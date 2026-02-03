# report.py
from scoring import compute_confidence, questions_to_ask

def make_counsellor_brief(payload: dict) -> str:
    conf = compute_confidence(payload)
    qs = questions_to_ask(payload)

    student = payload.get("student_name", "Unknown")
    dests = payload.get("destinations", [])
    majors = payload.get("major_choices", [])
    finance = payload.get("finance", {})

    md = f"""
# Counsellor Brief — {student}

**Destinations:** {", ".join([d for d in dests if d]) or "Not provided"}  
**Major Interests:** {", ".join([m for m in majors if m]) or "Not provided"}  
**Intake:** {payload.get("intake","Not provided")}  

## Finance Snapshot
- **Annual budget:** {finance.get("annual_budget","Not provided")}
- **Savings:** {finance.get("savings","Not provided")}
- **Cash buffer:** {finance.get("cash_buffer","Not provided")}
- **Debt allowed:** {finance.get("debt_allowed","Not provided")}
- **Part-time required:** {finance.get("part_time_required","Not provided")}

## Academics Snapshot
- **GPA/Grades:** {payload.get("gpa","Not provided")}
- **English:** {payload.get("english","Not provided")}

## Confidence (data completeness)
**Estimated confidence:** {int(conf*100)}%

## Key Questions to Ask (first call)
"""
    if qs:
        md += "\n".join([f"- {q}" for q in qs])
    else:
        md += "- No major gaps detected. Proceed to recommendations & next steps."

    md += "\n\n## Next Action\n- Contact lead within 24 hours, confirm constraints, then generate full report v1."
    return md.strip()
