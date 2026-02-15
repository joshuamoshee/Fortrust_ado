import streamlit as st
import json
import uuid
import datetime as dt
import pandas as pd

# --- CUSTOM MODULES ---
# Ensure these files exist in your folder
from doc_parser import extract_text_from_pdf
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
    # This is what Students see when they visit fortrust.com
    # ====================================================
    st.title("🌏 Fortrust Global Marketplace")
    st.markdown("#### Search Programs. Apply Instantly. Get AI Counseling.")

    # 1. Referral Tracking (Model B Hook)
    # Captures ?ref=AGENT001 from the URL
    query_params = st.query_params
    ref_code = query_params.get("ref", "")
    if ref_code:
        st.info(f"✅ Applying via Verified Partner: **{ref_code}**")

    # 2. Program Search Engine (The "Booking.com" Experience)
    with st.expander("🔍 **Find Your Dream Program**", expanded=True):
        c1, c2, c3 = st.columns(3)
        with c1: search_dest = st.selectbox("Destination", ["Australia", "UK", "USA", "Canada", "Singapore"])
        with c2: search_major = st.text_input("Major", placeholder="e.g. Data Science")
        with c3: search_budget = st.selectbox("Max Budget", ["Unlimited", "< $20k/yr", "< $40k/yr"])
        
        if st.button("Search Database"):
            # Mockup of search results - in real app, query your CSV/DB
            st.success(f"Found 12 matches for {search_major} in {search_dest}")
            st.dataframe(pd.DataFrame([
                {"University": "Monash University", "Rank": "#42 Global", "Tuition": "$32,000", "Match": "98%"},
                {"University": "RMIT", "Rank": "#140 Global", "Tuition": "$28,000", "Match": "92%"},
                {"University": "Deakin", "Rank": "#233 Global", "Tuition": "$25,000", "Match": "89%"},
            ]), use_container_width=True)

    st.markdown("---")

    # 3. Application Form (The Funnel)
    st.subheader("🚀 Start Your Application")
    with st.form("intake_form"):
        col1, col2 = st.columns(2)
        with col1:
            student_name = st.text_input("Full Name *")
            phone = st.text_input("WhatsApp *")
        with col2:
            email = st.text_input("Email *")
            destinations = st.multiselect("Destinations", ["Australia", "UK", "USA", "Canada"])
        
        # Hidden Referral Field
        referral_source = st.selectbox("How did you find us?", ["Online Search", "Social Media", "Referral/Agent"])
        manual_ref = st.text_input("Agent Code (Optional)", value=ref_code)

        if st.form_submit_button("Submit Application"):
            if not student_name or not phone:
                st.error("Name and Phone are required.")
            else:
                cid = str(uuid.uuid4())[:8].upper()
                payload = {
                    "student_name": student_name, "phone": phone, "email": email,
                    "destinations": destinations, "finance": {"annual_budget": 0},
                    "counsellor_data": {}, "qualification_data": {}
                }
                # Insert with Referral Code to track commissions
                insert_case(cid, payload, "Marketplace Lead", referral_code=manual_ref)
                
                st.balloons()
                st.success(f"Application Sent! Your Ref ID: {cid}")
                st.info("An AI Counselor is reviewing your profile now.")

    # Login for Agents/Admin
    login_panel()

