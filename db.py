import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
import json
import hashlib
import uuid

DB_PATH = Path("data/fortrust.db")

def ensure_column(conn, table: str, col: str, col_type: str):
    try:
        cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
        if col not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
    except Exception as e:
        print(f"Migration warning for {table}.{col}: {e}")

def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB_PATH)

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()

def init_db():
    with get_conn() as conn:
        # 1. CASES TABLE
        conn.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            case_id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL,
            student_name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            destination_1 TEXT,
            destination_2 TEXT,
            destination_3 TEXT,
            annual_budget REAL,
            savings REAL,
            cash_buffer REAL,
            raw_json TEXT NOT NULL,
            counsellor_brief_md TEXT,
            full_report_md TEXT,
            assigned_to TEXT,
            last_updated_at TEXT,
            referral_code TEXT,           -- NEW: For Micro-Agent Tracking
            commission_status TEXT        -- NEW: PENDING, PAID, CANCELLED
        )
        """)
        
        # Schema upgrades (Existing + New Franchise Fields)
        ensure_column(conn, "cases", "full_report_md", "TEXT")
        ensure_column(conn, "cases", "full_report_updated_at", "TEXT")
        ensure_column(conn, "cases", "assigned_to", "TEXT")
        ensure_column(conn, "cases", "first_contacted_at", "TEXT")
        ensure_column(conn, "cases", "last_contact_attempt_at", "TEXT")
        ensure_column(conn, "cases", "next_followup_at", "TEXT")
        # Franchise migrations
        ensure_column(conn, "cases", "referral_code", "TEXT")
        ensure_column(conn, "cases", "commission_status", "TEXT")

        # 2. USERS TABLE
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            referral_code TEXT UNIQUE,    -- NEW: The Agent's unique code
            bank_details TEXT             -- NEW: For paying commissions
        )
        """)
        
        # Franchise migrations
        ensure_column(conn, "users", "referral_code", "TEXT")
        ensure_column(conn, "users", "bank_details", "TEXT")

        # Bootstrap admin
        row = conn.execute("SELECT COUNT(*) FROM users").fetchone()
        if row and row[0] == 0:
            # Create default admin with a referral code just in case
            create_user_internal(conn, "ADMIN001", "Default Admin", "admin@fortrust.local", "admin123", "ADMIN", "ADM-001")

        # 3. AUDIT LOG
        conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            user_id TEXT,
            action TEXT NOT NULL,
            case_id TEXT,
            metadata TEXT
        )
        """)
        conn.commit()

# Internal helper to avoid opening nested connections during init
def create_user_internal(conn, user_id, name, email, password, role, referral_code=None):
    if not referral_code:
        # Generate default: e.g. "JON-XE3"
        suffix = uuid.uuid4().hex[:3].upper()
        clean_name = name.replace(" ", "")[:3].upper()
        referral_code = f"{clean_name}-{suffix}"
        
    conn.execute("""
    INSERT INTO users (user_id, name, email, password_hash, role, is_active, created_at, referral_code)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    """, (user_id, name, email, hash_password(password), role, datetime.utcnow().isoformat(), referral_code))

# --- Public API ---

def create_user(user_id: str, name: str, email: str, password: str, role: str, referral_code: str = None):
    with get_conn() as conn:
        create_user_internal(conn, user_id, name, email, password, role, referral_code)
        conn.commit()

def insert_case(case_id: str, payload: dict, brief_md: str, referral_code: str = None):
    now = datetime.utcnow().isoformat()
    dests = payload.get("destinations") or []
    dests = (dests + ["", "", ""])[:3]

    commission_status = "PENDING" if referral_code else None

    with get_conn() as conn:
        conn.execute("""
        INSERT INTO cases (
            case_id, created_at, status, student_name, phone, email,
            destination_1, destination_2, destination_3,
            annual_budget, savings, cash_buffer,
            raw_json, counsellor_brief_md, referral_code, commission_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case_id, now, "NEW",
            payload.get("student_name",""),
            payload.get("phone",""),
            payload.get("email",""),
            dests[0], dests[1], dests[2],
            payload.get("finance", {}).get("annual_budget"),
            payload.get("finance", {}).get("savings"),
            payload.get("finance", {}).get("cash_buffer"),
            json.dumps(payload, ensure_ascii=False),
            brief_md,
            referral_code,
            commission_status
        ))
        conn.commit()

def list_cases():
    with get_conn() as conn:
        rows = conn.execute("SELECT case_id, created_at, status, student_name, destination_1, annual_budget FROM cases ORDER BY created_at DESC").fetchall()
    return rows

