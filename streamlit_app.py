import streamlit as st
import json
import uuid
import datetime as dt
import pandas as pd

# --- CUSTOM MODULES ---
# Ensure these files exist in your folder
try:
    from doc_parser import extract_text_from_pdf
except ImportError:
    # Fallback prevents crash if file is missing
    def extract_text_from_pdf(f): return "Error: doc_parser.py not found."

from ai_report import generate_abigail_content
from pdf_generator import create_pdf
from scoring import calculate_lead_score
from engine import rank_programs
from db import (
    init_db, insert_case, get_case, list_cases, update_status, get_user_by_email,
    hash_password, create_user, list_users, assign_case, list_cases_advanced,
    list_cases_filtered, mark_contacted, save_full_report, update_case_payload,
    update_case_status_and_payload
)

# -------------------------
# APP CONFIG
# -------------------------
init_db()
st.set_page_config(page_title="Fortrust 2.0 Ecosystem", layout="wide", page_icon="🎓")

# -------------------------
# HELPER FUNCTIONS
# -------------------------
def rerun():
    try: st.rerun()
    except: st.experimental_rerun()

def hours_since(iso_ts: str) -> float:
    try:
        t = dt.datetime.fromisoformat(iso_ts.replace("Z", ""))
        return (dt.datetime.utcnow() - t).total_seconds() / 3600.0
    except: return 0.0

def get_query_param(key):
    """Safe method to get URL params on ANY Streamlit version"""
    try:
        # New Streamlit (1.30+)
        return st.query_params.get(key, "")
    except AttributeError:
        # Old Streamlit (<1.30)
        params = st.experimental_get_query_params()
        return params.get(key, [""])[0]

def login_panel():
    st.sidebar.markdown("---")
    st.sidebar.subheader("Partner Login")
    email = st.sidebar.text_input("Email", key="login_email")
    pw = st.sidebar.text_input("Password", type="password", key="login_pw")
    if st.sidebar.button("Login"):
        u = get_user_by_email(email.strip().lower())
        # u = [user_id, name, email, pw_hash, role, is_active, referral_code]
        if u and u[5]: # is_active
            if hash_password(pw) == u[3]:
                st.session_state["user"] = {
                    "user_id": u[0], "name": u[1], "email": u[2], 
                    "role": u[4], "referral_code": u[6]
                }
                rerun()
            else: st.sidebar.error("Wrong password")
        else: st.sidebar.error("User not found or inactive")

def logout_button():
    if st.sidebar.button("Logout"):
        st.session_state.pop("user", None)
        rerun()

# -------------------------
# MAIN ROUTING LOGIC
# -------------------------

if "user" not in st.session_state:
    # ====================================================
    # VIEW A: PUBLIC MARKETPLACE (Model A)
    # ====================================================
    st.title("🌏 Fortrust Global Marketplace")
    st.markdown("#### Search Programs. Apply Instantly. Get AI Counseling.")

    # 1. Referral Tracking (FIXED FOR ALL VERSIONS)
    ref_code = get_query_param("ref")
    
    if ref_code:
        st.info(f"✅ Applying via Verified Partner: **{ref_code}**")

    # 2. Program Search Engine
    with st.expander("🔍 **Find Your Dream Program**", expanded=True):
        c1, c2, c3 = st.columns(3)
        with c1: search_dest = st.selectbox("Destination", ["Australia", "UK", "USA", "Canada", "Singapore"])
        with c2: search_major = st.text_input("Major", placeholder="e.g. Data Science")
        with c3: search_budget = st.selectbox("Max Budget", ["Unlimited", "< $20k/yr", "< $40k/yr"])
        
        if st.button("Search Database"):
            st.success(f"Found 12 matches for {search_major} in {search_dest}")
            st.dataframe(pd.DataFrame([
                {"University": "Monash University", "Rank": "#42 Global", "Tuition": "$32,000", "Match": "98%"},
                {"University": "RMIT", "Rank": "#140 Global", "Tuition": "$28,000", "Match": "92%"},
                {"University": "Deakin", "Rank": "#233 Global", "Tuition": "$25,000", "Match": "89%"},
            ]), use_container_width=True)

    st.markdown("---")

    # 3. Application Form (Data Wajib)
    st.subheader("🚀 Start Your Application")
    with st.form("intake_form"):
        col1, col2 = st.columns(2)
        with col1:
            student_name = st.text_input("Nama Lengkap *")
            phone = st.text_input("WhatsApp Number *")
            email = st.text_input("Email *")
        with col2:
            # Dropdown exactly as requested
            referral_source = st.selectbox("Tahu event/info dari mana? *", [
                "Pilih sumber...", "Meta Ads", "Tiktok Ads", "Expo", 
                "School Expo", "Info Sessions", "Webinar", "Referrals"
            ])
            
            # Sub-dropdown if Referrals is chosen
            referral_detail = ""
            if referral_source == "Referrals":
                referral_detail = st.selectbox("Source of Referrals:", [
                    "Teman Sekolah/Kuliah", "Guru BK", "Guru Les"
                ])
                
            destinations = st.multiselect("Preferred Destinations", ["Australia", "UK", "USA", "Canada", "Singapore"])
        
        # Hidden Agent Code
        manual_ref = st.text_input("Agent/Referral Code (Optional)", value=ref_code)

        if st.form_submit_button("Submit Data"):
            if not student_name or not phone or referral_source == "Pilih sumber...":
                st.error("Nama, WA, dan Sumber Info wajib diisi.")
            else:
                cid = str(uuid.uuid4())[:8].upper()
                payload = {
                    "student_name": student_name, "phone": phone, "email": email,
                    "destinations": destinations, 
                    "referral_source": referral_source,
                    "referral_detail": referral_detail,
                    "counsellor_data": {}, "qualification_data": {}
                }
                insert_case(cid, payload, "New Lead", referral_code=manual_ref)
                
                st.balloons()
                st.success(f"Data Submitted! Your Ref ID: {cid}")
                st.info("Tim Counsellor kami akan segera menghubungi Anda.")
