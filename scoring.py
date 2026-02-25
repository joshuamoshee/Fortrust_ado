def calculate_lead_score(data: dict) -> dict:
    """
    Fortrust 2.0 Lead Qualification Algorithm.
    Evaluates Financial (50), Motivation (30), and Readiness (20).
    Applies Red Flags (Auto-Risky) and Yellow Flags (Downgrades).
    """
    score = 0
    red_flag = False
    yellow_flag = False
    reasons = []

    # ---------------------------------------------------------
    # A. VARIABEL FINANSIAL (Max 50 Poin)
    # ---------------------------------------------------------
    q4 = data.get("q_part_time", "")
    if q4 == "POCKET_MONEY": score += 15
    elif q4 == "SURVIVAL_MODE": score += 0
    
    q5 = data.get("q_travel", "")
    if q5 == "PREMIUM_TRAVEL": score += 15
    elif q5 == "BUDGET_TRAVEL": score += 10
    elif q5 == "NO_TRAVEL": score += 5
    
    q6 = data.get("q_accom", "")
    if q6 == "COMFORT": score += 10
    elif q6 == "SENSITIVE": score += 5
    
    q7 = data.get("q_liquid", "")
    if q7 == "LIQUID": score += 10
    elif q7 == "NOT_LIQUID": 
        score += 0
        yellow_flag = True
        reasons.append("FLAG KUNING: Deposit tidak likuid (Jual aset/Pinjaman).")

    # ---------------------------------------------------------
    # B. VARIABEL MOTIVASI (Max 30 Poin)
    # ---------------------------------------------------------
    q1 = data.get("q_action", "")
    if q1 == "DOER": score += 15
    elif q1 == "DREAMER": score += 5
    
    q2 = data.get("q_anchor", "")
    if q2 == "PRACTICAL": score += 15
    elif q2 == "HIGH_ANCHOR": 
        score += 0
        red_flag = True
        reasons.append("FLAG MERAH: Jangkar Emosional Tinggi (Pacar/Keluarga). 80% batal last minute.")
        
    q8 = data.get("q_blocker", "")
    if q8 == "LOGISTIC_BLOCKER": score += 10
    elif q8 == "FUNDING_BLOCKER": 
        score += 0
        red_flag = True
        reasons.append("FLAG MERAH: Blocker Finansial (Wajib Full Beasiswa).")

    # ---------------------------------------------------------
    # C. VARIABEL KESIAPAN (Max 20 Poin)
    # ---------------------------------------------------------
    q3 = data.get("q_family", "")
    if q3 == "SUPPORT": score += 10
    elif q3 == "CONFLICT": score += 0
    
    q9 = data.get("q_language", "")
    if q9 == "TESTED": score += 5
    elif q9 == "UNTESTED": score += 2
    
    q10 = data.get("q_dm", "")
    if q10 == "CLEAR_DM": score += 5
    elif q10 == "HIDDEN_DM": score += 0

    # ---------------------------------------------------------
    # LOGIKA KALKULASI & KLASIFIKASI (The Filter)
    # ---------------------------------------------------------
    status = ""
    
    if red_flag:
        status = "RISKY / COLD LEADS"
    elif score >= 75:
        if yellow_flag:
            status = "WARM LEADS (Sensitif Harga)"
        else:
            status = "HOT LEADS"
    elif score >= 45:
        status = "WARM LEADS"
    else:
        status = "RISKY / COLD LEADS"

    return {
        "score": score,
        "status": status,
        "red_flag": red_flag,
        "yellow_flag": yellow_flag,
        "reasons": reasons
    }