def get_case(case_id: str):
    with get_conn() as conn:
        row = conn.execute("""
        SELECT case_id, created_at, status, student_name, phone, email,
                raw_json, counsellor_brief_md, assigned_to, full_report_md, full_report_updated_at, referral_code
        FROM cases WHERE case_id = ?
        """, (case_id,)).fetchone()
    return row

def update_status(case_id: str, status: str):
    with get_conn() as conn:
        conn.execute("UPDATE cases SET status=? WHERE case_id=?", (status, case_id))
        conn.commit()

def log_event(user_id: Optional[str], action: str, case_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
    with get_conn() as conn:
        conn.execute("INSERT INTO audit_log (ts, user_id, action, case_id, metadata) VALUES (?, ?, ?, ?, ?)", 
                     (datetime.utcnow().isoformat(), user_id, action, case_id, json.dumps(metadata or {}, ensure_ascii=False)))
        conn.commit()

def get_user_by_email(email: str):
    with get_conn() as conn:
        # Added referral_code to selection
        return conn.execute("SELECT user_id, name, email, password_hash, role, is_active, referral_code FROM users WHERE email = ?", (email,)).fetchone()
    
def list_users(role: Optional[str] = None):
    with get_conn() as conn:
        # Added referral_code to selection
        if role:
            return conn.execute("SELECT user_id, name, email, password_hash, role, is_active, referral_code FROM users WHERE role=? ORDER BY name", (role,)).fetchall()
        return conn.execute("SELECT user_id, name, email, password_hash, role, is_active, referral_code FROM users ORDER BY role, name").fetchall()

def assign_case(case_id: str, user_id: Optional[str]):
    with get_conn() as conn:
        conn.execute("UPDATE cases SET assigned_to=? WHERE case_id=?", (user_id, case_id))
        conn.commit()

def list_cases_filtered(status: Optional[str] = None, assigned_to: Optional[str] = None):
    q = "SELECT case_id, created_at, status, student_name, destination_1, annual_budget, assigned_to FROM cases WHERE 1=1"
    params = []
    if status:
        q += " AND status=?"
        params.append(status)
    if assigned_to:
        q += " AND assigned_to=?"
        params.append(assigned_to)
    q += " ORDER BY created_at DESC"
    with get_conn() as conn:
        return conn.execute(q, params).fetchall()

def get_audit_for_case(case_id: str, limit: int = 50):
    with get_conn() as conn:
        return conn.execute("SELECT ts, user_id, action, metadata FROM audit_log WHERE case_id=? ORDER BY ts DESC LIMIT ?", (case_id, limit)).fetchall()

# Updated to support Referral Code filtering
def list_cases_advanced(status=None, assigned_to=None, unassigned_only=False, destination=None, referral_code=None):
    q = "SELECT case_id, created_at, status, student_name, destination_1, annual_budget, assigned_to FROM cases WHERE 1=1"
    params = []
    if status:
        q += " AND status=?"
        params.append(status)
    if assigned_to:
        q += " AND assigned_to=?"
        params.append(assigned_to)
    if unassigned_only:
        q += " AND assigned_to IS NULL"
    if destination:
        q += " AND (destination_1=? OR destination_2=? OR destination_3=?)"
        params += [destination, destination, destination]
    if referral_code:
        q += " AND referral_code=?"
        params.append(referral_code)

    q += " ORDER BY created_at DESC"
    with get_conn() as conn:
        return conn.execute(q, params).fetchall()

def mark_contacted(case_id: str):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("UPDATE cases SET first_contacted_at = COALESCE(first_contacted_at, ?), last_contact_attempt_at = ? WHERE case_id = ?", (now, now, case_id))
        conn.commit()

def log_contact_attempt(case_id: str):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("UPDATE cases SET last_contact_attempt_at = ? WHERE case_id = ?", (now, case_id))
        conn.commit()

def save_full_report(case_id: str, report_md: str):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("UPDATE cases SET full_report_md = ?, full_report_updated_at = ? WHERE case_id = ?", (report_md, now, case_id))
        conn.commit()

def update_case_payload(case_id: str, new_payload: dict):
    """Updates just the JSON data (for counsellor notes/data opsional)"""
    with get_conn() as conn:
        conn.execute("UPDATE cases SET raw_json = ? WHERE case_id = ?", (json.dumps(new_payload, ensure_ascii=False), case_id))
        conn.commit()

def update_case_status_and_payload(case_id: str, status: str, new_payload: dict):
    """Updates Status AND JSON at the same time (for Qualification results)"""
    with get_conn() as conn:
        conn.execute("UPDATE cases SET status = ?, raw_json = ? WHERE case_id = ?", (status, json.dumps(new_payload, ensure_ascii=False), case_id))
        conn.commit()