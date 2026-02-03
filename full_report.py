import pandas as pd
from engine import rank_programs

def money(x):
    try:
        return f"{float(x):,.0f}"
    except Exception:
        return str(x)
    
def split_list(s):
    return [x.strip() for x in (s or "").split(",") if x.strip()]

def major_fit_from_text(text: str):
    t = (text or "").lower()
    # crude mapping; expand later
    if any(k in t for k in ["software", "data", "ai", "cyber", "it"]): return "IT"
    if any(k in t for k in ["business", "finance", "account", "consult"]): return "Business"
    if any(k in t for k in ["design", "animation", "ui", "ux", "media"]): return "Design"
    if any(k in t for k in ["nurse", "doctor", "medicine", "health"]): return "Health"
    return "Other"

def salary_block(p):
    # safe formatting: show if exists
    def g(k):
        return p.get(k, None)
    return {
        "id": (g("salary_id_low"), g("salary_id_med"), g("salary_id_high")),
        "dest": (g("salary_dest_low"), g("salary_dest_med"), g("salary_dest_high")),
    }


def make_internal_report(student: dict, programs_df: pd.DataFrame) -> str:
    ranked = rank_programs(student, programs_df)
    top3 = ranked[:3]

    finance = student.get("finance", {})
    student_name = student.get("student_name", "Unknown")
    destinations = ", ".join(student.get("destinations", []) or []) or "Not provided"
    majors = ", ".join(student.get("major_choices", []) or []) or "Not provided"
    intake = student.get("intake", "Not provided")

    # Confidence is data completeness (simple v1)
    conf = 0.95
    if not finance.get("annual_budget"): conf -= 0.20
    if not student.get("destinations"): conf -= 0.10
    if not student.get("major_choices"): conf -= 0.10
    if student.get("english") == "Not yet": conf -= 0.05
    conf = max(0.50, min(0.95, conf))

    lines = []
    lines.append(f"# Internal Student Report — {student_name}\n")

    lines.append("## Disclaimer\n")
    lines.append(f"Based on the data provided, the confidence level of this result is **{int(conf*100)}%**.\n")
    lines.append("The recommendation is triangulated from multiple factors (finance feasibility, preference alignment, visa/scholarship indicators, and baseline entry requirements). ")
    lines.append("The remaining uncertainty accounts for external variables (family finance changes, policy shifts, health, and job market movements).\n")

    lines.append("## Student Snapshot\n")
    lines.append(f"- **Destinations:** {destinations}")
    lines.append(f"- **Preferred majors:** {majors}")
    lines.append(f"- **Intake:** {intake}")
    lines.append(f"- **Annual budget (max):** {finance.get('annual_budget','Not provided')}")
    lines.append(f"- **Savings / Buffer:** {finance.get('savings','?')} / {finance.get('cash_buffer','?')}")
    lines.append(f"- **English:** {student.get('english','Not provided')} ({student.get('english_score','')})")
    lines.append(f"- **GPA/Grades:** {student.get('gpa','Not provided')}\n")

    if not top3:
        lines.append("## Result\nNo matching programs found for the current filters. Add more programs to the database or widen destination preferences.")
        return "\n".join(lines)

    lines.append("## Top 3 Recommendations (Finance-led)\n")
    for i, p in enumerate(top3, start=1):
        lines.append(f"### Option {i}: {p['program_name']} — {p['institution']} ({p['city']}, {p['country']})\n")
        lines.append("| Factor | Result | Notes |")
        lines.append("|---|---:|---|")
        lines.append(f"| Estimated yearly cost | {money(p['yearly_cost'])} | Tuition {money(p['tuition_per_year'])} + Living {money(p['living_per_year'])} |")
        lines.append(f"| Visa risk tag | {p['visa_risk']} | Used as a safety-weight factor |")
        lines.append(f"| Scholarship indicator | {p['scholarship_level']} | Used as a value factor (not guaranteed) |")
        lines.append(f"| Intake months | {p['intake_months']} | Check institution dates |")
        lines.append(f"| Overall score | {p['score']:.2f} | Finance>Visa>Fit>Scholarship, with requirement penalty |")
        lines.append("")
        lines.append("**Reasoning notes:**")
        lines.append(f"- Affordability: {p['notes']['affordability']}")
        lines.append(f"- Interest fit: {p['notes']['interest']}")
        lines.append(f"- Requirements: {p['notes']['requirements']}\n")

    # Education Value Matrix (simple v1)
    # X-axis: Cost (yearly_cost), Y-axis: Value proxy (score)
    lines.append("## Education Value Matrix (v1)\n")
    lines.append("**Quadrants definition (v1):**\n")
    lines.append("- **Golden Ticket:** Low cost / High value\n- **Premium Investment:** High cost / High value\n- **Passion Project:** High cost / Low value\n- **Questionable Utility:** Low cost / Low value\n")

    # pick 5 items for matrix from ranked list
    sample = ranked[:5]
    if sample:
        costs = [p["yearly_cost"] for p in sample]
        cost_med = sorted(costs)[len(costs)//2]
        score_med = sorted([p["score"] for p in sample])[len(sample)//2]

        def quadrant(p):
            low_cost = p["yearly_cost"] <= cost_med
            high_val = p["score"] >= score_med
            if low_cost and high_val: return "Golden Ticket"
            if (not low_cost) and high_val: return "Premium Investment"
            if (not low_cost) and (not high_val): return "Passion Project"
            return "Questionable Utility"

        lines.append("| Program | Institution | City | Yearly Cost | Value Score | Quadrant |")
        lines.append("|---|---|---|---:|---:|---|")
        for p in sample:
            lines.append(f"| {p['program_name']} | {p['institution']} | {p['city']} | {money(p['yearly_cost'])} | {p['score']:.2f} | {quadrant(p)} |")
        lines.append("")

    # Next steps / checklist
    lines.append("## Strategic Execution Plan (First Call)\n")
    lines.append("1) Confirm budget, buffer, funding source, and whether part-time work is required.\n"
                 "2) Confirm IELTS plan and target test date.\n"
                 "3) Shortlist 2–3 programs and validate entry requirements + intake dates.\n"
                 "4) Explain the application timeline and required documents.\n")

    lines.append("## Counsellor Notes (What to ask next)\n")
    lines.append("- Confirm parent priorities (cost vs prestige vs visa safety vs job outcomes).\n"
                 "- Clarify major intent (what role do they want after graduation?).\n"
                 "- Check flexibility: change destination? change level (Diploma→Bachelor)?\n")

    return "\n".join(lines).strip()
