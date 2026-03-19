import json
import os
from google import genai
from google.genai import types
import streamlit as st

# ------------------------------------------------------------------
# CONFIGURATION - THE GEMINI AI ENGINE
# ------------------------------------------------------------------
# Safely fetch the key from Streamlit secrets or environment variables
try:
    API_KEY = st.secrets["GEMINI_API_KEY"]
except (KeyError, FileNotFoundError):
    API_KEY = os.environ.get("GEMINI_API_KEY", "")

def generate_strategic_report(student_name, payload, top_programs):
    """
    The Core Gemini AI Engine. 
    It reads psychometric data AND academic grades to output a strategic JSON,
    acting as an intellectual sparring partner.
    """
    
    # --- 1. GATHER CONTEXT ---
    c_data = payload.get("counsellor_data", {})
    scores = payload.get("algo_result", {})
    
    personality_notes = c_data.get("personality_notes", "No specific psychometric test provided.")
    academic_notes = c_data.get("academic_notes", "No academic transcripts provided.")
    parents_pref = c_data.get("parents_pref", "No specific parent preference stated.")
    target_uni = c_data.get("target_uni", "Open to suggestions")
    
    # --- 2. THE SYSTEM PROMPT ---
    system_prompt = """
    You are a Senior Educational Psychologist and Strategic Admissions Expert at Fortrust.
    From now on, do not simply affirm the student's or parent's statements or assume their career conclusions are correct. 
    Your goal is to be an intellectual sparring partner, not just an agreeable assistant. 
    Every time you analyze a student profile, do the following:
    1. Analyse their assumptions (e.g., Parent preferences vs. student reality).
    2. Provide counterpoints (e.g., Highlight friction between their grades and their desired major).
    3. Test their reasoning.
    4. Offer alternative perspectives (Realistic pivot pathways).
    5. Prioritize truth over agreement. Maintain a constructive, but rigorous approach.

    You SHOULD: 
    - Always tell the truth about their academic reality.
    - Never make up information, speculate, or guess university data.
    - Explicitly state "I cannot confirm this" if a career pathway cannot be verified.
    - Prioritize accuracy over speed.

    You MUST AVOID: 
    - Fabricating facts, salaries, or university requirements.
    - Presenting speculation or assumption as fact.

    ⚠️ CRITICAL PSYCHOMETRIC RULES:
    - IF "Stress Tolerance" is low: explicitly warn against high-pressure careers (Medicine, Corporate Law). Prioritize tech, design, or project-based roles.
    - IF "Parent Preference" contradicts Grades or Kryptonite, state "Unsuitable" in the parent analysis.

    OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema:
    {
      "disclaimer": "Confidence level statement...",
      "executive_summary": "A rigorous analysis...",
      "analysis": {
        "superpowers": "Identify strongest verifiable cognitive assets...",
        "kryptonite": "Identify critical personality/academic risks..."
      },
      "recommendations": [
        {
          "role": "Alternative/Recommended Career Path Name",
          "future_proofing": "Factual strategy...",
          "salary_map": "Indonesia: $X | Abroad: $Y",
          "universities": ["Uni A", "Uni B"]
        }
      ],
      "roadmap": [{"phase": "Year X", "action": "Specific habit..."}],
      "parent_analysis": {"preference": "Parent's Choice", "verdict": "Rigorous analysis..."},
      "value_matrix": {"golden_ticket": ["Option A"], "premium": ["Option B"], "passion": ["Option C"], "questionable": ["Option D"], "scholarship_impact": "Impact..."},
      "city_matrix": [{"city": "City Name", "institution": "Uni Name", "risk": "Verifiable risk..."}],
      "fit_vs_friction": [{"pathway": "Option Name", "fit": "Cognitive alignment", "friction": "Counterpoint/Friction", "score": "8/10"}]
    }
    """
    
    # --- 3. THE USER PROMPT ---
    user_prompt = f"""
    STUDENT: {student_name}
    ALGO LEAD SCORE: {scores.get('score', 0)} / 100
    
    --- PSYCHOMETRIC DATA ---
    {personality_notes}
    
    --- ACADEMIC GRADES / TRANSCRIPTS ---
    {academic_notes}
    
    --- INTERVIEW NOTES ---
    PARENT PREFERENCE: {parents_pref}
    TARGET UNI/BUDGET: {target_uni}
    
    --- DATABASE MATCHES ---
    {json.dumps(top_programs[:3])}
    
    TASK: Execute the Core Protocol acting as an intellectual sparring partner and return the strict JSON report.
    """

    # --- 4. EXECUTE GEMINI API CALL (NEW SDK SYNTAX) ---
    if not API_KEY or API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return _simulation_fallback(student_name)

    try:
        # Initialize the new Client
        client = genai.Client(api_key=API_KEY)
        
        # Call the model using the new configuration types
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.2, 
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return _simulation_fallback(student_name)

