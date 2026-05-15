from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from fastapi.responses import Response 
from pydantic import BaseModel
from typing import List 
from ai_report import generate_strategic_report
import psycopg2
import os
import csv
import bcrypt
import datetime
import json
import io
import jwt
import PyPDF2
import pandas as pd
import requests
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from google import genai
from supabase import create_client, Client 

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_fallback_key_123")

# Supabase Storage Setup
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

# AUTO-UPGRADE SCHEMA
def verify_schema():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS pdf_text TEXT DEFAULT '';")
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';")
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS commission_earned NUMERIC DEFAULT 0.0;")
        
        # 🚨 NEW: Added Agent Pipeline Fields
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'Individual Agent';")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS corporation_name TEXT DEFAULT '';")

        # 🚨 NEW: Added Marketing Fields to prevent crashes!
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS program_interest TEXT DEFAULT '';")
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT '';")
        cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'Cold Leads';")
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

# --- EMERGENCY BACKDOOR ---
@app.get("/api/emergency-admin")
def create_emergency_admin():
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
        return {"status": "success", "message": "Emergency Admin created successfully!"}
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
                "exp": datetime.utcnow() + timedelta(hours=24)
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
    phone: str = ""
    agent_type: str = "Individual Agent"
    corporation_name: str = ""

@app.post("/api/users")
def create_user(req: NewUserRequest):
    hashed_password = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO users (name, email, password, role, branch, phone, agent_type, corporation_name) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (req.name, req.email, hashed_password, req.role, req.branch, req.phone, req.agent_type, req.corporation_name))
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
    cur.execute("SELECT id, name, email, role, branch, phone, agent_type, corporation_name FROM users ORDER BY id DESC")
    users = cur.fetchall()
    cur.close()
    conn.close()
    return {"status": "success", "data": users}

# --- MASTER ADMIN DASHBOARD STATS ---
@app.get("/api/admin/dashboard-stats")
def get_dashboard_stats(timeframe: str = "all", user_data: dict = Depends(verify_token)):
    if user_data.get("role") != "MASTER_ADMIN":
        raise HTTPException(status_code=403, detail="Master Admin access required.")
        
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT name, role FROM users")
    users_db = cur.fetchall()
    user_roles = {u['name']: u['role'] for u in users_db}

    query = "SELECT assignee, status, applications, commission_earned, created_at FROM students"
    if timeframe == "30days":
        query += " WHERE created_at >= NOW() - INTERVAL '30 days'"
    elif timeframe == "this_year":
        query += " WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())"

    cur.execute(query)
    students = cur.fetchall()
    cur.close()
    conn.close()

    total_students = len(students)
    qualified_leads = 0
    active_applications = 0
    total_business = 0.0

    agent_volume, agent_revenue = {}, {}
    counsellor_volume, counsellor_revenue = {}, {}
    institution_volume = {}

    for s in students:
        status = (s.get("status") or "").upper()
        assignee = s.get("assignee") or "Unassigned"
        role = user_roles.get(assignee, "Agent")
        commission = float(s.get("commission_earned") or 0.0)
        apps = s.get("applications") or []

        if status not in ["NEW LEAD", "REJECTED"]:
            qualified_leads += 1
        
        active_apps_for_student = [a for a in apps if isinstance(a, dict) and a.get("status") != "Rejected"]
        active_applications += len(active_apps_for_student)
        total_business += commission

        if role.upper() == "COUNSELLOR":
            counsellor_volume[assignee] = counsellor_volume.get(assignee, 0) + 1
            counsellor_revenue[assignee] = counsellor_revenue.get(assignee, 0.0) + commission
        else:
            agent_volume[assignee] = agent_volume.get(assignee, 0) + 1
            agent_revenue[assignee] = agent_revenue.get(assignee, 0.0) + commission

        for app in active_apps_for_student:
            uni = app.get("university", "Unknown")
            institution_volume[uni] = institution_volume.get(uni, 0) + 1

    return {
        "status": "success",
        "data": {
            "metrics": {
                "total_students": total_students,
                "qualified_leads": qualified_leads,
                "active_applications": active_applications,
                "total_business": total_business
            },
            "performance": {
                "top_agents_volume": [{"name": k, "value": v} for k, v in sorted(agent_volume.items(), key=lambda item: item[1], reverse=True)[:5]],
                "top_agents_revenue": [{"name": k, "value": v} for k, v in sorted(agent_revenue.items(), key=lambda item: item[1], reverse=True)[:5]],
                "top_counsellors_volume": [{"name": k, "value": v} for k, v in sorted(counsellor_volume.items(), key=lambda item: item[1], reverse=True)[:5]],
                "top_counsellors_revenue": [{"name": k, "value": v} for k, v in sorted(counsellor_revenue.items(), key=lambda item: item[1], reverse=True)[:5]],
                "top_institutions": [{"name": k, "value": v} for k, v in sorted(institution_volume.items(), key=lambda item: item[1], reverse=True)[:5]]
            }
        }
    }

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

