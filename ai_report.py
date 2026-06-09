import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

# 1. Force Python to open the .env vault right now
load_dotenv()

# 2. Safely fetch the key
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY is missing! Make sure your file is named exactly '.env' and not '.env.txt'")

# 3. Initialize the NEW Gemini Client
client = genai.Client(api_key=API_KEY)

def generate_strategic_report(student_name: str, destination: str, budget: float, notes: str, pdf_data: str = "") -> str:
    """
    Generates a highly structured, premium Fortrust Assessment Report.
    Forces strict JSON output so the React frontend can render it beautifully.
    """
    
    system_prompt = """
    You are a Senior Educational Psychologist and Strategic Admissions Expert at Fortrust.
    Your job is to generate a comprehensive, premium student assessment report. 
    
    CRITICAL INSTRUCTION 1 (SEARCH): You have access to Google Search. You MUST search the live internet to find 3 REAL, up-to-date university programs that perfectly match the student's profile, destination, and budget. Find the actual current estimated tuition.
        
    CRITICAL INSTRUCTION 2 (FAIL-SAFE): First, scan the provided documents and notes. If you cannot find anything regarding the provided student's name, or if the document is clearly not an academic or profiling record, YOU MUST STOP IMMEDIATELY. Output this exact JSON:
    {"error": "Sorry, we can't find anything regarding the student name or academic profile in this document. Please ensure you uploaded the correct file."}
        
    CRITICAL INSTRUCTION 3 (FORMAT): You MUST output ONLY raw, valid JSON. Do not use Markdown formatting. Do not wrap in ```json. 
    
    You MUST adhere strictly to this exact JSON schema:
    {
      "superpower": "e.g., The Analytical-Communicator Profile",
      "executive_summary": "3-4 sentence psychological and academic profile based on notes and PDF.",
      "strategic_direction": "2-sentence strategy on the ideal career path.",
      "matches": [
        {
          "university": "LIVE UNIVERSITY NAME FOUND ONLINE",
          "major": "MAJOR NAME",
          "fit_percentage": 95,
          "best_fit_reason": "1 sentence explaining why, e.g., 'The Sweet Spot'",
          "tuition_estimate": "Actual tuition found via Google Search",
          "risk_factor": "Low/Medium/High",
          "scores": { "cognitive": 9, "interest": 8, "personality": 7, "career": 9 },
          "future_proofing": { "shift": "Industry trend", "advice": "Actionable advice", "salary": "Entry/Senior estimate" }
        }
      ],
      "success_factors": [
        {"risk": "Identify a specific risk from the PDF", "action": "Actionable advice to overcome it"}
      ],
      "roadmap": [
        {"year": "Year 1", "focus": "Foundation", "action": "Specific steps"},
        {"year": "Year 2", "focus": "Application", "action": "Specific steps"}
      ],
      "budget_strategy": {
        "traditional_tuition": "Estimated Cost",
        "polytech_tuition": "Estimated Cost",
        "savings": "Amount saved",
        "alternative_pathway": "Strategy explanation (like a Polytechnic/Diploma ladder)"
      }
    }
    """
    
    user_prompt = f"""
    --- STUDENT DATA ---
    STUDENT NAME: {student_name}
    TARGET DESTINATION: {destination}
    ANNUAL BUDGET: ${budget}
    
    --- COUNSELLOR NOTES ---
    {notes}
    
    --- EXTRACTED PDF DATA ---
    {pdf_data}
    --------------------
    """

    try:
        full_prompt = system_prompt + "\n\n" + user_prompt
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}], 
                temperature=0.2,
                # THIS IS THE MAGIC: It forces Gemini to return JSON, preventing UI crashes
                response_mime_type="application/json" 
            )
        )
        
        # Strip any accidental markdown formatting just in case
        clean_json = response.text.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:-3].strip()
        elif clean_json.startswith("```"):
            clean_json = clean_json[3:-3].strip()
            
        return clean_json
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return json.dumps({"error": "Error generating AI report. Please check your API key and connection."})