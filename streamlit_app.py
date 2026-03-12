import streamlit as st
import json
import uuid
import datetime as dt
import pandas as pd

# --- CUSTOM MODULES ---
try:
    from doc_parser import extract_text_from_pdf
except ImportError:
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
    st.rerun()

def hours_since(iso_ts: str) -> float:
    try:
        t = dt.datetime.fromisoformat(iso_ts.replace("Z", ""))
        return (dt.datetime.utcnow() - t).total_seconds() / 3600.0
    except: return 0.0

def get_query_param(key):
    try:
        return st.query_params.get(key, "")
    except AttributeError:
        params = st.experimental_get_query_params()
        return params.get(key, [""])[0]

def login_panel():
    st.sidebar.markdown("---")
    st.sidebar.subheader("Partner Login")
    email = st.sidebar.text_input("Email", key="login_email")
    pw = st.sidebar.text_input("Password", type="password", key="login_pw")
    if st.sidebar.button("Login"):
        u = get_user_by_email(email.strip().lower())
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
    # VIEW A: PUBLIC INTAKE (Model A - Streamlined)
    # ====================================================
    st.title("🌏 Fortrust Global Marketplace")
    st.markdown("#### Apply Instantly. Get AI Counseling.")

    # 1. Referral Tracking
    ref_code = get_query_param("ref")
    if ref_code:
        st.info(f"✅ Applying via Verified Partner: **{ref_code}**")

    # 2. Application Form
    st.subheader("🚀 Start Your Application")
    with st.form("intake_form"):
        col1, col2 = st.columns(2)
        with col1:
            student_name = st.text_input("Nama Lengkap *")
            phone = st.text_input("WhatsApp Number *")
            email = st.text_input("Email *")
        with col2:
            referral_source = st.selectbox("Tahu event/info dari mana? *", [
                "Pilih sumber...", "Meta Ads", "Tiktok Ads", "Expo", 
                "School Expo", "Info Sessions", "Webinar", "Referrals"
            ])
            
            referral_detail = ""
            if referral_source == "Referrals":
                referral_detail = st.selectbox("Source of Referrals:", [
                    "Teman Sekolah/Kuliah", "Guru BK", "Guru Les"
                ])
                
            destinations = st.multiselect("Preferred Destinations", ["Australia", "UK", "USA", "Canada", "Singapore"])
        
        st.markdown("---")
        st.markdown("**🏢 Khusus Internal / Agent (Opsional)**")
        c_branch1, c_branch2, c_branch3 = st.columns(3)
        with c_branch1:
            list_kantor = [
                "Pilih Cabang...", "Jakarta - Sudirman", "Jakarta - Kelapa Gading", "Jakarta - PIK", 
                "Tangerang - Gading Serpong", "Bandung", "Surabaya", 
                "Semarang", "Bali", "Medan", "Makassar", "Pusat / Head Office", "Lainnya"
            ]
            kantor = st.selectbox("Kantor (Branch)", list_kantor)
        with c_branch2:
            nama_agent = st.text_input("Nama Agent")
        with c_branch3:
            manual_ref = st.text_input("Agent/Referral Code (Opsional)", value=ref_code, help="Bisa dikosongkan jika lupa.")

        if st.form_submit_button("Submit Data"):
            if not student_name or not phone or referral_source == "Pilih sumber...":
                st.error("Nama, WA, dan Sumber Info wajib diisi.")
            else:
                cid = str(uuid.uuid4())[:8].upper()
                
                # Bundle the optional branch and agent info
                c_data = {}
                if kantor != "Pilih Cabang...": c_data["kantor"] = kantor
                if nama_agent: c_data["nama_agent"] = nama_agent
                
                payload = {
                    "student_name": student_name, "phone": phone, "email": email,
                    "destinations": destinations, 
                    "referral_source": referral_source,
                    "referral_detail": referral_detail,
                    "counsellor_data": c_data, "qualification_data": {}
                }
                insert_case(cid, payload, "New Lead", referral_code=manual_ref)
                
                st.balloons()
                st.success(f"Data Submitted! Your Ref ID: {cid}")
                st.info("Tim Counsellor kami akan segera menghubungi Anda.")
                
    login_panel()

