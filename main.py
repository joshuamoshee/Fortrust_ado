from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from fastapi.responses import Response # 🚨 UPDATED: Used for cloud files
from pydantic import BaseModel
import psycopg2
import os
import bcrypt
import datetime
import json
import io
import jwt
import PyPDF2
from dotenv import load_dotenv
from google import genai
from supabase import create_client, Client # 🚨 NEW: For Cloud Storage

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_fallback_key_123")

# 🚨 NEW: Supabase Storage Setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None
client = genai.Client(api_key=API_KEY) if API_KEY else None

# 1. Initialize the API
app = FastAPI(title="Fortrust OS API", version="1.0")

# --- CORS SECURITY FIX ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. The Cloud Database Connection
def get_db_connection():
    return psycopg2.connect(DATABASE_URL, sslmode='require')

# 🚨 AUTO-UPGRADE SCHEMA
def verify_schema():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS pdf_text TEXT DEFAULT '';")
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';")
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS commission_earned NUMERIC DEFAULT 0.0;")
        conn.commit()
    except Exception as e:
        conn.rollback()
    finally:
        cur.close()
        conn.close()

verify_schema() 

# --- THE BOUNCER (Security Check) ---
def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Access Denied: Missing ID Badge.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Access Denied: Badge Expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Access Denied: Fake Badge Detected.")

# --- 🚨 EMERGENCY BACKDOOR 🚨 ---
@app.get("/api/emergency-admin")
def create_emergency_admin():
    """Temporary backdoor to force-create a working admin account."""
    conn = get_db_connection()
    cur = conn.cursor()
    fresh_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
    try:
        cur.execute("DELETE FROM users WHERE email = 'admin@fortrust.com'")
        cur.execute("""
            INSERT INTO users (name, email, password, role, branch) 
            VALUES ('Master Admin', 'admin@fortrust.com', %s, 'MASTER_ADMIN', 'Global')
        """, (fresh_hash,))
        conn.commit()
        return {"status": "success", "message": "Emergency Admin created successfully! Go try logging in."}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cur.close()
        conn.close()

# --- 0. AUTHENTICATION & USER MANAGEMENT ---
class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login_user(req: LoginRequest):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, name, role, password FROM users WHERE email=%s", (req.email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if user:
        provided_password = req.password.encode('utf-8')
        stored_hash = user['password'].encode('utf-8')
        if bcrypt.checkpw(provided_password, stored_hash):
            token_data = {
                "id": user['id'], 
                "role": user['role'], 
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }
            token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
            return {
                "status": "success", 
                "token": token, 
                "user": {"id": user['id'], "name": user['name'], "role": user['role']}
            }
            
    raise HTTPException(status_code=401, detail="Invalid email or password.")

class NewUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    branch: str

@app.post("/api/users")
def create_user(req: NewUserRequest):
    hashed_password = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO users (name, email, password, role, branch) VALUES (%s, %s, %s, %s, %s)",
                    (req.name, req.email, hashed_password, req.role, req.branch))
        conn.commit()
        return {"status": "success", "message": "User account created securely!"}
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists.")
    finally:
        cur.close()
        conn.close()

@app.get("/api/users")
def get_all_users():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, name, email, role, branch FROM users")
    users = cur.fetchall()
    cur.close()
    conn.close()
    return {"status": "success", "data": users}

