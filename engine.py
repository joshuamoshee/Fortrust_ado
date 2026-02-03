import pandas as pd

VISA_RISK = {"Low": 1.0, "Medium": 0.7, "High": 0.4}
SCHOLAR = {"High": 1.0, "Medium": 0.7, "Low": 0.4}

def _safe_float(x, default=None):
    try:
        return float(x)
    except Exception:
        return default
    
def normalize_country_list(destination):
    # intake uses "UK", "new zealand", etc
    return [d for d in (destination or []) if d and d != "other"]

def estimate_yearly_cost(row):
    return float(row["tuition_per_year"]) + float(row["living_per_year"])

def affordability_score(finance, yearly_cost):
    budget = finance.get("annual_budget")
    savings = finance.get("savings")
    cash_buffer = finance.get("cash_buffer")

    if not budget:
        return 0.45, "No budget provided"
    
    ratio = yearly_cost / budget if budget > 0 else 99
    score = max(0.0, min(1.0, 1.1 - ratio))

    # buffer safety penalty
    if savings is not None and cash_buffer is not None:
        # rough check: if first year shortfall would dip into buffer
        shortfall = max(0.0, yearly_cost - budget)
        if (savings - shortfall) < cash_buffer:
            score *= 0.75
            return score, "Budget shortfall risks breaking cash buffer"
    return score, f"Cost/Budget ratio {ratio:.2f}"

def interest_score(major_choices, category):
    if not major_choices: 
        return 0.6, "No major choices provided"
    
    text = " ".join([m.lower() for m in major_choices])

    # simple keyword matching, expand later
    keyword_map = {
        "IT": ["computer", "it", "data", "software", "ai", "cyber", "information"],
        "Business": ["business", "finance", "account", "management", "commerce", "marketing"],
        "Design": ["design", "animation", "media", "creative", "ui", "ux"],
        "Health": ["nursing", "health", "medicine", "pharmacy"],
    }

    kws = keyword_map.get(category, [])
    if any(k in text for k in kws):
        return 1.0, "Category matches stated interests"
    return 0.6, "Category not clearly matched to stated interests"

def requirements_penalty(student, row):
    # If student has IELTS/GPA, penalize options that exceed
    gpa = _safe_float(student.get("gpa"))
    ielts = _safe_float(student.get("english_score"))

    gpa_min = _safe_float(row.get("gpa_min"))
    ielts_min = _safe_float(row.get("ielts_min"))

    penalty = 1.0
    reasons = []

    if gpa is not None and gpa_min is not None and gpa < gpa_min:
        penalty *= 0.75
        reasons.append("GPA below typical minimum")

    if ielts is not None and ielts_min is not None and ielts < ielts_min:
        penalty *= 0.75
        reasons.append("IELTS below typical minimum")

    return penalty, (", ".join(reasons) if reasons else "No requirement conflicts detected")

def rank_programs(student, programs_df: pd.DataFrame):
    finance = student.get("finance", {})
    destinations = normalize_country_list(student.get("destinations", []))
    major_choices = student.get("major_choices", [])

    df = programs_df.copy()

    if destinations:
        df = df[df["country"].isin(destinations)].copy()

    results = []
    for _, row in df.iterrows():
        yearly_cost = estimate_yearly_cost(row)
        aff, aff_note = affordability_score(finance, yearly_cost)
        intr, intr_note = interest_score(major_choices, row["category"])
        visa = VISA_RISK.get(row.get("visa_risk", "Medium"), 0.7)
        schol = SCHOLAR.get(row.get("scholarship_level", "Low"), 0.4)

        req_pen, req_note = requirements_penalty(student, row)

        # Weighted scoring (finance-led)
        base = (0.55 * aff) + (0.20 * visa) + (0.15 * intr) + (0.10 * schol)
        final = base * req_pen

        results.append({
            "country": row["country"],
            "city": row["city"],
            "institution": row["institution"],
            "level": row["level"],
            "category": row["category"],
            "program_name": row["program_name"],
            "yearly_cost": yearly_cost,
            "tuition_per_year": float(row["tuition_per_year"]),
            "living_per_year": float(row["living_per_year"]),
            "duration_years": float(row["duration_years"]),
            "intake_months": row.get("intake_months", ""),
            "visa_risk": row.get("visa_risk", "Medium"),
            "scholarship_level": row.get("scholarship_level", "Low"),
            "vibe": row.get("vibe", ""),
            "score": float(final),
            "notes": {
                "affordability": aff_note,
                "interest": intr_note,
                "requirements": req_note
            }
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results