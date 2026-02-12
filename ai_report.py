import json
import os
from openai import OpenAI

# ------------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------------
# Get your key from: https://platform.openai.com/api-keys
API_KEY = "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" 

def generate_abigail_content(student_name, payload, top_programs):
    """
    Connects to an LLM (GPT-4) to write a unique, strategic report.
    Returns a Dictionary of content sections (not just flat text).
    """
    
    # 1. Prepare the Context for the AI
    c_data = payload.get("counsellor_data", {})
    q_data = payload.get("qualification_data", {})
    scores = payload.get("algo_result", {})
    
    # If API Key is missing, fallback to the old template (Simulation)
    if API_KEY == "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":
        return _simulation_fallback(student_name, payload, top_programs)

    # 2. Construct the Prompt
    client = OpenAI(api_key=API_KEY)
    
    system_prompt = """
    You are a Senior Education Strategist at Fortrust. You are writing a confidential internal strategy document for a counsellor.
    Tone: Professional, Insightful, Strategic, and Direct.
    Structure the output as a JSON object with keys: "executive_summary", "cognitive_profile", "recommendation_1", "recommendation_2", "roadmap".
    """
    
    user_prompt = f"""
    Student: {student_name}
    Score: {scores.get('score', 0)} ({scores.get('status', 'Unknown')})
    Profile: {json.dumps(q_data)}
    Counsellor Notes: {json.dumps(c_data)}
    Top University Matches: {json.dumps(top_programs[:2])}
    
    Task:
    1. Analyze their "Cognitive Profile" based on their "Action" (Dreamer/Doer) and "Anchor" (Practical/Emotional).
    2. Write an "Executive Summary" (3 sentences max).
    3. Analyze the #1 University Match (Why this fits their budget/goals).
    4. Create a 5-Year Roadmap (Year 1 to Year 5).
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o", # Or "gpt-3.5-turbo" for cheaper costs
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return _simulation_fallback(student_name, payload, top_programs, error=str(e))

def _simulation_fallback(student_name, payload, programs, error=None):
    """Fallback generator if no API key is present."""
    # This ensures your app works even without paying OpenAI right now
    c_data = payload.get("counsellor_data", {})
    
    target = c_data.get("target_uni", programs[0]['institution'] if programs else "Generic Uni")
    major = c_data.get("target_program", "Selected Major")
    
    return {
        "cognitive_profile": "The Pragmatic Executor",
        "executive_summary": f"{student_name} is a strong candidate with a clear focus on {major}. The primary challenge is financial liquidity, but the academic profile is solid.",
        "recommendation_1": {
            "name": target,
            "why": "Best ROI for the stated budget.",
            "metrics": {"fit": "9/10", "roi": "High", "risk": "Low"}
        },
        "roadmap": [
            {"phase": "Year 1", "action": "Finalize IELTS & Visa"},
            {"phase": "Year 2", "action": "Maintain GPA > 3.0"},
            {"phase": "Year 3", "action": "Internship"},
            {"phase": "Year 4", "action": "Grad Visa"},
            {"phase": "Year 5", "action": "Junior Role ($60k)"}
        ],
        "is_simulation": True,
        "error_msg": error
    }