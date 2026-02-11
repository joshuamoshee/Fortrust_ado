import json

def generate_abigail_report(student_name, payload, top_programs):
    """
    Generates a strategic report matching the 'Abigail M' PDF format.
    Now 'Smart-Linked' to Counsellor Interview Data.
    """
    
    # 1. Extract Data
    scores = payload.get("algo_result", {})
    q_data = payload.get("qualification_data", {})
    c_data = payload.get("counsellor_data", {}) # <--- NEW: Read Counsellor Notes
    
    finance_score = scores.get('scores', {}).get('financial', 0)
    
    # 2. Determine "Cognitive Profile" (Simulated from Q1/Q2)
    profile_type = "The Strategic-Analytical Thinker"
    if q_data.get("q_action") == "DREAMER":
        profile_type = "The Visionary Explorer (Needs Structure)"
    elif q_data.get("q_anchor") == "PRACTICAL":
        profile_type = "The Pragmatic Executor (High ROI Focused)"

    # 3. Determine the "Focus University"
    # Logic: If Counsellor entered a specific target, use that. Otherwise use the Algorithm's top pick.
    manual_target = c_data.get("target_uni")
    manual_program = c_data.get("target_program", "Selected Major")
    
    if manual_target:
        # User has a specific dream school
        focus_uni_name = manual_target
        focus_uni_loc = c_data.get("branch", "Overseas") # Placeholder logic
        focus_reason = "Specifically requested by student during interview."
        match_score = "N/A (Manual Selection)"
    else:
        # Use Algorithm
        if top_programs:
            focus_uni_name = top_programs[0]['institution']
            focus_uni_loc = top_programs[0]['country']
            focus_reason = "Matched based on Budget & GPA."
            match_score = "9.2/10"
        else:
            focus_uni_name = "Generic University"
            focus_uni_loc = "Global"
            focus_reason = "General recommendation."
            match_score = "8.0/10"

    # 4. Build the Report (Markdown)
    report = f"""
# 🎓 STRATEGIC ROADMAP: {student_name.upper()}
**Profile Type:** {profile_type}  
**Ref:** FORTRUST-AI-{scores.get('score', 0)}  
**Date:** {json.dumps(payload.get('intake', '2025/2026')).replace('"', '')}

---

## 1. EXECUTIVE SUMMARY
**{student_name}** has been assessed with a Qualification Score of **{scores.get('score', 0)}/100** ({scores.get('status', 'Unclassified')}).

* **Financial Health:** {c_data.get('budget_discussion', 'Not Discussed')}
* **Academic Interest:** {manual_program}
* **Counsellor Verdict:** {_get_counsellor_verdict(scores.get('score', 0))}

**Strategic Direction:** The student is targeting **{focus_uni_name}**. The primary challenge will be {_get_challenge(q_data)}. 
We recommend the **"Direct Entry"** pathway provided documents are submitted by **October**.

---

## 2. TARGET UNIVERSITY ANALYSIS

### 🏛 Option 1: {focus_uni_name} ({focus_uni_loc})
* **Program:** {manual_program}
* **Selection Reason:** {focus_reason}

| **Metric** | **Analysis** | **Score** |
| :--- | :--- | :--- |
| **Cognitive Fit** | Curriculum matches {profile_type} learning style. | **{match_score}** |
| **Budget Fit** | {c_data.get('budget_discussion', 'Neutral')} | **High** |
| **ROI Speed** | Estimated break-even: 3.5 years after grad. | **High** |

> **💡 AI Strategy Tip:** Since the student identified as a **{q_data.get('q_action', 'Student')}**, we recommend focusing the Personal Statement on {_get_ps_tip(q_data)}.

---

## 3. ALTERNATIVE RECOMMENDATIONS (Algorithm)
If **{focus_uni_name}** is unavailable, here are the best data-backed alternatives:

"""
    # Loop through algorithm matches (Top 2), skipping if it duplicates the manual target
    count = 0
    for prog in top_programs:
        if count >= 2: break
        if manual_target and manual_target.lower() in prog['institution'].lower(): continue
        
        report += f"""* **{prog['institution']} ({prog['country']})** - {prog['program_name']} (${prog['tuition_per_year']:,.0f}/yr)\n"""
        count += 1

    report += """
---

## 4. 5-YEAR FUTURE-PROOFING ROADMAP
| Phase | Focus | Action Item |
| :--- | :--- | :--- |
| **Year 1 (Prep)** | Language & Portfolio | Finalize IELTS. Start a 'Passion Project' related to major. |
| **Year 2 (Uni)** | Adaptation | Join 1 Professional Club (Networking). Maintain GPA > 3.0. |
| **Year 3 (Work)** | Internships | Apply for Summer Internships in local industry. |
| **Year 4 (Grad)** | Post-Study Visa | Apply for Graduate Visa immediately. |
| **Year 5 (Career)** | ROI | Target Junior Role salary range ($55k - $65k). |

---
**Disclaimer:** This roadmap is generated based on current profiling data. External visa policies may change.
"""
    return report

# --- Helper Functions ---
def _get_counsellor_verdict(score):
    if score >= 75: return "Highly Qualified. Priority processing recommended."
    if score >= 45: return "Qualified but requires Nurturing (Budget/Docs)."
    return "High Risk. Requires substantial document/financial review."

def _get_challenge(q_data):
    if q_data.get('q_english') == "UNTESTED": return "meeting English entry requirements on time"
    if q_data.get('q_liquid') == "NOT_LIQUID": return "demonstrating financial liquidity for the visa"
    return "maintaining GPA during the final semester"

def _get_ps_tip(q_data):
    if q_data.get('q_action') == "DOER": return "concrete achievements and leadership roles"
    return "future vision and adaptability to new environments"