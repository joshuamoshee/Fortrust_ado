import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
import json

DB_PATH = Path("data/fortrust.db")

def ensure_column(conn, table: str, col: str, col_type: str):
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if col not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")


def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB_PATH)

# db.py (add below your existing imports)
import hashlib

def init_db():
    with get_conn() as conn:
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
            last_updated_at TEXT
        )
        """)

        # ✅ Guaranteed schema upgrades (won't silently fail)
        ensure_column(conn, "cases", "full_report_md", "TEXT")
        ensure_column(conn, "cases", "full_report_updated_at", "TEXT")
        ensure_column(conn, "cases", "assigned_to", "TEXT")
        ensure_column(conn, "cases", "first_contacted_at", "TEXT")
        ensure_column(conn, "cases", "last_contact_attempt_at", "TEXT")
        ensure_column(conn, "cases", "next_followup_at", "TEXT")

        # create users table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,           -- ADMIN / MANAGER / AGENT
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """)
        
        # ---- Bootstrap first admin if no users exist ----
        row = conn.execute("SELECT COUNT(*) FROM users").fetchone()
        user_count = row[0] if row else 0

        if user_count == 0:
            default_email = "admin@fortrust.local"
            default_pw = "admin123"
            default_name = "Default Admin"

            conn.execute("""
            INSERT INTO users (user_id, name, email, password_hash, role, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)
            """, (
                "ADMIN001",
                default_name,
                default_email,
                hash_password(default_pw),
                "ADMIN",
                datetime.utcnow().isoformat()
            ))

        # create audit log table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            user_id TEXT,
            action TEXT NOT NULL,         -- VIEW_CASE / UPDATE_STATUS / ASSIGN_CASE / GENERATE_REPORT / LOGIN
            case_id TEXT,
            metadata TEXT
        )
        """)

        conn.commit()

        for col in ["first_contacted_at", "last_contact_attempt_at", "next_followup_at"]:
            try:
                conn.execute(f"ALTER TABLE cases ADD COLUMN {col} TEXT")
            except Exception:
                pass  # column already exists

        # Add missing columns if upgrading from old DB
        for col in ["full_report_md", "assigned_to", "last_updated_at"]:
            try:
                conn.execute(f"ALTER TABLE cases ADD COLUMN {col} TEXT")
            except Exception:
                pass

        # users table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,           -- ADMIN / MANAGER / AGENT
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """)
        # ---- Bootstrap first admin if no users exist ----
    row = conn.execute("SELECT COUNT(*) FROM users").fetchone()
    user_count = row[0] if row else 0

    if user_count == 0:
        default_email = "admin@fortrust.local"
        default_pw = "admin123"
        default_name = "Default Admin"

        conn.execute("""
        INSERT INTO users (user_id, name, email, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
        """, (
            "ADMIN001",
            default_name,
            default_email,
            hash_password(default_pw),
            "ADMIN",
            datetime.utcnow().isoformat()
        ))


        # audit log
        conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            user_id TEXT,
            action TEXT NOT NULL,         -- VIEW_CASE / UPDATE_STATUS / ASSIGN_CASE / GENERATE_REPORT / LOGIN
            case_id TEXT,
            metadata TEXT
        )
        """)

        conn.commit()

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()



def insert_case(case_id: str, payload: dict, brief_md: str):
    now = datetime.utcnow().isoformat()

    # ✅ Safe padding so we always have 3 slots
    dests = payload.get("destinations") or []
    dests = (dests + ["", "", ""])[:3]

    with get_conn() as conn:
        conn.execute("""
        INSERT INTO cases (
            case_id, created_at, status, student_name, phone, email,
            destination_1, destination_2, destination_3,
            annual_budget, savings, cash_buffer,
            raw_json, counsellor_brief_md
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case_id, now, "NEW",
            payload.get("student_name",""),
            payload.get("phone",""),
            payload.get("email",""),
            dests[0],
            dests[1],
            dests[2],
            payload.get("finance", {}).get("annual_budget"),
            payload.get("finance", {}).get("savings"),
            payload.get("finance", {}).get("cash_buffer"),
            json.dumps(payload, ensure_ascii=False),
            brief_md
        ))
        conn.commit()


