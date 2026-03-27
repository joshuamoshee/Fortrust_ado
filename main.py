from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import sqlite3
import datetime
import json
import io
import PyPDF2
import csv
import codecs
import os
import shutil # 🚨 NEW: Saves files to hard drive
from dotenv import load_dotenv
from google import genai

# Import the "brain" we already built!
from db import list_cases_advanced, get_case, delete_case
from ai_report import generate_strategic_report

os.makedirs("data/uploads", exist_ok=True)

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY) if API_KEY else None

# Initialize the API
app = FastAPI(title="Fortrust OS API", version="1.0")
# --- DATABASE INITIALIZATION ---
from db import init_db, seed_programs
init_db()       # <-- This builds the tables and the Master Admin!
seed_programs() # <-- This loads the dummy universities

# --- CORS SECURITY FIX ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 0. AUTHENTICATION & USER MANAGEMENT ---
class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login_user(req: LoginRequest):
    """Checks the REAL database for the user's credentials."""
    conn = sqlite3.connect("data/fortrust.db")
    c = conn.cursor()
    user = c.execute("SELECT id, name, role FROM users WHERE email=? AND password=?", (req.email, req.password)).fetchone()
    conn.close()
    
    if user:
        return {
            "status": "success", 
            "user": {"id": user[0], "name": user[1], "role": user[2]}
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

class NewUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    branch: str

@app.post("/api/users")
def create_user(req: NewUserRequest):
    """Allows Master Admin to create new agents/counsellors."""
    try:
        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        new_id = f"U-{int(datetime.datetime.now().timestamp())}"
        
        c.execute("INSERT INTO users (id, name, email, password, role, branch) VALUES (?, ?, ?, ?, ?, ?)",
                  (new_id, req.name, req.email, req.password, req.role, req.branch))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "User account created!"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already exists.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create user.")

@app.get("/api/users")
def get_all_users():
    """Returns the list of all agents, their branch, and their student counts."""
    try:
        from db import get_users_with_stats
        rows = get_users_with_stats()
        users = []
        for r in rows:
            users.append({
                "id": r[0], "name": r[1], "email": r[2], 
                "role": r[3], "branch": r[4], "student_count": r[5]
            })
        return {"status": "success", "data": users}
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users.")

# --- 0.5 AI-POWERED PROGRAM FINDER (LIVE INTERNET) ---
@app.get("/api/programs/search")
def ai_program_search(query: str = "Popular business degrees in Australia"):
    """Bypasses the database and uses Gemini + LIVE GOOGLE SEARCH to find universities."""
    try:
        if not client:
            raise HTTPException(status_code=500, detail="Gemini API key not configured.")

        # 🚨 UPGRADED PROMPT: Telling it to explicitly use live data
        prompt = f"""
        You are an expert global university counselor API. 
        The agent is searching for: "{query}"
        
        STEP 1: Use your Google Search tool to look up the MOST RECENT and up-to-date tuition fees and program details for 5 to 8 REAL university programs that match this query.
        STEP 2: Return ONLY a raw, valid JSON array of objects. Do not use markdown blocks. Do not include ```json.
        
        Format exactly like this:
        [
            {{"id": "1", "country": "Australia", "university": "Monash University", "program_name": "Bachelor of Business", "level": "Bachelor", "tuition": 30000, "duration": 3, "category": "Business"}}
        ]
        """
        
        # 🚨 THE MAGIC LINE: We tell the model to use the Google Search tool!
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt,
            config={"tools": [{"google_search": {}}]} # <-- Connects the AI to the live web
        )
        
        # Clean the response and parse it
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        programs = json.loads(clean_json)
        
        return {"status": "success", "data": programs}
        
    except Exception as e:
        print(f"AI Live Search Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to search live universities.")
    