else:
    # ====================================================
    # LOGGED IN VIEWS
    # ====================================================
    user = st.session_state["user"]
    role = user["role"]
    
    # Sidebar Info
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
            # Filter cases by THIS user's referral code
            my_cases = list_cases_advanced(referral_code=user['referral_code'])
            
            if not my_cases:
                st.info("No students yet. Share your referral link to start earning!")
            else:
                # Display simplified view for agents
                for c in my_cases:
                    # c = [id, date, status, name, dest, budget, agent]
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
        
        # Navigation
        menu = st.sidebar.radio("Command Center", ["Pipeline", "Case Detail", "Admin Panel"])

        # --- PIPELINE VIEW ---
        if menu == "Pipeline":
            st.title("Global Pipeline")
            
            # Filters
            with st.expander("Filters", expanded=True):
                c1, c2 = st.columns(2)
                with c1: status_filter = st.selectbox("Status", ["All", "NEW", "HOT LEAD", "WON"])
                with c2: 
                    # Filter by Franchise Partner
                    agents = list_users("MICRO_AGENT")
                    agent_opts = ["All"] + [a[1] for a in agents]
                    agent_filter = st.selectbox("Franchise Partner", agent_opts)

            # Logic for filtering would go here, simplified for display
            status_val = None if status_filter == "All" else status_filter
            rows = list_cases_advanced(status=status_val)
            
            # Display rows
            st.dataframe([
                {"ID": r[0], "Date": r[1][:10], "Status": r[2], "Student": r[3], "Agent": r[6]} 
                for r in rows
            ], use_container_width=True)

        # --- CASE DETAIL VIEW (The AI Powerhouse) ---
        elif menu == "Case Detail":
            st.title("Student Case File")
            
            # 1. Selector
            all_cases = list_cases()
            c_ids = [x[0] for x in all_cases]
            selected_id = st.selectbox("Search Student ID/Name", c_ids, format_func=lambda x: f"{x} - {next((c[3] for c in all_cases if c[0]==x), '')}")
            
            if selected_id:
                # Load Data
                case_row = get_case(selected_id)
                # Unpack: case_id, created, status, name, phone, email, raw_json, brief, assignee, report, rep_date, referral_code
                cid, cdate, status, sname, phone, email, raw_json, brief, assignee, full_rep, rep_date, ref_code = case_row
                payload = json.loads(raw_json)
                c_data = payload.get("counsellor_data", {})

                # Header
                c1, c2 = st.columns([3, 1])
                c1.header(f"{sname}")
                if ref_code:
                    c1.caption(f"📍 Referred by Agent: **{ref_code}**")
                c2.metric("Status", status)

                # --- PART 1: AI DOC PARSING (OCR) ---
                st.info("🤖 **Step 1: Upload Psychometric Results**")
                uploaded_pdf = st.file_uploader("Upload Navigather/Psych PDF", type="pdf", key="ocr_upload")
                if uploaded_pdf:
                    with st.spinner("AI Reading Document..."):
                        extracted_text = extract_text_from_pdf(uploaded_pdf)
                        if extracted_text:
                            # Auto-fill notes if empty
                            if not c_data.get("personality_notes"):
                                c_data["personality_notes"] = extracted_text[:2000]
                                payload["counsellor_data"] = c_data
                                update_case_payload(cid, payload)
                                st.success("Text Extracted & Saved to Profile!")
                            else:
                                st.warning("Profile already has notes. Clear them to overwrite.")
                
                # --- PART 2: DEEP PROFILING ---
                st.info("🧠 **Step 2: Deep Profiling (AI Context)**")
                with st.form("profile_form"):
                    p_notes = st.text_area("Personality/IQ Notes (Auto-filled from PDF)", 
                                         value=c_data.get("personality_notes", ""), height=150)
                    p_pref = st.text_input("Parent Preference", value=c_data.get("parents_pref", ""))
                    
                    # Other fields from your original code
                    col_a, col_b = st.columns(2)
                    with col_a:
                        target_uni = st.text_input("Target Uni", value=c_data.get("target_uni", ""))
                    with col_b:
                        target_prog = st.text_input("Target Major", value=c_data.get("target_program", ""))

                    if st.form_submit_button("💾 Update Profile"):
                        payload["counsellor_data"].update({
                            "personality_notes": p_notes,
                            "parents_pref": p_pref,
                            "target_uni": target_uni,
                            "target_program": target_prog
                        })
                        update_case_payload(cid, payload)
                        st.success("Profile Updated")
                        rerun()

                # --- PART 3: GENERATE REPORT ---
                st.info("📄 **Step 3: Strategic Report**")
                col_gen1, col_gen2 = st.columns([1, 2])
                with col_gen1:
                    if st.button("Generate 'Abigail-Style' PDF"):
                        with st.spinner("Analyzing Matrix..."):
                            # 1. Rank
                            df = pd.read_csv("data/programs.csv")
                            ranks = rank_programs({"finance":payload.get("finance",{}), "major_choices":["General"], "destinations":[], "gpa":"3.0", "english":"IELTS"}, df)
                            # 2. Generate Content
                            content = generate_abigail_content(sname, payload, ranks)
                            # 3. Create PDF
                            fname = create_pdf(sname, content)
                            # 4. Read for DL
                            with open(fname, "rb") as f:
                                st.session_state['pdf_bytes'] = f.read()
                                st.session_state['pdf_name'] = fname
                            st.success("Generated!")
                
                with col_gen2:
                    if 'pdf_bytes' in st.session_state:
                        st.download_button("📥 Download PDF", st.session_state['pdf_bytes'], file_name=st.session_state['pdf_name'], mime='application/pdf')

        # --- ADMIN PANEL ---
        elif menu == "Admin Panel":
            st.title("System Admin")
            st.subheader("Manage Franchises")
            
            # Create Agent
            with st.form("create_agent"):
                st.write("Create New Franchise Partner")
                a_name = st.text_input("Partner Name")
                a_email = st.text_input("Email")
                if st.form_submit_button("Create Account"):
                    # Create with MICRO_AGENT role
                    create_user(uuid.uuid4().hex[:6], a_name, a_email, "123456", "MICRO_AGENT")
                    st.success(f"Agent {a_name} Created!")
            
            st.write("Existing Users:")
            st.dataframe(pd.DataFrame(list_users(), columns=["ID", "Name", "Email", "Hash", "Role", "Active", "RefCode"]))