@app.post("/api/pipeline")
async def create_lead(
    name: str = Form(...), email: str = Form(""), phone: str = Form(""),
    notes: str = Form(""), assignee: str = Form("Unassigned"),
    report_cards: List[UploadFile] = File(default=[]), 
    psych_tests: List[UploadFile] = File(default=[])
):
    extracted_pdf_text = ""
    saved_documents = [] 
    
    all_files = [(f, "REPORT CARD") for f in report_cards] + [(f, "PSYCHOLOGY TEST") for f in psych_tests]
    
    for file, title in all_files:
        if file and file.filename:
            if file.filename.endswith(('.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png')):
                safe_filename = f"NEW_{title.replace(' ', '_')}_{file.filename}"
                file_bytes = await file.read()
                
                if supabase:
                    supabase.storage.from_("student-documents").upload(
                        path=safe_filename, file=file_bytes, file_options={"content-type": file.content_type}
                    )
                saved_documents.append({"title": f"{title} - {file.filename}", "filename": safe_filename})

                if file.filename.endswith('.pdf'):
                    try:
                        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                        extracted_pdf_text += f"\n\n--- [BEGIN {title} - {file.filename}] ---\n"
                        extracted_pdf_text += "\n".join([page.extract_text() or "" for page in reader.pages])
                    except Exception:
                        pass

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

@app.delete("/api/pipeline/{case_id}")
def delete_lead(case_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM students WHERE id = %s", (case_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success", "message": "Lead deleted."}

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

