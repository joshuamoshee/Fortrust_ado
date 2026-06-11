import os
from google import genai
 
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
 
 
def generate_strategic_report(
    student_name: str,
    destination: str = "Global (AI Recommended)",
    budget: float = 30000,
    notes: str = "No notes provided.",
    pdf_data: str = "No documents uploaded."
) -> str:
    if not _client:
        raise Exception("GEMINI_API_KEY is not configured on the server.")
 
    MAX_PDF_CHARS = 50000  # bumped up — multiple report cards + profiling can be large
    pdf_excerpt = pdf_data[:MAX_PDF_CHARS] if pdf_data else "No documents uploaded."
    if len(pdf_data) > MAX_PDF_CHARS:
        pdf_excerpt += "\n\n[... documents truncated for length ...]"
 
    prompt = f"""You are a senior university placement counselor at Fortrust Education Services.
Generate a **comprehensive Strategic Placement Report** for the student below.
 
# STUDENT PROFILE
- **Name:** {student_name}
- **Target Destination:** {destination}
- **Indicative Annual Budget (USD):** {budget:,.0f}
- **Agent Notes:** {notes}
 
# UPLOADED DOCUMENTS
The text below contains content from MULTIPLE documents the student/parents have uploaded.
These typically include TWO key categories — you MUST analyze BOTH:
  1. **Report cards / rapot** — academic grades across subjects and semesters
  2. **Profiling test results** — psychology/career assessment (HCC, similar providers)
 
There may also be passports, English test results, statements of purpose, etc.
 
```
{pdf_excerpt}
```
 
# YOUR TASK
Produce a well-structured markdown report with these EXACT sections:
 
## 1. Student Snapshot
A 3-4 sentence summary distilling who this student is — combining academic profile (from grades) AND personality/cognitive profile (from profiling test).
 
## 2. Academic Performance Analysis (from Report Cards)
**This section MUST be based on actual grades found in the uploaded report cards.**
- Identify the student's strongest subjects with specific examples ("Strong in Economics — consistent A grades", "Above-average in Mathematics — B+ across 3 semesters")
- Identify weak subjects similarly
- Note any patterns (improving over time, consistent, declining)
- If no report card data is in the documents, explicitly say: "⚠️ No report card data found in uploaded documents. Recommendations below are based on profiling test only — please upload report cards for stronger analysis."
 
## 3. Cognitive & Personality Analysis (from Profiling Test)
Bullet points from the profiling/psychology assessment:
- Cognitive strengths
- Cognitive areas for growth
- Personality / work style observations
- Social profile
- IQ or aptitude scores if present
- If no profiling test data is found, explicitly say so.
 
## 4. Cross-Variable Analysis (THE KEY SECTION)
**This is the most important section.** Compare what the report cards show vs what the profiling test recommends:
- **Alignment**: Where do grades and profiling agree? (e.g., "Profiling recommends IPS/Business → student's grades in Economics and Geography support this")
- **Mismatch**: Where do they disagree? (e.g., "Profiling suggests artistic field, but grades show stronger numerical aptitude in Math")
- **Risk flags**: Are there subjects the student dislikes/struggles with that contradict the recommended major?
 
## 5. Recommended Fields of Study
List 3-5 specific majors/programs grounded in BOTH variables. For each, cite WHICH data supports it ("Manajemen Bisnis — recommended by profiling, supported by strong Economics grades").
 
## 6. Top University Recommendations
Use Google Search to find 5-7 REAL, currently-operating universities that:
- Offer the recommended majors
- Match the budget (within ~30% tolerance)
- Match the target destination
- Have admission standards realistic for this student's grades (don't suggest MIT for a B+ student)
 
For each university include:
- **University name** and country
- **Tuition (latest available, in USD)**
- **Why it's a good fit** referencing this student's specific profile
- **Application difficulty for THIS student** (Easy / Moderate / Competitive — based on their actual grades)
 
## 7. Recommended Pathway
A short 4-step action plan over the next 12 months.
 
## 8. Risk Factors & Mitigation
2-3 honest risks specific to THIS student (visa, English level, budget gap, grade gap for target unis, personality fit), and how to address each.
 
# FORMATTING RULES
- Use clean markdown — headers, bullets, bold for emphasis
- Be SPECIFIC and grounded — cite real grades, real scores, real test results
- Never invent universities, tuition figures, or grades the documents don't contain — use Google Search for university data
- If grades or profiling data is missing, explicitly flag it (don't pretend)
- Total length: 800-1200 words
 
Begin the report now."""
 
    try:
        response = _client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                "tools": [{"google_search": {}}],
                # NOTE: response_mime_type intentionally NOT set — Gemini doesn't allow tools + JSON.
            }
        )
        report_text = (response.text or "").strip()
        if not report_text:
            raise Exception("AI returned an empty response.")
        return report_text
 
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise Exception(f"AI generation failed: {str(e)}")