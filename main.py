from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from ai_report import generate_strategic_report
import psycopg2
import os
import shutil
import bcrypt
import json
import io
import jwt
import PyPDF2
import pandas as pd
import requests
from datetime import datetime, date, timedelta
from dotenv import load_dotenv
from google import genai
from supabase import create_client, Client
import traceback

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_fallback_key_123")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if SUPABASE_URL:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

if API_KEY:
    client = genai.Client(api_key=API_KEY)
else:
    client = None

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Fortrust OS API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# --- DATABASE CONNECTION ---
# =====================================================================
def get_db_connection():
    return psycopg2.connect(DATABASE_URL, sslmode='require')


# =====================================================================
# --- AUTO SCHEMA UPGRADE ---
# =====================================================================
def verify_schema():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS pdf_text TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS commission_earned NUMERIC DEFAULT 0.0;")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS program_interest TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'Cold Leads';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'PENDING_CENSUS';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS agent_cut NUMERIC DEFAULT 0;")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS loss_reason TEXT DEFAULT '';")

            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'Individual Agent';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS corporation_name TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS office_address TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_address TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS swift_code TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 50;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_corporate_id INTEGER REFERENCES users(id) ON DELETE SET NULL;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS training_points INTEGER DEFAULT 0;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact TEXT DEFAULT '';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS field_interests TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS budget TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS archive_reason TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS father_email TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS father_whatsapp TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_email TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_whatsapp TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_field TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS career_goal TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS campus_env TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS country_interest TEXT DEFAULT '';")
            cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS assignees JSONB DEFAULT '[]'::jsonb;")
            # Backfill: copy existing single assignee values into the new JSONB array
            cur.execute("""
                UPDATE students 
                SET assignees = jsonb_build_array(assignee)
                WHERE (assignees IS NULL OR assignees = '[]'::jsonb)
                AND assignee IS NOT NULL 
                AND assignee != '' 
                AND assignee != 'Unassigned'
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                    sender TEXT NOT NULL,
                    message TEXT NOT NULL,
                    mentioned_users JSONB DEFAULT '[]'::jsonb,
                    read_by JSONB DEFAULT '[]'::jsonb,
                    is_system BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    recipient_username TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    message TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS institutions (
                    id SERIAL PRIMARY KEY,
                    name TEXT DEFAULT '',
                    type TEXT DEFAULT '',
                    country TEXT DEFAULT '',
                    city TEXT DEFAULT '',
                    status TEXT DEFAULT 'Active',
                    website TEXT DEFAULT '',
                    establishment_year TEXT DEFAULT '',
                    student_intake TEXT DEFAULT '',
                    programs_offered TEXT DEFAULT '',
                    agreement_id TEXT DEFAULT '',
                    agreement_date TEXT DEFAULT '',
                    agreement_type TEXT DEFAULT '',
                    base_commission TEXT DEFAULT '',
                    performance_bonus TEXT DEFAULT '',
                    tiered_levels TEXT DEFAULT '',
                    duration_start TEXT DEFAULT '',
                    duration_end TEXT DEFAULT '',
                    terms_conditions TEXT DEFAULT '',
                    contacts JSONB DEFAULT '[]',
                    total_referrals INTEGER DEFAULT 0,
                    total_enrollment INTEGER DEFAULT 0,
                    total_base_commission TEXT DEFAULT '',
                    total_payable TEXT DEFAULT '',
                    commission_status TEXT DEFAULT 'Pending',
                    payment_date TEXT DEFAULT '',
                    commission_notes TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS document_link TEXT;")
            cur.execute("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS commission_programs JSONB DEFAULT '[]'::jsonb;")
            cur.execute("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS ai_extracted_at TIMESTAMP;")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id SERIAL PRIMARY KEY,
                    action TEXT,
                    entity TEXT,
                    entity_id TEXT,
                    changed_by TEXT,
                    details JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS broadcasts (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    target_role TEXT DEFAULT 'ALL',
                    target_branch TEXT DEFAULT 'ALL',
                    send_email BOOLEAN DEFAULT FALSE,
                    created_by TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)

            conn.commit()
    except Exception as e:
        print(f"Schema upgrade error: {e}")
        conn.rollback()
    finally:
        conn.close()


verify_schema()


# =====================================================================
# --- AUDIT LOG ENGINE ---
# =====================================================================
def log_audit_event(conn, action: str, entity: str, entity_id: str, changed_by: str, details: dict = None):
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO audit_logs (action, entity, entity_id, changed_by, details)
            VALUES (%s, %s, %s, %s, %s::jsonb)
        """, (action, entity, str(entity_id), changed_by, json.dumps(details or {})))
        cur.close()
    except Exception as e:
        print(f"Audit Log Failed: {str(e)}")


# =====================================================================
# --- 🔒 SECURITY CONSTANTS & HELPERS (Document Vault) ---
# =====================================================================
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
}
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# File extension whitelist — primary validation method
ALLOWED_EXTENSIONS = {
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif',
    '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'
}


def is_safe_filetype(file) -> tuple:
    """
    Returns (is_safe: bool, reason: str).
    Checks by extension first (reliable), MIME as a sanity check.
    """
    filename = (file.filename or "").lower().strip()
    if not filename:
        return False, "missing filename"

    if '.' not in filename:
        return False, "file has no extension"

    ext = '.' + filename.rsplit('.', 1)[-1]
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"extension '{ext}' not allowed (allowed: PDF, images, Word, Excel, text)"

    bad_mimes = {
        'application/x-msdownload',
        'application/x-sh',
        'application/x-bat',
        'application/javascript',
    }
    if file.content_type and file.content_type in bad_mimes:
        return False, f"dangerous MIME type '{file.content_type}'"

    return True, "ok"


def sanitize_filename(filename: str) -> str:
    """Strip path separators, null bytes, and dangerous characters."""
    if not filename:
        return "file"
    filename = filename.replace('\\', '_').replace('/', '_').replace('\x00', '')
    filename = filename.lstrip('.')
    filename = filename[:200]
    return filename or "file"


def check_student_access(conn, case_id: str, user_data: dict) -> bool:
    """
    Returns True if this user can access this student's documents.
    Rules:
      - MASTER_ADMIN: always yes
      - Corporate Agent / Team Manager: yes if any sub-agent is assigned
      - Anyone else: yes ONLY if they are the assignee
    """
    role = user_data.get("role")
    user_name = user_data.get("name")
    user_id = user_data.get("id")

    if role == "MASTER_ADMIN":
        return True

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT assignee FROM students WHERE id = %s", (case_id,))
            row = cur.fetchone()
            if not row:
                return False
            assignee = row.get("assignee")

            if assignee == user_name:
                return True

            if role in ("Corporate Agent", "Team Manager"):
                cur.execute(
                    "SELECT name FROM users WHERE parent_corporate_id = %s",
                    (user_id,)
                )
                sub_agents = [r['name'] for r in cur.fetchall()]
                if assignee in sub_agents:
                    return True

        return False
    except Exception as e:
        print(f"[access-check] Error: {e}")
        return False


# =====================================================================
# --- SECURITY / AUTH HELPERS ---
# =====================================================================
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


def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")


def get_current_master_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("role") != "MASTER_ADMIN":
            raise HTTPException(status_code=403, detail="Access Forbidden: Master Admin privileges required.")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")
    
def can_access_student_chat(conn, student_id, user_data: dict) -> bool:
    """
    Returns True if user can view/post in this student's chat.
    Rules:
    - Master Admin: always yes
    - Other users: must be in the student's `assignees` array OR be the legacy `assignee`
    """
    if user_data.get("role") == "MASTER_ADMIN":
        return True
    
    user_name = user_data.get("name", "")
    if not user_name:
        return False
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT assignee, assignees FROM students WHERE id = %s",
            (student_id,)
        )
        row = cur.fetchone()
        if not row:
            return False
        
        # Check legacy single assignee
        if row.get("assignee") == user_name:
            return True
        
        # Check assignees array
        assignees = row.get("assignees") or []
        if isinstance(assignees, str):
            try:
                assignees = json.loads(assignees)
            except Exception:
                assignees = []
        
        return user_name in assignees


# =====================================================================
# --- PYDANTIC MODELS ---
# =====================================================================
class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False


class BroadcastCreate(BaseModel):
    title: str
    message: str
    target_role: str = "ALL"
    target_branch: str = "ALL"
    send_email: bool = True
    mentioned_agents: Optional[List[str]] = None  # If set, sends ONLY to these emails (overrides role/branch)


class NewUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    branch: str
    phone: str = ""
    agent_type: str = "Individual Agent"
    corporation_name: str = ""
    office_address: str = ""
    max_capacity: int = 50
    commission_rate: float = 0
    bank_name: str = ""
    bank_branch: str = ""
    bank_account: str = ""
    swift_code: str = ""
    parent_corporate_id: Optional[int] = None
    emergency_contact: str = ""


class UpdateSystemUser(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    branch: Optional[str] = None
    phone: Optional[str] = None
    agent_type: Optional[str] = None
    corporation_name: Optional[str] = None
    office_address: Optional[str] = None
    max_capacity: Optional[int] = None
    commission_rate: Optional[float] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_address: Optional[str] = None
    bank_account: Optional[str] = None
    swift_code: Optional[str] = None
    parent_corporate_id: Optional[int] = None
    emergency_contact: Optional[str] = None
    is_active: Optional[bool] = None
    is_archived: Optional[bool] = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    office_address: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_address: Optional[str] = None
    bank_account: Optional[str] = None
    swift_code: Optional[str] = None
    is_active: Optional[bool] = None
    is_archived: Optional[bool] = None
    max_capacity: Optional[int] = None
    commission_rate: Optional[float] = None


class UpdateLeadRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    assignee: Optional[str] = None
    tuition: Optional[float] = None
    commission_rate: Optional[float] = None
    currency: Optional[str] = None
    loss_reason: Optional[str] = None
    archive_reason: Optional[str] = None
    budget: Optional[str] = None
    father_name: Optional[str] = None
    father_email: Optional[str] = None
    father_whatsapp: Optional[str] = None
    mother_name: Optional[str] = None
    mother_email: Optional[str] = None
    mother_whatsapp: Optional[str] = None
    academic_field: Optional[str] = None
    career_goal: Optional[str] = None
    campus_env: Optional[str] = None
    country_interest: Optional[str] = None

class ArchiveStudentRequest(BaseModel):
    reason: str
    notes: Optional[str] = None
    new_agent: Optional[str] = None

class ChatMessageCreate(BaseModel):
    message: str


class TimelineNote(BaseModel):
    note: str
    author: str
    reminder_date: str = None


class ApplicationData(BaseModel):
    applications: list


class AIRequest(BaseModel):
    case_id: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class StudentCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    assignee: Optional[str] = None
    status: Optional[str] = "Lead"
    program_interest: Optional[str] = None
    lead_source: Optional[str] = None
    lead_temperature: Optional[str] = None
    budget: Optional[str] = None
    father_name: Optional[str] = None
    father_email: Optional[str] = None
    father_whatsapp: Optional[str] = None
    mother_name: Optional[str] = None
    mother_email: Optional[str] = None
    mother_whatsapp: Optional[str] = None
    academic_field: Optional[str] = None
    career_goal: Optional[str] = None
    campus_env: Optional[str] = None
    country_interest: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    assignee: Optional[str] = None
    assignees: Optional[List[str]] = None  # NEW: multi-assignee support
    status: Optional[str] = None
    notes: Optional[str] = None
    program_interest: Optional[str] = None
    lead_source: Optional[str] = None
    lead_temperature: Optional[str] = None
    commission_earned: Optional[float] = None
    loss_reason: Optional[str] = None
    field_interests: Optional[str] = None
    budget: Optional[str] = None
    father_name: Optional[str] = None
    father_email: Optional[str] = None
    father_whatsapp: Optional[str] = None
    mother_name: Optional[str] = None
    mother_email: Optional[str] = None
    mother_whatsapp: Optional[str] = None
    academic_field: Optional[str] = None
    career_goal: Optional[str] = None
    campus_env: Optional[str] = None
    country_interest: Optional[str] = None


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    status: Optional[str] = None
    website: Optional[str] = None
    student_intake: Optional[str] = None
    programs_offered: Optional[str] = None
    agreement_id: Optional[str] = None
    agreement_date: Optional[str] = None
    agreement_type: Optional[str] = None
    base_commission: Optional[str] = None
    performance_bonus: Optional[str] = None
    tiered_levels: Optional[str] = None
    duration_start: Optional[str] = None
    duration_end: Optional[str] = None
    terms_conditions: Optional[str] = None
    document_link: Optional[str] = None
    contacts: Optional[list] = None
    commission_programs: Optional[list] = None
    total_referrals: Optional[int] = None
    total_enrollment: Optional[int] = None
    total_base_commission: Optional[str] = None
    total_payable: Optional[str] = None
    commission_status: Optional[str] = None
    payment_date: Optional[str] = None
    commission_notes: Optional[str] = None


class AIChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []


# =====================================================================
# --- EMERGENCY BACKDOOR ---
# =====================================================================
@app.get("/api/emergency-admin")
def create_emergency_admin():
    conn = get_db_connection()
    fresh_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
    try:
        with conn.cursor() as cur:
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
        conn.close()


# =====================================================================
# --- 0. AUTHENTICATION ---
# =====================================================================
@app.post("/api/login")
def login_user(req: LoginRequest):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, role, password, branch, phone, corporation_name,
                       bank_name, bank_account, bank_branch, swift_code,
                       COALESCE(is_active, true) as is_active 
                FROM users WHERE email=%s
            """, (req.email,))
            user = cur.fetchone()

            if not user or not bcrypt.checkpw(req.password.encode('utf-8'), user['password'].encode('utf-8')):
                raise HTTPException(status_code=401, detail="Invalid email or password.")
            if user['is_active'] is False:
                raise HTTPException(status_code=403, detail="Account frozen.")

            try:
                cur.execute("""
                    INSERT INTO audit_logs (action, entity, entity_id, changed_by, details)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                """, ("LOGIN", "System Access", str(user['id']), user['name'], json.dumps({"action": "Agent logged into Fortrust OS"})))
                conn.commit()
            except Exception as e:
                print(f"CCTV Tracking Error: {e}")

            expire_hours = 24 * 30 if req.remember_me else 24
            token_data = {
                "id": user['id'],
                "name": user['name'],
                "role": user['role'],
                "exp": datetime.utcnow() + timedelta(hours=expire_hours)
            }
            token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
            return {
                "status": "success",
                "token": token,
                "user": {
                    "id": user['id'],
                    "name": user['name'],
                    "email": req.email,
                    "role": user['role'],
                    "branch": user['branch'],
                    "phone": user['phone'],
                    "corporation_name": user['corporation_name'],
                    "bank_name": user['bank_name'],
                    "bank_account": user['bank_account'],
                    "bank_branch": user['bank_branch'],
                    "swift_code": user['swift_code']
                }
            }
    finally:
        conn.close()


# =====================================================================
# --- 1. USER MANAGEMENT ---
# =====================================================================
@app.post("/api/users")
def create_user_legacy(req: NewUserRequest):
    hashed_password = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (
                    name, email, password, role, branch, phone, agent_type,
                    corporation_name, office_address, max_capacity, commission_rate,
                    bank_name, bank_branch, bank_account, swift_code,
                    parent_corporate_id, emergency_contact
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                req.name, req.email, hashed_password, req.role, req.branch,
                req.phone, req.agent_type, req.corporation_name, req.office_address,
                req.max_capacity, req.commission_rate,
                req.bank_name, req.bank_branch, req.bank_account, req.swift_code,
                req.parent_corporate_id, req.emergency_contact
            ))
            conn.commit()
            return {"status": "success", "message": "User account created securely!"}
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/api/users")
def get_all_users_legacy():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, email, role, branch, phone, agent_type, corporation_name,
                       office_address, bank_name, bank_branch, bank_address, bank_account,
                       swift_code, max_capacity, commission_rate, parent_corporate_id,
                       emergency_contact, training_points,
                       COALESCE(is_active, true) as is_active,
                       COALESCE(is_archived, false) as is_archived
                FROM users ORDER BY id DESC
            """)
            return {"status": "success", "data": cur.fetchall()}
    finally:
        conn.close()


