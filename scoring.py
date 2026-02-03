# scoring.py

def calculate_lead_score(payload: dict):
    """
    Implements the 100-Point Algorithm:
    - Financial (50%)
    - Motivation (30%)
    - Readiness (20%)
    """
    
    # 1. Initialize Scores
    score_financial = 0
    score_motivation = 0
    score_readiness = 0
    
    flags = [] # To store "Red Flag", "Yellow Flag"
    breakdown = [] # To explain the score to the user

    # --- A. FINANCIAL (Max 50) ---
    q_part_time = payload.get("q_part_time") # Q4
    if q_part_time == "SURVIVAL_MODE":
        score_financial += 0
        breakdown.append("Financial: Survival Mode (0)")
    elif q_part_time == "POCKET_MONEY":
        score_financial += 15
        breakdown.append("Financial: Pocket Money (+15)")

    q_travel = payload.get("q_travel") # Q5
    if q_travel == "NO_TRAVEL": score_financial += 5
    elif q_travel == "BUDGET_TRAVEL": score_financial += 10
    elif q_travel == "PREMIUM_TRAVEL": score_financial += 15

    q_accom = payload.get("q_accom") # Q6
    if q_accom == "SENSITIVE": score_financial += 5
    elif q_accom == "COMFORT": score_financial += 10

    q_liquid = payload.get("q_liquid") # Q7
    if q_liquid == "NOT_LIQUID":
        score_financial += 0
        flags.append("YELLOW_FLAG_LIQUIDITY")
        breakdown.append("Financial: Not Liquid (Yellow Flag)")
    elif q_liquid == "LIQUID":
        score_financial += 10
        breakdown.append("Financial: Liquid (+10)")

    # --- B. MOTIVATION (Max 30) ---
    q_action = payload.get("q_action") # Q1
    if q_action == "DREAMER": score_motivation += 5
    elif q_action == "DOER": score_motivation += 15

    q_anchor = payload.get("q_anchor") # Q2
    if q_anchor == "HIGH_ANCHOR":
        score_motivation += 0
        flags.append("RED_FLAG_ANCHOR")
        breakdown.append("Motivation: High Emotional Anchor (Red Flag)")
    elif q_anchor == "PRACTICAL":
        score_motivation += 15

    q_blocker = payload.get("q_blocker") # Q8
    if q_blocker == "FUNDING_BLOCKER":
        score_motivation += 0
        flags.append("RED_FLAG_SCHOLARSHIP")
        breakdown.append("Motivation: Needs Full Scholarship (Red Flag)")
    elif q_blocker == "LOGISTIC_BLOCKER":
        score_motivation += 10

    # --- C. READINESS (Max 20) ---
    q_family = payload.get("q_family") # Q3
    if q_family == "CONFLICT": score_readiness += 0
    elif q_family == "SUPPORT": score_readiness += 10

    q_language = payload.get("q_language") # Q9
    if q_language == "UNTESTED": score_readiness += 2
    elif q_language == "TESTED": score_readiness += 5

    q_dm = payload.get("q_dm") # Q10
    if q_dm == "HIDDEN_DM": score_readiness += 0
    elif q_dm == "CLEAR_DM": score_readiness += 5

    # --- CALCULATION ---
    total_score = score_financial + score_motivation + score_readiness

    # --- CLASSIFICATION LOGIC ---
    status = "RISKY"
    action_plan = "Arahkan ke E-Book / Webinar."
    
    # Logic:
    # HOT: >= 75 AND No Red Flags
    # WARM: 45-74 OR (>75 but Yellow Flag)
    # RISKY: < 45 OR Red Flag OR Yellow Flag downgrade logic
    
    has_red_flag = any("RED_FLAG" in f for f in flags)
    has_yellow_flag = "YELLOW_FLAG_LIQUIDITY" in flags

    if has_red_flag:
        status = "RISKY / COLD"
        action_plan = "AUTO-REJECT: Do not pass to sales. Send generic scholarship info."
    elif total_score >= 75:
        if has_yellow_flag:
            status = "WARM (Downgraded)"
            action_plan = "Nurture: High potential but liquidity issues. Send financing options."
        else:
            status = "HOT LEAD"
            action_plan = "URGENT: Call immediately. Lock in deposit."
    elif total_score >= 45:
        # Check specific downgrade rule: Q7 Not Liquid downgrades Warm to Risky?
        # The prompt says: "Jual tanah/aset dulu -> DOWNGRADE_ONE_LEVEL"
        if has_yellow_flag:
            status = "RISKY (Downgraded)"
            action_plan = "Too risky due to liquidity. Keep on email list only."
        else:
            status = "WARM"
            action_plan = "Nurture: Send University comparison content."
    else:
        status = "RISKY"
        action_plan = "Low Score. Automate follow-up only."

    return {
        "score": total_score,
        "status": status,
        "breakdown": breakdown,
        "action_plan": action_plan,
        "flags": flags,
        "scores": {
            "financial": score_financial,
            "motivation": score_motivation,
            "readiness": score_readiness
        }
    }