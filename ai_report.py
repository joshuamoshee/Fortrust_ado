import json
import os
import google.generativeai as genai
import streamlit as st
# ------------------------------------------------------------------
# CONFIGURATION - THE GEMINI AI ENGINE
# ------------------------------------------------------------------
# ------------------------------------------------------------------
# CONFIGURATION - THE GEMINI AI ENGINE
# ------------------------------------------------------------------
# Safely fetch the key from Streamlit secrets
try:
    API_KEY = st.secrets["GEMINI_API_KEY"]
except KeyError:
    API_KEY = "" # Fallback if secret is missing

def generate_abigail_content(student_name, payload, top_programs):
    """
    The Core Gemini AI Engine. 
    It reads the psychometric data, applies strict psychological rules, 
    and outputs a structured strategic JSON.
    """
    
    # --- 1. GATHER CONTEXT ---
    c_data = payload.get("counsellor_data", {})
    scores = payload.get("algo_result", {})
    
    personality_notes = c_data.get("personality_notes", "No specific psychometric test provided.")
    parents_pref = c_data.get("parents_pref", "No specific parent preference stated.")
    target_uni = c_data.get("target_uni", "Open to suggestions")
    
    # --- 2. THE SYSTEM PROMPT (Strict Rules) ---
    system_prompt = """
    You are a Meta-Cognitive Reasoning Expert and Senior Educational Psychologist at Fortrust.
    
    CORE PROTOCOL:
    1. Decompose the student's profile into Cognitive Assets (Superpowers) and Personality Risks (Kryptonite) based on the exact test scores provided.
    2. Solve for the best "Fit vs Friction" career paths.
    3. Synthesize into a strategic roadmap.

    ⚠️ CRITICAL PSYCHOMETRIC RULES:
    - IF "Stress Tolerance" is low (e.g., Score 1 or 2, or listed as a risk): You MUST explicitly warn against high-pressure, emergency-driven careers (e.g., Medicine, Corporate Law). Prioritize project-based, creative, or tech roles (e.g., Design, Data, Engineering).
    - IF "Figural/Spatial Logic" is high (e.g., Score 4 or 5): You MUST recommend Visual, Design, Architecture, or UI/UX fields.
    - IF "Parent Preference" contradicts the student's Kryptonite (e.g., Parent wants Medicine, but Stress Tolerance is low), you MUST state "Unsuitable" in the parent analysis and explain the high risk of burnout.

    OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema:
    {
      "disclaimer": "Confidence level statement...",
      "executive_summary": "A brief summary of their cognitive profile...",
      "analysis": {
        "superpowers": "Identify strongest cognitive assets based on scores...",
        "kryptonite": "Identify critical personality risks (MUST mention Stress Tolerance if low)..."
      },
      "recommendations": [
        {
          "role": "Career Path Name",
          "future_proofing": "Strategy for 5-10 years...",
          "salary_map": "Indonesia: $X | Abroad: $Y",
          "universities": ["Uni A", "Uni B"]
        }
      ],
      "roadmap": [{"phase": "Year X", "action": "Specific habit or focus..."}],
      "parent_analysis": {"preference": "Parent's Choice", "verdict": "Suitable/Unsuitable because..."},
      "value_matrix": {"golden_ticket": ["Option A"], "premium": ["Option B"], "passion": ["Option C"], "questionable": ["Option D"], "scholarship_impact": "Impact of financial aid..."},
      "city_matrix": [{"city": "City Name", "institution": "Uni Name", "risk": "Risk factor..."}],
      "fit_vs_friction": [{"pathway": "Option Name", "fit": "Cognitive alignment", "friction": "Personality risk", "score": "8/10"}]
    }
    """
    
    # --- 3. THE USER PROMPT ---
    user_prompt = f"""
    STUDENT: {student_name}
    ALGO LEAD SCORE: {scores.get('score', 0)} / 100
    
    --- PSYCHOMETRIC DATA ---
    {personality_notes}
    
    --- INTERVIEW NOTES ---
    PARENT PREFERENCE: {parents_pref}
    TARGET UNI/BUDGET: {target_uni}
    
    --- DATABASE MATCHES (Use as reference for university names) ---
    {json.dumps(top_programs[:3])}
    
    TASK: Execute the Core Protocol and return the JSON report. Ensure you obey the CRITICAL PSYCHOMETRIC RULES based on the data above.
    """

    # --- 4. EXECUTE GEMINI API CALL ---
    if API_KEY == "YOUR_GEMINI_API_KEY_HERE" or API_KEY == "":
        return _simulation_fallback(student_name)

    try:
        # Configure Gemini
        genai.configure(api_key=API_KEY)
        
        # Initialize Gemini 1.5 Pro
        model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            system_instruction=system_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.4, # Low temp keeps it analytical
                response_mime_type="application/json", # Forces PERFECT JSON output
            )
        )
        
        # Run the AI
        response = model.generate_content(user_prompt)
        
        # Parse the JSON it returns
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return _simulation_fallback(student_name)

def _simulation_fallback(student_name):
    """Fallback if API Key is missing or quota is exceeded."""
    return {
        "disclaimer": "⚠️ OFFLINE MODE: Showing simulation data.",
        "executive_summary": f"{student_name} demonstrates a 'Visual-Systematic' profile with high spatial logic but requires a low-stress environment.",
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