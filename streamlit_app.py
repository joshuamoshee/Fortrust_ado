# streamlit_app.py
import streamlit as st
import json
import uuid
import datetime as dt
import pandas as pd
from full_report import make_internal_report
from db import list_cases_advanced
from db import save_full_report
from report import make_counsellor_brief

# DB imports (Phase 1)
from db import (
    init_db,
    insert_case,
    get_case,
    list_cases,
    update_status,
    # auth/users
    get_user_by_email,
    hash_password,
    create_user,
    list_users,
    # pipeline/assignment/audit
    assign_case,
    list_cases_filtered,
    get_audit_for_case,
    log_event,
    # contact functions
    log_contact_attempt,
    mark_contacted,
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
# Public Intake
# -------------------------
if mode == "Public Intake":
    st.title("Study Abroad Intake Form")
    st.write("Fill this form and our counsellor will contact you for a free meeting.")

    with st.form("intake_form"):
        student_name = st.text_input("Student Full Name *")
        phone = st.text_input("Phone / WhatsApp *")
        email = st.text_input("Email (optional)")

        st.subheader("Goals")
        destinations = st.multiselect(
            "Preferred destinations (pick up to 3)",
            ["New Zealand", "UK", "Australia", "Canada", "USA", "Germany", "Other"],
        )
        major_choices = st.text_input("Preferred majors (comma-separated, e.g., Business Analytics, IT, Design)")
        intake = st.text_input("Intake (e.g., Sep 2026)")

        st.subheader("Family & Career Direction")
        student_goal = st.text_area("Student career goal (optional)", placeholder = "e.g., work in tech industry, become a data analyst, start a business, etc.")
        parent_careers = st.text_input ("parent preffered career options(coma-seperated)", placeholder="e.g., Doctor, Engineer, Accountant")
        
        st.subheader("Academics")
        gpa = st.text_input("GPA / Grades (optional)")
        english = st.selectbox("English Test", ["Not yet", "IELTS", "TOEFL", "Other"])
        english_score = st.text_input("English score (optional)")

        st.subheader("Finance (important)")
        annual_budget = st.number_input("Max annual budget (tuition + living)", min_value=0.0, step=500.0)
        savings = st.number_input("Savings available now", min_value=0.0, step=500.0)
        cash_buffer = st.number_input("Minimum cash buffer (must remain)", min_value=0.0, step=500.0)
        debt_allowed = st.selectbox("Debt allowed?", ["No", "Yes"])
        part_time_required = st.selectbox("Must work part-time?", ["No", "Yes"])

        submitted = st.form_submit_button("Submit")

    if submitted:
        if not student_name.strip() or not phone.strip():
            st.error("Please fill Student Name and Phone/WhatsApp.")
        else:
            payload = {
                "student_name": student_name.strip(),
                "phone": phone.strip(),
                "email": email.strip(),
                "destinations": destinations[:3],
                "major_choices": [m.strip() for m in major_choices.split(",") if m.strip()],
                "intake": intake.strip(),
                "gpa": gpa.strip() if gpa else None,
                "english": english,
                "english_score": english_score.strip() if english_score else None,
                "finance": {
                    "annual_budget": annual_budget if annual_budget > 0 else None,
                    "savings": savings if savings > 0 else None,
                    "cash_buffer": cash_buffer if cash_buffer > 0 else None,
                    "debt_allowed": debt_allowed,
                    "part_time_required": part_time_required,
                },
                "student_goal": student_goal.strip() if student_goal else None,
                "parent_careers": [x.strip() for x in parent_careers.split(",") if x.strip()]

            }

            case_id = str(uuid.uuid4())[:8].upper()
            brief_md = make_counsellor_brief(payload)

            # store in DB
            insert_case(case_id, payload, brief_md)

            # log system event
            log_event(None, "NEW_CASE", case_id, {"student_name": payload["student_name"]})

            st.success("Submitted! A counsellor will contact you soon.")
            st.info(f"Reference ID: {case_id}")

# -------------------------
# Counsellor Dashboard
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

    tab = st.sidebar.radio("Dashboard", tabs)

    # -------------------------
    # Pipeline
    # -------------------------
    if tab == "Pipeline":
        st.title("Pipeline")

        # Filters
        with st.expander("Filters", expanded=True):
            f1, f2, f3, f4 = st.columns(4)

            with f1:
                destination_filter = st.selectbox(
                    "Destination",
                    ["All", "New Zealand", "UK", "Australia", "Canada", "USA", "Germany", "Other"]
                )

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

        statuses = ["NEW", "CONTACTED", "MEETING_BOOKED", "APPLIED", "WON", "LOST"]
        cols = st.columns(len(statuses))

        # Resolve assigned_to filter value
        assigned_to_filter_id = None
        if role in ["ADMIN", "MANAGER"] and assignee_filter != "All":
            agent_map = {f"{a[1]} ({a[2]})": a[0] for a in list_users("AGENT")}
            assigned_to_filter_id = agent_map.get(assignee_filter)

        # Destination actual value
        dest_val = None if destination_filter == "All" else destination_filter

        for col, status in zip(cols, statuses):
            with col:
                st.subheader(status)

                status_query = status
                if show_only_hot and status != "NEW":
                    st.caption("—")
                    continue

                rows = list_cases_advanced(
                    status=status_query,
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
                    meta = f"{dest1 or '-'} • {budget or '-'} • {int(age_h)}h"

                    if st.button(title, key=f"open_{status}_{cid}"):
                        set_selected_case(cid)
                    st.caption(meta)

    # -------------------------
    # My Cases
    # -------------------------
    elif tab == "My Cases":
        st.title("My Work Queue")

        rows = list_cases_advanced(assigned_to=user["user_id"])
        if not rows:
            st.info("No cases assigned to you yet.")
            st.stop()

        # Prioritise: NEW first, then CONTACTED, then MEETING_BOOKED, then APPLIED
        priority = {"NEW": 0, "CONTACTED": 1, "MEETING_BOOKED": 2, "APPLIED": 3, "WON": 4, "LOST": 5}
        rows = sorted(rows, key=lambda r: (priority.get(r[2], 99), -hours_since(r[1])))

        # Quick stats
        new_count = sum(1 for r in rows if r[2] == "NEW")
        st.metric("New leads assigned to you", new_count)

        # Table + open
        for r in rows[:40]:
            cid, created_at, stt, sname, dest1, budget, assigned_to = r
            age_h = hours_since(created_at)
            age_tag = "🟢" if age_h < 6 else ("🟠" if age_h < 24 else "🔴")
            line = f"{age_tag} **{cid}** — {sname} ({stt})"
            st.write(line)
            st.caption(f"{dest1 or '-'} • budget {budget or '-'} • created {int(age_h)}h ago")
            if st.button("Open", key=f"my_open_{cid}"):
                set_selected_case(cid)
            st.divider()

    # -------------------------
    # All Cases
    # -------------------------
    elif tab == "All Cases":
        st.subheader("All Cases")
        rows = list_cases_filtered()
        if not rows:
            st.info("No cases yet.")
        else:
            st.dataframe(
                [{"case_id": r[0], "created_at": r[1], "status": r[2], "student": r[3], "destination": r[4], "budget": r[5], "assigned_to": r[6]} for r in rows],
                use_container_width=True,
            )

    # -------------------------
    # Case Detail
    # -------------------------
    elif tab == "Case Detail":
        # Get all cases first - FIXED INDENTATION
        all_cases = list_cases()
        if not all_cases:
            st.info("No cases yet.")
            st.stop()

        # Left: select case
        left, right = st.columns([1, 2])

        with left:
            st.subheader("Select a case")

            case_ids = [c[0] for c in all_cases]
            selected_default = st.session_state.get("selected_case_id")

            if selected_default in case_ids:
                default_index = case_ids.index(selected_default)
            else:
                default_index = 0

            selected = st.radio(
                "Cases",
                case_ids,
                index=default_index,
                format_func=lambda cid: f"{cid} — {next(x[3] for x in all_cases if x[0] == cid)}",
            )

        # Get the selected case details
        row = get_case(selected)
        
        # Initialize all variables first
        case_id = created_at = status = student_name = phone = email = raw_json = brief_md = assigned_to = full_report_md = full_report_updated_at = None
        
        # Now unpack based on row length
        if len(row) == 11:
            case_id, created_at, status, student_name, phone, email, raw_json, brief_md, assigned_to, full_report_md, full_report_updated_at = row
        elif len(row) == 9:
            case_id, created_at, status, student_name, phone, email, raw_json, brief_md, assigned_to = row
        elif len(row) == 8:
            case_id, created_at, status, student_name, phone, email, raw_json, brief_md = row
        else:
            st.error(f"Unexpected row format from get_case: {row}")
            st.stop()
        
        # Log view
        log_event(user["user_id"], "VIEW_CASE", case_id, {"student": student_name})

        payload = json.loads(raw_json)

        with right:
            st.subheader(f"Case {case_id} — {student_name}")
            st.write(f"**Status:** {status}")
            st.write(f"**Created:** {created_at}")
            st.write(f"**Phone:** {phone}")
            st.write(f"**Email:** {email}")

            # Contact Actions (SLA)
            st.markdown("### Contact Actions")

            c1, c2, c3 = st.columns(3)

            with c1:
                if st.button("Mark Contact Attempt", key=f"attempt_{case_id}"):
                    log_contact_attempt(case_id)
                    log_event(user["user_id"], "CONTACT_ATTEMPT", case_id, {})
                    st.success("Logged contact attempt.")
                    rerun()

            with c2:
                if st.button("Mark Contacted", key=f"contacted_{case_id}"):
                    mark_contacted(case_id)
                    update_status(case_id, "CONTACTED")
                    log_event(user["user_id"], "MARK_CONTACTED", case_id, {})
                    st.success("Marked as contacted.")
                    rerun()

            with c3:
                # WhatsApp quick-open
                if phone:
                    wa_num = phone.replace("+", "").replace(" ", "").replace("-", "")
                    st.markdown(f'<a href="https://wa.me/{wa_num}" target="_blank"><button style="background-color: #25D366; color: white; border: none; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 4px;">Open WhatsApp</button></a>', unsafe_allow_html=True)
                else:
                    st.button("Open WhatsApp", disabled=True)

            # Assignment
            st.markdown("### Assignment")
            agents = list_users("AGENT")
            agent_map = {f"{a[1]} ({a[2]})": a[0] for a in agents}

            # Show current assigned
            assigned_name = "Unassigned"
            if assigned_to:
                for agent in agents:
                    if agent[0] == assigned_to:
                        assigned_name = f"{agent[1]} ({agent[2]})"
                        break
                
            st.caption(f"Currently assigned to: {assigned_name}")

            can_assign = role in ["ADMIN", "MANAGER"]
            if can_assign:
                choice = st.selectbox("Assign to agent", ["Unassigned"] + list(agent_map.keys()))
                if st.button("Save Assignment"):
                    if choice == "Unassigned":
                        assign_case(case_id, None)
                        log_event(user["user_id"], "ASSIGN_CASE", case_id, {"assigned_to": None})
                    else:
                        assign_case(case_id, agent_map[choice])
                        log_event(user["user_id"], "ASSIGN_CASE", case_id, {"assigned_to": agent_map[choice]})
                    st.success("Assignment updated.")
                    rerun()
            else:
                st.info("Only Admin/Manager can assign cases.")

            # Status update
            st.markdown("### Status")
            status_list = ["NEW", "CONTACTED", "MEETING_BOOKED", "APPLIED", "WON", "LOST"]
            new_status = st.selectbox("Update status", status_list, index=status_list.index(status))
            if st.button("Save Status"):
                update_status(case_id, new_status)
                log_event(user["user_id"], "UPDATE_STATUS", case_id, {"status": new_status})
                st.success("Status updated.")
                rerun()

            # Brief report
            st.markdown("---")
            st.subheader("Counsellor Brief (Internal)")
            st.markdown(brief_md)

            # Raw payload
            with st.expander("Raw Intake Data (Internal)"):
                st.json(payload)

            # Audit trail
            st.markdown("---")
            st.subheader("Audit Trail")
            aud = get_audit_for_case(case_id, limit=30)
            if not aud:
                st.caption("No audit entries.")
            else:
                for ts, uid, action, meta in aud:
                    st.write(f"- {ts} | {uid or 'SYSTEM'} | **{action}** | {meta}")

            st.markdown("---")
            st.subheader("Full Internal Report (Counsellor Only)")
            if st.button("Generate / Refresh Full Report"):
                programs_df = pd.read_csv("data/programs.csv")
                full_md = make_internal_report(payload, programs_df)
                save_full_report(case_id, full_md)
                log_event(user["user_id"], "GENERATE_FULL_REPORT", case_id, {"rows_in_db": len(programs_df)})
                st.success("Full report generated.")
                st.rerun()

            # show stored report if exists
            if full_report_md:
                if full_report_updated_at:
                    st.caption(f"Last updated: {full_report_updated_at}")
                st.markdown(full_report_md)
            else:
                st.info("No full report yet. Click Generate.")

    # -------------------------
    # Admin Panel
    # -------------------------
    elif tab == "Admin Panel":  # Changed from 'if' to 'elif'
        if role != "ADMIN":
            st.error("Admin only.")
            st.stop()

        st.title("Admin Panel — Users")
        st.write("Create counsellor/agent accounts.")

        with st.form("create_user_form"):
            name = st.text_input("Name")
            email = st.text_input("Email")
            password = st.text_input("Temporary Password", type="password")
            role_new = st.selectbox("Role", ["AGENT", "MANAGER", "ADMIN"])
            submitted = st.form_submit_button("Create User")

        if submitted:
            if not name.strip() or not email.strip() or not password.strip():
                st.error("Name, email, and password are required.")
            else:
                uid = str(uuid.uuid4())[:8].upper()
                create_user(uid, name.strip(), email.strip().lower(), password, role_new)
                log_event(user["user_id"], "CREATE_USER", None, {"created_user": uid, "role": role_new, "email": email.strip().lower()})
                st.success(f"Created {role_new} user: {name} ({email})")

        st.subheader("Existing Users")
        users = list_users()
        if users:
            # Format the users for display
            display_users = []
            for u in users:
                # Handle both 5-field and 6-field returns
                if len(u) == 6:
                    user_id, name, email, _, role, is_active = u
                elif len(u) == 5:
                    user_id, name, email, role, is_active = u
                else:
                    st.error(f"Unexpected user data format: {u}")
                    continue
                    
                display_users.append({
                    "User ID": user_id,
                    "Name": name,
                    "Email": email,
                    "Role": role,
                    "Active": "Yes" if is_active else "No"
                })
            st.dataframe(display_users, use_container_width=True)