# --- 1. GET ALL STUDENTS ENDPOINT ---
@app.get("/api/pipeline")
def get_pipeline(role: str, agent_code: str = None):
    all_rows_summary = list_cases_advanced()
    filtered_students = []
    if all_rows_summary:
        for r in all_rows_summary:
            case_details = get_case(r[0])
            if not case_details: continue
            
            cid, cdate, status, sname, phone, email, raw_json, brief, assignee, full_rep, rep_date, ref_code = case_details
            payload = json.loads(raw_json) if raw_json else {}
            
            student_data = {
                "id": cid, "name": sname, "status": status, "phone": phone, "email": email,
                "assigned_to": assignee, "date": cdate[:10],
                "commission_earned": payload.get("commission_earned", 0.0), 
                "currency": payload.get("currency", "USD"),
                "timeline": payload.get("timeline", []),
                "applications": payload.get("applications", []),
                "documents": payload.get("documents", []) # 🚨 NEW: Load Vault Documents
            }

            if role in ["MASTER_ADMIN", "ADMIN", "TELEMARKETER"]: filtered_students.append(student_data)
            elif role == "BRANCH_ADMIN" and payload.get("counsellor_data", {}).get("kantor", "") == agent_code: filtered_students.append(student_data)
            elif role in ["Agent", "Micro Agent", "Counsellor"] and assignee == agent_code: filtered_students.append(student_data)
            
    return {"status": "success", "data": filtered_students}