# --- 0.5 AI-POWERED PROGRAM FINDER ---
@app.get("/api/programs/search")
def ai_program_search(query: str = "Popular business degrees in Australia"):
    try:
        if not client: raise HTTPException(status_code=500, detail="Gemini API key not configured.")
        prompt = f"""
        You are an expert global university counselor API. The agent is searching for: "{query}"
        STEP 1: Use Google Search to look up the MOST RECENT tuition fees and programs for 5 to 8 REAL universities.
        STEP 2: Return ONLY a raw, valid JSON array of objects. No markdown.
        Format: [{{"id": "1", "country": "Australia", "university": "Monash", "program_name": "BA Business", "level": "Bachelor", "tuition": 30000, "duration": 3, "category": "Business"}}]
        """
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt, config={"tools": [{"google_search": {}}]})
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        return {"status": "success", "data": json.loads(clean_json)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to search live universities.")
    
# --- 1. GET ALL STUDENTS ENDPOINT ---
@app.get("/api/pipeline")
def get_pipeline(role: str, agent_code: str = None, user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    if role in ["MASTER_ADMIN", "ADMIN", "TELEMARKETER", "BRANCH_ADMIN"]:
        cur.execute("SELECT * FROM students ORDER BY created_at DESC")
    else:
        cur.execute("SELECT * FROM students WHERE assignee = %s ORDER BY created_at DESC", (agent_code,))
    students = cur.fetchall()
    cur.close()
    conn.close()
    for s in students: s['id'] = str(s['id'])
    return {"status": "success", "data": students}

# --- 2. CREATE NEW LEAD WITH DUAL PDF UPLOAD (CLOUD STORAGE VERSION) ---
@app.post("/api/pipeline")
async def create_lead(
    name: str = Form(...), email: str = Form(""), phone: str = Form(""),
    notes: str = Form(""), assignee: str = Form("Unassigned"),
    report_card: UploadFile = File(None), psych_test: UploadFile = File(None)
):
    extracted_pdf_text = ""
    saved_documents = [] 
    
    for file, title in [(report_card, "REPORT CARD"), (psych_test, "PSYCHOLOGY TEST")]:
        if file and file.filename.endswith('.pdf'):
            safe_filename = f"NEW_{title.replace(' ', '_')}_{file.filename}"
            
            # Read file into memory
            file_bytes = await file.read()
            
            # 🚨 CLOUD UPLOAD: Fire directly to Supabase
            if supabase:
                supabase.storage.from_("student-documents").upload(
                    path=safe_filename, file=file_bytes, file_options={"content-type": "application/pdf"}
                )
            saved_documents.append({"title": title, "filename": safe_filename})

            # AI READING
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            extracted_pdf_text += f"\n\n--- [BEGIN {title}] ---\n"
            extracted_pdf_text += "\n".join([page.extract_text() or "" for page in reader.pages])

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO students (name, email, phone, assignee, status, notes, documents, pdf_text) 
        VALUES (%s, %s, %s, %s, 'NEW LEAD', %s, %s::jsonb, %s)
    """, (name, email, phone, assignee, notes, json.dumps(saved_documents), extracted_pdf_text))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success", "message": "Lead & Documents saved to Cloud!"}

# --- 3. DELETE LEAD ENDPOINT ---
@app.delete("/api/pipeline/{case_id}")
def delete_lead(case_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM students WHERE id = %s", (case_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success", "message": "Lead deleted."}

# --- 4. ADD NOTE TO STUDENT TIMELINE ---
class TimelineNote(BaseModel):
    note: str
    author: str
    reminder_date: str = None 

@app.post("/api/pipeline/{case_id}/notes")
def add_timeline_note(case_id: str, req: TimelineNote):
    new_entry = {
        "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "author": req.author,
        "note": req.note,
        "reminder_date": req.reminder_date 
    }
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE students SET timeline = timeline || %s::jsonb WHERE id = %s", 
                (json.dumps([new_entry]), case_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success", "message": "Note added to timeline!"}

# --- 5. UPDATE UNIVERSITY APPLICATIONS ---
class ApplicationData(BaseModel):
    applications: list

@app.put("/api/pipeline/{case_id}/applications")
def update_applications(case_id: str, req: ApplicationData):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE students SET applications = %s::jsonb WHERE id = %s", 
                (json.dumps(req.applications), case_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success", "message": "Applications updated!"}

# --- 6. SECURE CLOUD VAULT DOWNLOAD ---
@app.get("/api/documents/{filename}")
def download_document(filename: str, user_data: dict = Depends(verify_token)):
    try:
        if not supabase: raise HTTPException(status_code=500, detail="Cloud storage not configured.")
        response = supabase.storage.from_("student-documents").download(filename)
        return Response(content=response, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Document not found in Cloud Vault.")

# --- 7. AI ANTI-CHEAT COMMISSION VERIFIER ---
@app.post("/api/pipeline/{case_id}/verify-commission")
async def verify_comission(
    case_id: str, tuition: float = Form(...), commission_rate: float = Form(...), proof_document: UploadFile = File(...)
):
    try:
        content = await proof_document.read()
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        extracted_text = "".join([page.extract_text() or "" for page in reader.pages])

        prompt = f"""
        You are a financial auditor. Review document: "{extracted_text}"
        Check for: 1. Agent emailed uni regarding payment. 2. Payment confirmed.
        Return ONLY JSON: {{"verified": true/false, "reason": "Explanation"}}
        """
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        result = json.loads(response.text.strip().replace("```json", "").replace("```", ""))

        if result.get("verified"):
            commission = tuition * commission_rate
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("UPDATE students SET status = 'COMPLETED', commission_earned = %s WHERE id = %s", (commission, case_id))
            conn.commit()
            cur.close()
            conn.close()
            return {"status": "success", "verified": True, "message": "Deal closed and commission locked.", "reason": result.get("reason")}
        else:
            return {"status": "error", "verified": False, "message": "Verification failed.", "reason": result.get("reason")}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail="Verification system error.")

# --- 8. AI GENERATORS (STRATEGY, EMAIL, WHATSAPP) ---
class AIRequest(BaseModel):
    case_id: str 

@app.post("/api/ai-strategy")
def get_ai_strategy(req: AIRequest):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT name, notes, pdf_text FROM students WHERE id = %s", (req.case_id,))
    student = cur.fetchone()
    cur.close()
    conn.close()
    if not student: return {"status": "error", "report": "Student not found."}

    prompt = f"Analyze this student profile. Name: {student['name']}. Notes: {student['notes']}. Documents: {student['pdf_text']}. Provide a strict, professional academic strategy."
    response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
    return {"status": "success", "report": response.text}

@app.post("/api/pipeline/{case_id}/draft-email")
def draft_student_email(case_id: str):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT name, status, timeline, applications FROM students WHERE id = %s", (case_id,))
    s = cur.fetchone()
    cur.close()
    conn.close()
    if not s: raise HTTPException(status_code=404, detail="Student not found.")

    prompt = f"Draft an email to {s['name']}. Status: {s['status']}. Notes: {json.dumps(s['timeline'])}. Apps: {json.dumps(s['applications'])}. Return ONLY valid JSON: {{\"subject\": \"...\", \"body\": \"...\"}}"
    response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
    clean_json = response.text.strip().replace("```json", "").replace("```", "")
    return {"status": "success", "data": json.loads(clean_json)}

@app.post("/api/pipeline/{case_id}/draft-whatsapp")
def draft_whatsapp_message(case_id: str):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT name, status, timeline, applications FROM students WHERE id = %s", (case_id,))
    s = cur.fetchone()
    cur.close()
    conn.close()
    if not s: raise HTTPException(status_code=404, detail="Student not found.")

    prompt = f"Draft a short WhatsApp message to {s['name']}. Status: {s['status']}. Timeline: {json.dumps(s['timeline'])}. Return ONLY valid JSON: {{\"message\": \"...\"}}"
    response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
    clean_json = response.text.strip().replace("```json", "").replace("```", "")
    return {"status": "success", "data": json.loads(clean_json)}