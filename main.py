from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # NEW IMPORT
from pydantic import BaseModel
import json

# Import the "brain" we already built!
from db import list_cases_advanced, get_case
from ai_report import generate_strategic_report

# Initialize the API
app = FastAPI(title="Fortrust OS API", version="1.0")

# --- CORS SECURITY FIX ---
# This tells the Python server to allow traffic from your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # This is where React runs locally
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. GET ALL STUDENTS ENDPOINT ---
@app.get("/api/pipeline")
def get_pipeline(role: str, agent_code: str = None):
    """
    The React frontend calls this URL to get the list of students.
    """
    all_rows_summary = list_cases_advanced()
    
    filtered_students = []
    if all_rows_summary:
        for r in all_rows_summary:
            # FIX: We must fetch the full 12-column profile using the ID
            case_details = get_case(r[0])
            if not case_details: continue
            
            # Now we can safely unpack all 12 variables
            cid, cdate, status, sname, phone, email, raw_json, brief, assignee, full_rep, rep_date, ref_code = case_details
            
            payload = json.loads(raw_json)
            c_data = payload.get("counsellor_data", {})
            student_branch = c_data.get("kantor", "")

            # Package the data neatly for React
            student_data = {
                "id": cid,
                "name": sname,
                "status": status,
                "phone": phone,
                "email": email,
                "assigned_to": ref_code,
                "date": cdate[:10]
            }

            # RBAC Filtering
            if role in ["MASTER_ADMIN", "ADMIN", "TELEMARKETER"]:
                filtered_students.append(student_data)
            elif role == "BRANCH_ADMIN" and student_branch == agent_code:
                filtered_students.append(student_data)
            elif role == "COUNSELLOR" and ref_code == agent_code:
                filtered_students.append(student_data)
            
    return {"status": "success", "data": filtered_students}