def list_cases():
    with get_conn() as conn:
        rows = conn.execute("""
        SELECT case_id, created_at, status, student_name, destination_1,
               annual_budget
        FROM cases
        ORDER BY created_at DESC
        """).fetchall()
    return rows

def get_case(case_id: str):
    with get_conn() as conn:
        row = conn.execute("""
        SELECT case_id, created_at, status, student_name, phone, email,
                raw_json, counsellor_brief_md, assigned_to, full_report_md, full_report_updated_at
        FROM cases WHERE case_id = ?
        """, (case_id,)).fetchone()
    return row

def update_status(case_id: str, status: str):
    with get_conn() as conn:
        conn.execute("UPDATE cases SET status=? WHERE case_id=?", (status, case_id))
        conn.commit()

def log_event(user_id: Optional[str], action: str, case_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
    with get_conn() as conn:
        conn.execute("""
        INSERT INTO audit_log (ts, user_id, action, case_id, metadata)
        VALUES (?, ?, ?, ?, ?)
        """, (datetime.utcnow().isoformat(), user_id, action, case_id, json.dumps(metadata or {}, ensure_ascii=False)))
        conn.commit()

def create_user(user_id: str, name: str, email: str, password: str, role: str):
    with get_conn() as conn:
        conn.execute("""
        INSERT INTO users (user_id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, name, email, hash_password(password), role, datetime.utcnow().isoformat()))
        conn.commit()

def get_user_by_email(email: str):
    with get_conn() as conn:
        return conn.execute("""
        SELECT user_id, name, email, password_hash, role, is_active
        FROM users WHERE email = ?
        """, (email,)).fetchone()
    
def list_users(role: Optional[str] = None):
    with get_conn() as conn:
        if role:
            return conn.execute("""
            SELECT user_id, name, email, password_hash, role, is_active FROM users
            WHERE role=? ORDER BY name
            """, (role,)).fetchall()
        return conn.execute("""
            SELECT user_id, name, email, password_hash, role, is_active FROM users
            ORDER BY role, name
        """).fetchall()

def assign_case(case_id: str, user_id: Optional[str]):
    with get_conn() as conn:
        conn.execute("UPDATE cases SET assigned_to=? WHERE case_id=?", (user_id, case_id))
        conn.commit()

def list_cases_filtered(status: Optional[str] = None, assigned_to: Optional[str] = None):
    q = """
    SELECT case_id, created_at, status, student_name, destination_1,
           annual_budget, assigned_to
    FROM cases
    WHERE 1=1
    """
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
        return conn.execute("""
        SELECT ts, user_id, action, metadata
        FROM audit_log
        WHERE case_id=?
        ORDER BY ts DESC
        LIMIT ?
        """, (case_id, limit)).fetchall()

def list_cases_advanced(status=None, assigned_to=None, unassigned_only=False, destination=None):
    q = """
    SELECT case_id, created_at, status, student_name, destination_1,
           annual_budget, assigned_to
    FROM cases
    WHERE 1=1
    """
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

    q += " ORDER BY created_at DESC"
    with get_conn() as conn:
        return conn.execute(q, params).fetchall()

def mark_contacted(case_id: str):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("""
        UPDATE cases
        SET first_contacted_at = COALESCE(first_contacted_at, ?),
            last_contact_attempt_at = ?
        WHERE case_id = ?
        """, (now, now, case_id))
        conn.commit()

def log_contact_attempt(case_id: str):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("""
        UPDATE cases
        SET last_contact_attempt_at = ?
        WHERE case_id = ?
        """, (now, case_id))
        conn.commit()

from datetime import datetime

def save_full_report(case_id: str, report_md: str):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("""
        UPDATE cases
        SET full_report_md = ?,
            full_report_updated_at = ?
        WHERE case_id = ?
        """, (report_md, now, case_id))
        conn.commit()

# Add this to db.py
def update_case_payload(case_id, new_payload):
    with get_conn() as conn:
        # Convert dict to json string
        json_str = json.dumps(new_payload)
        conn.execute("UPDATE cases SET raw_json = ? WHERE case_id = ?", (json_str, case_id))
        conn.commit()