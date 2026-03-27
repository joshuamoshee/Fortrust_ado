import os
from dotenv import load_dotenv
from google import genai
from google.genai import types # <-- NEW: We need this to turn on Google Search

# 1. Force Python to open the .env vault right now
load_dotenv()

# 2. Safely fetch the key
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY is missing! Make sure your file is named exactly '.env' and not '.env.txt'")

# 3. Initialize the NEW Gemini Client
client = genai.Client(api_key=API_KEY)

# 🚨 UPGRADE: Added 'pdf_data' so the AI can read the extracted text!
def generate_strategic_report(student_name: str, destination: str, budget: float, notes: str, pdf_data: str = "") -> str:
    """
    Generates a highly structured, premium Fortrust Assessment Report.
    Now reads BOTH Counselor Notes AND raw PDF text, AND searches the live internet!
    """
    
    system_prompt = """
    You are a Senior Educational Psychologist and Strategic Admissions Expert at Fortrust.
    Your job is to generate a comprehensive, premium student assessment report. 
    You must output the report in strict Markdown format, using bold headers, bullet points, and Markdown tables where requested. Do NOT use raw JSON.
    
    CRITICAL INSTRUCTION: You have access to Google Search. You MUST search the live internet to find 3 REAL, up-to-date university programs that perfectly match the student's profile, destination, and budget. Do NOT invent or hallucinate tuition fees. Find the actual current estimated tuition and use it in your tables.
    
    You will be provided with Counselor Notes AND raw text extracted from the student's PDFs (Psychometric Reports and Report Cards).
    You MUST analyze both data sources to find their "Superpower", academic reality, and highest risk factors.
    
    Read the provided student data and generate a report using EXACTLY this structure and these headings:

    # FORTRUST ASSESSMENT REPORT for [Student Name]

    ## 1. EXECUTIVE SUMMARY
    [Provide a 3-4 sentence psychological and academic profile based on the notes AND the PDF data. Define their "superpower" (e.g., "The Visual-Systematic Profile").]

    ## 2. STRATEGIC DIRECTION
    [Provide a 2-sentence strategy on the ideal career path that leverages their natural aptitude.]

    ## 3. TOP 3 RECOMMENDED UNIVERSITY MAJORS & CAREER PATHS
    [For EACH of the 3 options, provide the following structure:]
    ### OPTION [1/2/3]: [MAJOR NAME] at [LIVE UNIVERSITY NAME FOUND ONLINE]
    **BEST FIT:** [1 sentence explaining why, e.g., "The Sweet Spot" or "The Safety Backup"]
    
    | CRITERIA | ANALYSIS | SCORE (1-10) |
    | :--- | :--- | :--- |
    | Cognitive Fit | [Your rigorous analysis based on the PDF] | [X/10] |
    | Interest Alignment | [Your rigorous analysis] | [X/10] |
    | Personality Fit | [Your rigorous analysis] | [X/10] |
    | Career Outlook | [Your rigorous analysis] | [X/10] |
    | Live Tuition Estimate | [Include the actual tuition found via Google Search] | - |
    | Risk Factor | [Low/Med/High] | - |

    **FUTURE PROOFING STRATEGY (5-9 Years)**
    * **The Shift:** [Industry trend]
    * **Actionable Advice:** [Specific minor, tech, or skill to learn]
    * **Salary Expectation:** [Entry and Senior estimates in local currency of target destination]

    ## 4. CRITICAL SUCCESS FACTORS
    [Identify 3 specific risks (e.g., low stress tolerance, math gaps from the PDF) and provide strict, actionable advice to overcome them (e.g., "The Feynman Technique", "Body Double Strategy").]

    ## 5. CONCLUSION
    [A brief 3-sentence final verdict on their best pathway.]

    ## 6. 5-YEAR DEVELOPMENT ROADMAP (From Current Grade to Uni Year 2)
    | Year | Focus Area | Actionable Steps |
    | :--- | :--- | :--- |
    | Year 1 | Foundation | [Specific steps] |
    | Year 2 | Application | [Specific steps] |
    | Year 3 | Survival | [Specific steps] |
    | Year 4 | Specialization | [Specific steps] |
    | Year 5 | Professionalism | [Specific steps] |

    ## 7. EXTRACURRICULAR SUGGESTIONS & PORTFOLIO BLUEPRINT
    [Suggest 2-3 specific clubs/activities and 3 specific portfolio projects tailored to their major.]

    ## 8. CITY & UNIVERSITY MATCHING
    **Target Destination:** [Destination]
    [Provide 3 specific university recommendations in the target destination, including the "Why". Include a short "Scholarship Match List".]

    ## 9. THE BUDGET-OPTIMIZED STRATEGY
    [Provide a strategic alternative pathway (like a Polytechnic/Diploma ladder or regional arbitrage) to save money, assuming an annual budget of the provided amount.]
    | Strategy | Estimated Tuition | Saved Tuition | Risk Factor |
    | :--- | :--- | :--- | :--- |
    | Traditional Uni | [Amount] | - | [Risk] |
    | Polytech / Diploma Pathway | [Amount] | [Amount Saved] | [Risk] |
    """
    
    user_prompt = f"""
    --- STUDENT DATA ---
    STUDENT NAME: {student_name}
    TARGET DESTINATION: {destination}
    ANNUAL BUDGET: ${budget}
    
    --- COUNSELLOR NOTES ---
    {notes}
    
    --- EXTRACTED PDF DATA (REPORT CARDS / NAVIGATHER) ---
    {pdf_data}
    --------------------
    
    TASK: Generate the strict, premium Fortrust Markdown report based on ALL the data above. Ensure you use Google Search to ground your university recommendations and tuition estimates in live, real-world data.
    """

    try:
        full_prompt = system_prompt + "\n\n" + user_prompt
        # The NEW syntax for generating content WITH LIVE SEARCH ON!
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}], # <-- Turns on live internet access
                temperature=0.2 # Keep it strictly factual so it doesn't hallucinate
            )
        )
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "Error generating AI report. Please check your API key and connection."