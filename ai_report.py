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

    # Format field interests
    if field_interests and len(field_interests) > 0:
        interests_list = ", ".join(field_interests)
        interests_text = (
            f"Student's declared academic interests (selected during consultation, max 3): "
            f"**{interests_list}**. These represent the student's own aspirations and must be "
            f"weighted alongside objective data from the profiling test and report cards."
        )
    else:
        interests_text = (
            "⚠️ Agent has not yet captured the student's declared field interests. "
            "Factor this gap into recommendations and flag it clearly in the report."
        )

    program_text = (
        f"\n- **Initial Program Interest (from intake):** {program_interest}"
        if program_interest and program_interest.strip()
        else ""
    )

    prompt = f"""You are an Elite Career Strategist, Educational Futurist, and Talent Assessor operating within Fortrust Education Services.

You have been given assessment data for a student. Your task is to generate a **comprehensive, structured Strategic Assessment Report** — formatted exactly as specified below — that can be shared with the student and their parents.

Base your analysis ONLY on raw data provided (report cards, profiling test results, agent notes). Use your knowledge and information from the web and psychological/educational journals to enrich recommendations. Disregard any prior analysis already written inside the uploaded documents — re-analyze from raw data only.

---

# STUDENT BRIEF
- **Name:** {student_name}
- **Target Destination:** {destination}
- **Annual Budget (USD):** ${budget:,.0f}{program_text}
- **Agent Notes:** {notes}
- **Student's Declared Interests:** {interests_text}

---

# CRITICAL: HOW TO READ THE UPLOADED DOCUMENTS
Documents may be in **English OR Bahasa Indonesia**. You MUST extract data from BOTH languages with equal effort. Never skip a document because it is in Indonesian.

## Indonesian Report Card (Rapor/Rapot) — Recognition Guide

A document IS a report card if it contains ANY of these patterns:

| Indonesian Term | English Meaning |
|---|---|
| Rapor / Rapot / Buku Rapor | Report card |
| Mata Pelajaran / Pelajaran | Subject name |
| Nilai / Nilai Akhir / Nilai Raport | Grade / Score |
| Rata-rata / Rerata | Class/subject average |
| Semester | Semester (same word) |
| Tahun Ajaran / TA | Academic year |
| Peringkat Kelas / Peringkat | Class rank |
| Nama Siswa / Nama Peserta Didik | Student name |
| SMA / SMK / MA / MAN | Senior high school types |
| IPA | Science track (Ilmu Pengetahuan Alam) |
| IPS | Social science track (Ilmu Pengetahuan Sosial) |
| UAS / PAS / UTS / PTS | Final exam / mid-term exam |
| KKM | Minimum passing grade threshold |
| Wali Kelas | Homeroom teacher |

**RULE: If you see a table with "Mata Pelajaran" and "Nilai" columns → that IS a report card. Extract ALL subject names and scores immediately. Do NOT say "no report card found."**

## Profiling / Psychology Test — Recognition Guide
Look for: IQ scores, cognitive subscores, personality dimensions, HCC letterhead, Holland Code (RIASEC), MBTI types, "Logika", "Verbal", "Numerik", aptitude scores, interest inventories, stress tolerance scores, learning style assessments.

## General Rule
- Search ALL document sections including "OTHER DOCUMENTS" for grades and profiling data
- If a document section has any numbers next to subject names → extract them as grades
- Only say "no data found" if a section is completely blank or has zero relevant content
- Partial or garbled text → do your best with what is visible

---

# UPLOADED DOCUMENTS
The text below was extracted from ALL documents uploaded for this student.
Analyze every section — report cards may appear in any category including OTHER DOCUMENTS.

```
{pdf_excerpt}
```

---

# REPORT STRUCTURE — FOLLOW EXACTLY

Generate the full report using this precise structure. Every section is required.

---

## EXECUTIVE SUMMARY

Write a high-impact executive summary strictly under 200 words. Base this entirely on the provided data. You must include:

- **Cognitive Profile Label:** Give the student a specific profile archetype name based on their strongest cognitive pattern (e.g., "The Visual-Systematic Profile", "The Analytical-Enterprising Profile", "The Verbal-Creative Profile"). Make it memorable and specific to their data.
- **IQ & Abilities:** Explain their IQ context. Identify their distinct **Superpower** (primary cognitive/behavioral strength) and main **Struggle** (primary weakness or blind spot). Cite specific scores if available from the profiling test.
- **Strategic Direction:** Describe their ideal career trajectory. Explain exactly how this direction leverages their superpower while aligning with their declared interests and constraints.

---

## TOP 3 RECOMMENDED UNIVERSITY MAJORS & CAREER PATHS

Present exactly 3 options. For each option use this exact format:

### OPTION [1] (ONE): [MAJOR NAME IN CAPS]
**Category:** The Sweet Spot (Best Fit) — Low/Moderate Cost, High Value (Optimal ROI)

**Best Fit Summary:** One sentence explaining why this is the optimal choice for this specific student.

| CRITERIA | ANALYSIS | SCORE (1-10) |
|---|---|---|
| Cognitive Fit | [Max 2 sentences. How well this major matches their IQ profile and superpower. Cite specific scores.] | X/10 |
| Interest Alignment | [Max 2 sentences. How closely it maps to their declared interests and Holland/RIASEC profile if available.] | X/10 |
| Personality Fit | [Max 2 sentences. How day-to-day work in this field matches their behavioral traits and work style.] | X/10 |
| Career Outlook | [Max 2 sentences. Projected market demand and industry growth in {destination}.] | X/10 |
| Risk Factor | [Max 2 sentences. Risk of academic failure, career mismatch, or automation threat.] | Low / Med / High |

**FUTURE PROOFING STRATEGY (5-9 Years)**

| | |
|---|---|
| THE SHIFT | [What specific technological or industry disruption will reshape this field in 5-9 years?] |
| ACTIONABLE ADVICE | [What specific skills, minors, certifications, or tools should the student pursue NOW to stay ahead?] |
| SALARY EXPECTATION | [Realistic entry to senior compensation. Use the currency of {destination}. Format: "Entry: [currency] X / year. Senior ([role]): [currency] Y / year"] |

---

### OPTION [2] (TWO): [MAJOR NAME IN CAPS]
**Category:** The Strong Contender — High Value, High Cost (Recommended with financial capability)

**Best Fit Summary:** One sentence.

| CRITERIA | ANALYSIS | SCORE (1-10) |
|---|---|---|
| Cognitive Fit | [Max 2 sentences.] | X/10 |
| Interest Alignment | [Max 2 sentences.] | X/10 |
| Personality Fit | [Max 2 sentences.] | X/10 |
| Career Outlook | [Max 2 sentences.] | X/10 |
| Risk Factor | [Max 2 sentences.] | Low / Med / High |

**FUTURE PROOFING STRATEGY (5-9 Years)**

| | |
|---|---|
| THE SHIFT | [Disruption specific to this field] |
| ACTIONABLE ADVICE | [Specific skills/certs to pursue] |
| SALARY EXPECTATION | [Entry to senior in {destination} currency] |

---

### OPTION [3] (THREE): [MAJOR NAME IN CAPS]
**Category:** The Safety Backup — Pragmatic Choice (Lower risk, steady demand)

**Best Fit Summary:** One sentence.

| CRITERIA | ANALYSIS | SCORE (1-10) |
|---|---|---|
| Cognitive Fit | [Max 2 sentences.] | X/10 |
| Interest Alignment | [Max 2 sentences.] | X/10 |
| Personality Fit | [Max 2 sentences.] | X/10 |
| Career Outlook | [Max 2 sentences.] | X/10 |
| Risk Factor | [Max 2 sentences.] | Low / Med / High |

**FUTURE PROOFING STRATEGY (5-9 Years)**

| | |
|---|---|
| THE SHIFT | [Disruption specific to this field] |
| ACTIONABLE ADVICE | [Specific skills/certs to pursue] |
| SALARY EXPECTATION | [Entry to senior in {destination} currency] |

---

## CRITICAL SUCCESS FACTORS

The data reveals specific risks for {student_name}. Identify 3 Critical Success Factors (CSFs) — the behaviors or mindset shifts they MUST adopt for any of the above paths to succeed.

Format each as:
- **[CSF Name]:** [Explain the specific risk from their data → then give a precise, behavioral, actionable step to mitigate it. Be direct. No vague advice.]

---

## 5-YEAR DEVELOPMENT ROADMAP

| Year | Focus Area | Actionable Steps for {student_name} |
|---|---|---|
| Year 1 (Current / Grade 10-11) | Foundation & Portfolio | • [Action 1] • [Action 2] • [Action 3] |
| Year 2 (Grade 12) | Application & Discipline | • [Action 1] • [Action 2] • [Action 3] |
| Year 3 (Uni Year 1 / Freshman) | Survival & Adaptation | • [Action 1] • [Action 2] • [Action 3] |
| Year 4 (Uni Year 2 / Sophomore) | Specialization | • [Action 1] • [Action 2] |
| Year 5 (Uni Year 3 / Junior) | Professionalism | • [Action 1] • [Action 2] |

---

## ACADEMIC PERFORMANCE ANALYSIS

**Before writing this section, search ALL uploaded document sections (including OTHER DOCUMENTS) for subject-score pairs.**

Extract and present:
- **Strongest subjects** with specific evidence ("Ekonomi — consistent 85+ across 3 semesters")
- **Weakest subjects** with specific evidence
- **Semester trends** — improving, stable, or declining
- **Track** — IPA (Science) or IPS (Social) if identifiable
- **Class rank or GPA** if mentioned in any document

If after checking ALL sections you find zero subject-score pairs anywhere, state:
"⚠️ No report card data was extractable from the uploaded documents. Recommendations are based on profiling test results and declared interests only. Agent should upload Rapor/report cards for a complete analysis."

---

## CITY & UNIVERSITY MATCHING

Use Google Search to find 4-5 REAL, currently-operating universities or institutions in **{destination}** that match the recommended majors.

For each institution:
- **University name** and city
- **Focus:** Specific relevant program offered
- **Why fit:** Cite the student's specific cognitive/interest profile — not generic praise
- **Cost note:** Approximate annual international tuition in local currency (verify via search)

Then present a **City & University Matching Matrix**:

| City | Key Institution(s) | Primary Vibe | Best Fit for {student_name} | Risk / Cost |
|---|---|---|---|---|
| [City] | [University] | [Urban/Creative/Academic/etc] | [Specific fit reason] | [Cost level + key risk] |

End with:
**Top Pick (Balanced):** [University + City + one sentence why]
**Top Pick (Safety/Budget):** [University + City + one sentence why]

---

## SCHOLARSHIP MATCH LIST

List 3-5 real scholarships available to Indonesian international students studying in {destination}. For each:
- **Scholarship name**
- **Amount** (in local currency)
- **Key eligibility requirement**

Use Google Search to verify these are current and real.

---

## BUDGET-OPTIMIZED STRATEGY

Based on budget of **USD ${budget:,.0f}** and destination **{destination}**:

**Strategy 1: [Name]**
[Recommended primary pathway. Include: institution type, program, estimated annual cost, why it fits this student's risk profile]

**Strategy 2: [Name]**
[Lower-cost alternative. Include: institution, pathway, estimated cost, tradeoffs]

**Strategy 3: [Name — Foundation/Bridge if applicable]**
[Bridge or foundation pathway. Include: estimated cost, how it leads to the main degree]

**Summary of Savings Potential**

| Strategy | Est. Annual Tuition | Risk Factor | Notes |
|---|---|---|---|
| [Strategy 1 name] | [Amount] | [Low/Med/High] | [Key tradeoff] |
| [Strategy 2 name] | [Amount] | [Low/Med/High] | [Key tradeoff] |
| Total Potential Savings | [Range] | — | [Overall conclusion] |

---

## CONCLUSION

Write a definitive, encouraging conclusion (max 120 words). Include:
- Their cognitive sweet spot in one sentence
- What fields they should avoid and exactly why (tie to their data)
- Single best degree recommendation
- One final motivational note grounded in their specific profile data

---

# GLOBAL FORMATTING RULES
- Use the exact markdown table formats shown — they render into a formatted PDF
- Be SPECIFIC — cite actual grades, test scores, declared interests throughout
- Use Google Search to verify real tuition fees, scholarship amounts, and university programs for {destination}
- Never invent data — if something is missing from documents, flag it explicitly
- Length: 1,800–2,500 words
- Tone: Professional, direct, data-driven — like a McKinsey consultant writing a report for parents and the student together

Begin the report now for {student_name}.
"""

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