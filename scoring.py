# scoring.py
def compute_confidence(payload: dict) -> float:
    # Start high, subtract for missing critical fields
    conf = 0.95
    finance = payload.get("finance", {})
    if finance.get("annual_budget") is None: conf -= 0.20
    if finance.get("savings") is None: conf -= 0.10
    if not payload.get("destinations"): conf -= 0.15
    if payload.get("gpa") is None: conf -= 0.10
    if payload.get("english") in (None, "", "Not yet"): conf -= 0.05
    return max(0.50, min(0.95, conf))

def questions_to_ask(payload: dict):
    qs = []
    finance = payload.get("finance", {})
    if finance.get("annual_budget") is None:
        qs.append("Confirm maximum annual budget (tuition + living).")
    if finance.get("cash_buffer") is None:
        qs.append("Confirm minimum savings buffer the family refuses to go below.")
    if payload.get("english") in (None, "", "Not yet"):
        qs.append("Confirm IELTS/TOEFL plan and target score + test date.")
    if not payload.get("major_choices"):
        qs.append("Clarify top 2–3 major preferences and why.")
    if not payload.get("intake"):
        qs.append("Confirm intended intake month/year.")
    return qs
