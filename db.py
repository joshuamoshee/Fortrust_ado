import sqlite3
import datetime
import json

DB_FILE = "data/fortrust.db"

def init_db():
    """Initializes the database with necessary tables."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # 1. Cases table
    c.execute('''
        CREATE TABLE IF NOT EXISTS cases (
            case_id TEXT PRIMARY KEY,
            created_at TEXT,
            status TEXT,
            student_name TEXT,
            phone TEXT,
            email TEXT,
            raw_json TEXT,
            counsellor_brief_md TEXT,
            assigned_to TEXT,
            full_report_md TEXT,
            report_generated_at TEXT,
            referral_code TEXT
        )
    ''')

    # 2. Programs table
    c.execute('''
        CREATE TABLE IF NOT EXISTS programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country TEXT,
            university TEXT,
            program_name TEXT,
            level TEXT,
            tuition_per_year REAL,
            duration_years REAL,
            category TEXT,
            notes TEXT
        )
    ''')

    # 3. Users table (with branch)
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT,
            branch TEXT
        )
    ''')

    # 4. Create default Master Admin
    c.execute("SELECT * FROM users WHERE email='admin@fortrust.com'")
    if not c.fetchone():
        c.execute("INSERT INTO users (id, name, email, password, role, branch) VALUES (?, ?, ?, ?, ?, ?)",
                  ("U-001", "Master Admin", "admin@fortrust.com", "admin123", "MASTER_ADMIN", "Headquarters"))
    
    # 🚨 Notice how the commit and close are ONLY at the very end now!
    conn.commit()
    conn.close()

def seed_programs():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    count = c.execute("SELECT COUNT(*) FROM programs").fetchone()[0]
    if count == 0:
        print("Seeding database with university programs...")
        test_programs = [
            ("New Zealand", "Massey University", "Bachelor of Design", "Bachelor", 35000, 4.0, "Design", ""),
        ]
        c.executemany('''
            INSERT INTO programs (country, university, program_name, level, tuition_per_year, duration_years, category, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', test_programs)
        conn.commit()
    conn.close()

def get_all_programs():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    programs = c.execute("SELECT * FROM programs").fetchall()
    conn.close()
    return programs

def list_cases_advanced():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    try:
        rows = c.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()
    except sqlite3.OperationalError:
        rows = []
    conn.close()
    return rows

def get_case(case_id: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    row = c.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,)).fetchone()
    conn.close()
    return row

def delete_case(case_id: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM cases WHERE case_id = ?", (case_id,))
    conn.commit()
    conn.close()

def update_case_assignment(case_id: str, status: str, assigned_to: str, tuition: float = 0.0, commission_rate: float = 0.0, currency: str = "USD"):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    row = c.execute("SELECT raw_json FROM cases WHERE case_id = ?", (case_id,)).fetchone()
    payload = json.loads(row[0]) if row and row[0] else {}
    
    if status == "COMPLETED":
        payload["tuition"] = tuition
        payload["commission_rate"] = commission_rate
        payload["currency"] = currency # <-- NEW: Save the specific currency!
        payload["commission_earned"] = tuition * (commission_rate / 100)
    
    c.execute('''
        UPDATE cases SET status = ?, assigned_to = ?, raw_json = ? WHERE case_id = ?
    ''', (status, assigned_to, json.dumps(payload, ensure_ascii=False), case_id))
    
    conn.commit()
    conn.close()


def get_users_with_stats():
    """Fetches all users and counts how many students are assigned to them."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    query = '''
        SELECT u.id, u.name, u.email, u.role, u.branch, COUNT(c.case_id) as student_count
        FROM users u
        LEFT JOIN cases c ON u.name = c.assigned_to
        GROUP BY u.id
        ORDER BY student_count DESC
    '''
    rows = c.execute(query).fetchall()
    conn.close()
    return rows