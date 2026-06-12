import os
from google import genai
 
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
 
 
def generate_strategic_report(
    student_name: str,
    destination: str = "Global (AI Recommended)",
    budget: float = 30000,
    notes: str = "No notes provided.",
    pdf_data: str = "No documents uploaded.",
    field_interests: list = None,
    program_interest: str = ""
) -> str:
    if not _client:
        raise Exception("GEMINI_API_KEY is not configured on the server.")
 
    MAX_PDF_CHARS = 60000
    pdf_excerpt = pdf_data[:MAX_PDF_CHARS] if pdf_data else "No documents uploaded."
    if len(pdf_data) > MAX_PDF_CHARS:
        pdf_excerpt += "\n\n[... documents truncated for length ...]"
 
    # Format field interests for prompt
    interests_text = ""
    if field_interests and len(field_interests) > 0:
        interests_list = "\n".join([f"  - {f}" for f in field_interests])
        interests_text = f"""
# STUDENT'S DECLARED FIELDS OF INTEREST
The agent has consulted directly with the student and identified these as the student's
own primary academic interests (selected from a list, max 3):
{interests_list}
 
**This is the THIRD critical variable** alongside report cards and profiling test.
The student's own aspirations matter — do NOT recommend a path that ignores these
unless the academic/profiling evidence strongly contradicts them.
"""
    else:
        interests_text = """
# STUDENT'S DECLARED FIELDS OF INTEREST
⚠️ The agent has not yet captured the student's own field interests.
Recommend that the agent complete this step during consultation.
"""
 
    program_text = ""
    if program_interest and program_interest.strip():
        program_text = f"\n- **Initial Program Interest (from intake):** {program_interest}\n"
 
    prompt = f"""You are a senior university placement counselor at Fortrust Education Services.
Generate a **comprehensive Strategic Placement Report** for the student below.
 
# STUDENT PROFILE
- **Name:** {student_name}
- **Target Destination:** {destination}
- **Indicative Annual Budget (USD):** {budget:,.0f}
- **Agent Notes:** {notes}{program_text}
 
{interests_text}
 
# UPLOADED DOCUMENTS
The text below contains content from MULTIPLE documents grouped by category.
You MUST analyze EACH category:
 
```
{pdf_excerpt}
```
 
# YOUR TASK
Produce a well-structured markdown report with these EXACT sections:
 
## 1. Student Snapshot
3-4 sentence summary blending academics + personality + the student's own stated interests.
 
## 2. Academic Performance Analysis (from Report Cards)
**This section MUST be based on actual grades from the uploaded rapot/report cards.**
- Identify strongest subjects with specific evidence ("Strong in Ekonomi — consistent 85+", "Above-average in Matematika — 80 across 3 semesters")
- Identify weak subjects with specific evidence
- Note patterns (improving, stable, declining)
- If you cannot find report card data, explicitly say: "⚠️ No report card data was extractable from uploads. Recommendations are based on profiling test and stated interests only."
 
## 3. Cognitive & Personality Analysis (from Profiling Test)
Bullet points from the profiling/psychology assessment:
- Cognitive strengths (cite specific scores if shown, e.g. "IQ 93", "Logika Verbal: 5/7")
- Cognitive areas for growth
- Personality / work style
- Social profile
- Recommended fields per the profiling provider (e.g. "HCC recommends IPS, Manajemen Bisnis, Kewirausahaan")
- If no profiling data found, say so explicitly.
 
## 4. Three-Variable Cross-Analysis (THE KEY SECTION)
Compare what each variable says:
- **Where do all THREE agree?** Grades + profiling + student's stated interests aligned → strongest signal
- **Where do TWO agree?** Note which two and the implication
- **Where do they DISAGREE?** Flag clearly. E.g. "Profiling suggests Business, but student selected Engineering and grades in Math are average — this is a tension worth discussing in next consultation"
- Are the student's declared interests REALISTIC given grades + profiling?
 
## 5. Recommended Fields of Study
List 3-5 specific majors. For each, cite WHICH variables support it:
- Example: "Manajemen Bisnis — supported by ✅ profiling (recommended), ✅ grades (strong Economics), ✅ student interest (selected Business)"
- Example: "Computer Science — supported by ✅ student interest, ⚠️ grades (Math only average), ❌ profiling (not suggested)"
 
## 6. Top University Recommendations
Use Google Search to find 5-7 REAL, currently-operating universities that:
- Offer the recommended majors
- Match the budget (within ~30% tolerance)
- Match target destination
- Have admission standards realistic for this student's actual grades
 
For each include:
- **University name** and country
- **Tuition (latest, USD)**
- **Why fit** for THIS student's specific 3-variable profile
- **Application difficulty for THIS student**: Easy / Moderate / Competitive
 
## 7. Recommended Pathway
Short 4-step action plan over next 12 months.
 
## 8. Risk Factors & Mitigation
2-3 honest risks specific to this student, with mitigations.
 
# FORMATTING RULES
- Clean markdown with headers, bullets, bold
- SPECIFIC and grounded — cite actual grades, scores, declared interests
- Never invent data
- If any variable is missing, flag it clearly
- Total length: 900-1300 words
 
Begin the report now."""
 
    try:
        response = _client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                "tools": [{"google_search": {}}],
            }
        )
        report_text = (response.text or "").strip()
        if not report_text:
            raise Exception("AI returned an empty response.")
        return report_text
 
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise Exception(f"AI generation failed: {str(e)}")