# --- 2. CREATE NEW LEAD WITH DUAL PDF UPLOAD ---
@app.post("/api/pipeline")
async def create_lead(
    name: str = Form(...), email: str = Form(...), phone: str = Form(...),
    notes: str = Form(""), destination: str = Form("To be determined"),
    budget: float = Form(0.0), assignee: str = Form("Unassigned"),
    report_card: UploadFile = File(None), psych_test: UploadFile = File(None)
):
    try:
        new_id = f"L-{int(datetime.datetime.now().timestamp())}"
        extracted_pdf_text = ""
        saved_documents = [] # 🚨 NEW: Track saved files
        
        for file, title in [(report_card, "REPORT CARD"), (psych_test, "PSYCHOLOGY TEST")]:
            if file and file.filename.endswith('.pdf'):
                # 1. Save physical file to Vault
                safe_filename = f"{new_id}_{title.replace(' ', '_')}.pdf"
                file_path = os.path.join("data/uploads", safe_filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                saved_documents.append({"title": title, "filename": safe_filename})

                # 2. Read text for AI
                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    extracted_pdf_text += f"\n\n--- [BEGIN {title}] ---\n"
                    for page in reader.pages:
                        extracted_pdf_text += (page.extract_text() or "") + "\n"

        raw_json_payload = json.dumps({"pdf_data": extracted_pdf_text, "destination": destination, "budget": budget, "documents": saved_documents}, ensure_ascii=False)

        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        c.execute('''INSERT INTO cases (case_id, created_at, status, student_name, phone, email, counsellor_brief_md, raw_json, assigned_to)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''', (new_id, datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "NEW LEAD", name, phone, email, notes, raw_json_payload, assignee))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Lead & Documents saved!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save lead and process PDFs.")


# --- 3. DELETE LEAD ENDPOINT ---
@app.delete("/api/pipeline/{case_id}")
def delete_lead(case_id: str):
    try:
        delete_case(case_id)
        return {"status": "success", "message": f"Lead {case_id} deleted."}
    except Exception as e:
        print(f"Delete Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete lead.")

# --- 3.5 UPDATE LEAD (MASTER ADMIN & COMMISSION) ---
class UpdateLeadRequest(BaseModel):
    status: str
    assigned_to: str
    tuition: float = 0.0          # 🚨 Added for Commission
    commission_rate: float = 0.0  # 🚨 Added for Commission
    currency: str = "USD"         # 🚨 Added for Commission

@app.put("/api/pipeline/{case_id}")
def update_lead(case_id: str, req: UpdateLeadRequest):
    """
    Receives updated status, agent assignment, and financial data.
    """
    try:
        from db import update_case_assignment
        # 🚨 Passes all the financial variables down to db.py
        update_case_assignment(case_id, req.status, req.assigned_to, req.tuition, req.commission_rate, req.currency)
        return {"status": "success", "message": "Lead updated successfully!"}
    except Exception as e:
        print(f"Update Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update lead.")


# --- 4. GENERATE AI REPORT ENDPOINT ---
class AIRequest(BaseModel):
    case_id: str 

@app.post("/api/ai-strategy")
def get_ai_strategy(req: AIRequest):
    try:
        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        student = c.execute("SELECT student_name, counsellor_brief_md, raw_json FROM cases WHERE case_id = ?", (req.case_id,)).fetchone()
        conn.close()

        if not student:
            return {"status": "error", "report": "Student not found in database."}

        student_name = student[0]
        student_notes = student[1] or "No specific notes provided."
        
        # Unpack the PDF text, Destination, and Budget from the database
        try:
            payload = json.loads(student[2]) if student[2] else {}
            pdf_data = payload.get("pdf_data", "")
            dest = payload.get("destination", "To be determined") 
            budg = payload.get("budget", 0.0)                     
        except:
            pdf_data = ""
            dest = "To be determined"
            budg = 0.0

        # Send ALL data to Gemini
        report = generate_strategic_report(
            student_name=student_name, 
            destination=dest, 
            budget=budg, 
            notes=student_notes,
            pdf_data=pdf_data 
        )
        return {"status": "success", "report": report}
        
    except Exception as e:
        print(f"AI Route Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI report.")
    

# --- 5. UPLOAD MULTIPLE PDFs TO EXISTING LEAD ---
@app.put("/api/pipeline/{case_id}/document")
async def upload_document_to_existing_lead(case_id: str, report_card: UploadFile = File(None), psych_test: UploadFile = File(None)):
    try:
        extracted_text = ""
        new_saved_docs = []
        
        for file, title in [(report_card, "REPORT CARD"), (psych_test, "PSYCHOLOGY TEST")]:
            if file and file.filename.endswith('.pdf'):
                # Save physical file
                safe_filename = f"{case_id}_{int(datetime.datetime.now().timestamp())}_{title.replace(' ', '_')}.pdf"
                file_path = os.path.join("data/uploads", safe_filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                new_saved_docs.append({"title": title, "filename": safe_filename})

                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    extracted_text += f"\n\n--- [BEGIN {title}] ---\n"
                    for page in reader.pages:
                        extracted_text += (page.extract_text() or "") + "\n"

        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        row = c.execute("SELECT raw_json FROM cases WHERE case_id = ?", (case_id,)).fetchone()
        payload = json.loads(row[0]) if row and row[0] else {}
        
        payload["pdf_data"] = payload.get("pdf_data", "") + extracted_text
        payload["documents"] = payload.get("documents", []) + new_saved_docs # Append to vault
        
        c.execute("UPDATE cases SET raw_json = ? WHERE case_id = ?", (json.dumps(payload, ensure_ascii=False), case_id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Documents attached!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process document.")

# --- 6. AI BULK SCANNER (EXPO IMPORT) ---
@app.post("/api/pipeline/bulk")
async def bulk_import_leads(assignee: str = Form("Unassigned"), file: UploadFile = File(...)):
    """Scans CSVs or Expo PDFs to auto-create multiple leads at once."""
    leads_to_insert = []
    
    try:
        # 1. If it's an Excel/CSV file
        if file.filename.endswith('.csv'):
            csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
            for row in csvReader:
                name = row.get('Name', row.get('name', 'Unknown Student'))
                email = row.get('Email', row.get('email', ''))
                phone = row.get('Phone', row.get('phone', ''))
                leads_to_insert.append((name, email, phone))
                
        # 2. If it's a messy PDF from a school expo
        elif file.filename.endswith('.pdf'):
            content = await file.read()
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            extracted_text = "".join([page.extract_text() or "" for page in reader.pages])
            
            # Ask Gemini to extract the unstructured list
            if client:
                prompt = f"""
                You are an AI data extractor. Read this raw text from a school expo sign-up sheet.
                Find all the student names, emails, and phone numbers.
                Return ONLY a valid, raw JSON array of objects. No markdown formatting. No backticks.
                Format: [{{"name": "...", "email": "...", "phone": "..."}}]
                Text to scan: {extracted_text}
                """
                response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
                
                json_str = response.text.strip().replace("```json", "").replace("```", "")
                parsed_leads = json.loads(json_str)
                
                for lead in parsed_leads:
                    leads_to_insert.append((lead.get("name", "Unknown"), lead.get("email", ""), lead.get("phone", "")))

        # 3. Insert everyone into the database
        if leads_to_insert:
            conn = sqlite3.connect("data/fortrust.db")
            c = conn.cursor()
            for name, email, phone in leads_to_insert:
                new_id = f"L-{int(datetime.datetime.now().timestamp())}-{len(leads_to_insert)}"
                c.execute('''INSERT INTO cases (case_id, created_at, status, student_name, phone, email, assigned_to)
                             VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                          (new_id, datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "NEW LEAD", name, phone, email, assignee))
            conn.commit()
            conn.close()
            return {"status": "success", "message": f"Successfully imported {len(leads_to_insert)} students!"}
        else:
            return {"status": "error", "detail": "No students found in the document."}
            
    except Exception as e:
        print(f"Bulk Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process bulk import.")

# --- 7. ADD NOTE TO STUDENT TIMELINE ---
class TimelineNote(BaseModel):
    note: str
    author: str
    reminder_date: str = None  # 🚨 NEW: Optional future date for tasks

@app.post("/api/pipeline/{case_id}/notes")
def add_timeline_note(case_id: str, req: TimelineNote):
    """Appends a new note and optional reminder to the student's history timeline."""
    try:
        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        
        row = c.execute("SELECT raw_json FROM cases WHERE case_id = ?", (case_id,)).fetchone()
        payload = json.loads(row[0]) if row and row[0] else {}
        
        if "timeline" not in payload:
            payload["timeline"] = []
            
        new_entry = {
            "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            "author": req.author,
            "note": req.note,
            "reminder_date": req.reminder_date  # 🚨 NEW: Saves the task date
        }
        payload["timeline"].append(new_entry)
        
        c.execute("UPDATE cases SET raw_json = ? WHERE case_id = ?", (json.dumps(payload, ensure_ascii=False), case_id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Note added to timeline!"}
    except Exception as e:
        print(f"Timeline Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to add note.")

# --- 8. UPDATE UNIVERSITY APPLICATIONS ---
class ApplicationData(BaseModel):
    applications: list

@app.put("/api/pipeline/{case_id}/applications")
def update_applications(case_id: str, req: ApplicationData):
    """Saves the student's university application list."""
    try:
        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        
        row = c.execute("SELECT raw_json FROM cases WHERE case_id = ?", (case_id,)).fetchone()
        payload = json.loads(row[0]) if row and row[0] else {}
        
        # Overwrite the applications array with the new one
        payload["applications"] = req.applications
        
        c.execute("UPDATE cases SET raw_json = ? WHERE case_id = ?", (json.dumps(payload, ensure_ascii=False), case_id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Applications updated!"}
    except Exception as e:
        print(f"App Tracker Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update applications.")
    
# --- 9. SECURE VAULT FILE DOWNLOAD ---
@app.get("/api/documents/{filename}")
def download_document(filename: str):
    """Allows frontend to securely download original PDFs."""
    file_path = os.path.join("data/uploads", filename)
    if os.path.exists(file_path):
        return FileResponse(path=file_path, filename=filename, media_type='application/pdf')
    raise HTTPException(status_code=404, detail="Document not found.")

# --- 10. AI ANTI-CHEAT COMMISSION VERIFIER ---
@app.post("/api/pipeline/{case_id}/verify-commission")
async def verify_comission(
    case_id: str,
    tuition: float = Form(...),
    commission_rate: float = Form(...),
    proof_document: UploadFile = File(...)
):
    """Prevents agents from claiming commission without AI verifying the email/payment receipt."""
    try:
        if not proof_document.filename.endswith('.pdf'):
            return {"status": "error", "verified": False, "reason": "Please upload a PDF of the email/receipt."}

        # 1. Read the uploaded proof document
        content = await proof_document.read()
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        extracted_text = "".join([page.extract_text() or "" for page in reader.pages])

        # 2. Ask Gemini to audit the document
        prompt = f"""
        You are a strict financial auditor for an education agency.
        Review this uploaded document text: "{extracted_text}"
        
        Check for TWO things:
        1. Evidence that the agent emailed the university regarding the payment.
        2. Evidence or confirmation that the payment was completed by the university/student.
        
        Return ONLY valid JSON. Be strict.
        {{"verified": true or false, "reason": "Short explanation of what you found or what is missing"}}
        """
        
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        result = json.loads(clean_json)

        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        
        # 3. Fetch existing student data
        row = c.execute("SELECT raw_json FROM cases WHERE case_id = ?", (case_id,)).fetchone()
        payload = json.loads(row[0]) if row and row[0] else {}

        if result.get("verified"):
            # PASSED: Lock in the commission and mark as COMPLETED!
            commission = tuition * commission_rate
            payload["commission_earned"] = commission
            
            c.execute("UPDATE cases SET status = 'COMPLETED', raw_json = ? WHERE case_id = ?", (json.dumps(payload, ensure_ascii=False), case_id))
            conn.commit()
            conn.close()
            return {"status": "success", "verified": True, "message": "Proof verified! Deal closed and commission locked.", "reason": result.get("reason")}
        else:
            # FAILED: Wipe any accidental commission and reject it!
            payload["commission_earned"] = 0.0 
            c.execute("UPDATE cases SET status = 'PAYMENT PENDING', raw_json = ? WHERE case_id = ?", (json.dumps(payload, ensure_ascii=False), case_id))
            conn.commit()
            conn.close()
            return {"status": "error", "verified": False, "message": "Verification failed.", "reason": result.get("reason")}
            
    except Exception as e:
        print(f"Verification Error: {e}")
        raise HTTPException(status_code=500, detail="Verification system error.")

# --- 11. 1-CLICK AI EMAIL DRAFTER ---
@app.post("/api/pipeline/{case_id}/draft-email")
def draft_student_email(case_id: str):
    """Generates a contextual email draft using Gemini based on the student's timeline and status."""
    try:
        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        row = c.execute("SELECT student_name, status, raw_json FROM cases WHERE case_id = ?", (case_id,)).fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Student not found.")

        student_name, status, raw_json = row
        payload = json.loads(raw_json) if raw_json else {}
        
        # Gather all the context for the AI brain!
        timeline = payload.get("timeline", [])
        recent_notes = "\n".join([f"- {t['date']}: {t['note']}" for t in timeline[-3:]]) if timeline else "No recent interactions."
        apps = payload.get("applications", [])
        app_context = "\n".join([f"- {a['university']} ({a['program']}): {a['status']}" for a in apps]) if apps else "No applications started yet."

        prompt = f"""
        You are an expert education counsellor writing an email to a student named {student_name}.
        Current Status of Student: {status}
        
        Recent Interactions (Timeline):
        {recent_notes}
        
        University Applications:
        {app_context}

        Draft a warm, professional, and concise email to the student to follow up on their progress based EXACTLY on the notes and applications above. 
        Do not include placeholders like [Your Name] unless absolutely necessary. Keep it ready to send.
        
        Return ONLY valid JSON in this exact format. Do not use markdown backticks:
        {{"subject": "Your proposed email subject", "body": "The full email body text"}}
        """
        
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        email_data = json.loads(clean_json)
        
        return {"status": "success", "data": email_data}
    except Exception as e:
        print(f"Email Draft Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to draft email.")


# --- 12. 1-CLICK AI WHATSAPP DRAFTER ---
@app.post("/api/pipeline/{case_id}/draft-whatsapp")
def draft_whatsapp_message(case_id: str):
    """Generates a conversational WhatsApp draft using Gemini."""
    try:
        conn = sqlite3.connect("data/fortrust.db")
        c = conn.cursor()
        row = c.execute("SELECT student_name, status, raw_json FROM cases WHERE case_id = ?", (case_id,)).fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Student not found.")

        student_name, status, raw_json = row
        payload = json.loads(raw_json) if raw_json else {}
        
        timeline = payload.get("timeline", [])
        recent_notes = "\n".join([f"- {t['date']}: {t['note']}" for t in timeline[-3:]]) if timeline else "No recent interactions."
        apps = payload.get("applications", [])
        app_context = "\n".join([f"- {a['university']} ({a['program']}): {a['status']}" for a in apps]) if apps else "No applications started yet."

        prompt = f"""
        You are an expert education counsellor writing a WhatsApp message to a student named {student_name}.
        Current Status of Student: {status}
        
        Recent Interactions (Timeline):
        {recent_notes}
        
        University Applications:
        {app_context}

        Draft a warm, friendly, and concise WhatsApp message to follow up. Keep it shorter than an email, use 1 or 2 appropriate emojis, and be highly professional but approachable. Do not include placeholders like [Your Name].
        
        Return ONLY valid JSON in this exact format. Do not use markdown backticks:
        {{"message": "The full whatsapp message text"}}
        """
        
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        wa_data = json.loads(clean_json)
        
        return {"status": "success", "data": wa_data}
    except Exception as e:
        print(f"WA Draft Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to draft WhatsApp.")