else:
    # ====================================================
    # LOGGED IN VIEWS (Role-Based Access Control)
    # ====================================================
    user = st.session_state["user"]
    role = user["role"]
    
    st.sidebar.title("Fortrust OS")
    st.sidebar.write(f"👋 **{user['name']}**")
    st.sidebar.caption(f"Role: **{role}**")
    if role in ["AGENT", "MICRO_AGENT"]:
        st.sidebar.success(f"🔗 Code: **{user['referral_code']}**")
        st.sidebar.code(f"?ref={user['referral_code']}")
    
    logout_button()
    st.sidebar.markdown("---")

    # --- DYNAMIC MENU BUILDER ---
    menu_options = []
    
    if role in ["AGENT", "MICRO_AGENT"]:
        menu_options = ["Partner Dashboard"]
    elif role == "COUNSELLOR":  
        menu_options = ["Student Pipelines", "Case Detail", "University Search"]
    elif role in ["ADMIN", "MASTER_ADMIN"]: 
        menu_options = ["Student Pipelines", "Case Detail", "University Search", "Master Admin Panel"]
    else:
        # Fallback 
        menu_options = ["Student Pipelines", "Case Detail", "University Search", "Master Admin Panel"]

    menu = st.sidebar.radio("Main Menu", menu_options)
    # ==========================================
    # 1. PARTNER DASHBOARD (Agents Only)
    # ==========================================
    if menu == "Partner Dashboard":
        st.title("💼 My Workspace (Tasks & Pipeline)")
        
        # WE ADDED A 3RD TAB HERE
        tab1, tab2, tab3 = st.tabs(["My Pipeline & Tasks", "My Commissions", "📥 Bulk Upload Leads"])
        
        with tab1:
            st.subheader("Your Assigned Students")
            my_cases = list_cases_advanced(referral_code=user['referral_code'])
            
            if not my_cases:
                st.info("No students assigned yet. Share your referral link to start earning!")
            else:
                for c in my_cases:
                    case_details = get_case(c[0]) 
                    if case_details:
                        cid, cdate, status, sname, phone, email, raw_json, brief, assignee, full_rep, rep_date, ref_code = case_details
                        
                        with st.expander(f"👤 {sname}  |  Status: {status}  |  Applied: {cdate[:10]}"):
                            c1, c2 = st.columns([2, 1])
                            
                            with c1:
                                st.markdown(f"**📞 WhatsApp:** {phone}")
                                st.markdown(f"**✉️ Email:** {email}")
                                
                                payload = json.loads(raw_json)
                                c_data = payload.get("counsellor_data", {})
                                if c_data.get("kantor"):
                                    st.caption(f"🏢 Branch: {c_data.get('kantor')} | Agent: {c_data.get('nama_agent', '-')}")
                                elif c_data.get("kota"):
                                    st.caption(f"📍 Location: {c_data.get('kota')} | 🏫 School: {c_data.get('asal_sekolah')}")
                            
                            with c2:
                                status_map = {"NEW": 10, "CONTACTED": 30, "HOT LEAD": 50, "QUALIFIED LEADS": 60, "CONSULTING PROCESS": 70, "UNI APPLICATION": 80, "VISA": 90, "COMPLETED": 100}
                                progress = status_map.get(status, 10)
                                st.progress(progress / 100, text=f"Progress: {progress}%")
                                
                                if status == "COMPLETED":
                                    st.success("💰 Ready for Payout")

        with tab2:
            st.metric("Total Earnings", "Calculating...")
            st.metric("Next Payout", "15th of Month")

        # --- NEW BULK UPLOAD TAB ---
        with tab3:
            st.subheader("📥 Bulk Upload from Events/Expos")
            st.markdown("Got an Excel file from a school expo? Upload it here to instantly assign leads to your pipeline.")
            st.info("⚠️ **Format Requirement:** Your Excel file MUST have columns named exactly: **Nama Siswa**, **WhatsApp**, and **Email**.")
            
            uploaded_excel = st.file_uploader("Upload Excel File (.xlsx)", type=["xlsx"])
            
            if uploaded_excel:
                if st.button("🚀 Process & Import Leads", type="primary"):
                    try:
                        df_leads = pd.read_excel(uploaded_excel)
                        
                        # Validate that the necessary columns exist
                        if 'Nama Siswa' not in df_leads.columns or 'WhatsApp' not in df_leads.columns:
                            st.error("❌ Error: The Excel file is missing the 'Nama Siswa' or 'WhatsApp' columns. Please rename your columns and try again.")
                        else:
                            success_count = 0
                            with st.spinner("Importing leads to database..."):
                                for index, row in df_leads.iterrows():
                                    s_name = str(row.get('Nama Siswa', '')).strip()
                                    s_phone = str(row.get('WhatsApp', '')).strip()
                                    s_email = str(row.get('Email', '')).strip()
                                    
                                    # Skip empty rows
                                    if s_name and s_phone and s_name.lower() != 'nan':
                                        new_cid = str(uuid.uuid4())[:8].upper()
                                        
                                        # Package the JSON data exactly like the manual form does
                                        payload = {
                                            "student_name": s_name, "phone": s_phone, "email": s_email,
                                            "destinations": [], 
                                            "referral_source": "Event/Expo Bulk Upload",
                                            "referral_detail": "Bulk Import",
                                            "counsellor_data": {"nama_agent": user['name']}, 
                                            "qualification_data": {}
                                        }
                                        
                                        # Insert into database securely attached to THIS agent
                                        insert_case(new_cid, payload, "NEW", referral_code=user['referral_code'])
                                        success_count += 1
                                        
                            st.success(f"✅ Successfully imported {success_count} new leads into your pipeline!")
                            # Refresh to show them in Tab 1
                            st.button("View My New Leads") 
                            
                    except Exception as e:
                        st.error(f"Error reading Excel file: {e}")

    # ==========================================
    # 2. UNIVERSITY SEARCH (Internal Only)
    # ==========================================
    elif menu == "University Search":
        st.title("🔍 Program & University Database")
        st.markdown("Internal tool for Counsellors to find and recommend programs.")
        
        c1, c2, c3 = st.columns(3)
        with c1: search_dest = st.selectbox("Destination", ["Australia", "UK", "USA", "Canada", "Singapore"])
        with c2: search_major = st.text_input("Major", placeholder="e.g. Data Science")
        with c3: search_budget = st.selectbox("Max Budget", ["Unlimited", "< $20k/yr", "< $40k/yr"])
        
        if st.button("Search Database"):
            st.success(f"Found matches for {search_major} in {search_dest}")
            st.dataframe(pd.DataFrame([
                {"University": "Monash University", "Rank": "#42 Global", "Tuition": "$32,000", "Match": "98%"},
                {"University": "RMIT", "Rank": "#140 Global", "Tuition": "$28,000", "Match": "92%"},
                {"University": "Deakin", "Rank": "#233 Global", "Tuition": "$25,000", "Match": "89%"},
            ]), width='stretch')

    # ==========================================
    # 3. STUDENT PIPELINES (Lead Processing)
    # ==========================================
    elif menu == "Student Pipelines":
        st.title("📋 Student Pipelines")
        st.markdown("Process raw leads, update follow-up remarks, and assign them to branches/counsellors.")
        
        # --- 1. FILTERS ---
        with st.expander("🔍 Filters", expanded=True):
            c1, c2 = st.columns(2)
            
            # Added NEW and the requested Remarks to the status list
            pipeline_statuses = [
                "All", "NEW", "Contacted 1", "Contacted 2", "Contacted 3", 
                "No Respons", "Junk", "Warm Leads", "HOT LEAD", 
                "QUALIFIED LEADS", "CONSULTING PROCESS", "UNI APPLICATION", "VISA", "COMPLETED"
            ]
            with c1: status_filter = st.selectbox("Filter by Remarks/Status", pipeline_statuses)
            
            with c2: 
                agents = list_users() 
                agent_opts = ["All", "Unassigned"] + [a[1] for a in agents]
                agent_filter = st.selectbox("Filter by Assigned To", agent_opts)

        status_val = None if status_filter == "All" else status_filter
        rows = list_cases_advanced(status=status_val)
        
        # --- 2. INTERACTIVE LEAD PROCESSING LIST ---
        if not rows:
            st.info("No students found matching these filters.")
        else:
            for r in rows:
                cid, cdate, status, sname, phone, email, raw_json, brief, assignee, full_rep, rep_date, ref_code = r
                
                # Logic to map the RefCode to the Agent's actual name for display
                assignee_name = "Unassigned"
                for a in agents:
                    if a[6] == ref_code and ref_code != "": # Match by RefCode
                        assignee_name = a[1]
                        break
                        
                # Apply the Assignee filter
                if agent_filter != "All":
                    if agent_filter == "Unassigned" and assignee_name != "Unassigned": continue
                    elif agent_filter != "Unassigned" and assignee_name != agent_filter: continue

                # Add visual indicators for the lead temperature
                icon = "🔵"
                if status == "NEW": icon = "🟢"
                elif "Contacted" in status: icon = "🟡"
                elif status in ["Junk", "No Respons"]: icon = "🔴"
                elif status in ["Warm Leads", "HOT LEAD", "QUALIFIED LEADS"]: icon = "🔥"
                
                # The Interactive Expander Card
                with st.expander(f"{icon} {sname}  |  Remarks: {status}  |  Assigned To: {assignee_name}  |  Date: {cdate[:10]}"):
                    with st.form(f"process_lead_{cid}"):
                        col_info, col_action = st.columns(2)
                        
                        with col_info:
                            st.markdown(f"**📱 WhatsApp:** {phone}")
                            st.markdown(f"**✉️ Email:** {email}")
                            
                            payload = json.loads(raw_json)
                            c_data = payload.get("counsellor_data", {})
                            st.markdown(f"**🏢 Source Branch:** {c_data.get('kantor', 'N/A')}")
                            st.markdown(f"**🎯 Origin:** {payload.get('referral_source', 'N/A')}")
                            
                        with col_action:
                            # Dropdown 1: Update Remarks / Status
                            current_index = pipeline_statuses.index(status) if status in pipeline_statuses else 0
                            # We slice from [1:] to remove "All" from the selection options
                            new_status = st.selectbox("Update Remarks / Status:", pipeline_statuses[1:], index=current_index-1 if current_index > 0 else 0)
                            
                            # Dropdown 2: Update Assigned To
                            user_options = [{"label": "Unassigned", "value": ""}]
                            for u in agents:
                                # Include Counsellors, Branches, and Agents
                                if u[4] in ["AGENT", "MICRO_AGENT", "COUNSELLOR", "ADMIN"]:
                                    user_options.append({"label": f"{u[1]} ({u[4]})", "value": u[6] if u[6] else u[0]})
                                    
                            assignee_index = 0
                            for i, opt in enumerate(user_options):
                                if opt["value"] == ref_code:
                                    assignee_index = i
                                    break
                                    
                            new_assignee_label = st.selectbox("Assigned To:", options=[o["label"] for o in user_options], index=assignee_index)
                            
                        if st.form_submit_button("💾 Save Updates", type="primary"):
                            selected_assignee_value = next(o["value"] for o in user_options if o["label"] == new_assignee_label)
                            
                            # Save to Database
                            from db import update_status, update_case_agent
                            update_status(cid, new_status)
                            if selected_assignee_value != ref_code:
                                update_case_agent(cid, selected_assignee_value)
                                
                            st.success(f"✅ Lead {sname} updated successfully!")
                            rerun()

    # ==========================================
    # 4. CASE DETAIL & AI (Admins & Counsellors)
    # ==========================================
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

            # ADDED THE DELETE BUTTON HERE
            c1, c2, c3 = st.columns([2, 1, 1])
            c1.header(f"{sname}")
            if ref_code: c1.caption(f"📍 Referred by Agent: **{ref_code}**")
            if c_data.get("kantor"): c1.caption(f"🏢 Branch: {c_data.get('kantor')} | Agent: {c_data.get('nama_agent', '-')}")
            c2.metric("Status", status)
            
            with c3:
                # Big red delete button for Admins
                if st.button("🗑️ Delete Student", type="primary"):
                    from db import delete_case
                    delete_case(cid)
                    st.toast(f"Student {sname} permanently deleted.")
                    rerun()

            # OCR / AI Parsing
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
            
            # Counsellor Input
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

            # Generate Report
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

    # ==========================================
    # 5. MASTER ADMIN PANEL (Master Admin Only)
    # ==========================================
    elif menu == "Master Admin Panel":
        st.title("👑 Master Admin Dashboard")
        
        # Analytics
        st.subheader("📊 Agent Leaderboard & Analytics")
        all_cases = list_cases_advanced()
        if all_cases:
            import sqlite3
            conn = sqlite3.connect("data/fortrust.db")
            df_cases = pd.read_sql_query("SELECT case_id, status, referral_code FROM cases", conn)
            
            if not df_cases.empty and 'referral_code' in df_cases.columns:
                c1, c2, c3, c4, c5 = st.columns(5)
                c1.metric("Qualified Leads", len(df_cases[df_cases['status'] == 'QUALIFIED LEADS']))
                c2.metric("Consulting", len(df_cases[df_cases['status'] == 'CONSULTING PROCESS']))
                c3.metric("Uni App", len(df_cases[df_cases['status'] == 'UNI APPLICATION']))
                c4.metric("Visa", len(df_cases[df_cases['status'] == 'VISA']))
                c5.metric("Completed", len(df_cases[df_cases['status'] == 'COMPLETED']))

                st.markdown("**Top Performing Agents (Total Students)**")
                agent_counts = df_cases['referral_code'].value_counts().reset_index()
                agent_counts.columns = ['Agent Code', 'Total Students']
                agent_counts = agent_counts[agent_counts['Agent Code'] != ""]
                agent_counts = agent_counts.dropna()
                
                if not agent_counts.empty:
                    st.bar_chart(data=agent_counts.set_index('Agent Code'))
                else:
                    st.info("No agent data to chart yet.")
        else:
            st.info("No data available for analytics.")
        st.divider()

        # Role Management
        st.subheader("👥 User & Role Management") 

        # WE ADDED A 4TH TAB HERE: "🤖 AI Data Ingestion"
        tab_create, tab_edit, tab_delete, tab_ingest = st.tabs(["Create New User", "Edit Existing User", "Delete User", "🤖 AI Data Ingestion"])        
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
            st.dataframe(df_users[["ID", "Name", "Email", "Role", "RefCode"]], width='stretch')
            
            with st.form("edit_role_form"):
                st.write("Change User Role")
                user_to_edit = st.selectbox("Select User", df_users['ID'].tolist(), format_func=lambda x: f"{x} - {df_users[df_users['ID']==x]['Name'].values[0]}")
                new_role_val = st.selectbox("New Role", roles_list)
                
                if st.form_submit_button("💾 Update Role"):
                    from db import update_user_role
                    update_user_role(user_to_edit, new_role_val)
                    st.success("Role Updated Successfully!")
                    rerun()
        st.divider()

        with tab_delete:
            st.write("⚠️ **Permanently Delete an Agent/User**")
            st.warning("Make sure you transfer their students to a new agent before deleting them!")
            
            with st.form("delete_user_form"):
                user_to_delete = st.selectbox(
                    "Select Agent to Delete", 
                    df_users['ID'].tolist(), 
                    format_func=lambda x: f"{x} - {df_users[df_users['ID']==x]['Name'].values[0]} ({df_users[df_users['ID']==x]['Role'].values[0]})"
                )
                
                if st.form_submit_button("🚨 Delete Agent", type="primary"):
                    from db import delete_user
                    delete_user(user_to_delete)
                    st.toast("Agent permanently deleted!")
                    rerun()

        # Data Transfer
        st.subheader("🔄 Transfer Student to New Agent")
        with st.form("transfer_student"):
            all_c = list_cases()
            if all_c:
                student_to_move = st.selectbox("Select Student", [c[0] for c in all_c], format_func=lambda x: f"{x} - {next((c[3] for c in all_c if c[0]==x), '')}")
                new_agent_code = st.selectbox("Assign to Agent Code", df_users['RefCode'].dropna().tolist())
                
                if st.form_submit_button("Transfer Data"):
                    from db import update_case_agent
                    update_case_agent(student_to_move, new_agent_code)
                    st.success(f"Student transferred to {new_agent_code}!")
                    rerun()

        with tab_ingest:
            st.subheader("📥 AI Brochure Ingestor")
            st.write("Upload a PDF brochure or fee guide. The AI will extract the programs, normalize the requirements, and append them directly to the Master Database (`programs.csv`).")
            
            uploaded_brochure = st.file_uploader("Upload University Brochure (PDF)", type="pdf", key="brochure_upload")
            
            if uploaded_brochure:
                if st.button("Extract & Ingest Data", type="primary"):
                    with st.spinner("AI is reading the document and structuring data... (This may take 30-60 seconds)"):
                        # 1. Read the PDF
                        raw_text = extract_text_from_pdf(uploaded_brochure)
                        
                        if not raw_text or "Error" in raw_text:
                            st.error("Could not read text from PDF.")
                        else:
                            # 2. Send to Gemini for Extraction
                            from ai_report import extract_programs_from_brochure
                            # We limit to first 50,000 characters to prevent API limits on massive books
                            new_programs = extract_programs_from_brochure(raw_text[:50000]) 
                            
                            if new_programs:
                                st.success(f"✅ Successfully extracted {len(new_programs)} programs!")
                                df_new = pd.DataFrame(new_programs)
                                
                                # Show preview to the Admin
                                st.dataframe(df_new)
                                
                                # 3. Safely format and append to CSV Database
                                expected_cols = ["country","city","institution","level","category","program_name","tuition_per_year","living_per_year","duration_years","intake_months","ielts_min","gpa_min","visa_risk","scholarship_level","vibe"]
                                
                                # Ensure missing columns get default values so the database doesn't break
                                for col in expected_cols:
                                    if col not in df_new.columns:
                                        df_new[col] = "Unknown"
                                        
                                # Force exact column order
                                df_new = df_new[expected_cols] 
                                
                                # Append to the bottom of the CSV securely
                                df_new.to_csv("data/programs.csv", mode='a', header=False, index=False)
                                st.toast("💾 Programs permanently saved to database!")
                            else:
                                st.error("AI could not extract valid programs from this document.")