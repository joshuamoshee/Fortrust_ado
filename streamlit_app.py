import streamlit as st
import json
import uuid
import datetime as dt
import pandas as pd
from scoring import calculate_lead_score # Import the new logic
from full_report import make_internal_report
from db import init_db, insert_case, get_case, list_cases, update_status, get_user_by_email, hash_password, create_user, list_users, assign_case, list_cases_advanced, log_event, log_contact_attempt, mark_contacted

# Initialize
init_db()
st.set_page_config(page_title="Fortrust 2.0", layout="wide")

# --- AUTH & HELPERS ---
def rerun():
    try: st.rerun()
    except: st.experimental_rerun()

def hours_since(iso_ts: str) -> float:
    try:
        t = dt.datetime.fromisoformat(iso_ts.replace("Z", ""))
        return (dt.datetime.utcnow() - t).total_seconds() / 3600.0
    except: return 0.0

# ---------------------------------------------------------
# MODE 1: PUBLIC INTAKE (Data Wajib Only)
# ---------------------------------------------------------
if "user" not in st.session_state:
    st.sidebar.title("Login")
    # Simple login flow for staff vs public view
    mode = st.sidebar.radio("View", ["Public Form", "Staff Login"])
else:
    mode = "Staff Dashboard"

if mode == "Public Form":
    st.title("Fortrust Education - Student Intake")
    st.write("Please fill in your details to connect with a counsellor.")

    with st.form("intake_form"):
        # DATA WAJIB
        st.subheader("Personal Details")
        col1, col2 = st.columns(2)
        with col1:
            student_name = st.text_input("Nama Lengkap *")
            wa_number = st.text_input("WhatsApp Number *")
        with col2:
            email = st.text_input("Email *")
        
        st.subheader("Source")
        referral_source = st.selectbox("Tahu Event dari mana?", 
            ["Meta Ads", "Tiktok Ads", "Expo", "School Expo", "Info Sessions", "Webinar", "Referrals"])
        
        # Conditional Logic for Referral
        referral_detail = None
        if referral_source == "Referrals":
            referral_detail = st.selectbox("Source of Referral", ["Teman Sekolah/Kuliah", "Guru BK", "Guru Les"])

        submitted = st.form_submit_button("Submit Data")

    if submitted:
        if not student_name or not wa_number or not email:
            st.error("Please fill in all mandatory fields (*).")
        else:
            # Create minimal payload
            payload = {
                "student_name": student_name,
                "phone": wa_number,
                "email": email,
                "referral_source": referral_source,
                "referral_detail": referral_detail,
                # Placeholders for Opsional Data
                "counsellor_data": {}, 
                "qualification_data": {} 
            }
            case_id = str(uuid.uuid4())[:8].upper()
            
            # Insert into DB (Status: NEW)
            insert_case(case_id, payload, "Pending Profiling") 
            st.success("Thank you! A counsellor will contact you shortly.")

