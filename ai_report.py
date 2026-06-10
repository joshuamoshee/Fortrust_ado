"""
Fortrust AI Strategic Report Generator
Uses Gemini 2.5 Flash with Google Search grounding to produce
personalized university placement strategies for students.

Fixed: removed response_mime_type conflict with tools (google_search)
"""

import os
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    _client = genai.Client(api_key=GEMINI_API_KEY)
else:
    _client = None


def generate_strategic_report(
    student_name: str,
    destination: str = "Global (AI Recommended)",
    budget: float = 30000,
    notes: str = "No notes provided.",
    pdf_data: str = "No documents uploaded."
) -> str:
    """
    Generates a comprehensive strategic placement report for a student.
    Returns markdown-formatted string ready to display in the UI.

    Raises Exception on failure (callers should catch and surface to user).
    """
    if not _client:
        raise Exception("GEMINI_API_KEY is not configured on the server.")

    # Truncate very large PDF text to stay within reasonable limits
    # Gemini 2.5 Flash handles ~1M tokens but we cap to keep responses fast
    MAX_PDF_CHARS = 30000
    pdf_excerpt = pdf_data[:MAX_PDF_CHARS] if pdf_data else "No documents uploaded."
    if len(pdf_data) > MAX_PDF_CHARS:
        pdf_excerpt += "\n\n[... document truncated for length ...]"

    prompt = f"""You are a senior university placement counselor at Fortrust Education Services.
Generate a **comprehensive Strategic Placement Report** for the student below.

# STUDENT PROFILE
- **Name:** {student_name}
- **Target Destination:** {destination}
- **Indicative Annual Budget (USD):** {budget:,.0f}
- **Agent Notes:** {notes}

# UPLOADED DOCUMENTS (psychology assessment, transcripts, etc.)
```
{pdf_excerpt}
```

# YOUR TASK
Produce a well-structured markdown report with these EXACT sections:

## 1. Student Snapshot
A 3-4 sentence summary of who this student is — strengths, learning style, personality traits from the assessment.

## 2. Cognitive & Personality Analysis
Bullet points distilling the key insights from their psychological/academic assessment.
- Cognitive strengths
- Cognitive areas for growth
- Personality / work style observations
- Social profile

## 3. Recommended Fields of Study
List 3-5 specific majors/programs that fit this student's profile. For each, explain WHY in 1-2 sentences.

## 4. Top University Recommendations
Use Google Search to find 5-7 REAL, currently-operating universities that:
- Offer the recommended majors
- Match the budget (within ~30% tolerance)
- Are located in or accessible from the target destination

For each university include:
- **University name** and country
- **Tuition (latest available, in USD)**
- **Why it's a good fit** for this student
- **Application difficulty** (Easy / Moderate / Competitive)

## 5. Recommended Pathway
A short 4-step action plan over the next 12 months.

## 6. Risk Factors & Mitigation
2-3 honest risks (e.g., visa difficulty, English requirements, budget gaps) and how to address each.

# FORMATTING RULES
- Use clean markdown — headers, bullets, bold for emphasis
- Be specific and grounded — cite real data from the assessment
- Never invent universities or tuition figures — use Google Search
- Keep it actionable, not generic
- Total length: 600-1000 words

Begin the report now."""

    try:
        response = _client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                "tools": [{"google_search": {}}],
                # NOTE: We deliberately do NOT set response_mime_type here.
                # Gemini does not allow tools + JSON output simultaneously.
            }
        )
        report_text = (response.text or "").strip()
        if not report_text:
            raise Exception("AI returned an empty response.")
        return report_text

    except Exception as e:
        # Log the real error so it surfaces in Render logs
        print(f"Gemini API Error: {e}")
        # Re-raise so the endpoint can return a proper 500
        raise Exception(f"AI generation failed: {str(e)}")