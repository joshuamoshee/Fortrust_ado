import streamlit as st
import json
import uuid
import datetime as dt
import pandas as pd
from scoring import calculate_lead_score
from engine import rank_programs
from ai_report import generate_abigail_content
from pdf_generator import create_pdf
from db import (
    init_db,
    insert_case,
    get_case,
    list_cases,
    update_status,
    get_user_by_email,
    hash_password,
    create_user,
    list_users,
    assign_case,
    list_cases_advanced,
    list_cases_filtered,
    get_audit_for_case,
    log_event,
    log_contact_attempt,
    mark_contacted,
    save_full_report,
    update_case_payload,
    update_case_status_and_payload
)

# -------------------------
# App setup
# -------------------------
init_db()

st.set_page_config(page_title="Fortrust ADO", layout="wide")

st.sidebar.title("Fortrust ADO")
mode = st.sidebar.radio("Mode", ["Public Intake", "Counsellor Dashboard"])

def rerun():
    try:
        st.rerun()  # new streamlit
    except Exception:
        st.experimental_rerun()  # old streamlit

# -------------------------
# Auth helpers (Dashboard only)
# -------------------------
def login_panel():
    st.sidebar.subheader("Login")
    email = st.sidebar.text_input("Email", key="login_email")
    pw = st.sidebar.text_input("Password", type="password", key="login_pw")

    if st.sidebar.button("Login", key="login_btn"):
        u = get_user_by_email(email.strip().lower())
        if not u:
            st.sidebar.error("User not found.")
            return

        user_id, name, em, pw_hash, role, is_active = u
        if not is_active:
            st.sidebar.error("Account disabled.")
            return

        if hash_password(pw) != pw_hash:
            st.sidebar.error("Wrong password.")
            return

        st.session_state["user"] = {"user_id": user_id, "name": name, "email": em, "role": role}
        log_event(user_id, "LOGIN", None, {"email": em})
        rerun()

def logout_button():
    if st.sidebar.button("Logout", key="logout_btn"):
        st.session_state.pop("user", None)
        rerun()

def require_login():
    if "user" not in st.session_state:
        login_panel()
        st.stop()

def set_selected_case(case_id: str):
    st.session_state["selected_case_id"] = case_id
    st.session_state["dashboard_tab"] = "Case Detail"
    rerun()

def hours_since(iso_ts: str) -> float:
    try:
        t = dt.datetime.fromisoformat(iso_ts.replace("Z", ""))
        return (dt.datetime.utcnow() - t).total_seconds() / 3600.0
    except Exception:
        return 0.0

# -------------------------
# Mode 1: Public Intake
# -------------------------
if mode == "Public Intake":
    st.title("Fortrust Education - Student Intake")
    st.write("Please fill in your details to connect with a counsellor.")

    with st.form("intake_form"):
        # --- DATA WAJIB (MANDATORY) ---
        col1, col2 = st.columns(2)
        with col1:
            student_name = st.text_input("Nama Lengkap *")
            phone = st.text_input("WhatsApp Number *")
        with col2:
            email = st.text_input("Email *")
        
        st.subheader("Study Preferences")
        col3, col4 = st.columns(2)
        with col3:
             destinations = st.multiselect("Preferred Destinations", ["Australia", "UK", "USA", "Canada", "New Zealand", "Singapore", "Europe"])
             major_input = st.text_input("Preferred Major / Lesson Interest (e.g. Business, IT)")
        with col4:
             budget_input = st.number_input("Est. Annual Budget (Tuition + Living)", min_value=0, step=1000)
             intake_input = st.text_input("Target Intake (Month/Year)", placeholder="e.g. Feb 2026")

        st.subheader("Source")
        referral_source = st.selectbox("Tahu Event dari mana?", 
            ["Meta Ads", "Tiktok Ads", "Expo", "School Expo", "Info Sessions", "Webinar", "Referrals"])
        
        referral_detail = None
        if referral_source == "Referrals":
            referral_detail = st.selectbox("Source of Referral", ["Teman Sekolah/Kuliah", "Guru BK", "Guru Les"])

        submitted = st.form_submit_button("Submit Data")

    if submitted:
        if not student_name.strip() or not phone.strip():
            st.error("Please fill Student Name and WhatsApp.")
        else:
            payload = {
                "student_name": student_name.strip(),
                "phone": phone.strip(),
                "email": email.strip(),
                "destinations": destinations,
                "major_choices": [major_input] if major_input else [],
                "intake": intake_input,
                "finance": {"annual_budget": budget_input},
                "referral_source": referral_source,
                "referral_detail": referral_detail,
                "counsellor_data": {},
                "qualification_data": {}
            }

            case_id = str(uuid.uuid4())[:8].upper()
            brief_md = "New Lead from Intake Form" 

            insert_case(case_id, payload, brief_md)
            log_event(None, "NEW_CASE", case_id, {"student_name": payload["student_name"]})

            st.success("Submitted! A counsellor will contact you soon.")
            st.info(f"Reference ID: {case_id}")