# ---------------------------------------------------------
# MODE 2: STAFF DASHBOARD
# ---------------------------------------------------------
elif mode == "Staff Dashboard":
    user = st.session_state["user"]
    st.sidebar.title(f"Welcome, {user['name']}")
    if st.sidebar.button("Logout"):
        del st.session_state["user"]
        rerun()
    
    tab = st.sidebar.radio("Menu", ["Pipeline", "My Cases", "Case Detail"])

    # --- PIPELINE & MY CASES (Simplified for brevity, similar to your old code) ---
    if tab == "Pipeline":
        st.title("Global Pipeline")
        # Reuse your existing list_cases_advanced logic here
        rows = list_cases_advanced(status="NEW")
        st.dataframe(pd.DataFrame(rows, columns=["ID", "Date", "Status", "Name", "Dest", "Budget", "Agent"]))

    # --- CASE DETAIL (The Core Logic) ---
    elif tab == "Case Detail":
        st.title("Consultation & Qualification")
        
        # 1. Select Case
        case_id_input = st.text_input("Enter Case ID to Manage")
        if not case_id_input:
            st.info("Please enter a Case ID from the Pipeline.")
            st.stop()
            
        row = get_case(case_id_input)
        if not row:
            st.error("Case not found.")
            st.stop()

        # Unpack Data
        # Ensure your DB `get_case` returns the correct number of columns
        # Assuming standard structure:
        cid, created_at, status, sname, phone, email, raw_json, brief_md, assigned_to = row[:9]
        payload = json.loads(raw_json)

        # 2. Display Mandatory Data
        st.info(f"Student: **{sname}** | WA: {phone} | Source: {payload.get('referral_source')}")

        # 3. COUNSELLOR INPUT SECTION
        with st.expander("📝 1. DATA OPSIONAL (Fill during chat)", expanded=True):
            with st.form("optional_data_form"):
                c_data = payload.get("counsellor_data", {})
                
                col_a, col_b = st.columns(2)
                with col_a:
                    city = st.text_input("Kota Tempat Tinggal", value=c_data.get("city", ""))
                    school = st.text_input("Asal Sekolah", value=c_data.get("school", ""))
                    grade = st.text_input("Kelas Berapa", value=c_data.get("grade", ""))
                with col_b:
                    branch = st.selectbox("Cabang Fortrust Terdekat", ["Jakarta", "Surabaya", "Bandung", "Medan"], index=0)
                    need_test = st.radio("Need Profiling Test?", ["Yes", "No"], horizontal=True)
                    need_lang = st.radio("Need Language Prep?", ["Yes", "No"], horizontal=True)
                
                if st.form_submit_button("Save Optional Data"):
                    payload["counsellor_data"] = {
                        "city": city, "school": school, "grade": grade,
                        "branch": branch, "need_test": need_test, "need_lang": need_lang
                    }
                    # Update DB (You need to implement a generic update_case_payload function in db.py)
                    # For now, we assume update logic exists or we just re-insert
                    # insert_case(cid, payload, brief_md) <--- simpler to update payload in DB
                    st.success("Optional Data Saved.")
                    # In real app: update_json_in_db(cid, payload)

        # 4. QUALIFICATION ALGORITHM (The 100 Points)
        st.divider()
        st.subheader("🔍 2. QUALIFICATION CHECK (The Algorithm)")
        
        q_data = payload.get("qualification_data", {})
        
        with st.form("qualification_form"):
            st.markdown("### A. Financial (50%)")
            q4 = st.selectbox("Q4: Part-time Need", 
                ["SURVIVAL_MODE", "POCKET_MONEY"], 
                format_func=lambda x: "Harus kerja untuk hidup (Survival)" if x == "SURVIVAL_MODE" else "Cari pengalaman (Pocket Money)")
            
            q5 = st.selectbox("Q5: Travel History", ["NO_TRAVEL", "BUDGET_TRAVEL", "PREMIUM_TRAVEL"])
            q6 = st.selectbox("Q6: Accomodation", ["SENSITIVE", "COMFORT"],
                format_func=lambda x: "Cari paling murah/Asrama (Sensitive)" if x == "SENSITIVE" else "Apartemen/Sendiri (Comfort)")
            
            q7 = st.selectbox("Q7: Liquidity (Deposit)", ["NOT_LIQUID", "LIQUID"],
                format_func=lambda x: "Jual aset/Pinjaman (Not Liquid)" if x == "NOT_LIQUID" else "Siap Transfer (Liquid)")

            st.markdown("### B. Motivation (30%)")
            q1 = st.selectbox("Q1: Action Taken", ["DREAMER", "DOER"],
                format_func=lambda x: "Baru mikir (Dreamer)" if x == "DREAMER" else "Sudah riset/Visa check (Doer)")
            
            q2 = st.selectbox("Q2: Emotional Anchor", ["HIGH_ANCHOR", "PRACTICAL"],
                format_func=lambda x: "Pacar/Ortu Sakit/Jabatan (High Anchor)" if x == "HIGH_ANCHOR" else "Siap resign/packing (Practical)")
            
            q8 = st.selectbox("Q8: Blocker Scenario", ["FUNDING_BLOCKER", "LOGISTIC_BLOCKER"],
                format_func=lambda x: "Butuh Full Scholarship (Funding Blocker)" if x == "FUNDING_BLOCKER" else "Masalah Dokumen (Logistic)")

            st.markdown("### C. Readiness (20%)")
            q3 = st.selectbox("Q3: Family Support", ["CONFLICT", "SUPPORT"])
            q9 = st.selectbox("Q9: English Test", ["UNTESTED", "TESTED"])
            q10 = st.selectbox("Q10: Decision Maker", ["HIDDEN_DM", "CLEAR_DM"])

            calc_btn = st.form_submit_button("CALCULATE SCORE & STATUS")

        if calc_btn:
            # Construct Payload for Scoring
            score_payload = {
                "q_part_time": q4, "q_travel": q5, "q_accom": q6, "q_liquid": q7,
                "q_action": q1, "q_anchor": q2, "q_blocker": q8,
                "q_family": q3, "q_language": q9, "q_dm": q10
            }
            
            # Run the Algorithm
            result = calculate_lead_score(score_payload)
            
            # Display Results
            st.divider()
            col_res1, col_res2 = st.columns([1, 2])
            
            with col_res1:
                st.metric("Total Score", f"{result['score']}/100")
                
                status_color = "red"
                if "HOT" in result['status']: status_color = "green"
                elif "WARM" in result['status']: status_color = "orange"
                
                st.markdown(f"### Status: :{status_color}[{result['status']}]")
            
            with col_res2:
                st.info(f"**Action Plan:** {result['action_plan']}")
                with st.expander("See Calculation Breakdown"):
                    for item in result['breakdown']:
                        st.write(f"- {item}")
            
            # Save these results to the payload
            payload["qualification_data"] = score_payload
            payload["algo_result"] = result
            # In real app: update_json_in_db(cid, payload)
            # In real app: update_status(cid, result['status']) to change column in DB
            st.toast("Score Updated!")

# --- LOGIN PANEL (Simple) ---
elif mode == "Staff Login":
    # ... (Your existing login code here) ...
    if st.button("Simulate Login"):
        st.session_state["user"] = {"name": "Admin", "role": "ADMIN", "user_id": "ADM01"}
        rerun()