def _simulation_fallback(student_name):
    """Fallback if API Key is missing or quota is exceeded."""
    return {
        "disclaimer": "⚠️ OFFLINE MODE: Showing simulation data.",
        "executive_summary": f"{student_name} demonstrates a 'Visual-Systematic' profile with high spatial logic but requires a low-stress environment. Academic grades indicate strong performance in practical subjects.",
        "analysis": {
            "superpowers": "High Figural Logic. Able to visualize complex 3D systems.",
            "kryptonite": "Low Stress Tolerance (Score: 2). High risk of burnout in reactive environments."
        },
        "recommendations": [
            {"role": "Industrial Design", "future_proofing": "AI Generative Design", "salary_map": "IDR 15jt | AUD $75k", "universities": ["RMIT", "Swinburne"]},
            {"role": "UX/UI Specialist", "future_proofing": "Spatial Computing (VR/AR)", "salary_map": "IDR 20jt | AUD $90k", "universities": ["Monash", "UTS"]}
        ],
        "roadmap": [
            {"phase": "Year 1", "action": "Build Discipline: Focus on time-management."}
        ],
        "parent_analysis": {"preference": "Medicine", "verdict": "Unsuitable. The Stress Tolerance of 2/5 indicates a severe risk of burnout in high-pressure medical environments."},
        "value_matrix": {"golden_ticket": ["Industrial Design"], "premium": ["Architecture @ G8"], "passion": ["Fine Arts"], "questionable": ["General Business"], "scholarship_impact": "Scholarships available for STEM/Design."},
        "city_matrix": [{"city": "Melbourne", "institution": "RMIT", "risk": "High living costs"}],
        "fit_vs_friction": [
            {"pathway": "Industrial Design", "fit": "High Spatial Skill", "friction": "Moderate Deadlines", "score": "9/10"},
            {"pathway": "Medicine", "fit": "High IQ", "friction": "Extreme Stress Environment", "score": "3/10"}
        ]
    }

def extract_programs_from_brochure(text):
    """
    Reads a raw university PDF brochure and extracts structured program data.
    """
    if not API_KEY or API_KEY == "GEMINI_API_KEY_HERE":
        print("Extraction Error: Gemini API Key is missing or invalid.")
        return []

    system_prompt = """
    You are an expert Data Extraction AI for a global education database.
    Your job is to read messy university brochures and extract program details.
    
    Extract a list of programs. For each program, provide EXACTLY these JSON keys:
    - country (string)
    - city (string)
    - institution (string)
    - level (string: "Bachelor", "Master", "Diploma", "Certificate")
    - category (string)
    - program_name (string)
    - tuition_per_year (integer, numeric only)
    - living_per_year (integer, numeric only, estimate 20000 if not stated)
    - duration_years (float)
    - intake_months (string)
    - ielts_min (float)
    - gpa_min (float)
    - visa_risk (string: "Low", "Medium", "High")
    - scholarship_level (string: "Low", "Medium", "High")
    - vibe (string, short 1-word description)
    
    Return ONLY a valid JSON array of objects. No markdown formatting, no ```json tags.
    """
    
    try:
        client = genai.Client(api_key=API_KEY)
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=text,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.1, 
            )
        )
        
        # --- BULLETPROOF JSON CLEANUP ---
        raw_output = response.text.strip()
        if raw_output.startswith("```json"):
            raw_output = raw_output[7:]
        if raw_output.startswith("```"):
            raw_output = raw_output[3:]
        if raw_output.endswith("```"):
            raw_output = raw_output[:-3]
            
        return json.loads(raw_output.strip())
        
    except Exception as e:
        print(f"Extraction Error: {e}") 
        return []