else:
    # ====================================================
    # LOGGED IN VIEWS
    # ====================================================
    user = st.session_state["user"]
    role = user["role"]
    
    st.sidebar.title("Fortrust OS")
    st.sidebar.write(f"👋 **{user['name']}**")
    st.sidebar.caption(f"Role: {role}")
    
    # MICRO-AGENT VIEW (Model B)
    if role == "MICRO_AGENT":
        st.sidebar.success(f"🔗 Code: **{user['referral_code']}**")
        st.sidebar.code(f"?ref={user['referral_code']}")
        logout_button()

        st.title("Franchise Partner Dashboard")
        
        tab1, tab2 = st.tabs(["My Pipeline", "My Commissions"])
        
        with tab1:
            st.subheader("Your Students")
            my_cases = list_cases_advanced(referral_code=user['referral_code'])
            
            if not my_cases:
                st.info("No students yet. Share your referral link to start earning!")
            else:
                for c in my_cases:
                    with st.container():
                        c1, c2, c3 = st.columns([3, 1, 1])
                        c1.write(f"**{c[3]}**")
                        c1.caption(f"Applied: {c[1][:10]}")
                        
                        status_map = {"NEW": 10, "CONTACTED": 30, "HOT LEAD": 50, "APPLIED": 80, "WON": 100}
                        progress = status_map.get(c[2], 0)
                        c2.progress(progress / 100, text=c[2])
                        
                        if c[2] == "WON":
                            c3.success("💰 $500")
                        else:
                            c3.caption("Pending")
                        st.divider()

        with tab2:
            st.metric("Total Earnings", "$1,500")
            st.metric("Next Payout", "March 15th")

    # ADMIN / INTERNAL AGENT VIEW (The Brain)
    else:
        logout_button()
        menu = st.sidebar.radio("Command Center", ["Pipeline", "Case Detail", "Admin Panel"])

        # --- PIPELINE ---
        if menu == "Pipeline":
            st.title("Global Pipeline")
            with st.expander("Filters", expanded=True):
                c1, c2 = st.columns(2)
                
                # UPDATED STATUSES HERE:
                client_statuses = ["All", "QUALIFIED LEADS", "CONSULTING PROCESS", "UNI APPLICATION", "VISA", "COMPLETED"]
                with c1: status_filter = st.selectbox("Status", client_statuses)
                
                with c2: 
                    agents = list_users() # Show all users so Master Admin can filter
                    agent_opts = ["All"] + [a[1] for a in agents]
                    agent_filter = st.selectbox("Filter by Agent/Counsellor", agent_opts)

            status_val = None if status_filter == "All" else status_filter
            rows = list_cases_advanced(status=status_val)
            
            st.dataframe([
                {"ID": r[0], "Date": r[1][:10], "Status": r[2], "Student": r[3], "Agent": r[6]} 
                for r in rows
            ], use_container_width=True)

        # --- CASE DETAIL (The Brain) ---
        elif menu == "Case Detail":
            st.title("Student Case File")
            
            all_cases = list_cases()
            c_ids = [x[0] for x in all_cases]
            selected_id = st.selectbox("Search Student ID/Name", c_ids, format_func=lambda x: f"{x} - {next((c[3] for c in all_cases if c[0]==x), '')}")
            
            if selected_id:
                case_row = get_case(selected_id)
                cid, cdate, status, sname, phone, email, raw_json, brief, assignee, full_rep, rep_date, ref_code = case_row
                payload = json.loads(raw_json)
                c_data = payload.get("counsellor_data", {})

                c1, c2 = st.columns([3, 1])
                c1.header(f"{sname}")
                if ref_code: c1.caption(f"📍 Referred by Agent: **{ref_code}**")
                c2.metric("Status", status)

                # --- 1. OCR ---
                st.info("🤖 **Step 1: Upload Psychometric Results**")
                uploaded_pdf = st.file_uploader("Upload Navigather/Psych PDF", type="pdf", key="ocr_upload")
                if uploaded_pdf:
                    with st.spinner("AI Reading Document..."):
                        extracted_text = extract_text_from_pdf(uploaded_pdf)
                        if extracted_text:
                            if not c_data.get("personality_notes"):
                                c_data["personality_notes"] = extracted_text[:2000]
                                payload["counsellor_data"] = c_data
                                update_case_payload(cid, payload)
                                st.success("Text Extracted & Saved to Profile!")
                            else: st.warning("Notes already exist. Clear manually to overwrite.")
                
                # --- PART 2: DATA OPSIONAL (Counsellor Input) ---
                st.info("📝 **Step 2: Data Opsional (Konsultasi Awal)**")
                with st.form("optional_data_form"):
                    col_a, col_b = st.columns(2)
                    with col_a: 
                        kota = st.text_input("Kota Tempat Tinggal", value=c_data.get("kota", ""))
                        asal_sekolah = st.text_input("Asal Sekolah", value=c_data.get("asal_sekolah", ""))
                        kelas = st.text_input("Sekarang kelas berapa?", value=c_data.get("kelas", ""))
                    with col_b: 
                        cabang = st.selectbox("Cabang Fortrust Terdekat", ["Pusat/Jakarta", "Surabaya", "Bandung", "Medan", "Lainnya"])
                        need_profiling = st.radio("Need Profiling Test?", ["Yes", "No"], horizontal=True)
                        need_language = st.radio("Need Language Preparation?", ["Yes", "No"], horizontal=True)

                    if st.form_submit_button("💾 Save Data Opsional"):
                        payload["counsellor_data"].update({
                            "kota": kota, "asal_sekolah": asal_sekolah, "kelas": kelas,
                            "cabang": cabang, "need_profiling": need_profiling, "need_language": need_language
                        })
                        update_case_payload(cid, payload)
                        st.success("Data Opsional Updated")
                        rerun()

                # --- 3. GENERATE REPORT ---
                st.info("📄 **Step 3: Strategic Report**")
                col_gen1, col_gen2 = st.columns([1, 2])
                with col_gen1:
                    if st.button("Generate 'Abigail-Style' PDF"):
                        with st.spinner("Analyzing Matrix..."):
                            df = pd.read_csv("data/programs.csv")
                            ranks = rank_programs({"finance":payload.get("finance",{}), "major_choices":["General"], "destinations":[], "gpa":"3.0", "english":"IELTS"}, df)
                            content = generate_abigail_content(sname, payload, ranks)
                            fname = create_pdf(sname, content)
                            with open(fname, "rb") as f:
                                st.session_state['pdf_bytes'] = f.read()
                                st.session_state['pdf_name'] = fname
                            st.success("Generated!")
                
                with col_gen2:
                    if 'pdf_bytes' in st.session_state:
                        st.download_button("📥 Download PDF", st.session_state['pdf_bytes'], file_name=st.session_state['pdf_name'], mime='application/pdf')

        # --- ADMIN PANEL ---
        # --- MASTER ADMIN PANEL ---
        elif menu == "Admin Panel":
            st.title("👑 Master Admin Dashboard")
            
            # --- 1. ANALYTICS & GRAPHICS (Siapa yang tertinggi) ---
            st.subheader("📊 Agent Leaderboard & Analytics")
            
            all_cases = list_cases_advanced()
            if all_cases:
                # Convert to DataFrame for easy charting
                # Columns: case_id, created_at, status, student_name, dest1, budget, assigned_to, referral_code
                # Note: If your list_cases_advanced doesn't return referral_code in pos 7, adjust accordingly. 
                # For safety, let's pull raw data:
                import sqlite3
                conn = sqlite3.connect("data/fortrust.db")
                df_cases = pd.read_sql_query("SELECT case_id, status, referral_code FROM cases", conn)
                
                if not df_cases.empty and 'referral_code' in df_cases.columns:
                    # Filter by Status matching client requests
                    c1, c2, c3, c4, c5 = st.columns(5)
                    c1.metric("Qualified Leads", len(df_cases[df_cases['status'] == 'QUALIFIED LEADS']))
                    c2.metric("Consulting Process", len(df_cases[df_cases['status'] == 'CONSULTING PROCESS']))
                    c3.metric("Uni Application", len(df_cases[df_cases['status'] == 'UNI APPLICATION']))
                    c4.metric("Visa", len(df_cases[df_cases['status'] == 'VISA']))
                    c5.metric("Completed (Business)", len(df_cases[df_cases['status'] == 'COMPLETED']))

                    st.markdown("**Top Performing Agents (Total Students)**")
                    # Group by agent code
                    agent_counts = df_cases['referral_code'].value_counts().reset_index()
                    agent_counts.columns = ['Agent Code', 'Total Students']
                    # Clean up empty codes
                    agent_counts = agent_counts[agent_counts['Agent Code'] != ""]
                    agent_counts = agent_counts.dropna()
                    
                    if not agent_counts.empty:
                        st.bar_chart(data=agent_counts.set_index('Agent Code'))
                    else:
                        st.info("No agent data to chart yet.")
            else:
                st.info("No data available for analytics.")

            st.divider()

            # --- 2. ROLE MANAGEMENT (Create & Edit) ---
            st.subheader("👥 User & Role Management")
            
            tab_create, tab_edit = st.tabs(["Create New User", "Edit Existing User"])
            
            roles_list = ["AGENT", "MICRO_AGENT", "COUNSELLOR", "ADMIN", "MASTER_ADMIN"]

            with tab_create:
                with st.form("create_agent"):
                    c1, c2 = st.columns(2)
                    with c1:
                        a_name = st.text_input("Full Name")
                        a_email = st.text_input("Email")
                    with c2:
                        password = st.text_input("Password", type="password")
                        role_new = st.selectbox("Assign Role", roles_list)
                    
                    if st.form_submit_button("➕ Create Account"):
                        create_user(uuid.uuid4().hex[:6].upper(), a_name, a_email, password, role_new)
                        st.success(f"User {a_name} Created as {role_new}!")
                        rerun()

            with tab_edit:
                users = list_users()
                df_users = pd.DataFrame(users, columns=["ID", "Name", "Email", "Hash", "Role", "Active", "RefCode"])
                st.dataframe(df_users[["ID", "Name", "Email", "Role", "RefCode"]], use_container_width=True)
                
                with st.form("edit_role_form"):
                    st.write("Change User Role")
                    user_to_edit = st.selectbox("Select User", df_users['ID'].tolist(), format_func=lambda x: f"{x} - {df_users[df_users['ID']==x]['Name'].values[0]}")
                    new_role_val = st.selectbox("New Role", roles_list)
                    
                    if st.form_submit_button("💾 Update Role"):
                        from db import update_user_role # Ensure it's imported
                        update_user_role(user_to_edit, new_role_val)
                        st.success("Role Updated Successfully!")
                        rerun()

            st.divider()

            # --- 3. DATA ASSIGNMENT (Transfer Students) ---
            st.subheader("🔄 Transfer Student to New Agent/Counsellor")
            with st.form("transfer_student"):
                all_c = list_cases()
                if all_c:
                    student_to_move = st.selectbox("Select Student", [c[0] for c in all_c], format_func=lambda x: f"{x} - {next((c[3] for c in all_c if c[0]==x), '')}")
                    new_agent_code = st.selectbox("Assign to Agent/Counsellor Code", df_users['RefCode'].dropna().tolist())
                    
                    if st.form_submit_button("Transfer Data"):
                        from db import update_case_agent
                        update_case_agent(student_to_move, new_agent_code)
                        st.success(f"Student transferred to {new_agent_code}!")
                        rerun()