# -------------------------
# Mode 2: Counsellor Dashboard
# -------------------------
else:
    require_login()
    user = st.session_state["user"]
    role = user["role"]
    st.title("Counsellor Dashboard")
    st.sidebar.write(f"Logged in as: **{user['name']}** ({role})")
    logout_button()

    tabs = ["Pipeline", "My Cases", "All Cases", "Case Detail"]
    if role == "ADMIN":
        tabs.append("Admin Panel")

    if "dashboard_tab" not in st.session_state:
        st.session_state["dashboard_tab"] = "Pipeline"
    
    tab = st.sidebar.radio("Dashboard", tabs)

    # --- PIPELINE ---
    if tab == "Pipeline":
        st.title("Pipeline")
        with st.expander("Filters", expanded=True):
            f1, f2, f3, f4 = st.columns(4)
            with f1: destination_filter = st.selectbox("Destination", ["All", "New Zealand", "UK", "Australia", "Canada", "USA", "Germany", "Other"])
            with f2: show_unassigned = st.checkbox("Only Unassigned", value=False)
            with f3:
                assignee_filter = "All"
                if role in ["ADMIN", "MANAGER"]:
                    agents = list_users("AGENT")
                    agent_labels = ["All"] + [f"{a[1]} ({a[2]})" for a in agents]
                    assignee_filter = st.selectbox("Assigned To", agent_labels)
            with f4: show_only_hot = st.checkbox("Only NEW (hot leads)", value=False)

        assigned_to_filter_id = None
        if role in ["ADMIN", "MANAGER"] and assignee_filter != "All":
            agent_map = {f"{a[1]} ({a[2]})": a[0] for a in list_users("AGENT")}
            assigned_to_filter_id = agent_map.get(assignee_filter)
        dest_val = None if destination_filter == "All" else destination_filter

        display_statuses = ["NEW", "CONTACTED", "HOT LEAD", "WARM", "RISKY", "WON", "LOST"] 
        pipeline_cols = st.columns(len(display_statuses))
        
        for col, status in zip(pipeline_cols, display_statuses):
            with col:
                st.subheader(status)
                rows = list_cases_advanced(status=status, assigned_to=assigned_to_filter_id, unassigned_only=show_unassigned, destination=dest_val)
                if not rows:
                    st.caption("—")
                    continue
                for r in rows[:25]:
                    cid, created_at, stt, sname, dest1, budget, assigned_to = r
                    age_h = hours_since(created_at)
                    age_tag = "🟢" if age_h < 6 else ("🟠" if age_h < 24 else "🔴")
                    title = f"{age_tag} {cid} • {sname}"
                    if st.button(title, key=f"open_{status}_{cid}"):
                        set_selected_case(cid)
                    st.caption(f"{int(age_h)}h ago")

    # --- MY CASES ---
    elif tab == "My Cases":
        st.title("My Work Queue")
        rows = list_cases_advanced(assigned_to=user["user_id"])
        if not rows:
            st.info("No cases assigned to you yet.")
            st.stop()
        priority = {"NEW": 0, "HOT LEAD": 0, "CONTACTED": 1, "WARM": 2, "MEETING_BOOKED": 3, "APPLIED": 4}
        rows = sorted(rows, key=lambda r: (priority.get(r[2], 99), -hours_since(r[1])))

        for r in rows[:40]:
            cid, created_at, stt, sname, dest1, budget, assigned_to = r
            age_h = hours_since(created_at)
            age_tag = "🟢" if age_h < 6 else ("🟠" if age_h < 24 else "🔴")
            c1, c2 = st.columns([4, 1])
            with c1:
                st.write(f"{age_tag} **{cid}** — {sname} (**{stt}**)")
                st.caption(f"Created {int(age_h)}h ago")
            with c2:
                if st.button("Open", key=f"my_open_{cid}"):
                    set_selected_case(cid)
            st.divider()

    # --- ALL CASES ---
    elif tab == "All Cases":
        st.subheader("All Cases")
        rows = list_cases_filtered()
        if not rows:
            st.info("No cases yet.")
        else:
            st.dataframe([{"case_id": r[0], "status": r[2], "student": r[3], "assigned_to": r[6]} for r in rows], use_container_width=True)

    # --- CASE DETAIL (UPDATED) ---
    elif tab == "Case Detail":
        all_cases = list_cases()
        if not all_cases:
            st.info("No cases yet.")
            st.stop()

        left, right = st.columns([1, 2])
        with left:
            st.subheader("Select a case")
            case_ids = [c[0] for c in all_cases]
            selected_default = st.session_state.get("selected_case_id")
            idx = 0
            if selected_default in case_ids:
                idx = case_ids.index(selected_default)
            selected = st.radio("Cases", case_ids, index=idx, format_func=lambda cid: f"{cid} — {next((x[3] for x in all_cases if x[0] == cid), 'Unknown')}")

        row = get_case(selected)
        try:
            case_id, created_at, status, student_name, phone, email, raw_json, brief_md, assigned_to = row[:9]
        except:
            st.error("Database row mismatch. Check db.py.")
            st.stop()

        payload = json.loads(raw_json)
        c_data = payload.get("counsellor_data", {})

        with right:
            st.title(f"{student_name}")
            
            # --- 1. STUDENT INTAKE REPORT (GOOGLE DOC STYLE) ---
            with st.container():
                st.markdown("### 📄 Student Intake Summary (Original Data)")
                with st.expander("View Full Student Profile", expanded=False):
                    ir1, ir2 = st.columns(2)
                    with ir1:
                        st.markdown(f"**Full Name:** {student_name}")
                        st.markdown(f"**Email:** {email}")
                        st.markdown(f"**Phone:** {phone}")
                        st.markdown(f"**Source:** {payload.get('referral_source', '-')}")
                    with ir2:
                        dests = ", ".join(payload.get("destinations", []))
                        majors = ", ".join(payload.get("major_choices", []))
                        budget = payload.get("finance", {}).get("annual_budget", 0)
                        
                        st.markdown(f"**Interested Countries:** {dests if dests else 'Not Selected'}")
                        st.markdown(f"**Interested Lesson/Major:** {majors if majors else 'Not Selected'}")
                        st.markdown(f"**Intake Target:** {payload.get('intake', 'Not Stated')}")
                        st.markdown(f"**Self-Declared Budget:** ${budget:,.0f}")
                st.divider()

            # --- ACTIONS ---
            act1, act2, act3 = st.columns(3)
            with act1:
                if phone:
                    wa_num = phone.replace("+", "").replace(" ", "").replace("-", "")
                    st.markdown(f'<a href="https://wa.me/{wa_num}" target="_blank"><button style="background-color:#25D366;color:white;border:none;padding:8px 16px;border-radius:4px;">Open WhatsApp</button></a>', unsafe_allow_html=True)
            with act2:
                 if st.button("Mark Contacted", key="btn_contact"):
                     mark_contacted(case_id)
                     update_status(case_id, "CONTACTED")
                     rerun()
            with act3:
                agents = list_users("AGENT")
                agent_map = {f"{a[1]} ({a[2]})": a[0] for a in agents}
                curr_assign = "Unassigned"
                if assigned_to:
                    for a in agents: 
                        if a[0] == assigned_to: curr_assign = a[1]
                
                with st.expander(f"Assign: {curr_assign}"):
                    new_assign = st.selectbox("Select Agent", ["Unassigned"] + list(agent_map.keys()))
                    if st.button("Save Assignment"):
                        aid = agent_map[new_assign] if new_assign != "Unassigned" else None
                        assign_case(case_id, aid)
                        rerun()

            # --- 2. DATA OPSIONAL (EXPANDED WITH SCHOOL/BUDGET) ---
            st.subheader("📝 2. Counsellor Interview (Expanded)")
            with st.expander("Interview Form: Schools & Pricing", expanded=True):
                with st.form("optional_data_form"):
                    
                    st.markdown("**Basic Info**")
                    c_col1, c_col2 = st.columns(2)
                    with c_col1:
                        city = st.text_input("Kota Tempat Tinggal", value=c_data.get("city", ""))
                        school = st.text_input("Asal Sekolah", value=c_data.get("school", ""))
                        grade = st.text_input("Kelas Berapa", value=c_data.get("grade", ""))
                    with c_col2:
                        branch = st.selectbox("Cabang Fortrust", ["Jakarta", "Surabaya", "Bandung", "Medan"], index=0)
                        need_test = st.radio("Profiling Test?", ["Yes", "No"], horizontal=True, index=0 if c_data.get("need_test")=="Yes" else 1)
                        need_lang = st.radio("Language Prep?", ["Yes", "No"], horizontal=True, index=0 if c_data.get("need_lang")=="Yes" else 1)
                    
                    st.markdown("---")
                    st.markdown("**🎓 Specific School & Budget Preferences**")
                    c_col3, c_col4 = st.columns(2)
                    with c_col3:
                        target_uni = st.text_input("Specific Target University (if any)", value=c_data.get("target_uni", ""), placeholder="e.g. Monash, UNSW")
                        target_program = st.text_input("Confirmed Major Interest", value=c_data.get("target_program", ""), placeholder="e.g. Bachelor of Business")
                    with c_col4:
                        budget_discussion = st.selectbox("Budget Status", 
                            ["Unknown", "Budget Fits Target", "Budget Tight (Need Scholarship)", "Budget Too Low (Survival Mode)"],
                            index=0
                        )
                        max_tuition = st.number_input("Confirmed Max Tuition (per year)", min_value=0, value=int(c_data.get("max_tuition", 0)))

                    if st.form_submit_button("💾 Save Counsellor Notes"):
                        payload["counsellor_data"] = {
                            "city": city, "school": school, "grade": grade,
                            "branch": branch, "need_test": need_test, "need_lang": need_lang,
                            "target_uni": target_uni, "target_program": target_program,
                            "budget_discussion": budget_discussion, "max_tuition": max_tuition
                        }
                        update_case_payload(case_id, payload)
                        st.success("Notes Saved.")
                        rerun()

            # --- 3. QUALIFICATION ---
            st.subheader("🔍 3. Lead Qualification (Score)")
            q_data = payload.get("qualification_data", {})
            algo_res = payload.get("algo_result", {})
            if algo_res:
                sc = algo_res.get('score', 0)
                stt = algo_res.get('status', 'Unknown')
                color = "green" if "HOT" in stt else ("orange" if "WARM" in stt else "red")
                st.markdown(f"### Score: {sc}/100 | Status: :{color}[{stt}]")

            with st.expander("Qualification Checklist"):
                with st.form("algo_form"):
                    col_f1, col_f2 = st.columns(2)
                    with col_f1:
                        q4 = st.selectbox("Q4: Part-time", ["SURVIVAL_MODE", "POCKET_MONEY"], index=0 if q_data.get("q_part_time")=="SURVIVAL_MODE" else 1)
                        q5 = st.selectbox("Q5: Travel", ["NO_TRAVEL", "BUDGET_TRAVEL", "PREMIUM_TRAVEL"])
                        q1 = st.selectbox("Q1: Action", ["DREAMER", "DOER"])
                    with col_f2:
                        q6 = st.selectbox("Q6: Accom", ["SENSITIVE", "COMFORT"])
                        q7 = st.selectbox("Q7: Liquidity", ["NOT_LIQUID", "LIQUID"])
                        q2 = st.selectbox("Q2: Anchor", ["HIGH_ANCHOR", "PRACTICAL"])
                        q8 = st.selectbox("Q8: Blocker", ["FUNDING_BLOCKER", "LOGISTIC_BLOCKER"])
                        q3 = st.selectbox("Q3: Family", ["CONFLICT", "SUPPORT"])
                        q9 = st.selectbox("Q9: English", ["UNTESTED", "TESTED"])
                        q10 = st.selectbox("Q10: DM", ["HIDDEN_DM", "CLEAR_DM"])

                    if st.form_submit_button("🧮 Calculate Score"):
                        score_inputs = {
                            "q_part_time": q4, "q_travel": q5, "q_accom": q6, "q_liquid": q7,
                            "q_action": q1, "q_anchor": q2, "q_blocker": q8,
                            "q_family": q3, "q_language": q9, "q_dm": q10
                        }
                        result = calculate_lead_score(score_inputs)
                        payload["qualification_data"] = score_inputs
                        payload["algo_result"] = result
                        update_case_status_and_payload(case_id, result['status'], payload)
                        rerun()

            # --- 4. REPORT GENERATION (SECURE & VISUAL) ---
            st.markdown("---")
            st.subheader("📄 Strategy Roadmap (Internal Only)")
            
            col_rep1, col_rep2 = st.columns([1, 2])
            
            with col_rep1:
                if st.button("Generate Strategy PDF"):
                    # 1. Gather Data
                    programs_df = pd.read_csv("data/programs.csv")
                    engine_payload = {
                        "finance": {"annual_budget": payload.get("finance", {}).get("annual_budget", 50000)},
                        "major_choices": payload.get("major_choices", ["General"]),
                        "destinations": [payload.get("destination_1"), payload.get("destination_2")],
                        "gpa": "3.0", 
                        "english": "IELTS"
                    }
                    top_programs = rank_programs(engine_payload, programs_df)
                    
                    # 2. Call "Real AI" to get content
                    with st.spinner("Consulting AI Engine..."):
                        content_data = generate_abigail_content(student_name, payload, top_programs)
                    
                    # 3. Generate PDF
                    pdf_file = create_pdf(student_name, content_data)
                    
                    # 4. Read PDF binary for download
                    with open(pdf_file, "rb") as f:
                        pdf_bytes = f.read()
                    
                    # 5. Save state so download button appears
                    st.session_state['generated_pdf'] = pdf_bytes
                    st.session_state['generated_pdf_name'] = pdf_file
                    
                    st.success("PDF Generated Successfully!")

            with col_rep2:
                if 'generated_pdf' in st.session_state:
                    st.download_button(
                        label="📥 Download Confidential PDF",
                        data=st.session_state['generated_pdf'],
                        file_name=st.session_state['generated_pdf_name'],
                        mime='application/pdf'
                    )
                    st.warning("⚠️ This report is for Counsellor use only. Do not share directly with students.")

    # --- ADMIN ---
    elif tab == "Admin Panel":
        if role != "ADMIN": st.error("Access Denied")
        else:
            st.title("Admin Panel")
            with st.form("create_user_form"):
                name = st.text_input("Name")
                email = st.text_input("Email")
                password = st.text_input("Password", type="password")
                role_new = st.selectbox("Role", ["AGENT", "MANAGER", "ADMIN"])
                if st.form_submit_button("Create User"):
                    create_user(str(uuid.uuid4())[:8].upper(), name, email, password, role_new)
                    st.success("Created.")
            st.dataframe(pd.DataFrame(list_users(), columns=["ID", "Name", "Email", "Hash", "Role", "Active"]))