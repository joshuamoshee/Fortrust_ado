# report.py

def make_counsellor_brief(payload: dict) -> str:
    """
    Generates a simple Markdown summary of the new lead for the counsellor.
    (Updated to remove dependency on old scoring logic).
    """
    s_name = payload.get("student_name", "Unknown")
    phone = payload.get("phone", "No Phone")
    email = payload.get("email", "-")
    source = payload.get("referral_source", "Unknown")
    
    # Financials (if provided in old form, otherwise placeholder)
    finance = payload.get("finance", {})
    budget = finance.get("annual_budget", "Not stated")
    
    # Destinations
    dests = payload.get("destinations", [])
    dest_str = ", ".join(dests) if dests else "Undecided"

    brief = f"""
### 👤 New Lead: {s_name}
* **Phone:** {phone}
* **Email:** {email}
* **Source:** {source}
* **Interests:** {dest_str}

---
**⚠️ Action Required:** This is a raw lead from the Public Intake. 
Please go to the **"Qualification"** section in the Dashboard to interview the student and calculate their Lead Score.
"""
    return brief