# streamlit_app.py
import streamlit as st
import json
import uuid
import datetime as dt
import pandas as pd
from full_report import make_internal_report
from scoring import calculate_lead_score  # <--- NEW IMPORT
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
    list_cases_filtered,          # <--- ADDED THIS FIXED YOUR ERROR
    get_audit_for_case,
    log_event,
    log_contact_attempt,
    mark_contacted,
    save_full_report,
    update_case_payload,          
    update_case_status_and_payload
)
from report import make_counsellor_brief

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
# Mode 1: Public Intake (Updated with Data Wajib)
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
        
        st.subheader("Source")
        referral_source = st.selectbox("Tahu Event dari mana?", 
            ["Meta Ads", "Tiktok Ads", "Expo", "School Expo", "Info Sessions", "Webinar", "Referrals"])
        
        referral_detail = None
        if referral_source == "Referrals":
            referral_detail = st.selectbox("Source of Referral", ["Teman Sekolah/Kuliah", "Guru BK", "Guru Les"])

        # We keep the old fields as OPTIONAL/HIDDEN or just remove them to follow the new flow.
        # Per your request "Counsellor asks later", we keep this form short.
        
        submitted = st.form_submit_button("Submit Data")

    if submitted:
        if not student_name.strip() or not phone.strip():
            st.error("Please fill Student Name and WhatsApp.")
        else:
            payload = {
                "student_name": student_name.strip(),
                "phone": phone.strip(),
                "email": email.strip(),
                "referral_source": referral_source,
                "referral_detail": referral_detail,
                # Initialize empty containers for later
                "counsellor_data": {},
                "qualification_data": {},
                "finance": {}, # Legacy field placeholder
                "major_choices": [] # Legacy field placeholder
            }

            case_id = str(uuid.uuid4())[:8].upper()
            brief_md = "New Lead from Intake Form" # Placeholder brief

            # store in DB
            insert_case(case_id, payload, brief_md)

            # log system event
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

    # Sidebar tabs
    tabs = ["Pipeline", "My Cases", "All Cases", "Case Detail"]
    if role == "ADMIN":
        tabs.append("Admin Panel")

    # Use session state to remember tab if set
    default_tab = st.session_state.get("dashboard_tab", "Pipeline")
    # If the user clicks the sidebar, it updates. If we set it via code, it updates.
    if "dashboard_tab" not in st.session_state:
        st.session_state["dashboard_tab"] = "Pipeline"
    
    # We use the radio but set index based on state is tricky in Streamlit, 
    # so we rely on the user clicking unless we force it.
    # Simplified: Just read the radio.
    tab = st.sidebar.radio("Dashboard", tabs)

    # -------------------------
    # Pipeline (KEPT ORIGINAL)
    # -------------------------
    if tab == "Pipeline":
        st.title("Pipeline")

        # Filters
        with st.expander("Filters", expanded=True):
            f1, f2, f3, f4 = st.columns(4)
            with f1:
                destination_filter = st.selectbox("Destination", ["All", "New Zealand", "UK", "Australia", "Canada", "USA", "Germany", "Other"])
            with f2:
                show_unassigned = st.checkbox("Only Unassigned", value=False)
            with f3:
                assignee_filter = "All"
                if role in ["ADMIN", "MANAGER"]:
                    agents = list_users("AGENT")
                    agent_labels = ["All"] + [f"{a[1]} ({a[2]})" for a in agents]
                    assignee_filter = st.selectbox("Assigned To", agent_labels)
            with f4:
                show_only_hot = st.checkbox("Only NEW (hot leads)", value=False)

        statuses = ["NEW", "CONTACTED", "MEETING_BOOKED", "APPLIED", "WON", "LOST", "HOT LEAD", "WARM", "RISKY"] # Added new statuses
        cols = st.columns(len(statuses))

        # Filter Logic
        assigned_to_filter_id = None
        if role in ["ADMIN", "MANAGER"] and assignee_filter != "All":
            agent_map = {f"{a[1]} ({a[2]})": a[0] for a in list_users("AGENT")}
            assigned_to_filter_id = agent_map.get(assignee_filter)

        dest_val = None if destination_filter == "All" else destination_filter

        # Display Pipeline Columns
        # Note: We group your new statuses into the pipeline flow
        display_statuses = ["NEW", "CONTACTED", "HOT LEAD", "WARM", "RISKY", "WON", "LOST"] 
        
        pipeline_cols = st.columns(len(display_statuses))
        
        for col, status in zip(pipeline_cols, display_statuses):
            with col:
                st.subheader(status)
                
                # Fetch cases
                rows = list_cases_advanced(
                    status=status,
                    assigned_to=assigned_to_filter_id,
                    unassigned_only=show_unassigned,
                    destination=dest_val
                )

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

    # -------------------------
    # My Cases (KEPT ORIGINAL)
    # -------------------------
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
            
            # Layout
            c1, c2 = st.columns([4, 1])
            with c1:
                st.write(f"{age_tag} **{cid}** — {sname} (**{stt}**)")
                st.caption(f"Created {int(age_h)}h ago")
            with c2:
                if st.button("Open", key=f"my_open_{cid}"):
                    set_selected_case(cid)
            st.divider()

    # -------------------------
    # All Cases (KEPT ORIGINAL)
    # -------------------------
    elif tab == "All Cases":
        st.subheader("All Cases")
        rows = list_cases_filtered()
        if not rows:
            st.info("No cases yet.")
        else:
            st.dataframe(
                [{"case_id": r[0], "status": r[2], "student": r[3], "assigned_to": r[6]} for r in rows],
                use_container_width=True,
            )

    # -------------------------
    # Case Detail (UPDATED WITH NEW FEATURES)
    # -------------------------
    elif tab == "Case Detail":
        all_cases = list_cases()
        if not all_cases:
            st.info("No cases yet.")
            st.stop()

        # Selection Logic
        left, right = st.columns([1, 2])
        with left:
            st.subheader("Select a case")
            case_ids = [c[0] for c in all_cases]
            selected_default = st.session_state.get("selected_case_id")
            
            # Find index
            idx = 0
            if selected_default in case_ids:
                idx = case_ids.index(selected_default)

            selected = st.radio(
                "Cases",
                case_ids,
                index=idx,
                format_func=lambda cid: f"{cid} — {next((x[3] for x in all_cases if x[0] == cid), 'Unknown')}",
            )

        # Get Case Data
        row = get_case(selected)
        # Unpack safely (handle different DB versions if needed)
        try:
            case_id, created_at, status, student_name, phone, email, raw_json, brief_md, assigned_to = row[:9]
            # Handle optional report fields if they exist
            full_report_md = row[9] if len(row) > 9 else None
        except:
            st.error("Database row mismatch. Check db.py.")
            st.stop()

        payload = json.loads(raw_json)

        # --- RIGHT COLUMN: THE WORKSPACE ---
        with right:
            st.title(f"{student_name}")
            
            # HEADER INFO
            h1, h2, h3 = st.columns(3)
            with h1: st.write(f"**Status:** {status}")
            with h2: st.write(f"**Phone:** {phone}")
            with h3: st.write(f"**Source:** {payload.get('referral_source', '-')}")

            # --- ORIGINAL ACTION BUTTONS ---
            st.markdown("---")
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
                # Assign logic
                agents = list_users("AGENT")
                agent_map = {f"{a[1]} ({a[2]})": a[0] for a in agents}
                curr_assign = "Unassigned"
                if assigned_to:
                    # find name
                    for a in agents: 
                        if a[0] == assigned_to: curr_assign = a[1]
                
                with st.popover(f"Assign: {curr_assign}"):
                    new_assign = st.selectbox("Select Agent", ["Unassigned"] + list(agent_map.keys()))
                    if st.button("Save Assignment"):
                        aid = agent_map[new_assign] if new_assign != "Unassigned" else None
                        assign_case(case_id, aid)
                        rerun()

            # --- NEW: DATA OPSIONAL SECTION ---
            st.markdown("---")
            st.subheader("📝 1. Data Opsional (Counsellor Call)")
            
            with st.expander("Expand/Collapse Interview Form", expanded=True):
                with st.form("optional_data_form"):
                    c_data = payload.get("counsellor_data", {})
                    
                    c_col1, c_col2 = st.columns(2)
                    with c_col1:
                        city = st.text_input("Kota Tempat Tinggal", value=c_data.get("city", ""))
                        school = st.text_input("Asal Sekolah", value=c_data.get("school", ""))
                        grade = st.text_input("Kelas Berapa", value=c_data.get("grade", ""))
                    with c_col2:
                        branch = st.selectbox("Cabang Fortrust Terdekat", ["Jakarta", "Surabaya", "Bandung", "Medan"], index=0)
                        need_test = st.radio("Need Profiling Test?", ["Yes", "No"], horizontal=True, index=0 if c_data.get("need_test")=="Yes" else 1)
                        need_lang = st.radio("Need Language Prep?", ["Yes", "No"], horizontal=True, index=0 if c_data.get("need_lang")=="Yes" else 1)
                    
                    if st.form_submit_button("💾 Save Data Opsional"):
                        payload["counsellor_data"] = {
                            "city": city, "school": school, "grade": grade,
                            "branch": branch, "need_test": need_test, "need_lang": need_lang
                        }
                        update_case_payload(case_id, payload)
                        st.success("Saved.")
                        rerun()

            # --- NEW: QUALIFICATION ALGORITHM SECTION ---
            st.subheader("🔍 2. Lead Qualification (100-Point Algo)")
            
            q_data = payload.get("qualification_data", {})
            algo_res = payload.get("algo_result", {})

            # Show Score if exists
            if algo_res:
                sc = algo_res.get('score', 0)
                stt = algo_res.get('status', 'Unknown')
                color = "green" if "HOT" in stt else ("orange" if "WARM" in stt else "red")
                st.markdown(f"### Current Score: {sc}/100 | Status: :{color}[{stt}]")
                st.info(f"👉 Action: {algo_res.get('action_plan')}")

            with st.expander("Open Qualification Form"):
                with st.form("algo_form"):
                    st.markdown("**A. Financial (50%)**")
                    col_f1, col_f2 = st.columns(2)
                    with col_f1:
                        q4 = st.selectbox("Q4: Part-time", ["SURVIVAL_MODE", "POCKET_MONEY"], index=0 if q_data.get("q_part_time")=="SURVIVAL_MODE" else 1)
                        q5 = st.selectbox("Q5: Travel", ["NO_TRAVEL", "BUDGET_TRAVEL", "PREMIUM_TRAVEL"])
                    with col_f2:
                        q6 = st.selectbox("Q6: Accom", ["SENSITIVE", "COMFORT"])
                        q7 = st.selectbox("Q7: Liquidity", ["NOT_LIQUID", "LIQUID"])

                    st.markdown("**B. Motivation (30%)**")
                    col_m1, col_m2 = st.columns(2)
                    with col_m1:
                        q1 = st.selectbox("Q1: Action", ["DREAMER", "DOER"])
                        q2 = st.selectbox("Q2: Anchor", ["HIGH_ANCHOR", "PRACTICAL"])
                    with col_m2:
                        q8 = st.selectbox("Q8: Blocker", ["FUNDING_BLOCKER", "LOGISTIC_BLOCKER"])

                    st.markdown("**C. Readiness (20%)**")
                    col_r1, col_r2 = st.columns(2)
                    with col_r1:
                        q3 = st.selectbox("Q3: Family", ["CONFLICT", "SUPPORT"])
                        q9 = st.selectbox("Q9: English", ["UNTESTED", "TESTED"])
                    with col_r2:
                        q10 = st.selectbox("Q10: DM", ["HIDDEN_DM", "CLEAR_DM"])

                    if st.form_submit_button("🧮 Calculate Score & Update Status"):
                        # Build Payload
                        score_inputs = {
                            "q_part_time": q4, "q_travel": q5, "q_accom": q6, "q_liquid": q7,
                            "q_action": q1, "q_anchor": q2, "q_blocker": q8,
                            "q_family": q3, "q_language": q9, "q_dm": q10
                        }
                        
                        # Calculate
                        result = calculate_lead_score(score_inputs)
                        
                        # Update Payload & Status
                        payload["qualification_data"] = score_inputs
                        payload["algo_result"] = result
                        
                        update_case_status_and_payload(case_id, result['status'], payload)
                        st.success(f"Score: {result['score']}. Status set to {result['status']}")
                        rerun()

            # --- ORIGINAL REPORT SECTION ---
            st.markdown("---")
            st.subheader("📄 Reports")
            if st.button("Generate Full Internal Report"):
                programs_df = pd.read_csv("data/programs.csv")
                full_md = make_internal_report(payload, programs_df)
                save_full_report(case_id, full_md)
                st.success("Report Generated!")
                rerun()
            
            if len(row) > 9 and row[9]:
                st.markdown(row[9])

    # -------------------------
    # Admin Panel (KEPT ORIGINAL)
    # -------------------------
    elif tab == "Admin Panel":
        if role != "ADMIN":
            st.error("Access Denied")
        else:
            st.title("Admin Panel")
            # ... (Rest of Admin code - standard user creation) ...
            with st.form("create_user_form"):
                name = st.text_input("Name")
                email = st.text_input("Email")
                password = st.text_input("Temporary Password", type="password")
                role_new = st.selectbox("Role", ["AGENT", "MANAGER", "ADMIN"])
                if st.form_submit_button("Create User"):
                    uid = str(uuid.uuid4())[:8].upper()
                    create_user(uid, name, email, password, role_new)
                    st.success("Created.")
            
            st.write("Existing Users:")
            users = list_users()
            st.dataframe(pd.DataFrame(users, columns=["ID", "Name", "Email", "PassHash", "Role", "Active"]))