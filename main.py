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
from datetime import datetime, timedelta
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
    send_email: bool = False


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


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    assignee: Optional[str] = None
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


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    status: Optional[str] = None
    website: Optional[str] = None
    establishment_year: Optional[str] = None
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
    contacts: Optional[list] = None
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
def get_chat_messages(case_id: int, user_data: dict = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, student_id, sender, message, mentioned_users, read_by, is_system, 
                       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
                FROM chat_messages 
                WHERE student_id = %s 
                ORDER BY created_at ASC
            """, (case_id,))
            return {"status": "success", "data": cur.fetchall()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()


@app.post("/api/pipeline/{case_id}/chat")
def create_chat_message(case_id: int, req: ChatMessageCreate, user_data: dict = Depends(verify_token)):
    sender_name = user_data.get("name", "Unknown")
    conn = get_db_connection()
    try:
        # Parse mentions
        mentions = extract_mentions(req.message, conn)
        
        with conn.cursor() as cur:
            # Insert message
            cur.execute("""
                INSERT INTO chat_messages (student_id, sender, message, mentioned_users, read_by, is_system)
                VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, FALSE)
                RETURNING id, created_at
            """, (
                case_id, sender_name, req.message, 
                json.dumps(mentions), json.dumps([{"user": sender_name, "read_at": datetime.now().strftime("%Y-%m-%d %H:%M")}])
            ))
            row = cur.fetchone()
            msg_id = row[0]
            created_at = row[1]
            
            # Create notifications for mentioned users
            for user in mentions:
                if user != sender_name:
                    cur.execute("""
                        INSERT INTO notifications (recipient_username, sender, message)
                        VALUES (%s, %s, %s)
                    """, (user, sender_name, f"You were mentioned by {sender_name} in chat: \"{req.message[:50]}...\""))
            
            conn.commit()
            return {
                "status": "success",
                "data": {
                    "id": msg_id,
                    "student_id": case_id,
                    "sender": sender_name,
                    "message": req.message,
                    "mentioned_users": mentions,
                    "read_by": [{"user": sender_name, "read_at": datetime.now().strftime("%Y-%m-%d %H:%M")}],
                    "is_system": False,
                    "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S")
                }
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
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
    2. Re-extracting text from ALL uploaded PDFs in Supabase
    3. Grouping them by category (Report Card, Profiling Test, Other)
    4. Combining with student's declared field_interests
    5. Calling Gemini with all three variables
    """
    conn = None
    try:
        conn = get_db_connection()
 
        # Fetch student
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, notes, documents, field_interests,
                       program_interest, country_interest
                FROM students WHERE id = %s
            """, (req.case_id,))
            student = cur.fetchone()
 
        if not student:
            return {"status": "error", "report": "Student not found."}
 
        # Access check (so agents can't pull each other's students' reports)
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
 
        # ---------- Re-extract text from every PDF in Supabase ----------
        # This is the key fix: instead of relying on cached pdf_text in the
        # students table (which can be stale or partial), we pull fresh
        # text from each file every time the AI report is generated.
        rapot_texts = []
        profiling_texts = []
        other_texts = []
 
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
 
                if not pdf_text:
                    print(f"[ai-strategy] {filename} had no extractable text")
                    continue
 
                # Classify by title (which we set from doc_type at upload time)
                title = (doc.get('title') or '').upper()
                fname_upper = filename.upper()
                doc_label = doc.get('title') or filename
 
                if ("REPORT CARD" in title or "RAPOT" in title or
                    "REPORT_CARD" in fname_upper or "RAPOT" in fname_upper):
                    rapot_texts.append(f"--- {doc_label} ---\n{pdf_text}")
                elif ("PROFILING" in title or "PSYCHOLOGY" in title or "PSIKOLOG" in title or
                      "HCC" in title or "PROFILING" in fname_upper or "PSYCHOLOGY" in fname_upper):
                    profiling_texts.append(f"--- {doc_label} ---\n{pdf_text}")
                else:
                    other_texts.append(f"--- {doc_label} ---\n{pdf_text}")
 
            except Exception as e:
                print(f"[ai-strategy] Extract failed for {filename}: {e}")
                continue
 
        # Combine into structured text
        combined_parts = []
        if rapot_texts:
            combined_parts.append("========== REPORT CARDS (RAPOT) ==========\n" + "\n\n".join(rapot_texts))
        if profiling_texts:
            combined_parts.append("========== PROFILING TEST RESULTS ==========\n" + "\n\n".join(profiling_texts))
        if other_texts:
            combined_parts.append("========== OTHER DOCUMENTS ==========\n" + "\n\n".join(other_texts))
 
        combined_text = "\n\n".join(combined_parts) if combined_parts else "No PDF documents could be extracted."
 
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
                    # Fallback: comma-separated
                    field_interests = [f.strip() for f in field_interests_raw.split(',') if f.strip()]
            elif isinstance(field_interests_raw, list):
                field_interests = field_interests_raw
 
        print(f"[ai-strategy] Student {student['name']} — "
              f"rapot files: {len(rapot_texts)}, profiling: {len(profiling_texts)}, "
              f"other: {len(other_texts)}, interests: {field_interests}")
 
        # ---------- Generate report ----------
        try:
            premium_report = generate_strategic_report(
                student_name=student['name'],
                destination=student.get('country_interest') or "Global (AI Recommended)",
                budget=30000,
                notes=student.get('notes') or "No notes provided.",
                pdf_data=combined_text,
                field_interests=field_interests,
                program_interest=student.get('program_interest') or ""
            )
 
            log_audit_event(
                conn=conn, action="AI_QUERY", entity="Student",
                entity_id=str(student['id']),
                changed_by=user_data.get("name", "Unknown"),
                details={
                    "rapot_files": len(rapot_texts),
                    "profiling_files": len(profiling_texts),
                    "other_files": len(other_texts),
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
                SELECT academic_field, career_goal, campus_env,
                       father_name, father_email, father_whatsapp,
                       mother_name, mother_email, mother_whatsapp
                FROM students WHERE id = %s
            """, (student_id,))
            old_profile = cur.fetchone()

            # 2. Process updates
            data = student.dict(exclude_unset=True)
            if not data:
                raise HTTPException(status_code=400, detail="No data provided to update.")
            updates = [f"{k} = %s" for k in data]
            params = list(data.values()) + [student_id]
            cur.execute(f"UPDATE students SET {', '.join(updates)} WHERE id = %s", tuple(params))
            if cur.rowcount == 0:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Student not found.")

            # 3. Log system activity messages to chat
            user_name = current_user.get("name", "Unknown")
            academic_profile_updated = False
            parent_profile_updated = False
            campus_env_changed = False
            new_campus_env = ""

            if old_profile:
                old_acad_field, old_career_goal, old_campus_env, \
                old_f_name, old_f_email, old_f_whatsapp, \
                old_m_name, old_m_email, old_m_whatsapp = old_profile

                # Check if academic profile changed
                if (student.academic_field is not None and student.academic_field != old_acad_field) or \
                   (student.career_goal is not None and student.career_goal != old_career_goal):
                    academic_profile_updated = True

                # Check if campus environment changed
                if student.campus_env is not None and student.campus_env != old_campus_env:
                    campus_env_changed = True
                    new_campus_env = student.campus_env

                # Check if parent profile changed
                if (student.father_name is not None and student.father_name != old_f_name) or \
                   (student.father_email is not None and student.father_email != old_f_email) or \
                   (student.father_whatsapp is not None and student.father_whatsapp != old_f_whatsapp) or \
                   (student.mother_name is not None and student.mother_name != old_m_name) or \
                   (student.mother_email is not None and student.mother_email != old_m_email) or \
                   (student.mother_whatsapp is not None and student.mother_whatsapp != old_m_whatsapp):
                    parent_profile_updated = True

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
                if field == 'contacts':
                    updates.append(f"{field} = %s::jsonb")
                    params.append(json.dumps(value))
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
async def extract_commission_agreement(contract: UploadFile = File(...)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
 
    # --- 1. Read PDF ---
    try:
        if not contract.filename or not contract.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Please upload a PDF file.")
 
        content = await contract.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
 
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        pages = []
        for i, page in enumerate(reader.pages):
            try:
                t = page.extract_text() or ""
                if t.strip():
                    pages.append(f"\n--- PAGE {i+1} ---\n{t}")
            except Exception as pe:
                print(f"[extract-commission] page {i+1} skipped: {pe}")
                continue
 
        extracted_text = "\n".join(pages).strip()
        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text. PDF may be scanned/image-only."
            )
 
        if len(extracted_text) > MAX_AGREEMENT_CHARS:
            print(f"[extract-commission] Truncating from {len(extracted_text)} to {MAX_AGREEMENT_CHARS} chars")
            extracted_text = extracted_text[:MAX_AGREEMENT_CHARS] + "\n\n[...truncated...]"
 
    except HTTPException:
        raise
    except Exception as e:
        print(f"[extract-commission] PDF read failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")
 
    # --- 2. Build strict extraction prompt ---
    prompt = f"""You are a senior contract analyst at Fortrust Education Services.
You are extracting structured data from a University/College partnership or commission agreement.
 
# DOCUMENT TEXT
```
{extracted_text}
```
 
# FAIL-SAFE CHECK
If the document is clearly NOT a partnership/commission agreement (e.g., it's a random PDF, invoice, brochure, or transcript), return EXACTLY:
{{"is_valid": false, "error_message": "This document does not appear to be a partnership or commission agreement."}}
 
# IF VALID, RETURN THIS EXACT JSON STRUCTURE
Every field is required. Use null (not "Unknown", not "N/A", not empty string) when a value cannot be found.
 
{{
  "is_valid": true,
  "institution_name": "Full official name as written, e.g. 'The Australian National University'",
  "institution_type": "One of: University | College | Vocational | Language School | Other",
  "country": "Country where the institution is based, e.g. 'Australia'",
  "city": "City where the institution is based, e.g. 'Canberra'",
  "website": "Official institution website URL if mentioned, else null",
  "agreement_type": "One of: Commission-based | Fixed Fee | Tiered | Hybrid",
  "base_commission": "Headline commission as a clear short sentence, e.g. '10% of first 12 months tuition, paid in two parts per semester'",
  "performance_bonus": "Any bonus/incentive structure, e.g. 'Visa assistance $500 one-off' or null if none",
  "tiered_levels": "If commission varies by program, summarize the tiers, e.g. 'Bachelors/Masters/PhD: 10%; English Pathway: 20%; MChD: flat $2,500/semester'. If single flat rate, return null.",
  "duration_start": "Effective date in YYYY-MM-DD. If only a year, use January 1st of that year.",
  "duration_end": "Expiry date in YYYY-MM-DD, or null if open-ended/perpetual",
  "terms_conditions": "2-4 sentence summary of the most important terms: invoice deadlines, payment timing, key restrictions, exclusivity, territory, termination notice period. Be specific.",
  "contacts": [
    {{
      "name": "Full name",
      "title": "Job title",
      "department": "Department or division",
      "email": "Email address or null",
      "phone": "Phone number or null"
    }}
  ]
}}
 
# EXTRACTION RULES
1. **Dates**: ALWAYS normalize to YYYY-MM-DD. "01/11/21" → "2021-11-01". "30/04/25" → "2025-04-30".
2. **Amendments / Variation Letters**: If the document is a variation/amendment that MODIFIES a previous agreement, extract the POST-AMENDMENT state. Add a note in `terms_conditions` like "[Variation dated YYYY-MM-DD: ...]".
3. **Multiple commission rates**: If different programs have different rates, the headline rate goes in `base_commission`, and the full breakdown goes in `tiered_levels`.
4. **Contacts**: Include the institution's authorized signatory (the person who signed for the university), plus any operational contacts (admissions email, commission payments email). Skip generic info@ addresses.
5. **Territory**: Mention in `terms_conditions` if the agent is limited to specific countries.
6. **Currency**: If commissions are in non-USD currency (e.g., AUD, GBP), mention in `terms_conditions`.
 
# WORKED EXAMPLE (for an ANU-style Australian agreement)
This is what good extraction looks like:
{{
  "is_valid": true,
  "institution_name": "The Australian National University",
  "institution_type": "University",
  "country": "Australia",
  "city": "Canberra",
  "website": null,
  "agreement_type": "Commission-based",
  "base_commission": "10% of first 12 months tuition, paid in two parts per semester after each Census Date",
  "performance_bonus": "Visa assistance only: $500 one-off; Partial service: $1,000 one-off",
  "tiered_levels": "Bachelors/Honours/Masters/PhD/Diploma: 10% Part 1 + 10% Part 2 of respective semester tuition. Graduate Certificate: 10% (single payment, 6-month program). MChD: $2,500 per semester. UC English Language Pathway: 20%.",
  "duration_start": "2021-11-01",
  "duration_end": "2025-04-30",
  "terms_conditions": "Non-exclusive appointment. Territory: Indonesia, Malaysia, Philippines. All payments in AUD. Commission invoiced within 12 months of relevant Census Date. Either party may terminate with 30 days written notice. Commission not payable for students with Australia Awards Scholarships, US Federal Aid recipients, or diplomatic visa holders. [Variation dated 2024-07-19: Added UC English Language Program pathway with 20% commission.]",
  "contacts": [
    {{
      "name": "Dr Amanda Barry",
      "title": "Director, Future Students",
      "department": "International Strategy and Future Students Division",
      "email": "agent.contract@anu.edu.au",
      "phone": null
    }}
  ]
}}
 
# OUTPUT FORMAT
Return ONLY the JSON object. No preamble, no markdown fences, no commentary.
Begin extraction now."""
 
    # --- 3. Call Gemini with JSON mode + low temperature ---
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
 
        # Strip code fences if the AI added them
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
 
        # --- 4. Handle invalid doc ---
        if not data.get("is_valid"):
            return {
                "status": "error",
                "data": data,
                "message": data.get("error_message", "Document is not a valid agreement.")
            }
 
        # --- 5. Fill missing keys with null, clean empty strings ---
        defaults = {
            "institution_name": None,
            "institution_type": None,
            "country": None,
            "city": None,
            "website": None,
            "agreement_type": None,
            "base_commission": None,
            "performance_bonus": None,
            "tiered_levels": None,
            "duration_start": None,
            "duration_end": None,
            "terms_conditions": None,
            "contacts": [],
        }
        for k, v in defaults.items():
            if k not in data:
                data[k] = v
 
        # Normalize empty/placeholder strings to null
        for k in list(data.keys()):
            if isinstance(data[k], str) and data[k].strip() in ("", "Unknown", "N/A", "null", "None"):
                data[k] = None
 
        # Ensure contacts is always a list
        if not isinstance(data.get("contacts"), list):
            data["contacts"] = []
 
        print(f"[extract-commission] Extracted: {data.get('institution_name')} "
              f"({data.get('country')}) — {len(data.get('contacts', []))} contacts")
 
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
            conn.commit()
            return {"status": "success", "message": "Broadcast sent successfully", "id": new_id}
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
                "established": inst.get('establishment_year') or '',
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