@app.get("/api/documents/{filename}")
def download_document(filename: str, user_data: dict = Depends(verify_token)):
    try:
        if not supabase: raise HTTPException(status_code=500, detail="Cloud storage not configured.")
        response = supabase.storage.from_("student-documents").download(filename)
        return Response(content=response, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Document not found in Cloud Vault.")

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
            return {"status": "success", "verified": True, "message": "Deal closed.", "reason": result.get("reason")}
        else:
            return {"status": "error", "verified": False, "message": "Verification failed.", "reason": result.get("reason")}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail="Verification system error.")

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
    
    if not student: 
        return {"status": "error", "report": "Student not found."}

    try:
        premium_report = generate_strategic_report(
            student_name=student['name'],
            destination="Global (AI Recommended)",
            budget=30000,
            notes=student['notes'] or "No notes provided.",
            pdf_data=student['pdf_text'] or "No documents uploaded."
        )
        return {"status": "success", "report": premium_report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pipeline/{case_id}/draft-email")
def draft_student_email(case_id: str):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT name, status, timeline, applications FROM students WHERE id = %s", (case_id,))
    s = cur.fetchone()
    cur.close()
    conn.close()
    if not s: raise HTTPException(status_code=404, detail="Student not found.")

    prompt = f"""
    You are a helpful education agent writing directly to your student.
    Draft a professional, helpful, and friendly email to your student named {s['name']}.
    Address the student directly (e.g., "Hi {s['name']},"). Do not refer to them in the third person.
    Context - Status: {s['status']}. Notes: {json.dumps(s['timeline'])}. Apps: {json.dumps(s['applications'])}.
    Return ONLY valid JSON: {{"subject": "...", "body": "..."}}
    """
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

    prompt = f"""
    You are a helpful education agent writing directly to your student.
    Draft a short, friendly, and supportive WhatsApp message to your student named {s['name']}.
    Context - Status: {s['status']}. Timeline: {json.dumps(s['timeline'])}.
    Return ONLY valid JSON: {{"message": "..."}}
    """
    response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
    clean_json = response.text.strip().replace("```json", "").replace("```", "")
    return {"status": "success", "data": json.loads(clean_json)}

# --- 9. MARKETING MODULE: GOOGLE FORM INGEST ---
@app.post("/api/marketing/leads")
async def create_marketing_lead(
    name: str = Form(...),
    email: str = Form(...),
    wa_number: str = Form(""),
    program_interest: str = Form(""),
    lead_source: str = Form(""),
):
    temperature = "Cold Leads"
    score = 0
    if wa_number.strip(): score += 1
    if program_interest.strip(): score += 2
    if score >= 3: temperature = "Hot Leads"
    elif score >= 1: temperature = "Warm Leads"

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO students (name, email, phone, program_interest, lead_source, lead_temperature, status, assignee) 
            VALUES (%s, %s, %s, %s, %s, %s, 'NEW LEAD', 'Unassigned')
        """, (name, email, wa_number, program_interest, lead_source, temperature))
        conn.commit()
        return {
            "status": "success", 
            "message": f"Lead safely stored and auto-filtered as: {temperature}",
            "temperature": temperature
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# --- 10. AI COMMISSION AGREEMENT EXTRACTOR ---
@app.post("/api/admin/extract-commission")
async def extract_commission_agreement(contract: UploadFile = File(...)):
    try:
        content = await contract.read()
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        extracted_text = "".join([page.extract_text() or "" for page in reader.pages])

        prompt = f"""
        You are a top-tier legal AI assistant for an education agency. Read the document.
        CRITICAL FAIL-SAFE: If it is NOT a valid contract, or if you cannot find an Institution Name, return this exact JSON:
        {{ "is_valid": false, "error_message": "Sorry, we can't find anything regarding an Institution Name or Commission Agreement in this document. Please upload a valid contract." }}
        
        If valid, return ONLY raw JSON:
        {{
            "is_valid": true,
            "institution_name": "...",
            "expiry_date": "...",
            "finance_pic_name": "...",
            "finance_pic_email": "...",
            "commission_structure": {{
                "High School / Year 1": "...",
                "English Course": "...",
                "Foundation": "...",
                "Diploma": "...",
                "Bachelor Year 1": "...",
                "Master Year 1": "...",
                "PhD": "..."
            }}
        }}
        
        CONTRACT TEXT:
        {extracted_text}
        """
        if not client: raise HTTPException(status_code=500, detail="Gemini API key not configured.")
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        return {"status": "success", "data": json.loads(clean_json)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to parse University Contract.")

# --- 11. THE MARKETING EXCEL / CSV BULK UPLOAD ENGINE ---
@app.post("/api/bulk-upload")
async def bulk_upload_students(file: UploadFile = File(...)):
    # 1. Validasi File (Sekarang terima Excel dan CSV)
    valid_extensions = ('.csv', '.xls', '.xlsx')
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(status_code=400, detail="Invalid format. Please upload an Excel (.xlsx) or .csv file.")

    try:
        content = await file.read()
        
        # 2. Baca file secara otomatis (Excel atau CSV) menggunakan Pandas
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))

        # Bersihkan data (Ubah NaN/Null jadi string kosong supaya tidak error)
        df = df.fillna('')

        conn = get_db_connection()
        cur = conn.cursor()
        success_count = 0

        # 3. Looping semua baris di Excel
        for index, row in df.iterrows():
            # Menggunakan .get() supaya kalau kolom tidak ada, tidak langsung crash
            name = str(row.get('Name', '')).strip()
            email = str(row.get('Email (Active)', '')).strip()
            phone = str(row.get('WA', '')).strip()
            program = str(row.get('Program yang diminati', '')).strip()
            source = str(row.get('How do you know about this event?', '')).strip()

            # Skip baris yang kosong
            if not name or not email:
                continue

            # 4. Auto-Grader
            temperature = "Cold Leads"
            score = 0
            if phone: score += 1
            if program: score += 2
            if score >= 3: temperature = "Hot Leads"
            elif score >= 1: temperature = "Warm Leads"

            # 5. Simpan ke Database
            cur.execute("""
                INSERT INTO students (name, email, phone, program_interest, lead_source, lead_temperature, status, assignee)
                VALUES (%s, %s, %s, %s, %s, %s, 'NEW LEAD', 'Unassigned')
            """, (name, email, phone, program, source, temperature))
            
            success_count += 1

        conn.commit()
        return {
            "status": "success", 
            "message": f"Berhasil mengunggah dan memfilter {success_count} data dari Excel!"
        }

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        print(f"Bulk Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Gagal membaca file Excel. Pastikan nama kolom sesuai format.")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

# =====================================================================
# --- 12. AUTHENTICATION & PASSWORD RESET ---
# =====================================================================

# Define what data we expect from Next.js
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@app.post("/api/auth/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    # 1. Generate a secure reset token (valid for 1 hour)
    # We use your existing JWT_SECRET from your .env file
    secret_key = os.getenv("JWT_SECRET", "fallback-secret-key-change-me")
    expiration = datetime.utcnow() + timedelta(hours=1)
    
    reset_token = jwt.encode(
        {"sub": request.email, "exp": expiration.timestamp()}, 
        secret_key, 
        algorithm="HS256"
    )

    # 2. Build the clickable link that goes back to your Vercel website
    # IMPORTANT: Change this to your ACTUAL live Vercel URL!
    frontend_url = "https://fortrust-frontend.vercel.app" 
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    # 3. Get SendGrid ready
    sg_api_key = os.getenv("SENDGRID_API_KEY")
    sg_from_email = os.getenv("SENDGRID_FROM_EMAIL")

    if not sg_api_key or not sg_from_email:
        raise HTTPException(status_code=500, detail="SendGrid keys are missing on the server.")

    headers = {
        "Authorization": f"Bearer {sg_api_key}",
        "Content-Type": "application/json"
    }

    # 4. Draft the Email
    payload = {
        "personalizations": [{
            "to": [{"email": request.email}],
            "subject": "Fortrust - Password Reset Request"
        }],
        "from": {"email": sg_from_email, "name": "Fortrust System"},
        "content": [{
            "type": "text/html",
            "value": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h2 style="color: #282860; margin-bottom: 24px;">Fortrust OS Password Reset</h2>
                <p style="color: #475569; font-size: 16px;">Hello,</p>
                <p style="color: #475569; font-size: 16px;">You recently requested to reset your password for your Fortrust account. Click the button below to proceed:</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="{reset_link}" style="display: inline-block; padding: 14px 28px; background-color: #BAD133; color: #282860; font-weight: bold; text-decoration: none; border-radius: 8px;">Reset My Password</a>
                </div>
                <p style="margin-top: 32px; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px;">If you did not request this, please ignore this email. This link will expire in 1 hour.</p>
            </div>
            """
        }]
    }

    # 5. Fire the email off to SendGrid
    response = requests.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers)

    if response.status_code >= 400:
        print("SendGrid Error:", response.text)
        raise HTTPException(status_code=500, detail="Failed to send email.")

    return {"status": "success", "message": "Password reset email sent!"}