@app.put("/api/users/{user_id}")
def update_system_user(user_id: int, req: UpdateSystemUser):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            data = req.dict(exclude_unset=True)
            if not data:
                return {"status": "success"}
            if "password" in data and data["password"]:
                data["password"] = bcrypt.hashpw(data["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            updates = [f"{k} = %s" for k in data]
            params = list(data.values()) + [user_id]
            cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", tuple(params))
            conn.commit()
            return {"status": "success", "message": "User updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/api/users/{user_id}")
def delete_system_user(user_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
            return {"status": "success", "message": "User deleted."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/api/users/{user_id}/award-training-point")
def award_training_point(user_id: int, user_data: dict = Depends(verify_token)):
    if user_data.get("role") != "MASTER_ADMIN" and user_data.get("id") != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE users 
                SET training_points = COALESCE(training_points, 0) + 1 
                WHERE id = %s 
                RETURNING training_points
            """, (user_id,))
            new_points = cur.fetchone()
            conn.commit()
            return {"status": "success", "message": "KPI Point Awarded!", "new_total": new_points[0]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to award point")
    finally:
        conn.close()


# =====================================================================
# --- 2. MASTER ADMIN DASHBOARD ---
# =====================================================================
@app.get("/api/admin/dashboard-stats")
def get_dashboard_stats(
    timeframe: str = "all",
    from_date: str = None,
    to_date: str = None,
    user_data: dict = Depends(verify_token)
):
    if user_data.get("role") != "MASTER_ADMIN":
        raise HTTPException(status_code=403, detail="Master Admin access required.")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT name, role, branch FROM users")
            users_info = {u['name']: {'role': u['role'], 'branch': u['branch']} for u in cur.fetchall()}

            base_query = "SELECT assignee, status, applications, commission_earned, lead_temperature, created_at FROM students"
            where_clause = ""

            if timeframe == "30days":
                where_clause = " WHERE created_at >= NOW() - INTERVAL '30 days'"
            elif timeframe == "3months":
                where_clause = " WHERE created_at >= NOW() - INTERVAL '3 months'"
            elif timeframe == "6months":
                where_clause = " WHERE created_at >= NOW() - INTERVAL '6 months'"
            elif timeframe == "this_year":
                where_clause = " WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())"
            elif timeframe == "custom" and from_date and to_date:
                where_clause = f" WHERE created_at::date BETWEEN '{from_date}' AND '{to_date}'"

            cur.execute(base_query + where_clause)
            students = cur.fetchall()

            cur.execute("""
                SELECT lead_temperature, status FROM students
                WHERE created_at >= NOW() - INTERVAL '30 days'
            """)
            last_30_days = cur.fetchall()

            cur.execute("""
                SELECT lead_temperature, status FROM students
                WHERE created_at >= NOW() - INTERVAL '60 days'
                AND created_at < NOW() - INTERVAL '30 days'
            """)
            prev_30_days = cur.fetchall()
    except Exception as e:
        print(f"Database Query Error in Stats: {e}")
        raise HTTPException(status_code=500, detail="Database query failed.")
    finally:
        conn.close()

    total_students = len(students)
    in_progress = 0
    completed = 0
    dropped = 0
    qualified_leads = 0
    active_applications = 0
    estimation_commission = 0.0
    logged_commission = 0.0

    agent_volume, agent_revenue = {}, {}
    counsellor_volume, counsellor_revenue = {}, {}
    institution_volume = {}
    branch_pipeline = {}

    for s in students:
        status = (s.get("status") or "").upper()
        temperature = (s.get("lead_temperature") or "").lower()
        assignee = s.get("assignee") or "Unassigned"
        info = users_info.get(assignee, {'role': 'Agent', 'branch': 'Unassigned'})
        role = info['role'] or "Agent"
        branch = info['branch'] or "Unassigned"

        try:
            commission = float(s.get("commission_earned") or 0.0)
        except (ValueError, TypeError):
            commission = 0.0

        apps = s.get("applications")
        if isinstance(apps, str):
            try:
                apps = json.loads(apps)
            except Exception:
                apps = []
        if not isinstance(apps, list):
            apps = []

        if status == "COMPLETED":
            completed += 1
            logged_commission += commission
        elif status == "REJECTED":
            dropped += 1
        else:
            in_progress += 1
            estimation_commission += commission

        if "hot" in temperature or "warm" in temperature:
            qualified_leads += 1

        active_apps = [a for a in apps if isinstance(a, dict) and a.get("status") in ("Submitted", "Pending", "Under Review")]
        active_applications += len(active_apps)

        if role.upper() == "COUNSELLOR" or "counselor" in role.lower():
            counsellor_volume[assignee] = counsellor_volume.get(assignee, 0) + 1
            counsellor_revenue[assignee] = counsellor_revenue.get(assignee, 0.0) + commission
        else:
            agent_volume[assignee] = agent_volume.get(assignee, 0) + 1
            agent_revenue[assignee] = agent_revenue.get(assignee, 0.0) + commission

        for app in active_apps:
            uni = app.get("university", "Unknown")
            institution_volume[uni] = institution_volume.get(uni, 0) + 1

        branch_pipeline[branch] = branch_pipeline.get(branch, 0) + 1

    current_qualified = sum(1 for s in last_30_days if "hot" in (s.get("lead_temperature") or "").lower() or "warm" in (s.get("lead_temperature") or "").lower())
    prev_qualified = sum(1 for s in prev_30_days if "hot" in (s.get("lead_temperature") or "").lower() or "warm" in (s.get("lead_temperature") or "").lower())

    if prev_qualified > 0:
        qualified_growth = round(((current_qualified - prev_qualified) / prev_qualified) * 100, 1)
    elif current_qualified > 0:
        qualified_growth = 100.0
    else:
        qualified_growth = 0.0

    def top5(d):
        return [{"name": k, "value": v} for k, v in sorted(d.items(), key=lambda x: x[1], reverse=True)[:5]]

    return {
        "status": "success",
        "data": {
            "metrics": {
                "total_students": total_students,
                "in_progress": in_progress,
                "completed": completed,
                "dropped": dropped,
                "qualified_leads": qualified_leads,
                "qualified_growth": qualified_growth,
                "active_applications": active_applications,
                "estimation_commission": estimation_commission,
                "logged_commission": logged_commission,
                "total_business": logged_commission,
                "avg_days_to_close": 24
            },
            "performance": {
                "top_agents_volume": top5(agent_volume),
                "top_agents_revenue": top5(agent_revenue),
                "top_counsellors_volume": top5(counsellor_volume),
                "top_counsellors_revenue": top5(counsellor_revenue),
                "top_institutions": top5(institution_volume),
                "branch_pipeline": [{"branch": k, "value": v} for k, v in sorted(branch_pipeline.items(), key=lambda x: x[1], reverse=True)]
            }
        }
    }


@app.get("/api/admin/audit-logs")
def get_audit_logs(limit: int = 100, user_data: dict = Depends(verify_token)):
    if user_data.get("role") != "MASTER_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs")
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, action, entity, entity_id, changed_by, details, created_at
                FROM audit_logs ORDER BY created_at DESC LIMIT %s
            """, (limit,))
            logs = cur.fetchall()
            for log in logs:
                if log.get('created_at'):
                    log['created_at'] = log['created_at'].isoformat()
            return {"status": "success", "data": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to load audit logs")
    finally:
        conn.close()


@app.post("/api/admin/users", dependencies=[Depends(get_current_master_admin)])
def create_admin_user(user: UserCreate):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (user.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered.")
            hashed = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cur.execute("""
                INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s) RETURNING id
            """, (user.name, user.email, hashed, user.role))
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "success", "message": "User created successfully", "user_id": new_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/api/admin/users", dependencies=[Depends(get_current_master_admin)])
def get_admin_users():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, name, email, role FROM users ORDER BY name ASC")
            return {"status": "success", "data": cur.fetchall()}
    finally:
        conn.close()


@app.put("/api/admin/users/{user_id}", dependencies=[Depends(get_current_master_admin)])
def update_admin_user(user_id: int, user: UserUpdate):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            data = user.dict(exclude_unset=True)
            if not data:
                raise HTTPException(status_code=400, detail="No data provided to update.")
            updates = [f"{k} = %s" for k in data]
            params = list(data.values()) + [user_id]
            cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", tuple(params))
            if cur.rowcount == 0:
                conn.rollback()
                raise HTTPException(status_code=404, detail="User not found.")
            conn.commit()
            return {"status": "success", "message": "Agent profile updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/api/admin/users/{user_id}", dependencies=[Depends(get_current_master_admin)])
def delete_admin_user(user_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            if cur.rowcount == 0:
                conn.rollback()
                raise HTTPException(status_code=404, detail="User not found.")
            conn.commit()
            return {"status": "success", "message": "User permanently deleted."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# =====================================================================
# --- ACTIONABLE DASHBOARD QUEUE ---
# =====================================================================
@app.get("/api/admin/action-queue", dependencies=[Depends(get_current_master_admin)])
def get_action_queue(user_data: dict = Depends(verify_token)):
    """
    Returns 6 categories of actionable items for the Master Admin command center.
    Each category includes: count, sample items (max 3), label, description.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
 
            # ============================================================
            # 1. HOT/WARM LEADS WITH NO RECENT CONTACT (3+ days stale)
            # ============================================================
            cur.execute("""
                SELECT id, name, assignee, lead_temperature,
                       COALESCE(updated_at, created_at) as last_activity
                FROM students
                WHERE LOWER(COALESCE(lead_temperature, '')) IN ('hot leads', 'warm leads')
                  AND UPPER(COALESCE(status, '')) NOT IN ('COMPLETED', 'REJECTED', 'ARCHIVED')
                  AND COALESCE(updated_at, created_at) < NOW() - INTERVAL '3 days'
                ORDER BY COALESCE(updated_at, created_at) ASC
                LIMIT 50
            """)
            hot_stale_rows = cur.fetchall()
 
            # ============================================================
            # 2. STUDENTS WITH MISSING DOCUMENTS (< 3 docs on file)
            # ============================================================
            cur.execute("""
                SELECT id, name, assignee,
                       COALESCE(jsonb_array_length(documents), 0) as doc_count
                FROM students
                WHERE UPPER(COALESCE(status, '')) NOT IN ('COMPLETED', 'REJECTED', 'ARCHIVED')
                  AND COALESCE(jsonb_array_length(documents), 0) < 3
                ORDER BY created_at DESC
                LIMIT 50
            """)
            missing_docs_rows = cur.fetchall()
 
            # ============================================================
            # 3. UNASSIGNED LEADS
            # ============================================================
            cur.execute("""
                SELECT id, name, lead_temperature, created_at
                FROM students
                WHERE (assignee IS NULL OR assignee = '' OR LOWER(assignee) = 'unassigned')
                  AND UPPER(COALESCE(status, '')) NOT IN ('COMPLETED', 'REJECTED', 'ARCHIVED')
                ORDER BY created_at DESC
                LIMIT 50
            """)
            unassigned_rows = cur.fetchall()
 
            # ============================================================
            # 4. COMMISSIONS READY TO CLAIM
            # ============================================================
            cur.execute("""
                SELECT id, name, assignee, commission_earned, payout_status
                FROM students
                WHERE (
                    UPPER(COALESCE(payout_status, '')) = 'CLEARED' 
                    OR (COALESCE(commission_earned, 0) > 0 AND UPPER(COALESCE(payout_status, '')) NOT IN ('CLAIMED', 'PAID'))
                )
                AND UPPER(COALESCE(status, '')) = 'COMPLETED'
                ORDER BY commission_earned DESC NULLS LAST
                LIMIT 50
            """)
            commissions_rows = cur.fetchall()
            total_cleared = sum(float(r.get('commission_earned') or 0) for r in commissions_rows)
 
            # ============================================================
            # 5. EXPIRING/EXPIRED AGREEMENTS (next 30 days or already expired)
            # ============================================================
            cur.execute("""
                SELECT id, name, country, duration_end
                FROM institutions
                WHERE duration_end IS NOT NULL
                  AND duration_end != ''
                  AND COALESCE(status, 'Active') = 'Active'
                ORDER BY duration_end ASC
                LIMIT 100
            """)
            all_inst = cur.fetchall()
 
            today = date.today()
            expiring_agreements = []
            for inst in all_inst:
                try:
                    end_str = (inst.get('duration_end') or '')[:10]
                    if not end_str:
                        continue
                    end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
                    days_left = (end_date - today).days
                    if days_left <= 30:  # expired OR expiring within 30 days
                        expiring_agreements.append({
                            'id': inst['id'],
                            'name': inst['name'],
                            'country': inst.get('country'),
                            'duration_end': end_str,
                            'days_left': days_left,
                            'is_expired': days_left < 0
                        })
                except Exception:
                    continue
 
            # ============================================================
            # 6. TODAY'S REMINDERS (timeline notes with reminder_date = today)
            # ============================================================
            cur.execute("""
                SELECT id, name, assignee, timeline
                FROM students
                WHERE timeline IS NOT NULL
                  AND UPPER(COALESCE(status, '')) != 'ARCHIVED'
            """)
            all_with_timeline = cur.fetchall()
 
            today_iso = today.isoformat()
            todays_reminders = []
            for s in all_with_timeline:
                timeline = s.get('timeline')
                if not timeline:
                    continue
                if isinstance(timeline, str):
                    try:
                        timeline = json.loads(timeline)
                    except Exception:
                        continue
                if not isinstance(timeline, list):
                    continue
                for note in timeline:
                    if isinstance(note, dict) and note.get('reminder_date') == today_iso:
                        todays_reminders.append({
                            'student_id': s['id'],
                            'student_name': s['name'],
                            'assignee': s.get('assignee'),
                            'note': (note.get('note') or note.get('content') or '')[:120],
                            'author': note.get('author', 'Unknown')
                        })
                        break  # only one reminder per student to keep list clean
 
            # ============================================================
            # HELPER: serialize dates / datetime for JSON
            # ============================================================
            def serialize(row):
                result = dict(row) if not isinstance(row, dict) else row.copy()
                for k, v in result.items():
                    if hasattr(v, 'isoformat'):
                        result[k] = v.isoformat()
                return result
 
            return {
                "status": "success",
                "data": {
                    "hot_stale": {
                        "count": len(hot_stale_rows),
                        "items": [serialize(r) for r in hot_stale_rows[:3]],
                        "label": "Hot/Warm leads needing follow-up",
                        "description": "Qualified leads with no activity in 3+ days"
                    },
                    "missing_docs": {
                        "count": len(missing_docs_rows),
                        "items": [serialize(r) for r in missing_docs_rows[:3]],
                        "label": "Students missing documents",
                        "description": "Active students with fewer than 3 documents on file"
                    },
                    "unassigned": {
                        "count": len(unassigned_rows),
                        "items": [serialize(r) for r in unassigned_rows[:3]],
                        "label": "Unassigned leads",
                        "description": "New leads sitting in the open pool"
                    },
                    "commissions_ready": {
                        "count": len(commissions_rows),
                        "total_amount": total_cleared,
                        "items": [serialize(r) for r in commissions_rows[:3]],
                        "label": "Commissions ready to claim",
                        "description": f"${total_cleared:,.0f} in cleared funds awaiting withdrawal"
                    },
                    "expiring_agreements": {
                        "count": len(expiring_agreements),
                        "items": expiring_agreements[:3],
                        "label": "Agreements expiring/expired",
                        "description": "Institution agreements ending in 30 days or already expired"
                    },
                    "todays_reminders": {
                        "count": len(todays_reminders),
                        "items": todays_reminders[:3],
                        "label": "Today's reminders",
                        "description": "Timeline notes scheduled for today"
                    }
                }
            }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Action queue error: {str(e)}")
    finally:
        conn.close()

# =====================================================================
# --- 3. AI PROGRAM SEARCH ---
# =====================================================================
@app.get("/api/programs/search")
def ai_program_search(query: str = "Popular business degrees in Australia"):
    try:
        if not client:
            raise HTTPException(status_code=500, detail="Gemini API key not configured.")
        prompt = f"""
        You are an expert global university counselor API. The agent is searching for: "{query}"
        STEP 1: Use Google Search to look up the MOST RECENT tuition fees and programs for 5 to 8 REAL universities.
        STEP 2: Return ONLY a raw, valid JSON array of objects. No markdown.
        Format: [{{"id": "1", "country": "Australia", "university": "Monash", "program_name": "BA Business", "level": "Bachelor", "tuition": 30000, "duration": 3, "category": "Business"}}]
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={"tools": [{"google_search": {}}]}
        )
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        return {"status": "success", "data": json.loads(clean_json)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to search live universities.")


# =====================================================================
# --- 4. PIPELINE ---
# =====================================================================
@app.get("/api/pipeline")
def get_pipeline(role: str, agent_code: str = None, user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if role in ["MASTER_ADMIN", "ADMIN", "TELEMARKETER", "BRANCH_ADMIN"]:
                cur.execute("SELECT * FROM students ORDER BY created_at DESC")
            else:
                cur.execute(
                    "SELECT * FROM students WHERE assignee = %s ORDER BY created_at DESC",
                    (agent_code,)
                )
            students = cur.fetchall()
            for s in students:
                s['id'] = str(s['id'])
            return {"status": "success", "data": students}
    finally:
        conn.close()


# 🔒 SECURED create_lead — auth required, file validation, two-phase save
@app.post("/api/pipeline")
async def create_lead(
    name: str = Form(...),
    email: str = Form(""),
    phone: str = Form(""),
    notes: str = Form(""),
    assignee: str = Form("Unassigned"),
    budget: str = Form(""),
    report_cards: List[UploadFile] = File(default=[]),
    psych_tests: List[UploadFile] = File(default=[]),
    user_data: dict = Depends(verify_token)
):
    conn = None
    try:
        conn = get_db_connection()

        # Phase 1: INSERT student first to get a stable ID for filenames
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO students (name, email, phone, assignee, status, notes, documents, pdf_text, budget)
                VALUES (%s, %s, %s, %s, 'NEW LEAD', %s, '[]'::jsonb, '', %s)
                RETURNING id
            """, (name, email, phone, assignee, notes, budget))
            new_id = cur.fetchone()[0]
            conn.commit()

        # Phase 2: process files with proper S{id}_ prefix
        extracted_pdf_text = ""
        saved_documents = []
        upload_errors = []
        all_files = [(f, "REPORT CARD") for f in report_cards] + [(f, "PSYCHOLOGY TEST") for f in psych_tests]

        for file, title in all_files:
            if not file or not file.filename:
                continue

            # ✅ MIME check
            is_safe, reason = is_safe_filetype(file)
            if not is_safe:
                upload_errors.append(f"{file.filename}: {reason}")
                continue

            # ✅ Sanitize filename
            clean_original = sanitize_filename(file.filename).replace(" ", "_")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
            safe_filename = f"S{new_id}_{title.replace(' ', '_')}_{timestamp}_{clean_original}"

            try:
                file_bytes = await file.read()
            except Exception:
                upload_errors.append(f"{file.filename}: could not read")
                continue

            # ✅ Size check
            if len(file_bytes) > MAX_FILE_SIZE_BYTES:
                upload_errors.append(f"{file.filename}: too large (max {MAX_FILE_SIZE_MB}MB)")
                continue
            if len(file_bytes) == 0:
                upload_errors.append(f"{file.filename}: empty file")
                continue

            if supabase:
                try:
                    supabase.storage.from_("student-documents").upload(
                        path=safe_filename,
                        file=file_bytes,
                        file_options={"content-type": file.content_type or "application/octet-stream"}
                    )
                except Exception as supa_err:
                    print(f"[create_lead] Supabase error: {supa_err}")
                    upload_errors.append(f"{file.filename}: cloud storage failed")
                    continue
            else:
                upload_errors.append(f"{file.filename}: cloud storage not configured")
                continue

            saved_documents.append({
                "title": f"{title} - {file.filename}",
                "filename": safe_filename,
                "uploaded_by": user_data.get("name", "Unknown"),
                "uploaded_at": datetime.now().isoformat(),
                "size_bytes": len(file_bytes)
            })

            if file.filename.lower().endswith('.pdf'):
                try:
                    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                    extracted_pdf_text += f"\n\n--- [BEGIN {title} - {file.filename}] ---\n"
                    extracted_pdf_text += "\n".join([page.extract_text() or "" for page in reader.pages])
                except Exception:
                    pass

        # Phase 3: UPDATE student with documents + pdf_text
        if saved_documents or extracted_pdf_text:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE students SET documents = %s::jsonb, pdf_text = %s WHERE id = %s",
                    (json.dumps(saved_documents), extracted_pdf_text, new_id)
                )

                log_audit_event(
                    conn=conn, action="CREATE_LEAD", entity="Student",
                    entity_id=str(new_id), changed_by=user_data.get("name", "Unknown"),
                    details={"documents_added": [d["title"] for d in saved_documents]}
                )
                conn.commit()

        msg = "Lead & Documents saved to Cloud!"
        if upload_errors:
            msg += f" (Partial: {len(upload_errors)} file(s) failed.)"

        return {
            "status": "success",
            "message": msg,
            "student_id": new_id,
            "errors": upload_errors if upload_errors else None
        }
    except Exception as e:
        if conn:
            conn.rollback()
        print("[create_lead] FATAL:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create lead: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.put("/api/pipeline/{case_id}")
def update_lead(case_id: str, req: UpdateLeadRequest, user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            updates = []
            params = []
            audit_details = {}

            if req.status is not None:
                updates.append("status = %s")
                params.append(req.status)
                audit_details["new_status"] = req.status

            new_assignee = req.assignee or req.assigned_to
            if new_assignee is not None:
                updates.append("assignee = %s")
                params.append(new_assignee)
                # Also sync the assignees JSONB array so multi-assignee UI stays consistent
                if new_assignee and new_assignee != "Unassigned":
                    updates.append("assignees = %s::jsonb")
                    params.append(json.dumps([new_assignee]))
                else:
                    updates.append("assignees = %s::jsonb")
                    params.append(json.dumps([]))
                audit_details["new_assignee"] = new_assignee

            if req.tuition is not None and req.commission_rate is not None:
                earned = req.tuition * (req.commission_rate / 100)
                updates.append("commission_earned = %s")
                params.append(earned)
                updates.append("currency = %s")
                params.append(req.currency or "USD")
                audit_details["commission_logged"] = earned

            if req.loss_reason is not None:
                updates.append("loss_reason = %s")
                params.append(req.loss_reason)
                audit_details["loss_reason"] = req.loss_reason

            if req.archive_reason is not None:
                updates.append("archive_reason = %s")
                params.append(req.archive_reason)
                audit_details["archive_reason"] = req.archive_reason

            if req.budget is not None:
                updates.append("budget = %s")
                params.append(req.budget)
                audit_details["budget"] = req.budget

            if not updates:
                return {"status": "success", "message": "Nothing to update."}

            params.append(case_id)
            cur.execute(f"UPDATE students SET {', '.join(updates)} WHERE id = %s", tuple(params))

            if req.status and req.status.lower() == "archived":
                agent_name = user_data.get("name", "Admin") if user_data else "Admin"
                reason = req.archive_reason or "No reason specified"
                new_entry = {
                    "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "author": agent_name,
                    "note": f"{agent_name} archived student.\nReason: {reason}.",
                    "reminder_date": None
                }
                cur.execute(
                    "UPDATE students SET timeline = timeline || %s::jsonb WHERE id = %s",
                    (json.dumps([new_entry]), case_id)
                )

            agent_name = user_data.get("name", "Unknown") if user_data else "Unknown"
            log_audit_event(
                conn=conn, action="UPDATE", entity="Student",
                entity_id=case_id, changed_by=agent_name, details=audit_details
            )
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/api/pipeline/{case_id}")
def delete_lead(case_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM students WHERE id = %s", (case_id,))
            conn.commit()
            return {"status": "success", "message": "Lead deleted."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database deletion error.")
    finally:
        conn.close()

# =====================================================================
# --- SPRINT A: DEDICATED ARCHIVE / REASSIGN ENDPOINT ---
# =====================================================================
@app.post("/api/pipeline/{case_id}/archive")
def archive_student(
    case_id: str,
    req: ArchiveStudentRequest,
    user_data: dict = Depends(verify_token)
):
    """Archive a student or reassign to another agent.
    Special case: reason='apply_through_other_agent' triggers reassign instead.
    """
    conn = None
    try:
        conn = get_db_connection()

        if not check_student_access(conn, case_id, user_data):
            raise HTTPException(status_code=403, detail="Not authorized for this student.")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, name, assignee FROM students WHERE id = %s", (case_id,))
            student = cur.fetchone()
            if not student:
                raise HTTPException(status_code=404, detail="Student not found.")

        actor_name = user_data.get("name", "Unknown")
        now_iso = datetime.now().isoformat()

        # Special case: reassign instead of archive
        if req.reason == "apply_through_other_agent":
            if not req.new_agent:
                raise HTTPException(status_code=400, detail="new_agent required when reason is apply_through_other_agent.")
            old_agent = student.get("assignee") or "Unassigned"
            timeline_note = {
                "date": now_iso[:16].replace("T", " "),
                "author": actor_name,
                "note": f"Reassigned from {old_agent} to {req.new_agent}. Reason: Applying through other agent.{(' - ' + req.notes) if req.notes else ''}"
            }
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE students
                    SET assignee = %s,
                        timeline = COALESCE(timeline, '[]'::jsonb) || %s::jsonb
                    WHERE id = %s
                """, (req.new_agent, json.dumps([timeline_note]), case_id))

                # Log to chat_messages (teammate's system)
                try:
                    cur.execute("""
                        INSERT INTO chat_messages (student_id, sender, message, is_system)
                        VALUES (%s, 'System', %s, TRUE)
                    """, (int(case_id), f"{actor_name} reassigned student from {old_agent} to {req.new_agent}"))
                except Exception:
                    pass

            log_audit_event(
                conn=conn, action="REASSIGN_VIA_ARCHIVE_FLOW", entity="Student",
                entity_id=case_id, changed_by=actor_name,
                details={"from": old_agent, "to": req.new_agent, "notes": req.notes}
            )
            conn.commit()
            return {"status": "success", "action": "reassigned", "message": f"Student reassigned to {req.new_agent}."}

        # Standard archive flow
        reason_pretty = {
            "budget_constraint": "Budget constraint",
            "changed_mind": "Changed mind / destination",
            "no_followup": "No agent follow-up",
            "documents_incomplete": "Documents incomplete",
            "other": "Other"
        }.get(req.reason, req.reason)

        timeline_note = {
            "date": now_iso[:16].replace("T", " "),
            "author": actor_name,
            "note": f"Archived. Reason: {reason_pretty}.{(' - ' + req.notes) if req.notes else ''}"
        }

        with conn.cursor() as cur:
            cur.execute("""
                UPDATE students
                SET status = 'ARCHIVED',
                    archive_reason = %s,
                    timeline = COALESCE(timeline, '[]'::jsonb) || %s::jsonb
                WHERE id = %s
            """, (reason_pretty, json.dumps([timeline_note]), case_id))

            # Log to chat_messages
            try:
                cur.execute("""
                    INSERT INTO chat_messages (student_id, sender, message, is_system)
                    VALUES (%s, 'System', %s, TRUE)
                """, (int(case_id), f"{actor_name} archived student. Reason: {reason_pretty}"))
            except Exception:
                pass

        log_audit_event(
            conn=conn, action="ARCHIVE_STUDENT", entity="Student",
            entity_id=case_id, changed_by=actor_name,
            details={"reason": req.reason, "notes": req.notes}
        )
        conn.commit()

        print(f"[archive] {student['name']} archived by {actor_name}, reason: {req.reason}")
        return {"status": "success", "action": "archived", "message": f"Student archived. Reason: {reason_pretty}."}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# 🔒 SECURED upload_additional_document
@app.put("/api/pipeline/{case_id}/document")
async def upload_additional_document(
    case_id: str,
    report_card: UploadFile = File(None),
    psych_test: UploadFile = File(None),
    doc_type: str = Form(None),
    user_data: dict = Depends(verify_token)
):
    conn = None
    cur = None
    try:
        conn = get_db_connection()

        # ✅ ACCESS CHECK
        if not check_student_access(conn, case_id, user_data):
            log_audit_event(
                conn=conn, action="DENIED_UPLOAD", entity="Student",
                entity_id=case_id, changed_by=user_data.get("name", "Unknown"),
                details={"reason": "not_authorized_for_student"}
            )
            conn.commit()
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to upload documents for this student."
            )

        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT documents, pdf_text FROM students WHERE id = %s", (case_id,))
        student = cur.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

        raw_docs = student.get('documents')
        if raw_docs is None:
            current_docs = []
        elif isinstance(raw_docs, str):
            try:
                current_docs = json.loads(raw_docs)
            except Exception:
                current_docs = []
        elif isinstance(raw_docs, list):
            current_docs = raw_docs
        else:
            current_docs = []

        current_text = student.get('pdf_text') or ""

        files_to_process = []
        if report_card:
            actual_title = sanitize_filename(doc_type or "REPORT CARD").upper()
            files_to_process.append((report_card, actual_title))
        if psych_test:
            files_to_process.append((psych_test, "PSYCHOLOGY TEST"))

        if not files_to_process:
            raise HTTPException(
                status_code=400,
                detail="No file provided. Expected 'report_card' or 'psych_test' form field."
            )

        doc_titles = []
        upload_errors = []

        for file, title in files_to_process:
            # ✅ MIME CHECK
            is_safe, reason = is_safe_filetype(file)
            if not is_safe:
                upload_errors.append(f"{file.filename}: {reason}")
                continue

            # ✅ SANITIZE FILENAME
            clean_original = sanitize_filename(file.filename or "file").replace(" ", "_")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
            safe_filename = f"S{case_id}_{title.replace(' ', '_')}_{timestamp}_{clean_original}"

            try:
                file_bytes = await file.read()
            except Exception as e:
                print(f"[upload] Failed to read {file.filename}: {e}")
                upload_errors.append(f"Could not read {file.filename}")
                continue

            # ✅ SIZE CHECK
            if len(file_bytes) > MAX_FILE_SIZE_BYTES:
                upload_errors.append(f"{file.filename}: file too large ({len(file_bytes) // 1024 // 1024}MB, max {MAX_FILE_SIZE_MB}MB)")
                continue
            if len(file_bytes) == 0:
                upload_errors.append(f"{file.filename}: empty file")
                continue

            if supabase:
                try:
                    supabase.storage.from_("student-documents").upload(
                        path=safe_filename,
                        file=file_bytes,
                        file_options={
                            "content-type": file.content_type or "application/octet-stream"
                        }
                    )
                except Exception as supa_err:
                    print(f"[upload] Supabase error for {safe_filename}: {supa_err}")
                    upload_errors.append(f"Cloud vault error: {str(supa_err)[:100]}")
                    continue
            else:
                print("[upload] WARNING: Supabase not configured")
                upload_errors.append("Cloud storage not configured")
                continue

            current_docs.append({
                "title": f"{title} - {file.filename}",
                "filename": safe_filename,
                "uploaded_by": user_data.get("name", "Unknown"),
                "uploaded_at": datetime.now().isoformat(),
                "size_bytes": len(file_bytes)
            })
            doc_titles.append(f"{title} - {file.filename}")

            if file.filename and file.filename.lower().endswith('.pdf'):
                try:
                    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                    current_text += f"\n\n--- [BEGIN {title} - {file.filename}] ---\n"
                    current_text += "\n".join([page.extract_text() or "" for page in reader.pages])
                except Exception as pdf_err:
                    print(f"[upload] PDF extraction failed: {pdf_err}")

        if upload_errors and not doc_titles:
            raise HTTPException(status_code=400, detail="; ".join(upload_errors))

        cur.execute(
            "UPDATE students SET documents = %s::jsonb, pdf_text = %s WHERE id = %s",
            (json.dumps(current_docs), current_text, case_id)
        )

        agent_name = user_data.get("name", "Unknown")
        for doc_title in doc_titles:
            cur.execute("""
                INSERT INTO chat_messages (student_id, sender, message, is_system)
                VALUES (%s, 'System', %s, TRUE)
            """, (int(case_id), f"{agent_name} uploaded {doc_title}"))
        if doc_titles:
            log_audit_event(
                conn=conn, action="UPLOAD_DOC", entity="Student",
                entity_id=case_id, changed_by=agent_name,
                details={"documents_added": doc_titles}
            )
        conn.commit()

        msg = "Documents securely added to vault."
        if upload_errors:
            msg += f" (Partial: {len(upload_errors)} file(s) failed.)"

        return {
            "status": "success",
            "message": msg,
            "uploaded": doc_titles,
            "errors": upload_errors if upload_errors else None
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[upload] FATAL error:")
        traceback.print_exc()
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.post("/api/pipeline/{case_id}/notes")
def add_timeline_note(case_id: str, req: TimelineNote):
    new_entry = {
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "author": req.author,
        "note": req.note,
        "reminder_date": req.reminder_date
    }
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE students SET timeline = timeline || %s::jsonb WHERE id = %s",
                (json.dumps([new_entry]), case_id)
            )
            conn.commit()
            return {"status": "success", "message": "Note added to timeline!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database update error.")
    finally:
        conn.close()


def extract_mentions(message_text: str, conn):
    import re
    # Extract @username patterns. Matches alphanumeric, space, dot, hyphen.
    tokens = re.findall(r'@([a-zA-Z0-9_\s\-\.]+)', message_text)
    mentioned_users = []
    
    with conn.cursor() as cur:
        # Fetch active users in system
        cur.execute("SELECT name FROM users WHERE is_active = TRUE")
        users = [r[0] for r in cur.fetchall()]
        
    for token in tokens:
        token_clean = token.strip().lower()
        if not token_clean:
            continue
        for u in users:
            words = u.lower().split()
            # If token matches any prefix of word in user name, or token is exact username
            if any(w.startswith(token_clean) for w in words) or token_clean == u.lower():
                if u not in mentioned_users:
                    mentioned_users.append(u)
    return mentioned_users


@app.get("/api/pipeline/{case_id}/chat")
def get_chat_messages(case_id: str, user_data: dict = Depends(verify_token)):
    """
    Returns ONLY real team messages (no SYSTEM events).
    Restricted to assignees + Master Admin.
    """
    conn = get_db_connection()
    try:
        # Access check
        if not can_access_student_chat(conn, case_id, user_data):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this student's chat."
            )
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Filter out SYSTEM messages — they belong in audit, not chat
            cur.execute("""
                SELECT id, student_id, sender, message, mentioned_users, 
                       read_by, is_system, created_at
                FROM chat_messages
                WHERE student_id = %s
                AND is_system = FALSE
                AND sender NOT IN ('System', 'System AI', 'SYSTEM')
                AND message NOT LIKE 'SYSTEM:%%'
                ORDER BY created_at ASC
            """, (case_id,))
            messages = cur.fetchall()
            
            # Normalize for frontend
            for m in messages:
                m['id'] = str(m['id'])
                if m.get('created_at'):
                    m['created_at'] = m['created_at'].isoformat()
                if m.get('mentioned_users') is None:
                    m['mentioned_users'] = []
                if m.get('read_by') is None:
                    m['read_by'] = []
            
            return {"status": "success", "data": messages}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/api/pipeline/{case_id}/chat")
def post_chat_message(
    case_id: str,
    body: dict,
    user_data: dict = Depends(verify_token)
):
    """
    Post a NEW human message. Restricted to assignees + Master Admin.
    Reject any attempt to post SYSTEM messages here.
    """
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    
    # Safety: prevent users from impersonating the system
    if message.upper().startswith("SYSTEM:"):
        raise HTTPException(
            status_code=400,
            detail="Messages cannot start with 'SYSTEM:'. That's reserved for audit events."
        )
    
    conn = get_db_connection()
    try:
        # Access check
        if not can_access_student_chat(conn, case_id, user_data):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to post in this student's chat."
            )
        
        sender_name = user_data.get("name", "Unknown User")
        
        # Extract @mentions
        import re
        mentions = re.findall(r'@(\w+)', message)
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO chat_messages 
                    (student_id, sender, message, mentioned_users, is_system, created_at)
                VALUES (%s, %s, %s, %s, FALSE, NOW())
                RETURNING id, student_id, sender, message, mentioned_users, 
                          is_system, created_at
            """, (case_id, sender_name, message, json.dumps(mentions)))
            new_message = cur.fetchone()
            conn.commit()
            
            # Normalize
            new_message['id'] = str(new_message['id'])
            if new_message.get('created_at'):
                new_message['created_at'] = new_message['created_at'].isoformat()
            new_message['read_by'] = []
            if new_message.get('mentioned_users') is None:
                new_message['mentioned_users'] = []
            
            return {"status": "success", "data": new_message}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/api/pipeline/{case_id}/chat/read")
def mark_chat_as_read(case_id: int, user_data: dict = Depends(verify_token)):
    user_name = user_data.get("name", "Unknown")
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch unread messages
            cur.execute("SELECT id, read_by FROM chat_messages WHERE student_id = %s", (case_id,))
            messages = cur.fetchall()
            
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            for msg in messages:
                read_by_list = msg["read_by"] or []
                if not isinstance(read_by_list, list):
                    read_by_list = []
                
                # Check if this user already read it
                if not any(r.get("user") == user_name for r in read_by_list):
                    read_by_list.append({"user": user_name, "read_at": now_str})
                    cur.execute(
                        "UPDATE chat_messages SET read_by = %s::jsonb WHERE id = %s",
                        (json.dumps(read_by_list), msg["id"])
                    )
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/api/pipeline/{case_id}/audit-trail")
def get_student_audit_trail(case_id: str, user_data: dict = Depends(verify_token)):
    """
    Returns the audit trail for a single student — SYSTEM events extracted from
    both chat_messages (legacy) and timeline column.
    Same access rule as chat.
    """
    conn = get_db_connection()
    try:
        # Access check (same as chat)
        if not can_access_student_chat(conn, case_id, user_data):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this student's audit trail."
            )
        
        events = []
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1) Pull SYSTEM messages from chat_messages
            cur.execute("""
                SELECT id, sender, message, created_at
                FROM chat_messages
                WHERE student_id = %s
                AND (
                    is_system = TRUE
                    OR sender IN ('System', 'System AI', 'SYSTEM')
                    OR message LIKE 'SYSTEM:%%'
                )
                ORDER BY created_at DESC
            """, (case_id,))
            sys_msgs = cur.fetchall()
            
            for m in sys_msgs:
                # Strip "SYSTEM:" prefix for cleaner display
                msg_text = m['message'] or ''
                if msg_text.upper().startswith("SYSTEM:"):
                    msg_text = msg_text[7:].strip()
                
                events.append({
                    "id": f"chat-{m['id']}",
                    "type": "system_event",
                    "actor": m['sender'] if m['sender'] not in ('System', 'System AI', 'SYSTEM') else None,
                    "message": msg_text,
                    "timestamp": m['created_at'].isoformat() if m['created_at'] else None
                })
            
            # 2) Also pull from timeline JSONB column (legacy notes that have SYSTEM)
            cur.execute("""
                SELECT timeline
                FROM students
                WHERE id = %s
            """, (case_id,))
            row = cur.fetchone()
            
            if row and row.get('timeline'):
                timeline = row['timeline']
                if isinstance(timeline, str):
                    try:
                        timeline = json.loads(timeline)
                    except Exception:
                        timeline = []
                
                if isinstance(timeline, list):
                    for entry in timeline:
                        note = entry.get('note', '') or ''
                        if note.upper().startswith("SYSTEM:") or entry.get('author') in ('System', 'System AI'):
                            cleaned = note[7:].strip() if note.upper().startswith("SYSTEM:") else note
                            events.append({
                                "id": f"timeline-{entry.get('date', '')}",
                                "type": "system_event",
                                "actor": entry.get('author') if entry.get('author') not in ('System', 'System AI') else None,
                                "message": cleaned,
                                "timestamp": entry.get('date')
                            })
        
        # Sort by timestamp descending (newest first)
        events.sort(key=lambda e: e.get('timestamp') or '', reverse=True)
        
        return {"status": "success", "data": events, "count": len(events)}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/api/notifications")
def get_user_notifications(user_data: dict = Depends(verify_token)):
    username = user_data.get("name")
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, recipient_username, sender, message, is_read, 
                       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
                FROM notifications 
                WHERE recipient_username = %s AND is_read = FALSE 
                ORDER BY created_at DESC
            """, (username,))
            return {"status": "success", "data": cur.fetchall()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()


@app.post("/api/notifications/{id}/read")
def mark_notification_read(id: int, user_data: dict = Depends(verify_token)):
    username = user_data.get("name")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE id = %s AND recipient_username = %s
            """, (id, username))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()


@app.put("/api/pipeline/{case_id}/applications")
def update_applications(case_id: str, req: ApplicationData):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE students SET applications = %s::jsonb WHERE id = %s",
                (json.dumps(req.applications), case_id)
            )
            conn.commit()
            return {"status": "success", "message": "Applications updated!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database update error.")
    finally:
        conn.close()


# 🔒 SECURED download_document — ONLY ONE COPY (duplicate removed)
@app.get("/api/documents/{filename}")
def download_document(filename: str, user_data: dict = Depends(verify_token)):
    """
    SECURE document download:
      - Requires valid JWT
      - Extracts case_id from filename pattern "S{id}_..."
      - Verifies caller has permission for that student
      - Logs every access/denial in audit_logs
      - Sets no-cache + nosniff headers
    """
    # ✅ Path traversal protection
    if '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    # Extract case_id from filename pattern: "S{id}_TITLE_TIMESTAMP_origname"
    case_id = None
    if filename.startswith('S'):
        try:
            case_id = filename[1:].split('_', 1)[0]
            int(case_id)  # validate numeric
        except (ValueError, IndexError):
            case_id = None

    conn = None
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Cloud storage not configured.")

        conn = get_db_connection()

        # ✅ ACCESS CHECK
        if case_id:
            if not check_student_access(conn, case_id, user_data):
                log_audit_event(
                    conn=conn, action="DENIED_DOC_ACCESS", entity="Document",
                    entity_id=filename, changed_by=user_data.get("name", "Unknown"),
                    details={"reason": "not_authorized", "case_id": case_id}
                )
                conn.commit()
                raise HTTPException(
                    status_code=403,
                    detail="You do not have permission to view this document."
                )

        response = supabase.storage.from_("student-documents").download(filename)

        ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
        content_types = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'txt': 'text/plain',
        }
        media_type = content_types.get(ext, 'application/octet-stream')

        # ✅ LOG SUCCESSFUL ACCESS (CCTV trail)
        log_audit_event(
            conn=conn, action="VIEW_DOC", entity="Document",
            entity_id=filename, changed_by=user_data.get("name", "Unknown"),
            details={"case_id": case_id, "media_type": media_type}
        )
        conn.commit()

        return Response(
            content=response,
            media_type=media_type,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "private, no-store, max-age=0",
                "X-Content-Type-Options": "nosniff",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[download] Error fetching {filename}: {e}")
        raise HTTPException(status_code=404, detail="Document not found in Cloud Vault.")
    finally:
        if conn:
            conn.close()


@app.post("/api/pipeline/{case_id}/verify-commission")
async def verify_commission(
    case_id: str,
    tuition: float = Form(...),
    commission_rate: float = Form(...),
    proof_document: UploadFile = File(...)
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
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE students SET status = 'COMPLETED', commission_earned = %s WHERE id = %s",
                        (commission, case_id)
                    )
                    conn.commit()
            except Exception as e:
                conn.rollback()
                raise HTTPException(status_code=500, detail="Database update error.")
            finally:
                conn.close()
            return {"status": "success", "verified": True, "message": "Deal closed.", "reason": result.get("reason")}
        else:
            return {"status": "error", "verified": False, "message": "Verification failed.", "reason": result.get("reason")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Verification system error.")


# =====================================================================
# --- 5. AI FEATURES ---
# =====================================================================
@app.post("/api/ai-strategy")
def get_ai_strategy(req: AIRequest, user_data: dict = Depends(verify_token)):
    """
    Generates a strategic placement report by:
    1. Fetching the student record
    2. Downloading ALL uploaded PDFs from Supabase (raw bytes + extracted text)
    3. Passing PDFs natively to Gemini so it can OCR scanned rapors with vision
    4. Grouping extracted text by category (Report Card, Profiling Test, Other)
    5. Combining with student's declared field_interests
    """
    conn = None
    try:
        conn = get_db_connection()

        # Fetch student
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, notes, documents, field_interests,
                       program_interest, country_interest, budget
                FROM students WHERE id = %s
            """, (req.case_id,))
            student = cur.fetchone()

        if not student:
            return {"status": "error", "report": "Student not found."}

        # Access check
        if not check_student_access(conn, str(student['id']), user_data):
            raise HTTPException(status_code=403, detail="Not authorized for this student.")

        # ---------- Parse documents JSONB ----------
        raw_docs = student.get('documents')
        if raw_docs is None:
            docs = []
        elif isinstance(raw_docs, str):
            try: docs = json.loads(raw_docs)
            except: docs = []
        elif isinstance(raw_docs, list):
            docs = raw_docs
        else:
            docs = []

        # ---------- Download PDFs and extract text ----------
        # KEY CHANGE: We now collect BOTH raw PDF bytes AND extracted text.
        # - Raw bytes → passed to Gemini for native vision (OCRs scanned rapors)
        # - Extracted text → supplementary context for fast-readable PDFs
        rapot_texts = []
        profiling_texts = []
        other_texts = []
        pdf_files_for_gemini = []  # list of (filename, raw_bytes) tuples

        if not supabase:
            print("[ai-strategy] WARNING: Supabase not configured; cannot extract PDFs.")

        for doc in docs:
            filename = doc.get('filename')
            if not filename or not filename.lower().endswith('.pdf'):
                continue
            if not supabase:
                continue

            try:
                file_bytes = supabase.storage.from_("student-documents").download(filename)
                if not file_bytes:
                    print(f"[ai-strategy] {filename} returned empty from Supabase")
                    continue

                # === STEP 1: Save raw bytes for Gemini's native vision ===
                # This is what fixes the scanned-rapor problem. Gemini will
                # OCR these PDFs directly even if PyPDF2 can't read them.
                doc_label = doc.get('title') or filename
                pdf_files_for_gemini.append((doc_label, file_bytes))

                # === STEP 2: ALSO try text extraction as supplementary context ===
                # This still works for text-based PDFs (typed/digital documents)
                # and helps Gemini cross-reference. For scanned rapors this
                # returns empty string — that's fine, vision handles it.
                pdf_text = ""
                try:
                    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                    pages = []
                    for page in reader.pages:
                        try:
                            t = page.extract_text() or ""
                            if t.strip():
                                pages.append(t)
                        except Exception:
                            continue
                    pdf_text = "\n".join(pages).strip()
                except Exception as text_err:
                    print(f"[ai-strategy] Text extraction failed for {filename} (likely a scanned PDF — Gemini vision will handle it): {text_err}")

                if not pdf_text:
                    print(f"[ai-strategy] {filename} had no extractable text (scanned PDF — vision will OCR it)")
                    # Don't skip — still classify so the section headers exist
                    pdf_text = f"[This document is a scanned PDF — see attached file '{doc_label}' for visual content]"

                # Classify by title/filename
                title = (doc.get('title') or '').upper()
                fname_upper = filename.upper()

                if ("REPORT CARD" in title or "RAPOT" in title or "RAPOR" in title or
                    "REPORT_CARD" in fname_upper or "RAPOT" in fname_upper or "RAPOR" in fname_upper):
                    rapot_texts.append(f"--- {doc_label} ---\n{pdf_text}")
                elif ("PROFILING" in title or "PSYCHOLOGY" in title or "PSIKOLOG" in title or
                      "HCC" in title or "PROFILING" in fname_upper or "PSYCHOLOGY" in fname_upper):
                    profiling_texts.append(f"--- {doc_label} ---\n{pdf_text}")
                else:
                    other_texts.append(f"--- {doc_label} ---\n{pdf_text}")

            except Exception as e:
                print(f"[ai-strategy] Download/extract failed for {filename}: {e}")
                continue

        # Combine extracted text into structured blob (supplementary)
        combined_parts = []
        if rapot_texts:
            combined_parts.append("========== REPORT CARDS (RAPOT) ==========\n" + "\n\n".join(rapot_texts))
        if profiling_texts:
            combined_parts.append("========== PROFILING TEST RESULTS ==========\n" + "\n\n".join(profiling_texts))
        if other_texts:
            combined_parts.append("========== OTHER DOCUMENTS ==========\n" + "\n\n".join(other_texts))

        combined_text = "\n\n".join(combined_parts) if combined_parts else "No PDF text extracted. Refer to attached PDF files directly."

        # ---------- Parse field_interests ----------
        field_interests_raw = student.get('field_interests')
        field_interests = []
        if field_interests_raw:
            if isinstance(field_interests_raw, str):
                try:
                    parsed = json.loads(field_interests_raw)
                    if isinstance(parsed, list):
                        field_interests = parsed
                    else:
                        field_interests = [str(parsed)]
                except Exception:
                    field_interests = [f.strip() for f in field_interests_raw.split(',') if f.strip()]
            elif isinstance(field_interests_raw, list):
                field_interests = field_interests_raw

        print(f"[ai-strategy] Student {student['name']} — "
              f"rapot files: {len(rapot_texts)}, profiling: {len(profiling_texts)}, "
              f"other: {len(other_texts)}, total PDFs sent to Gemini: {len(pdf_files_for_gemini)}, "
              f"interests: {field_interests}")

        # ---------- Generate report ----------
        try:
            raw_budget = student.get('budget') or ""
            premium_report = generate_strategic_report(
                student_name=student['name'],
                destination=student.get('country_interest') or "Global (AI Recommended)",
                budget=raw_budget,
                notes=student.get('notes') or "No notes provided.",
                pdf_data=combined_text,                # text fallback (supplementary)
                pdf_files=pdf_files_for_gemini,        # NEW: raw PDF bytes for native vision
                field_interests=field_interests,
                program_interest=student.get('program_interest') or ""
            )

            # Sprint A: persist report to DB so it survives dossier close/reopen
            try:
                with conn.cursor() as save_cur:
                    save_cur.execute("""
                        UPDATE students
                        SET ai_report = %s, ai_report_generated_at = NOW()
                        WHERE id = %s
                    """, (premium_report, req.case_id))
            except Exception as save_err:
                print(f"[ai-strategy] Could not save report: {save_err}")

            log_audit_event(
                conn=conn, action="AI_QUERY", entity="Student",
                entity_id=str(student['id']),
                changed_by=user_data.get("name", "Unknown"),
                details={
                    "rapot_files": len(rapot_texts),
                    "profiling_files": len(profiling_texts),
                    "other_files": len(other_texts),
                    "pdfs_sent_to_gemini": len(pdf_files_for_gemini),
                    "field_interests": field_interests
                }
            )
            conn.commit()

            return {
                "status": "success",
                "report": premium_report,
                "stats": {
                    "rapot_files": len(rapot_texts),
                    "profiling_files": len(profiling_texts),
                    "other_files": len(other_texts),
                    "pdfs_sent_to_gemini": len(pdf_files_for_gemini),
                    "field_interests": field_interests
                }
            }

        except Exception as e:
            print(f"[ai-strategy] AI generation error: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ai-strategy] FATAL: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.get("/api/pipeline/{case_id}/ai-report/pdf")
def download_ai_report_pdf(case_id: str, user_data: dict = Depends(verify_token)):
    """Generate a Fortrust-branded PDF — premium template with section title pages."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
        KeepTogether, Flowable
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from fastapi.responses import StreamingResponse
    import io, os, re
    from datetime import datetime

    conn = None
    try:
        conn = get_db_connection()
        if not check_student_access(conn, case_id, user_data):
            raise HTTPException(status_code=403, detail="Not authorized.")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, email, program_interest, country_interest,
                       ai_report, ai_report_generated_at
                FROM students WHERE id = %s
            """, (case_id,))
            student = cur.fetchone()

        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")
        if not student.get("ai_report"):
            raise HTTPException(
                status_code=404,
                detail="No AI report generated yet. Click 'Run AI Analysis' first."
            )

        # --- Fortrust brand palette ---
        NAVY = colors.HexColor("#282860")
        DARK_NAVY = colors.HexColor("#1b1b42")
        LIME = colors.HexColor("#BAD133")
        SLATE_700 = colors.HexColor("#334155")
        SLATE_500 = colors.HexColor("#64748b")
        SLATE_400 = colors.HexColor("#94a3b8")
        SLATE_100 = colors.HexColor("#f1f5f9")
        SLATE_50 = colors.HexColor("#f8fafc")
        SLATE_BORDER = colors.HexColor("#e2e8f0")
        BODY_DARK = colors.HexColor("#1e293b")

        # --- Locate logo ---
        logo_path = None
        here = os.path.dirname(os.path.abspath(__file__))
        for candidate in [
            "fortrust_logo.png", "fortrust_logo.jpg",
            "assets/fortrust_logo.png", "static/fortrust_logo.png",
        ]:
            full = os.path.join(here, candidate)
            if os.path.exists(full):
                logo_path = full
                break

        # =====================================================
        # PAGE DECORATIONS — header + footer on EVERY page
        # =====================================================
        def add_page_decorations(canv, doc):
            canv.saveState()
            page_w, page_h = A4

            # Logo top-left
            if logo_path:
                try:
                    canv.drawImage(
                        logo_path,
                        0.6 * inch, page_h - 0.95 * inch,
                        width=1.5 * inch, height=0.55 * inch,
                        preserveAspectRatio=True, mask='auto'
                    )
                except Exception as logo_err:
                    print(f"[pdf] logo draw failed: {logo_err}")

            # Title top-right
            canv.setFont("Helvetica-Bold", 13)
            canv.setFillColor(NAVY)
            canv.drawRightString(
                page_w - 0.6 * inch,
                page_h - 0.65 * inch,
                "FORTRUST ASSESSMENT REPORT"
            )

            # Footer page number
            canv.setFont("Helvetica", 8)
            canv.setFillColor(SLATE_400)
            canv.drawRightString(
                page_w - 0.6 * inch, 0.4 * inch,
                f"{doc.page}"
            )

            canv.restoreState()

        # =====================================================
        # DOCUMENT SETUP
        # =====================================================
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=0.6 * inch, rightMargin=0.6 * inch,
            topMargin=1.1 * inch, bottomMargin=0.6 * inch,
            title=f"Fortrust Assessment - {student['name']}",
            author="Fortrust Education Services"
        )

        styles = getSampleStyleSheet()

        # --- Custom paragraph styles ---
        section_title_style = ParagraphStyle(
            'SectionTitle', parent=styles['Normal'],
            fontSize=14, textColor=NAVY, fontName='Helvetica-Bold',
            spaceAfter=8, spaceBefore=14, leading=18,
            alignment=TA_LEFT
        )
        subsection_style = ParagraphStyle(
            'SubSection', parent=styles['Normal'],
            fontSize=11, textColor=DARK_NAVY, fontName='Helvetica-Bold',
            spaceAfter=6, spaceBefore=10, leading=14,
            alignment=TA_LEFT
        )
        body_style = ParagraphStyle(
            'Body', parent=styles['Normal'],
            fontSize=10, textColor=BODY_DARK,
            spaceAfter=6, leading=14, fontName='Helvetica',
            alignment=TA_LEFT  # NOT justified — avoids ugly word gaps
        )
        bullet_style = ParagraphStyle(
            'Bullet', parent=body_style,
            leftIndent=22, bulletIndent=10, spaceAfter=4, leading=14
        )
        table_cell = ParagraphStyle(
            'TableCell', parent=styles['Normal'],
            fontSize=9, textColor=BODY_DARK,
            leading=12, fontName='Helvetica', alignment=TA_LEFT
        )
        table_cell_bold = ParagraphStyle(
            'TableCellBold', parent=styles['Normal'],
            fontSize=9, textColor=NAVY,
            leading=12, fontName='Helvetica-Bold', alignment=TA_LEFT
        )
        table_header_white = ParagraphStyle(
            'TableHdrWhite', parent=styles['Normal'],
            fontSize=9, textColor=colors.white,
            leading=12, fontName='Helvetica-Bold', alignment=TA_LEFT
        )

        # Title page styles
        title_page_label = ParagraphStyle(
            'TPLabel', parent=styles['Normal'],
            fontSize=10, textColor=SLATE_500, fontName='Helvetica',
            alignment=TA_CENTER, spaceAfter=6
        )
        title_page_heading = ParagraphStyle(
            'TPHeading', parent=styles['Normal'],
            fontSize=28, textColor=NAVY, fontName='Helvetica-Bold',
            alignment=TA_CENTER, leading=34, spaceAfter=12
        )

        # =====================================================
        # MARKDOWN PARSING HELPERS
        # =====================================================
        def process_inline(text):
            """Convert **bold**, *italic*, `code` and escape XML."""
            text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
            text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<i>\1</i>', text)
            text = re.sub(r'`([^`]+)`', r'<font face="Courier" color="#1b1b42">\1</font>', text)
            return text

        def parse_table_row(line):
            line = line.strip()
            if line.startswith('|'):
                line = line[1:]
            if line.endswith('|'):
                line = line[:-1]
            return [c.strip() for c in line.split('|')]

        def is_table_separator(line):
            stripped = line.strip()
            if not stripped or '|' not in stripped:
                return False
            content = stripped.replace('|', '').replace(' ', '')
            if not content:
                return False
            return all(c in '-:' for c in content)

        def is_table_row(line):
            stripped = line.strip()
            return stripped.count('|') >= 2 and not is_table_separator(stripped)

        def build_table(header_cells, body_rows, col_count):
            """Branded table — navy header, alternating slate-50 row bg, slate borders."""
            if col_count == 0:
                return None

            def normalize(row):
                return (row + [''] * col_count)[:col_count]

            data = []
            has_header = len(header_cells) > 0 and any(c.strip() for c in header_cells)

            if has_header:
                data.append([
                    Paragraph(process_inline(c) or '&nbsp;', table_header_white)
                    for c in normalize(header_cells)
                ])

            for row_idx, row in enumerate(body_rows):
                # First column: bold navy (label column like reference)
                cells = []
                for col_idx, c in enumerate(normalize(row)):
                    if col_idx == 0 and has_header:
                        cells.append(Paragraph(process_inline(c) or '&nbsp;', table_cell_bold))
                    else:
                        cells.append(Paragraph(process_inline(c) or '&nbsp;', table_cell))
                data.append(cells)

            if not data:
                return None

            # Distribute widths: first col narrower if header, otherwise equal
            available_width = 7.2 * inch
            if has_header and col_count >= 3:
                first_w = available_width * 0.18
                remaining = (available_width - first_w) / (col_count - 1)
                col_widths = [first_w] + [remaining] * (col_count - 1)
            else:
                col_widths = [available_width / col_count] * col_count

            tbl = Table(data, colWidths=col_widths, repeatRows=1 if has_header else 0)

            style_cmds = [
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, SLATE_BORDER),
            ]

            if has_header:
                style_cmds.extend([
                    ('BACKGROUND', (0, 0), (-1, 0), NAVY),
                    ('TOPPADDING', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ])
                # Zebra striping body rows
                for i in range(1, len(data)):
                    if i % 2 == 0:
                        style_cmds.append(('BACKGROUND', (0, i), (-1, i), SLATE_50))
            else:
                for i in range(len(data)):
                    if i % 2 == 1:
                        style_cmds.append(('BACKGROUND', (0, i), (-1, i), SLATE_50))

            tbl.setStyle(TableStyle(style_cmds))
            return tbl

        # =====================================================
        # SECTION TITLE PAGE BUILDER
        # Shows: Name + (optional Country) card, big section heading, lime underline.
        # =====================================================
        def make_section_title_page(section_title, show_country=False):
            """Returns a list of flowables for a section divider page."""
            elements = [Spacer(1, 1.2 * inch)]

            # Student card (matches the reference's "NAME / REPORT SOURCE" card)
            student_name = (student.get('name') or 'Student').upper()
            label_left_col = "NAME"
            value_left = student_name

            if show_country:
                country_val = (student.get('country_interest') or 'Global').upper()
                info_data = [
                    [label_left_col, value_left],
                    ["CHOICE of COUNTRY", country_val],
                ]
            else:
                info_data = [
                    [label_left_col, value_left],
                    ["REPORT SOURCE", "FORTRUST AI STRATEGIC ENGINE"],
                ]

            info_table = Table(info_data, colWidths=[1.9 * inch, 5.3 * inch])
            info_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), SLATE_100),
                ('TEXTCOLOR', (0, 0), (0, -1), NAVY),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('TEXTCOLOR', (1, 0), (1, -1), BODY_DARK),
                ('LEFTPADDING', (0, 0), (-1, -1), 14),
                ('RIGHTPADDING', (0, 0), (-1, -1), 14),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 0.5, SLATE_BORDER),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(info_table)

            elements.append(Spacer(1, 1.5 * inch))

            # Big centered title with lime underline
            elements.append(Paragraph(section_title.upper(), title_page_heading))

            # Lime accent underline drawn as a colored table-line
            accent_data = [['']]
            accent = Table(accent_data, colWidths=[3.0 * inch], rowHeights=[6])
            accent.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), LIME),
                ('LINEABOVE', (0, 0), (-1, 0), 0, LIME),
                ('LINEBELOW', (0, 0), (-1, 0), 0, LIME),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))

            # Wrap accent in centering table
            centering = Table([[accent]], colWidths=[7.2 * inch])
            centering.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            elements.append(centering)

            elements.append(PageBreak())
            return elements

        # =====================================================
        # SECTION SPLITTER
        # Detect "## Major Section" headings and break the report into chunks.
        # Insert title pages before the BIG four.
        # =====================================================
        BIG_SECTIONS_KEYWORDS = {
            "top 3 recommended": ("Top 3 Recommended Majors", False),
            "recommended university majors": ("Top 3 Recommended Majors", False),
            "5-year development": ("5 Year Development Map", False),
            "5 year development": ("5 Year Development Map", False),
            "development roadmap": ("5 Year Development Map", False),
            "city & university": ("City & University Matching", True),
            "city and university": ("City & University Matching", True),
            "university matching": ("City & University Matching", True),
            "budget-optimized": ("The Budget-Optimized Strategy", True),
            "budget optimized": ("The Budget-Optimized Strategy", True),
        }

        def matches_big_section(heading_text):
            """Return (title, show_country) if heading is a BIG section, else None."""
            lower = heading_text.lower()
            for kw, info in BIG_SECTIONS_KEYWORDS.items():
                if kw in lower:
                    return info
            return None

        # =====================================================
        # MAIN MARKDOWN RENDERER
        # =====================================================
        def render_markdown(text):
            elements = []
            lines = (text or "").split("\n")
            current_bullets = []
            i = 0
            seen_big_sections = set()  # don't repeat the same title page

            def flush_bullets():
                if current_bullets:
                    for b in current_bullets:
                        elements.append(Paragraph(
                            f'<font color="#282860">●</font>&nbsp;&nbsp;{b}',
                            bullet_style
                        ))
                    current_bullets.clear()

            while i < len(lines):
                line = lines[i].rstrip()
                stripped = line.strip()

                # === TABLE DETECTION ===
                if is_table_row(line):
                    if i + 1 < len(lines) and is_table_separator(lines[i + 1]):
                        # Standard table with header
                        header_cells = parse_table_row(line)
                        col_count = len(header_cells)
                        i += 2
                        body_rows = []
                        while i < len(lines) and is_table_row(lines[i]):
                            body_rows.append(parse_table_row(lines[i]))
                            i += 1
                        flush_bullets()
                        tbl = build_table(header_cells, body_rows, col_count)
                        if tbl:
                            elements.append(Spacer(1, 6))
                            elements.append(tbl)
                            elements.append(Spacer(1, 10))
                        continue
                    else:
                        # Headerless table — only treat as table if 2+ consecutive rows
                        peek_count = 0
                        j = i
                        while j < len(lines) and is_table_row(lines[j]):
                            peek_count += 1
                            j += 1
                        if peek_count >= 2:
                            first_row = parse_table_row(line)
                            col_count = len(first_row)
                            body_rows = [first_row]
                            i += 1
                            while i < len(lines) and is_table_row(lines[i]):
                                body_rows.append(parse_table_row(lines[i]))
                                i += 1
                            flush_bullets()
                            tbl = build_table([], body_rows, col_count)
                            if tbl:
                                elements.append(Spacer(1, 6))
                                elements.append(tbl)
                                elements.append(Spacer(1, 10))
                            continue

                # === BLANK LINE ===
                if not stripped:
                    flush_bullets()
                    elements.append(Spacer(1, 4))
                    i += 1
                    continue

                # === HEADINGS — H2 (##) ===
                if line.startswith("## "):
                    flush_bullets()
                    heading_text = line[3:].strip()

                    # Is this a BIG section? Insert a title page first.
                    big = matches_big_section(heading_text)
                    if big and big[0] not in seen_big_sections:
                        seen_big_sections.add(big[0])
                        title_text, show_country = big
                        # Add page break before, then the title page block
                        elements.append(PageBreak())
                        elements.extend(make_section_title_page(title_text, show_country))
                        # Skip the H2 itself — the title page already covered it
                        i += 1
                        continue
                    else:
                        elements.append(Paragraph(process_inline(heading_text), section_title_style))
                        i += 1
                        continue

                # === HEADINGS — H3 (###) ===
                if line.startswith("### "):
                    flush_bullets()
                    elements.append(Paragraph(process_inline(line[4:]), subsection_style))
                    i += 1
                    continue

                # === H1 (#) ===
                if line.startswith("# "):
                    flush_bullets()
                    elements.append(Paragraph(process_inline(line[2:]), section_title_style))
                    i += 1
                    continue

                # === Bold-only line as heading ===
                if re.match(r'^\*\*[^*]+\*\*\s*$', line):
                    flush_bullets()
                    elements.append(Paragraph(line.strip("* ").strip(), subsection_style))
                    i += 1
                    continue

                # === BULLETS ===
                if stripped.startswith(("- ", "* ", "• ")):
                    current_bullets.append(process_inline(stripped[2:].strip()))
                    i += 1
                    continue

                # === NUMBERED LISTS ===
                num_match = re.match(r'^\s*(\d+)\.\s+(.+)', line)
                if num_match:
                    flush_bullets()
                    elements.append(Paragraph(
                        f'<font color="#282860"><b>{num_match.group(1)}.</b></font>&nbsp;&nbsp;{process_inline(num_match.group(2))}',
                        bullet_style
                    ))
                    i += 1
                    continue

                # === DEFAULT PARAGRAPH ===
                flush_bullets()
                elements.append(Paragraph(process_inline(line), body_style))
                i += 1

            flush_bullets()
            return elements

        # =====================================================
        # ASSEMBLE THE STORY
        # =====================================================
        story = []

        # --- COVER / EXECUTIVE INFO PAGE ---
        story.append(Spacer(1, 0.2 * inch))

        gen_dt = student.get('ai_report_generated_at')
        gen_str = gen_dt.strftime('%d %B %Y, %H:%M') if gen_dt else datetime.now().strftime('%d %B %Y, %H:%M')

        cover_data = [
            ["NAME", (student.get('name') or 'Unknown Student').upper()],
            ["REPORT SOURCE", "FORTRUST AI STRATEGIC ENGINE"],
            ["GENERATED", gen_str],
            ["PROGRAM INTEREST", student.get('program_interest') or "Not specified"],
            ["CHOICE OF COUNTRY", (student.get('country_interest') or "Global (AI Recommended)").upper()],
        ]
        cover_table = Table(cover_data, colWidths=[1.9 * inch, 5.3 * inch])
        cover_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), SLATE_100),
            ('TEXTCOLOR', (0, 0), (0, -1), NAVY),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (1, 0), (1, -1), BODY_DARK),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('RIGHTPADDING', (0, 0), (-1, -1), 14),
            ('TOPPADDING', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 0.5, SLATE_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(cover_table)
        story.append(Spacer(1, 0.3 * inch))

        # --- RENDER THE REPORT BODY ---
        story.extend(render_markdown(student['ai_report']))

        # =====================================================
        # BUILD PDF
        # =====================================================
        doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
        buffer.seek(0)

        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', student.get('name') or 'student')
        filename = f"Fortrust_Report_{safe_name}.pdf"

        try:
            log_audit_event(
                conn=conn, action="DOWNLOAD_AI_PDF", entity="Student",
                entity_id=case_id, changed_by=user_data.get("name", "Unknown"),
                details={"filename": filename}
            )
            conn.commit()
        except Exception:
            pass

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
    finally:
        if conn:
            conn.close()

# =====================================================================
# --- 6. MARKETING MODULE ---
# =====================================================================
@app.post("/api/marketing/leads")
async def create_marketing_lead(
    name: str = Form(...),
    email: str = Form(...),
    wa_number: str = Form(""),
    program_interest: str = Form(""),
    lead_source: str = Form(""),
):
    score = 0
    if wa_number.strip():
        score += 1
    if program_interest.strip():
        score += 2
    temperature = "Hot Leads" if score >= 3 else "Warm Leads" if score >= 1 else "Cold Leads"

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
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
        conn.close()


@app.post("/api/bulk-upload")
async def bulk_upload_leads(
    file: UploadFile = File(...),
    user_data: dict = Depends(verify_token)
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid format. Please upload a .csv or .xlsx file.")

    conn = get_db_connection()
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        df = df.fillna("")
        df.columns = [str(c).strip().lower() for c in df.columns]

        if 'name' not in df.columns:
            raise HTTPException(status_code=400, detail="The spreadsheet must contain a column titled 'name'.")

        success_count = 0
        agent_name = user_data.get("name", "Unknown System")

        with conn.cursor() as cur:
            for index, row in df.iterrows():
                name = row.get("name", "Unknown Lead")
                if not name:
                    continue

                email = row.get("email", "")
                phone = str(row.get("phone", ""))
                program_interest = row.get("program", "")

                cur.execute("""
                    INSERT INTO students 
                    (name, email, phone, program_interest, assignee, status, lead_source)
                    VALUES (%s, %s, %s, %s, %s, 'NEW LEAD', 'Bulk Excel Upload')
                """, (name, email, phone, program_interest, agent_name))

                success_count += 1

            cur.execute("""
                INSERT INTO audit_logs (entity, action, changed_by, details)
                VALUES (%s, 'CREATE', %s, %s)
            """, ("Bulk Leads", agent_name, f'{{"amount_imported": {success_count}}}'))

            conn.commit()

        return {"status": "success", "message": f"Successfully imported {success_count} new leads."}

    except Exception as e:
        if conn:
            conn.rollback()
        print("CRITICAL BULK UPLOAD CRASH:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process file. Ensure columns are named correctly. Error: {str(e)}")
    finally:
        if conn:
            conn.close()


# =====================================================================
# --- 7. PASSWORD RESET ---
# =====================================================================
@app.post("/api/auth/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    secret_key = os.getenv("JWT_SECRET", "fallback-secret-key-change-me")
    expiration = datetime.utcnow() + timedelta(hours=1)
    reset_token = jwt.encode(
        {"sub": request.email, "exp": expiration.timestamp()},
        secret_key,
        algorithm="HS256"
    )
    frontend_url = "https://fortrust-ado.vercel.app"
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    sg_api_key = os.getenv("SENDGRID_API_KEY")
    sg_from_email = os.getenv("SENDGRID_FROM_EMAIL")
    if not sg_api_key or not sg_from_email:
        raise HTTPException(status_code=500, detail="SendGrid keys are missing on the server.")

    headers = {"Authorization": f"Bearer {sg_api_key}", "Content-Type": "application/json"}
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
    response = requests.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers)
    if response.status_code >= 400:
        print("SendGrid Error:", response.text)
        raise HTTPException(status_code=500, detail="Failed to send email.")
    return {"status": "success", "message": "Password reset email sent!"}


@app.post("/api/auth/reset-password")
def execute_reset_password(request: ResetPasswordRequest):
    try:
        secret_key = os.getenv("JWT_SECRET", "fallback-secret-key-change-me")
        payload = jwt.decode(request.token, secret_key, algorithms=["HS256"])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid security token.")

        hashed_password = bcrypt.hashpw(
            request.new_password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')

        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET password = %s WHERE email = %s", (hashed_password, email))
                if cur.rowcount == 0:
                    conn.rollback()
                    raise HTTPException(status_code=404, detail="User not found in the database.")
                conn.commit()
                return {"status": "success", "message": "Password updated successfully."}
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid or corrupted security token.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error while saving new password.")


# =====================================================================
# --- 8. STUDENT CRM ---
# =====================================================================
@app.post("/api/students", dependencies=[Depends(get_current_user)])
def create_student(student: StudentCreate):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO students (name, email, phone, assignee, status, program_interest, lead_source, lead_temperature, budget)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (
                student.name, student.email, student.phone, student.assignee,
                student.status, student.program_interest, student.lead_source, student.lead_temperature, student.budget
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "success", "message": "Student lead created successfully.", "student_id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()


@app.get("/api/students", dependencies=[Depends(get_current_user)])
def get_all_students():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, email, phone, assignee, status, lead_temperature, program_interest, budget, created_at
                FROM students ORDER BY created_at DESC
            """)
            return {"status": "success", "data": cur.fetchall()}
    finally:
        conn.close()


@app.put("/api/students/{student_id}")
def update_student(student_id: int, student: StudentUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. Fetch old values for comparison
            cur.execute("""
                SELECT academic_field, career_goal, campus_env, country_interest,
                       father_name, father_email, father_whatsapp,
                       mother_name, mother_email, mother_whatsapp,
                       assignee, assignees
                FROM students WHERE id = %s
            """, (student_id,))
            old_profile = cur.fetchone()
            
            # 2. Process updates
            data = student.dict(exclude_unset=True)
            if not data:
                raise HTTPException(status_code=400, detail="No data provided to update.")

            # === MULTI-ASSIGNEE HANDLING ===
            # If assignees array is provided, sync the legacy assignee field with the FIRST entry
            # This keeps backward compatibility with everything reading from `assignee`
            if "assignees" in data:
                assignees_list = data.get("assignees") or []
                # Clean: remove empties and dupes while preserving order
                seen = set()
                clean_list = []
                for a in assignees_list:
                    if a and a.strip() and a not in seen:
                        seen.add(a)
                        clean_list.append(a.strip())
                data["assignees"] = clean_list
                # Sync primary
                data["assignee"] = clean_list[0] if clean_list else "Unassigned"

            # If only legacy assignee was provided, mirror it into assignees too
            elif "assignee" in data and data.get("assignee"):
                single = data["assignee"]
                if single and single != "Unassigned":
                    data["assignees"] = [single]
                else:
                    data["assignees"] = []

            # Build the UPDATE statement, casting assignees to jsonb
            updates = []
            params = []
            for k, v in data.items():
                if k == "assignees":
                    updates.append(f"{k} = %s::jsonb")
                    params.append(json.dumps(v))
                else:
                    updates.append(f"{k} = %s")
                    params.append(v)
            params.append(student_id)

            cur.execute(f"UPDATE students SET {', '.join(updates)} WHERE id = %s", tuple(params))
            if cur.rowcount == 0:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Student not found.")

            # 3. Log system activity messages to chat
            user_name = current_user.get("name", "Unknown")
            academic_profile_updated = False
            parent_profile_updated = False
            campus_env_changed = False
            country_interest_changed = False
            assignees_changed = False
            new_campus_env = ""
            new_country_interest = ""
            new_assignees_pretty = ""

            if old_profile:
                old_acad_field, old_career_goal, old_campus_env, old_country_interest, \
                old_f_name, old_f_email, old_f_whatsapp, \
                old_m_name, old_m_email, old_m_whatsapp, \
                old_assignee, old_assignees_raw = old_profile

                # Normalize old assignees
                if old_assignees_raw is None:
                    old_assignees = []
                elif isinstance(old_assignees_raw, list):
                    old_assignees = old_assignees_raw
                elif isinstance(old_assignees_raw, str):
                    try: old_assignees = json.loads(old_assignees_raw)
                    except: old_assignees = []
                else:
                    old_assignees = []

                # Check assignee change
                if "assignees" in data:
                    new_set = set(data["assignees"])
                    old_set = set(old_assignees)
                    if new_set != old_set:
                        assignees_changed = True
                        new_assignees_pretty = ", ".join(data["assignees"]) if data["assignees"] else "Unassigned"

                if (student.academic_field is not None and student.academic_field != old_acad_field) or \
                   (student.career_goal is not None and student.career_goal != old_career_goal):
                    academic_profile_updated = True

                if student.campus_env is not None and student.campus_env != old_campus_env:
                    campus_env_changed = True
                    new_campus_env = student.campus_env

                if student.country_interest is not None and student.country_interest != old_country_interest:
                    country_interest_changed = True
                    new_country_interest = student.country_interest

                if (student.father_name is not None and student.father_name != old_f_name) or \
                   (student.father_email is not None and student.father_email != old_f_email) or \
                   (student.father_whatsapp is not None and student.father_whatsapp != old_f_whatsapp) or \
                   (student.mother_name is not None and student.mother_name != old_m_name) or \
                   (student.mother_email is not None and student.mother_email != old_m_email) or \
                   (student.mother_whatsapp is not None and student.mother_whatsapp != old_m_whatsapp):
                    parent_profile_updated = True

            # System messages
            if assignees_changed:
                cur.execute("""
                    INSERT INTO chat_messages (student_id, sender, message, is_system)
                    VALUES (%s, 'System', %s, TRUE)
                """, (student_id, f"{user_name} updated assignees to: {new_assignees_pretty}"))

            if academic_profile_updated:
                cur.execute("""
                    INSERT INTO chat_messages (student_id, sender, message, is_system)
                    VALUES (%s, 'System', %s, TRUE)
                """, (student_id, f"{user_name} updated Academic Profile"))

            if campus_env_changed:
                cur.execute("""
                    INSERT INTO chat_messages (student_id, sender, message, is_system)
                    VALUES (%s, 'System', %s, TRUE)
                """, (student_id, f"{user_name} changed Preferred Campus Environment to {new_campus_env}"))

            if country_interest_changed:
                cur.execute("""
                    INSERT INTO chat_messages (student_id, sender, message, is_system)
                    VALUES (%s, 'System', %s, TRUE)
                """, (student_id, f"{user_name} set Preferred Study Destination to {new_country_interest}"))

            if parent_profile_updated:
                cur.execute("""
                    INSERT INTO chat_messages (student_id, sender, message, is_system)
                    VALUES (%s, 'System', %s, TRUE)
                """, (student_id, f"{user_name} updated Parent Profile"))

            conn.commit()
            return {"status": "success", "message": "Student updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()


@app.delete("/api/students/{student_id}", dependencies=[Depends(get_current_master_admin)])
def delete_student(student_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM students WHERE id = %s", (student_id,))
            if cur.rowcount == 0:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Student not found.")
            conn.commit()
            return {"status": "success", "message": "Student deleted."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

# =====================================================================
# --- MULTI-ASSIGNEE: ARCHIVE FLOW HELPERS ---
# =====================================================================
@app.get("/api/agents/{agent_name}/students")
def get_agent_students(
    agent_name: str, 
    include_inactive: bool = True,
    user_data: dict = Depends(verify_token)
):
    """
    Return all students assigned to this agent (single assignee or multi-assignee).
    
    - Master Admin: sees any agent's students
    - Agents: can only see their own students (security guard)
    - include_inactive=true (default): returns ALL students including completed/archived
    - include_inactive=false: only active pipeline (use for reassign-on-archive modal)
    """
    # Security: agents can only query their own name
    if user_data.get("role") != "MASTER_ADMIN":
        if user_data.get("name") != agent_name:
            raise HTTPException(
                status_code=403, 
                detail="You can only view your own assigned students."
            )

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if include_inactive:
                cur.execute("""
                    SELECT id, name, email, phone, status, lead_temperature, 
                           assignee, assignees, program_interest, country_interest,
                           budget, archive_reason, created_at, updated_at
                    FROM students
                    WHERE (
                        assignee = %s
                        OR assignees @> %s::jsonb
                    )
                    ORDER BY 
                        CASE 
                            WHEN UPPER(COALESCE(status, '')) IN ('COMPLETED', 'REJECTED', 'ARCHIVED') THEN 1
                            ELSE 0
                        END,
                        updated_at DESC NULLS LAST
                """, (agent_name, json.dumps([agent_name])))
            else:
                # Active only — used by the archive-agent reassign flow
                cur.execute("""
                    SELECT id, name, email, phone, status, lead_temperature,
                           assignee, assignees, program_interest, country_interest,
                           budget
                    FROM students
                    WHERE (
                        assignee = %s
                        OR assignees @> %s::jsonb
                    )
                    AND UPPER(COALESCE(status, '')) NOT IN ('COMPLETED', 'REJECTED', 'ARCHIVED')
                    ORDER BY name ASC
                """, (agent_name, json.dumps([agent_name])))
            
            students = cur.fetchall()
            for s in students:
                s['id'] = str(s['id'])
                if s.get('assignees') is None:
                    s['assignees'] = []
            return {"status": "success", "data": students, "count": len(students)}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


class ReassignBulkRequest(BaseModel):
    from_agent: str
    to_agent: str
    student_ids: Optional[List[str]] = None  # If None → reassign ALL students from this agent
    mode: Optional[str] = "replace"  # "replace" = swap; "remove_only" = just drop from_agent (multi-assignee case)


@app.post("/api/admin/reassign-students", dependencies=[Depends(get_current_master_admin)])
def reassign_students_bulk(req: ReassignBulkRequest, user_data: dict = Depends(verify_token)):
    """
    Bulk-reassign students from one agent to another.
    - mode='replace': remove from_agent from each student's assignees, add to_agent
    - mode='remove_only': just remove from_agent (used when student already has other assignees)
    """
    conn = get_db_connection()
    actor = user_data.get("name", "Master Admin")
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get the students to update
            if req.student_ids:
                # Use specific list
                cur.execute("""
                    SELECT id, name, assignee, assignees FROM students
                    WHERE id::text = ANY(%s)
                """, ([str(i) for i in req.student_ids],))
            else:
                # Get ALL active students of this agent
                cur.execute("""
                    SELECT id, name, assignee, assignees FROM students
                    WHERE (assignee = %s OR assignees @> %s::jsonb)
                      AND UPPER(COALESCE(status, '')) NOT IN ('COMPLETED', 'REJECTED', 'ARCHIVED')
                """, (req.from_agent, json.dumps([req.from_agent])))
            
            students = cur.fetchall()
            updated_count = 0

            for s in students:
                # Normalize current assignees
                current_assignees_raw = s.get('assignees')
                if current_assignees_raw is None:
                    current_assignees = []
                elif isinstance(current_assignees_raw, list):
                    current_assignees = list(current_assignees_raw)
                elif isinstance(current_assignees_raw, str):
                    try: current_assignees = json.loads(current_assignees_raw)
                    except: current_assignees = []
                else:
                    current_assignees = []

                # If legacy single field has a value not in the array, include it
                old_single = s.get('assignee')
                if old_single and old_single != 'Unassigned' and old_single not in current_assignees:
                    current_assignees.insert(0, old_single)

                # Remove from_agent
                new_assignees = [a for a in current_assignees if a != req.from_agent]

                # Replace mode: add to_agent if not present and not "Unassigned"
                if req.mode == "replace" and req.to_agent and req.to_agent != "Unassigned":
                    if req.to_agent not in new_assignees:
                        new_assignees.append(req.to_agent)

                # New primary = first in array
                new_primary = new_assignees[0] if new_assignees else "Unassigned"

                cur.execute("""
                    UPDATE students
                    SET assignee = %s, assignees = %s::jsonb
                    WHERE id = %s
                """, (new_primary, json.dumps(new_assignees), s['id']))

                # Timeline note
                if req.mode == "replace":
                    note_msg = f"Reassigned by {actor}: {req.from_agent} → {req.to_agent}"
                else:
                    note_msg = f"Assignee removed by {actor}: {req.from_agent}"

                timeline_note = {
                    "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "author": actor,
                    "note": note_msg
                }
                cur.execute("""
                    UPDATE students 
                    SET timeline = COALESCE(timeline, '[]'::jsonb) || %s::jsonb 
                    WHERE id = %s
                """, (json.dumps([timeline_note]), s['id']))

                # Chat system message
                try:
                    cur.execute("""
                        INSERT INTO chat_messages (student_id, sender, message, is_system)
                        VALUES (%s, 'System', %s, TRUE)
                    """, (s['id'], note_msg))
                except Exception:
                    pass

                updated_count += 1

            log_audit_event(
                conn=conn, action="BULK_REASSIGN", entity="System",
                entity_id=req.from_agent, changed_by=actor,
                details={
                    "from": req.from_agent,
                    "to": req.to_agent,
                    "mode": req.mode,
                    "count": updated_count
                }
            )
            conn.commit()

            return {
                "status": "success",
                "message": f"Reassigned {updated_count} student(s) from {req.from_agent} to {req.to_agent}.",
                "updated_count": updated_count
            }
    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# =====================================================================
# --- 9. NETWORK DIRECTORY & INSTITUTIONS ---
# =====================================================================
@app.get("/api/institutions")
def get_institutions(user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM institutions ORDER BY name ASC")
            return {"status": "success", "data": cur.fetchall()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/api/institutions")
def create_institution(inst: dict, user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO institutions (name, type, country, city, status, website, base_commission, agreement_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (
                inst.get('name', 'New Institution'),
                inst.get('type', ''),
                inst.get('country', ''),
                inst.get('city', ''),
                inst.get('status', 'Active'),
                inst.get('website', ''),
                inst.get('base_commission', ''),
                inst.get('agreement_type', ''),
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "success", "message": "Institution created", "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.put("/api/institutions/{inst_id}")
def update_institution(inst_id: int, inst: InstitutionUpdate, user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            data = inst.dict(exclude_unset=True)
            if not data:
                return {"status": "success"}
            updates = []
            params = []
            for field, value in data.items():
                if field in ('contacts', 'commission_programs'):
                    updates.append(f"{field} = %s::jsonb")
                    params.append(json.dumps(value or []))
                elif value == "" or value is None:
                    updates.append(f"{field} = NULL")
                else:
                    updates.append(f"{field} = %s")
                    params.append(value)
            params.append(inst_id)
            cur.execute(f"UPDATE institutions SET {', '.join(updates)} WHERE id = %s", tuple(params))
            conn.commit()
            return {"status": "success", "message": "Institution updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/api/institutions/{inst_id}")
def delete_institution(inst_id: int, user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM institutions WHERE id = %s", (inst_id,))
            if cur.rowcount == 0:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Institution not found.")
            conn.commit()
            return {"status": "success", "message": "Institution deleted."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# =====================================================================
# --- 10. AI CONTRACT EXTRACTOR ---
# =====================================================================
 
MAX_AGREEMENT_CHARS = 80000  # ~80K chars, safe for Gemini 2.5 Flash
 
 
@app.post("/api/admin/extract-commission")
async def extract_commission_agreement(contracts: List[UploadFile] = File(...)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")

    if not contracts or len(contracts) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    if len(contracts) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 files allowed at once.")

    # --- 1. Read ALL PDFs and combine into one labeled text block ---
    combined_sections = []
    
    for file_idx, contract in enumerate(contracts):
        try:
            if not contract.filename or not contract.filename.lower().endswith('.pdf'):
                raise HTTPException(status_code=400, detail=f"File '{contract.filename}' is not a PDF.")

            content = await contract.read()
            if not content:
                continue  # Skip empty files

            reader = PyPDF2.PdfReader(io.BytesIO(content))
            pages = []
            for i, page in enumerate(reader.pages):
                try:
                    t = page.extract_text() or ""
                    if t.strip():
                        pages.append(f"\n--- PAGE {i+1} ---\n{t}")
                except Exception as pe:
                    print(f"[extract-commission] {contract.filename} page {i+1} skipped: {pe}")
                    continue

            file_text = "\n".join(pages).strip()
            if not file_text:
                print(f"[extract-commission] {contract.filename} had no extractable text, skipping.")
                continue

            # Label each file clearly so the AI knows which one is which
            section_header = f"""
================================================================
FILE {file_idx + 1} of {len(contracts)}: {contract.filename}
================================================================
"""
            combined_sections.append(section_header + file_text)

        except HTTPException:
            raise
        except Exception as e:
            print(f"[extract-commission] Failed reading {contract.filename}: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=400, detail=f"Could not read PDF '{contract.filename}': {str(e)}")

    if not combined_sections:
        raise HTTPException(
            status_code=400,
            detail="None of the uploaded files contained extractable text. PDFs may be scanned/image-only."
        )

    extracted_text = "\n\n".join(combined_sections)

    # Cap total text size to avoid hitting Gemini token limits
    MAX_COMBINED_CHARS = 200000  # ~50k tokens, well under Gemini Flash limits
    if len(extracted_text) > MAX_COMBINED_CHARS:
        extracted_text = extracted_text[:MAX_COMBINED_CHARS] + "\n\n[...truncated due to length...]"

    file_count = len(combined_sections)
    file_list = ", ".join([c.filename for c in contracts if c.filename])

    # --- 2. Build the multi-file extraction prompt ---
    prompt = f"""You are a senior contract analyst at Fortrust Education Services.
You are extracting structured data from a University/College partnership/commission agreement that may span MULTIPLE FILES (original agreement + variation letters / amendments / addendums).

# DOCUMENTS PROVIDED
You have been given {file_count} file(s): {file_list}
Each file is clearly labeled with "FILE N of M" headers in the text below.

# CRITICAL MULTI-FILE STRATEGY

When multiple files are provided, follow these rules:

1. **Identify each document's role.** Look at each file's content and decide:
   - Is it the ORIGINAL master agreement?
   - Is it a VARIATION LETTER / AMENDMENT / ADDENDUM that modifies the original?
   - Is it a RENEWAL replacing an older agreement?

2. **Find dates.** Locate the signing/effective date in EACH file. Variations/amendments will typically be signed AFTER the original.

3. **Latest-by-date wins for conflicts.** If File A (signed 2021) says base commission is 10% and File B (signed 2024) says it's 12%, the FINAL extracted state should reflect 12% — because File B is more recent and supersedes the older clause.

4. **Merge non-conflicting clauses.** If the original specifies Bachelor commission and a variation adds a new "English Pathway" program, BOTH should appear in the final commission_programs array.

5. **Track amendment history in terms_conditions.** Always note: "[Original dated YYYY-MM-DD; amended by variation dated YYYY-MM-DD which changed X to Y]" so Mami can see what was overridden.

6. **For dates fields:**
   - `duration_start` = effective start of the CURRENT (post-amendment) agreement
   - `duration_end` = end date as modified by the LATEST amendment (if variations extended it, use the extended date)

# DOCUMENT TEXT
    {extracted_text}

# FAIL-SAFE CHECK
If NONE of the documents are partnership/commission agreements (e.g., all are invoices, brochures, transcripts), return EXACTLY:
{{"is_valid": false, "error_message": "These documents do not appear to be partnership or commission agreements."}}

# IF VALID, RETURN THIS EXACT JSON STRUCTURE
Every field is required. Use null when a value cannot be found.

{{
  "is_valid": true,
  "institution_name": "Full official name as written",
  "institution_type": "One of: University | College | Vocational | Language School | Other",
  "country": "Country where the institution is based",
  "city": "City where the institution is based",
  "website": "Official institution website URL if mentioned, else null",
  "agreement_id": "Agreement number or reference ID — use the LATEST/CURRENT one",
  "agreement_type": "One of: Commission-based | Fixed Fee | Tiered | Hybrid",
  "base_commission": "Headline commission rate after all amendments, as a short string like '10%' or 'Variable - see programs'",
  "performance_bonus": "Bonus structure as of latest amendment, e.g. 'Visa assistance $500 one-off', else null",
  "tiered_levels": "Plain-text summary of FINAL commission tiers (after all amendments)",
  "commission_programs": [
    {{
      "program_name": "Bachelor / Honours / Masters / PhD / Diploma",
      "part1_pct": 10,
      "part2_pct": 10,
      "partial_service_fee": null,
      "partial_service_currency": "AUD",
      "notes": "10% 1st Semester + 10% 2nd Semester. [From original agreement dated 2021-11-01]"
    }}
  ],
  "duration_start": "YYYY-MM-DD (effective start of the current agreement)",
  "duration_end": "YYYY-MM-DD (end date as modified by latest amendment, or null if open-ended)",
  "terms_conditions": "2-5 sentence summary INCLUDING amendment history. Example: 'Original agreement dated 2021-11-01 for 5 years. Variation letter dated 2024-03-15 added UC English Pathway at 20% and extended termination notice to 90 days.'",
  "contacts": [
    {{
      "name": "Full name",
      "title": "Job title",
      "department": "Department or division",
      "email": "Email address or null",
      "phone": "Phone number or null"
    }}
  ],
  "amendment_history": [
    {{
      "file_name": "Original_ANU_2021.pdf",
      "document_date": "2021-11-01",
      "role": "Original Master Agreement",
      "summary": "Establishes 10% commission on all undergraduate and postgraduate programs"
    }},
    {{
      "file_name": "ANU_Variation_2024.pdf",
      "document_date": "2024-03-15",
      "role": "Variation Letter",
      "summary": "Added UC English Language Pathway at 20% commission. Adjusted MChD to flat AUD 2,500/sem (was percentage). Extended agreement to 2028."
    }}
  ]
}}

# CRITICAL: HOW TO FILL commission_programs

This is the most important field. Break out EACH distinct program type into its own entry, reflecting the FINAL state after all amendments.

For each program, identify:
- **program_name**: What kind of program. Group similar programs if they share the same rate.
- **part1_pct**: 1st Semester payment percentage. Otherwise null.
- **part2_pct**: 2nd Semester payment percentage. If only one payment, leave null.
- **partial_service_fee**: Flat fee amount if program is paid as flat (not percentage). Otherwise null.
- **partial_service_currency**: Currency code. AUTO-DETECT using:
  1. If the document EXPLICITLY states currency next to the amount (e.g. "$2,500 AUD" → "AUD"), use that.
  2. Otherwise infer from the institution's COUNTRY:
     - Australia → "AUD"
     - United Kingdom / UK → "GBP"
     - United States / USA → "USD"
     - Canada → "CAD"
     - New Zealand → "NZD"
     - Singapore → "SGD"
     - Switzerland → "CHF"
     - China → "CNY"
     - Malaysia → "MYR"
     - Indonesia → "IDR"
     - Japan → "JPY"
     - EU country → "EUR"
     - Default fallback → "USD"
- **notes**: Specific conditions PLUS source attribution. Example: "Flat AUD 2,500 per semester. [Originally percentage-based, changed by variation dated 2024-03-15]"

# EXTRACTION RULES

1. **Dates**: ALWAYS normalize to YYYY-MM-DD. "01/11/21" → "2021-11-01".
2. **Multi-file conflict resolution**: When two files disagree, the LATER-DATED document wins. Always.
3. **Multi-file merging**: Programs added by later amendments must appear in the array alongside originals.
4. **Track provenance**: In each program's `notes` field, note which document defined it (especially if amended).
5. **Amendment history is mandatory**: Always populate `amendment_history` array — it gives Mami a paper trail of what changed and when.
6. **Contacts**: Include the latest authorized signatory + operational contacts. If amendments listed new contacts, prefer those. Skip generic info@.

# OUTPUT FORMAT
Return ONLY the JSON object. No preamble, no markdown fences, no commentary.
Begin extraction now."""

    # --- 3. Call Gemini ---
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.1,
            }
        )

        raw = (response.text or "").strip()
        if not raw:
            raise Exception("Gemini returned an empty response.")

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as je:
            print(f"[extract-commission] JSON parse error: {je}")
            print(f"[extract-commission] Raw response: {raw[:1000]}")
            raise Exception(f"AI returned malformed JSON: {raw[:200]}")

        if not data.get("is_valid"):
            return {
                "status": "error",
                "data": data,
                "message": data.get("error_message", "Documents are not valid agreements.")
            }

        # Fill defaults
        defaults = {
            "institution_name": None,
            "institution_type": None,
            "country": None,
            "city": None,
            "website": None,
            "agreement_id": None,
            "agreement_type": None,
            "base_commission": None,
            "performance_bonus": None,
            "tiered_levels": None,
            "commission_programs": [],
            "duration_start": None,
            "duration_end": None,
            "terms_conditions": None,
            "contacts": [],
            "amendment_history": [],
        }
        for k, v in defaults.items():
            if k not in data:
                data[k] = v

        # Normalize empty strings to null
        for k in list(data.keys()):
            if isinstance(data[k], str) and data[k].strip() in ("", "Unknown", "N/A", "null", "None"):
                data[k] = None

        # Ensure lists
        if not isinstance(data.get("contacts"), list):
            data["contacts"] = []
        if not isinstance(data.get("commission_programs"), list):
            data["commission_programs"] = []
        if not isinstance(data.get("amendment_history"), list):
            data["amendment_history"] = []

        # Defensive: backfill partial_service_currency for any program missing it
        country_to_currency = {
            "australia": "AUD",
            "united kingdom": "GBP", "uk": "GBP", "england": "GBP", "scotland": "GBP", "wales": "GBP",
            "united states": "USD", "usa": "USD", "us": "USD", "america": "USD",
            "canada": "CAD",
            "new zealand": "NZD",
            "singapore": "SGD",
            "switzerland": "CHF",
            "china": "CNY",
            "malaysia": "MYR",
            "indonesia": "IDR",
            "japan": "JPY",
            "south korea": "KRW", "korea": "KRW",
            "india": "INR",
            "hong kong": "HKD",
            "uae": "AED", "dubai": "AED",
            "germany": "EUR", "france": "EUR", "netherlands": "EUR", "spain": "EUR",
            "italy": "EUR", "ireland": "EUR", "belgium": "EUR", "austria": "EUR", "portugal": "EUR",
        }
        inst_country = (data.get("country") or "").strip().lower()
        default_currency = country_to_currency.get(inst_country, "USD")

        for prog in data.get("commission_programs", []):
            if isinstance(prog, dict) and not prog.get("partial_service_currency"):
                prog["partial_service_currency"] = default_currency

        print(f"[extract-commission] Extracted: {data.get('institution_name')} "
              f"({data.get('country')}) — {len(data.get('contacts', []))} contacts, "
              f"{len(data.get('commission_programs', []))} programs, "
              f"{len(data.get('amendment_history', []))} amendment(s) merged from {file_count} file(s)")

        return {"status": "success", "data": data, "files_processed": file_count}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[extract-commission] AI extraction failed: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"AI extraction failed: {str(e)}"
        )
    # --- 3. Call Gemini ---
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.1,
            }
        )
 
        raw = (response.text or "").strip()
        if not raw:
            raise Exception("Gemini returned an empty response.")
 
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
 
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as je:
            print(f"[extract-commission] JSON parse error: {je}")
            print(f"[extract-commission] Raw response: {raw[:1000]}")
            raise Exception(f"AI returned malformed JSON: {raw[:200]}")
 
        if not data.get("is_valid"):
            return {
                "status": "error",
                "data": data,
                "message": data.get("error_message", "Document is not a valid agreement.")
            }
 
        # Fill defaults including the new commission_programs array
        defaults = {
            "institution_name": None,
            "institution_type": None,
            "country": None,
            "city": None,
            "website": None,
            "agreement_id": None,
            "agreement_type": None,
            "base_commission": None,
            "performance_bonus": None,
            "tiered_levels": None,
            "commission_programs": [],
            "duration_start": None,
            "duration_end": None,
            "terms_conditions": None,
            "contacts": [],
        }
        for k, v in defaults.items():
            if k not in data:
                data[k] = v
 
        # Normalize empty strings to null
        for k in list(data.keys()):
            if isinstance(data[k], str) and data[k].strip() in ("", "Unknown", "N/A", "null", "None"):
                data[k] = None
 
        # Ensure lists are lists
        if not isinstance(data.get("contacts"), list):
            data["contacts"] = []
        if not isinstance(data.get("commission_programs"), list):
            data["commission_programs"] = []

        # Defensive: backfill partial_service_currency for any program missing it
        # Uses the institution's country to pick a sensible default
        country_to_currency = {
            "australia": "AUD",
            "united kingdom": "GBP", "uk": "GBP", "england": "GBP", "scotland": "GBP", "wales": "GBP",
            "united states": "USD", "usa": "USD", "us": "USD", "america": "USD",
            "canada": "CAD",
            "new zealand": "NZD",
            "singapore": "SGD",
            "switzerland": "CHF",
            "china": "CNY",
            "malaysia": "MYR",
            "indonesia": "IDR",
            "japan": "JPY",
            "south korea": "KRW", "korea": "KRW",
            "india": "INR",
            "hong kong": "HKD",
            "uae": "AED", "dubai": "AED",
            "germany": "EUR", "france": "EUR", "netherlands": "EUR", "spain": "EUR",
            "italy": "EUR", "ireland": "EUR", "belgium": "EUR", "austria": "EUR", "portugal": "EUR",
        }
        inst_country = (data.get("country") or "").strip().lower()
        default_currency = country_to_currency.get(inst_country, "USD")

        for prog in data.get("commission_programs", []):
            if isinstance(prog, dict) and not prog.get("partial_service_currency"):
                prog["partial_service_currency"] = default_currency
 
        print(f"[extract-commission] Extracted: {data.get('institution_name')} "
              f"({data.get('country')}) — {len(data.get('contacts', []))} contacts, "
              f"{len(data.get('commission_programs', []))} programs")
 
        return {"status": "success", "data": data}
 
    except HTTPException:
        raise
    except Exception as e:
        print(f"[extract-commission] AI extraction failed: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"AI extraction failed: {str(e)}"
        )


# =====================================================================
# --- 11. GLOBAL BROADCAST HUB ---
# =====================================================================
@app.post("/api/admin/broadcasts", dependencies=[Depends(get_current_master_admin)])
def create_broadcast(req: BroadcastCreate, user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. Save to DB
            cur.execute("""
                INSERT INTO broadcasts (title, message, target_role, target_branch, send_email, created_by)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (
                req.title,
                req.message,
                req.target_role,
                req.target_branch,
                req.send_email,
                user_data.get("name", "Master Admin")
            ))
            new_id = cur.fetchone()[0]

            # 2. If send_email, gather recipient list
            emails_sent = 0
            emails_failed = []

            if req.send_email:
                agents = []  # list of (name, email) tuples

                # --- PATH A: Specific @mentioned agents — direct send only ---
                if req.mentioned_agents and len(req.mentioned_agents) > 0:
                    # Normalize emails for the query (lowercase, strip)
                    clean_emails = [e.strip().lower() for e in req.mentioned_agents if e and "@" in e]
                    if clean_emails:
                        cur.execute("""
                            SELECT name, email FROM users 
                            WHERE LOWER(email) = ANY(%s)
                              AND COALESCE(is_active, true) = true 
                              AND COALESCE(is_archived, false) = false
                        """, (clean_emails,))
                        agents = cur.fetchall()
                        print(f"[broadcast] @mention mode: targeting {len(agents)} specific agent(s) out of {len(clean_emails)} requested")

                # --- PATH B: Role/Branch filter — only if no @mention was provided ---
                else:
                    query = """
                        SELECT name, email FROM users 
                        WHERE COALESCE(is_active, true) = true 
                          AND COALESCE(is_archived, false) = false 
                          AND email IS NOT NULL 
                          AND email != ''
                    """
                    params = []

                    if req.target_role != "ALL":
                        query += " AND agent_type = %s"
                        params.append(req.target_role)

                    if req.target_branch != "ALL":
                        query += " AND branch = %s"
                        params.append(req.target_branch)

                    cur.execute(query, tuple(params))
                    agents = cur.fetchall()
                    print(f"[broadcast] role/branch mode: role={req.target_role}, branch={req.target_branch}, targeting {len(agents)} agent(s)")

                # 3. Send emails via SendGrid
                sg_api_key = os.getenv("SENDGRID_API_KEY")
                sg_from_email = os.getenv("SENDGRID_FROM_EMAIL")

                if sg_api_key and sg_from_email and agents:
                    for agent_name, agent_email in agents:
                        if not agent_email or "@" not in agent_email:
                            continue
                        try:
                            html_body = f"""
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                                <div style="background: #1b1b42; padding: 24px 32px; display: flex; align-items: center; gap: 12px;">
                                    <span style="color: #BAD133; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">FORTRUST</span>
                                    <span style="color: #ffffff; font-size: 13px; opacity: 0.6; margin-left: 4px;">education services</span>
                                </div>
                                <div style="padding: 32px;">
                                    <p style="color: #64748b; font-size: 13px; margin-bottom: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">System Broadcast</p>
                                    <h2 style="color: #282860; font-size: 22px; font-weight: 900; margin: 0 0 16px 0;">{req.title}</h2>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                        <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">{req.message}</p>
                                    </div>
                                    <p style="color: #94a3b8; font-size: 12px;">Hi {agent_name}, this message was sent to you by the Fortrust Master Admin team. Please log in to Fortrust OS for more details.</p>
                                </div>
                                <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0;">
                                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">Fortrust Education Services · Global Network · <a href="https://fortrust-ado.vercel.app" style="color: #BAD133;">Login to Fortrust OS</a></p>
                                </div>
                            </div>
                            """
                            sg_headers = {
                                "Authorization": f"Bearer {sg_api_key}",
                                "Content-Type": "application/json"
                            }
                            sg_payload = {
                                "personalizations": [{
                                    "to": [{"email": agent_email, "name": agent_name}],
                                    "subject": f"[Fortrust Broadcast] {req.title}"
                                }],
                                "from": {"email": sg_from_email, "name": "Fortrust OS"},
                                "content": [{"type": "text/html", "value": html_body}]
                            }
                            resp = requests.post(
                                "https://api.sendgrid.com/v3/mail/send",
                                json=sg_payload,
                                headers=sg_headers
                            )
                            if resp.status_code < 400:
                                emails_sent += 1
                            else:
                                emails_failed.append(agent_email)
                                print(f"[broadcast] SendGrid error for {agent_email}: {resp.text}")
                        except Exception as email_err:
                            emails_failed.append(agent_email)
                            print(f"[broadcast] Failed to email {agent_email}: {email_err}")

            conn.commit()

            msg = f"Broadcast sent successfully."
            if req.send_email:
                msg += f" Emails dispatched: {emails_sent}."
                if emails_failed:
                    msg += f" Failed: {len(emails_failed)}."

            return {
                "status": "success",
                "message": msg,
                "id": new_id,
                "emails_sent": emails_sent,
                "emails_failed": emails_failed
            }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()


@app.get("/api/admin/broadcasts", dependencies=[Depends(get_current_master_admin)])
def get_broadcasts():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, title, message, target_role, target_branch, send_email, created_by, created_at 
                FROM broadcasts ORDER BY created_at DESC LIMIT 50
            """)
            logs = cur.fetchall()
            for log in logs:
                if log.get('created_at'):
                    log['created_at'] = log['created_at'].isoformat()
            return {"status": "success", "data": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# =====================================================================
# --- 12. COMMISSIONS & PAYOUTS LEDGER ---
# =====================================================================
@app.get("/api/commissions")
def get_commissions(user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if user_data.get("role") == "MASTER_ADMIN":
                cur.execute("""
                    SELECT id, name as student, program_interest as program, 
                           commission_earned as amount, payout_status as status, 
                           created_at as date, assignee
                    FROM students 
                    WHERE commission_earned > 0 OR status IN ('VISA', 'COMPLETED')
                    ORDER BY created_at DESC
                """)
            else:
                cur.execute("""
                    SELECT id, name as student, program_interest as program, 
                           commission_earned as amount, payout_status as status, 
                           created_at as date, assignee
                    FROM students 
                    WHERE assignee = %s AND (commission_earned > 0 OR status IN ('VISA', 'COMPLETED'))
                    ORDER BY created_at DESC
                """, (user_data.get("name"),))

            records = cur.fetchall()
            processed = []
            for r in records:
                status = r['status'] or "PENDING_CENSUS"
                amount = float(r['amount'] or 0)
                if status == "PENDING_CENSUS" and amount > 0:
                    status = "CLEARED"

                processed.append({
                    "id": f"INV-{str(r['id']).zfill(4)}",
                    "student": r['student'],
                    "university": "Assigned Institution",
                    "program": r['program'] or "General Program",
                    "tuition": amount * 10 if amount > 0 else 0,
                    "rate": 10,
                    "amount": amount,
                    "status": status,
                    "date": r['date'].strftime("%Y-%m-%d") if r['date'] else "TBD",
                    "notes": "Ready for withdrawal." if status == "CLEARED" else "Awaiting university clearance." if status == "PENDING_CENSUS" else "Payout transferred via SWIFT."
                })
            return {"status": "success", "data": processed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/api/commissions/claim")
def claim_commissions(user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if user_data.get("role") == "MASTER_ADMIN":
                cur.execute("UPDATE students SET payout_status = 'CLAIMED' WHERE payout_status = 'CLEARED' OR commission_earned > 0")
            else:
                cur.execute("UPDATE students SET payout_status = 'CLAIMED' WHERE assignee = %s AND (payout_status = 'CLEARED' OR commission_earned > 0)", (user_data.get("name"),))

            if cur.rowcount == 0:
                return {"status": "error", "message": "No cleared funds available to claim."}

            conn.commit()
            return {"status": "success", "message": "Funds claimed and invoice generated to Finance!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# =====================================================================
# --- 13. AI UNIVERSITY PARTNERSHIP ASSISTANT ---
# =====================================================================
@app.post("/api/agent/ai-chat")
def ai_partnership_assistant(req: AIChatRequest, user_data: dict = Depends(verify_token)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini AI not configured.")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT name, type, country, city, status, website, programs_offered,
                       agreement_type, base_commission, performance_bonus, tiered_levels,
                       duration_start, duration_end, terms_conditions, contacts,
                       establishment_year, student_intake
                FROM institutions
                WHERE COALESCE(status, 'Active') != 'Inactive'
                ORDER BY country ASC, name ASC
            """)
            institutions = cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load partner database: {str(e)}")
    finally:
        conn.close()

    if not institutions:
        context_text = "EMPTY DATABASE - no institutions have been added yet."
    else:
        clean_data = []
        for inst in institutions:
            contacts = inst.get('contacts')
            if contacts and not isinstance(contacts, str):
                contacts_str = json.dumps(contacts)
            else:
                contacts_str = contacts or "[]"

            clean_data.append({
                "name": inst.get('name') or '',
                "type": inst.get('type') or '',
                "country": inst.get('country') or '',
                "city": inst.get('city') or '',
                "website": inst.get('website') or '',
                "programs": inst.get('programs_offered') or 'Not specified',
                "agreement_type": inst.get('agreement_type') or '',
                "base_commission": inst.get('base_commission') or '',
                "performance_bonus": inst.get('performance_bonus') or '',
                "tiered_levels": inst.get('tiered_levels') or '',
                "agreement_period": f"{inst.get('duration_start', '?')} to {inst.get('duration_end', '?')}",
                "terms": inst.get('terms_conditions') or '',
                "contacts": contacts_str,
                "annual_intake": inst.get('student_intake') or '',
            })
        context_text = json.dumps(clean_data, indent=2, default=str)

    history_text = ""
    for msg in (req.history or [])[-6:]:
        role = msg.get('role', 'user').upper()
        content = msg.get('content', '')
        if content and content != req.message:
            history_text += f"{role}: {content}\n\n"

    agent_name = user_data.get("name", "Agent")
    prompt = f"""You are the **Fortrust Partnership Assistant**, an AI helping {agent_name} (an education agent at Fortrust) instantly answer student questions about which universities Fortrust partners with.

The goal: make agents self-sufficient so they don't have to ask the Master Admin every time a student asks about a school, program, or country.

## FORTRUST'S OFFICIAL PARTNERSHIP DATABASE (your ONLY source of truth):
```json
{context_text}
```

## STRICT RULES:
1. **NEVER invent data.** Only use universities, programs, commissions, and details from the database above.
2. If a university is NOT in the database, say: "We don't currently have a formal agreement with [Name]. Our closest options are: [suggest 2-3 from same country/program type]."
3. For commission questions, always cite the exact `base_commission` and `performance_bonus` from the data.
4. For country/region queries: list the universities, their cities, types, and base commission.
5. For program queries: search the `programs` field across institutions and list matches.
6. For contact/PIC questions: parse the `contacts` JSON and give name, email, phone.
7. **Format clearly** - use bullet points, bold names, and concise paragraphs.
8. **Be efficient** - agents are usually mid-conversation with a student. Get to the point fast.
9. End EVERY response with a helpful follow-up like: "Want me to check programs at [related uni]?" or "Need contact details for any of these?"
10. Use a friendly, professional tone - like a knowledgeable colleague, not a stiff bot.
11. If the agent asks something unrelated (weather, jokes, code), politely redirect: "I'm focused on Fortrust's university partnerships - what can I help you find?"
12. If the database is empty, say: "Our partnership database is empty right now. Please ask the Master Admin to add institutions before I can help with university queries."

## PREVIOUS CONVERSATION (for context):
{history_text if history_text else "(no previous messages)"}

## {agent_name.upper()}'S CURRENT QUESTION:
{req.message}

Answer now (be helpful, accurate, and grounded in the database only):"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        ai_text = response.text.strip()

        try:
            conn = get_db_connection()
            log_audit_event(
                conn=conn,
                action="AI_QUERY",
                entity="Partnership Assistant",
                entity_id="chat",
                changed_by=agent_name,
                details={"question": req.message[:200], "answered": True}
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

        return {
            "status": "success",
            "response": ai_text,
            "institutions_count": len(institutions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


# =====================================================================
# --- 14. SECURED GENERIC DOCUMENT UPLOAD ---
# =====================================================================
@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    student_id: str = Form(...),
    document_type: str = Form(...),
    user_data: dict = Depends(verify_token)
):
    conn = None
    try:
        conn = get_db_connection()

        # Access check - only authorized users can upload to this student
        if not check_student_access(conn, student_id, user_data):
            log_audit_event(
                conn=conn, action="DENIED_UPLOAD", entity="Student",
                entity_id=student_id, changed_by=user_data.get("name", "Unknown"),
                details={"reason": "not_authorized_for_student", "endpoint": "upload-document"}
            )
            conn.commit()
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to upload documents for this student."
            )

        # MIME check
        if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file.content_type}' not allowed."
            )

        # Sanitize
        clean_doc_type = sanitize_filename(document_type).upper().replace(" ", "_")
        clean_original = sanitize_filename(file.filename or "file").replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        safe_filename = f"S{student_id}_{clean_doc_type}_{timestamp}_{clean_original}"

        file_bytes = await file.read()

        # Size check
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File too large (max {MAX_FILE_SIZE_MB}MB)"
            )
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file.")

        public_url = ""
        if supabase:
            try:
                supabase.storage.from_("student-documents").upload(
                    path=safe_filename,
                    file=file_bytes,
                    file_options={"content-type": file.content_type or "application/octet-stream"}
                )
                public_url = f"/api/documents/{safe_filename}"
            except Exception as supa_err:
                print(f"[upload-document] Supabase error: {supa_err}")
                raise HTTPException(status_code=500, detail=f"Cloud storage error: {str(supa_err)[:100]}")
        else:
            # Local fallback (ephemeral on Render)
            file_location = f"uploads/{safe_filename}"
            with open(file_location, "wb") as buffer:
                buffer.write(file_bytes)
            public_url = f"/uploads/{safe_filename}"

        log_audit_event(
            conn=conn,
            action="UPLOAD_DOC",
            entity="Student",
            entity_id=str(student_id),
            changed_by=user_data.get("name", "Unknown"),
            details={
                "document_type": document_type,
                "filename": file.filename,
                "stored_as": safe_filename,
                "size_bytes": len(file_bytes)
            }
        )
        conn.commit()

        return {
            "status": "success",
            "filename": safe_filename,
            "url": public_url,
            "storage": "supabase" if supabase else "local-ephemeral"
        }

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print("[upload-document] FATAL:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/api/admin/cleanup-orphan-docs")
def cleanup_orphan_docs(
    fix: bool = False,
    user_data: dict = Depends(verify_token)
):
    if user_data.get("role") != "MASTER_ADMIN":
        raise HTTPException(status_code=403, detail="Only Master Admin can run this.")
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured.")
 
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name, documents FROM students WHERE documents IS NOT NULL")
        students = cur.fetchall()
 
        report = []
        total_orphans = 0
        total_cleaned = 0
 
        for student in students:
            raw_docs = student.get('documents')
            if raw_docs is None:
                continue
            if isinstance(raw_docs, str):
                try:
                    docs = json.loads(raw_docs)
                except Exception:
                    continue
            elif isinstance(raw_docs, list):
                docs = raw_docs
            else:
                continue
 
            if not isinstance(docs, list):
                continue
 
            valid_docs = []
            orphan_docs = []
 
            for doc in docs:
                filename = doc.get('filename')
                if not filename:
                    orphan_docs.append({"reason": "no filename", "doc": doc})
                    continue
                try:
                    # Try to get file info from Supabase
                    files = supabase.storage.from_("student-documents").list(
                        path="",
                        options={"search": filename}
                    )
                    exists = any(f.get('name') == filename for f in (files or []))
                    if exists:
                        valid_docs.append(doc)
                    else:
                        orphan_docs.append({"reason": "missing in supabase", "doc": doc})
                        total_orphans += 1
                except Exception as e:
                    print(f"[cleanup] Could not check {filename}: {e}")
                    valid_docs.append(doc)  # Keep it if we can't verify (safer)
 
            if orphan_docs:
                report.append({
                    "student_id": student['id'],
                    "student_name": student['name'],
                    "orphan_count": len(orphan_docs),
                    "orphans": [o['doc'].get('title') or o['doc'].get('filename') for o in orphan_docs]
                })
 
                if fix:
                    cur.execute(
                        "UPDATE students SET documents = %s::jsonb WHERE id = %s",
                        (json.dumps(valid_docs), student['id'])
                    )
                    total_cleaned += len(orphan_docs)
 
        if fix:
            conn.commit()
            log_audit_event(
                conn=conn, action="CLEANUP_ORPHAN_DOCS", entity="System",
                entity_id=None, changed_by=user_data.get("name", "Admin"),
                details={"orphans_removed": total_cleaned}
            )
            conn.commit()
 
        return {
            "status": "success",
            "fix_applied": fix,
            "students_with_orphans": len(report),
            "total_orphans_found": total_orphans,
            "total_orphans_cleaned": total_cleaned if fix else 0,
            "report": report,
            "next_step": "Call again with ?fix=true to remove orphans" if not fix and total_orphans > 0 else None
        }
 
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.delete("/api/pipeline/{case_id}/document/{filename}")
async def delete_document(
    case_id: str,
    filename: str,
    user_data: dict = Depends(verify_token)
):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
 
        # Access check
        if not check_student_access(conn, case_id, user_data):
            log_audit_event(
                conn=conn, action="DENIED_DELETE_DOC", entity="Student",
                entity_id=case_id, changed_by=user_data.get("name", "Unknown"),
                details={"filename": filename}
            )
            conn.commit()
            raise HTTPException(status_code=403, detail="Not authorized to delete this file.")
 
        # Path traversal protection
        if "/" in filename or "\\" in filename or ".." in filename:
            raise HTTPException(status_code=400, detail="Invalid filename.")
 
        # The filename must start with S{case_id}_ — proves it belongs to this student
        if not filename.startswith(f"S{case_id}_"):
            raise HTTPException(status_code=403, detail="This file doesn't belong to this student.")
 
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT documents FROM students WHERE id = %s", (case_id,))
        student = cur.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")
 
        # Parse existing docs
        raw_docs = student.get('documents')
        if raw_docs is None:
            docs = []
        elif isinstance(raw_docs, str):
            try: docs = json.loads(raw_docs)
            except: docs = []
        elif isinstance(raw_docs, list):
            docs = raw_docs
        else:
            docs = []
 
        # Find the doc
        doc_to_delete = next((d for d in docs if d.get('filename') == filename), None)
        if not doc_to_delete:
            raise HTTPException(status_code=404, detail="Document not found in vault.")
 
        # Remove from Supabase (best-effort; continue even if it fails)
        supabase_removed = False
        if supabase:
            try:
                supabase.storage.from_("student-documents").remove([filename])
                supabase_removed = True
            except Exception as supa_err:
                print(f"[delete-doc] Supabase remove error for {filename}: {supa_err}")
 
        # Remove from documents JSONB
        new_docs = [d for d in docs if d.get('filename') != filename]
        cur.execute(
            "UPDATE students SET documents = %s::jsonb WHERE id = %s",
            (json.dumps(new_docs), case_id)
        )
 
        # Audit log
        log_audit_event(
            conn=conn, action="DELETE_DOC", entity="Student",
            entity_id=case_id, changed_by=user_data.get("name", "Unknown"),
            details={
                "filename": filename,
                "title": doc_to_delete.get('title'),
                "supabase_removed": supabase_removed
            }
        )
        conn.commit()
 
        print(f"[delete-doc] {filename} removed by {user_data.get('name')} (supabase: {supabase_removed})")
        return {
            "status": "success",
            "message": "Document deleted.",
            "supabase_removed": supabase_removed
        }
 
    except HTTPException:
        raise
    except Exception as e:
        print(f"[delete-doc] FATAL: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
# ============================================================
# SOP TEMPLATE — Master Admin uploads once, everyone downloads
# ============================================================

@app.post("/api/templates/sop")
async def upload_sop_template(
    file: UploadFile = File(...),
    user_data: dict = Depends(verify_token)
):
    """Master Admin only — upload/replace the global SOP template."""
    if user_data.get("role") != "MASTER_ADMIN":
        raise HTTPException(status_code=403, detail="Only Master Admin can upload templates.")
    
    allowed_extensions = ['.pdf', '.docx', '.doc']
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only PDF, DOC, or DOCX files allowed.")
    
    try:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
        
        storage_path = f"templates/sop_template{file_ext}"
        
        # Remove existing file if any
        try:
            supabase.storage.from_("student-documents").remove([storage_path])
        except Exception:
            pass
        
        supabase.storage.from_("student-documents").upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type or "application/pdf"}
        )
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO app_settings (key, value, updated_by, updated_at)
                    VALUES ('sop_template_path', %s, %s, NOW())
                    ON CONFLICT (key) DO UPDATE SET 
                        value = EXCLUDED.value, 
                        updated_by = EXCLUDED.updated_by, 
                        updated_at = NOW()
                """, (storage_path, user_data.get("name", "Master Admin")))
                conn.commit()
        finally:
            conn.close()
        
        return {
            "status": "success",
            "message": "SOP template uploaded successfully.",
            "filename": file.filename,
            "storage_path": storage_path
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/api/templates/sop")
def download_sop_template(user_data: dict = Depends(verify_token)):
    """Any authenticated user can download the SOP template."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT value FROM app_settings WHERE key = 'sop_template_path'")
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="SOP template not yet uploaded.")
            
            storage_path = row["value"]
        
        file_bytes = supabase.storage.from_("student-documents").download(storage_path)
        
        ext = os.path.splitext(storage_path)[1].lower()
        media_type = "application/pdf"
        if ext in [".docx", ".doc"]:
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
        return Response(
            content=file_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="Fortrust_SOP_Template{ext}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")
    finally:
        conn.close()


@app.get("/api/templates/sop/info")
def sop_template_info(user_data: dict = Depends(verify_token)):
    """Check if SOP template exists + metadata."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT value, updated_by, updated_at 
                FROM app_settings 
                WHERE key = 'sop_template_path'
            """)
            row = cur.fetchone()
            
            if not row:
                return {"status": "success", "exists": False}
            
            return {
                "status": "success",
                "exists": True,
                "uploaded_by": row.get("updated_by"),
                "uploaded_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
                "filename": os.path.basename(row["value"])
            }
    finally:
        conn.close()

@app.get("/api/admin/archived-analytics")
def get_archived_analytics(user_data: dict = Depends(verify_token)):
    """
    Comprehensive analytics for archived (lost) students.
    Master Admin only. Returns all the data the frontend needs in one call.
    """
    if user_data.get("role") != "MASTER_ADMIN":
        raise HTTPException(status_code=403, detail="Master Admin access required.")
    
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get all archived students with rich data
            cur.execute("""
                SELECT 
                    id, name, email, phone, status,
                    program_interest, country_interest, budget,
                    assignee, assignees, lead_temperature, lead_source,
                    archive_reason, created_at, updated_at,
                    field_interests
                FROM students
                WHERE UPPER(COALESCE(status, '')) = 'ARCHIVED'
                ORDER BY updated_at DESC NULLS LAST
            """)
            archived = cur.fetchall()
            
            # Also fetch total active + completed for context
            cur.execute("""
                SELECT 
                    COUNT(*) FILTER (WHERE UPPER(COALESCE(status, '')) NOT IN ('ARCHIVED', 'COMPLETED', 'REJECTED')) AS active_count,
                    COUNT(*) FILTER (WHERE UPPER(COALESCE(status, '')) = 'COMPLETED') AS completed_count,
                    COUNT(*) FILTER (WHERE UPPER(COALESCE(status, '')) = 'ARCHIVED') AS archived_count,
                    COUNT(*) AS total_count
                FROM students
            """)
            counts = cur.fetchone()
        
        # Normalize archived rows
        for s in archived:
            s['id'] = str(s['id'])
            for date_field in ('created_at', 'updated_at'):
                if s.get(date_field):
                    s[date_field] = s[date_field].isoformat()
            # Normalize assignees (JSONB → list)
            if s.get('assignees') is None:
                s['assignees'] = []
        
        # === REASON BREAKDOWN ===
        # Group archive_reason into standard categories (handle "Other: ..." as Other)
        reason_groups = {}
        for s in archived:
            raw_reason = (s.get('archive_reason') or 'Not specified').strip()
            # Bucket "Other: blah" as "Other" but keep custom text in a separate field
            if raw_reason.lower().startswith('other:'):
                bucket = 'Other'
            elif not raw_reason or raw_reason == 'Not specified':
                bucket = 'Not specified'
            else:
                bucket = raw_reason
            reason_groups[bucket] = reason_groups.get(bucket, 0) + 1
        
        reason_breakdown = [
            {"reason": k, "count": v, "percentage": round((v / len(archived) * 100) if archived else 0, 1)}
            for k, v in sorted(reason_groups.items(), key=lambda x: -x[1])
        ]
        
        # === BY COUNTRY ===
        country_groups = {}
        for s in archived:
            ci = s.get('country_interest') or 'Unknown'
            # Handle JSON-array stored as string
            if isinstance(ci, str) and ci.startswith('['):
                try:
                    parsed = json.loads(ci)
                    if isinstance(parsed, list) and parsed:
                        # Count each country in the array
                        for c in parsed:
                            country_groups[c or 'Unknown'] = country_groups.get(c or 'Unknown', 0) + 1
                        continue
                except Exception:
                    pass
            country_groups[ci] = country_groups.get(ci, 0) + 1
        
        by_country = [
            {"country": k, "count": v}
            for k, v in sorted(country_groups.items(), key=lambda x: -x[1])
        ]
        
        # === BY AGENT ===
        agent_groups = {}
        for s in archived:
            # Prefer primary assignee, fallback to legacy
            assignees = s.get('assignees') or []
            if isinstance(assignees, str):
                try:
                    assignees = json.loads(assignees)
                except Exception:
                    assignees = []
            
            primary = (assignees[0] if assignees else None) or s.get('assignee') or 'Unassigned'
            agent_groups[primary] = agent_groups.get(primary, 0) + 1
        
        by_agent = [
            {"agent": k, "count": v}
            for k, v in sorted(agent_groups.items(), key=lambda x: -x[1])
        ]
        
        # === MONTHLY TREND (last 12 months) ===
        from collections import defaultdict
        from datetime import datetime, timedelta
        
        monthly = defaultdict(int)
        for s in archived:
            if s.get('updated_at'):
                try:
                    d = datetime.fromisoformat(s['updated_at'].replace('Z', '+00:00')) if isinstance(s['updated_at'], str) else s['updated_at']
                    key = d.strftime('%Y-%m')
                    monthly[key] += 1
                except Exception:
                    pass
        
        # Fill in last 12 months even if zero
        now = datetime.now()
        monthly_trend = []
        for i in range(11, -1, -1):
            d = now.replace(day=1) - timedelta(days=i * 30)
            key = d.strftime('%Y-%m')
            label = d.strftime('%b %Y')
            monthly_trend.append({"month": key, "label": label, "count": monthly.get(key, 0)})
        
        # === LEAD TEMPERATURE AT TIME OF LOSS ===
        temp_groups = {}
        for s in archived:
            temp = s.get('lead_temperature') or 'Unknown'
            temp_groups[temp] = temp_groups.get(temp, 0) + 1
        by_temperature = [{"temperature": k, "count": v} for k, v in temp_groups.items()]
        
        # === LEAD SOURCE BREAKDOWN ===
        source_groups = {}
        for s in archived:
            src = s.get('lead_source') or 'Unknown'
            source_groups[src] = source_groups.get(src, 0) + 1
        by_source = [
            {"source": k, "count": v}
            for k, v in sorted(source_groups.items(), key=lambda x: -x[1])
        ][:10]  # top 10
        
        # === LOST REVENUE ESTIMATE ===
        # Parse "USD 50000" or "USD 30000-50000" format
        import re
        
        def parse_budget_amount(b: str):
            if not b:
                return None
            # Strip currency prefix
            cleaned = re.sub(r'^[A-Z]{3}\s+', '', b.strip())
            # Range like "30000-50000" → take midpoint
            range_match = re.match(r'^([\d,\.]+)\s*-\s*([\d,\.]+)', cleaned)
            if range_match:
                try:
                    low = float(range_match.group(1).replace(',', ''))
                    high = float(range_match.group(2).replace(',', ''))
                    return (low + high) / 2
                except Exception:
                    return None
            # Single number
            num_match = re.match(r'^([\d,\.]+)', cleaned)
            if num_match:
                try:
                    return float(num_match.group(1).replace(',', ''))
                except Exception:
                    return None
            return None
        
        total_estimated_revenue = 0
        revenue_by_country = {}
        budgets_found = 0
        for s in archived:
            amt = parse_budget_amount(s.get('budget') or '')
            if amt is not None:
                total_estimated_revenue += amt
                budgets_found += 1
                country = s.get('country_interest') or 'Unknown'
                if isinstance(country, str) and country.startswith('['):
                    try:
                        parsed = json.loads(country)
                        country = parsed[0] if parsed else 'Unknown'
                    except Exception:
                        pass
                revenue_by_country[country] = revenue_by_country.get(country, 0) + amt
        
        # Average days from creation to archive
        total_days = 0
        days_counted = 0
        for s in archived:
            if s.get('created_at') and s.get('updated_at'):
                try:
                    created = datetime.fromisoformat(s['created_at'].replace('Z', '+00:00')) if isinstance(s['created_at'], str) else s['created_at']
                    updated = datetime.fromisoformat(s['updated_at'].replace('Z', '+00:00')) if isinstance(s['updated_at'], str) else s['updated_at']
                    delta_days = (updated - created).days
                    if delta_days >= 0:
                        total_days += delta_days
                        days_counted += 1
                except Exception:
                    pass
        
        avg_days_to_archive = round(total_days / days_counted) if days_counted > 0 else 0
        
        # === HIGH-VALUE LOSSES (top 10 by budget) ===
        high_value_losses = []
        for s in archived:
            amt = parse_budget_amount(s.get('budget') or '')
            if amt is not None:
                high_value_losses.append({
                    "id": s['id'],
                    "name": s['name'],
                    "budget_amount": amt,
                    "budget_raw": s.get('budget'),
                    "country_interest": s.get('country_interest'),
                    "archive_reason": s.get('archive_reason'),
                    "updated_at": s.get('updated_at')
                })
        high_value_losses.sort(key=lambda x: -(x['budget_amount'] or 0))
        high_value_losses = high_value_losses[:10]
        
        # === CONVERSION RATE CONTEXT ===
        total_resolved = (counts['completed_count'] or 0) + (counts['archived_count'] or 0)
        loss_rate = round((counts['archived_count'] / total_resolved * 100), 1) if total_resolved > 0 else 0
        
        return {
            "status": "success",
            "data": {
                "summary": {
                    "total_archived": len(archived),
                    "total_active": counts['active_count'] or 0,
                    "total_completed": counts['completed_count'] or 0,
                    "total_all_students": counts['total_count'] or 0,
                    "loss_rate_pct": loss_rate,
                    "avg_days_to_archive": avg_days_to_archive,
                    "estimated_lost_revenue": round(total_estimated_revenue, 2),
                    "budgets_recorded": budgets_found,
                },
                "reason_breakdown": reason_breakdown,
                "by_country": by_country,
                "by_agent": by_agent,
                "monthly_trend": monthly_trend,
                "by_temperature": by_temperature,
                "by_source": by_source,
                "revenue_by_country": [
                    {"country": k, "amount": round(v, 2)} 
                    for k, v in sorted(revenue_by_country.items(), key=lambda x: -x[1])
                ],
                "high_value_losses": high_value_losses,
                "archived_students": archived,  # Full list for the table
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()