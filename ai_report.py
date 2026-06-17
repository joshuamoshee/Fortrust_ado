import os
import re
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


def generate_strategic_report(
    student_name: str,
    destination: str = "Global (AI Recommended)",
    budget=None,  # Can be string ("USD 11,000-28,000/Year") OR number — we handle both
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

    # --- BUDGET PARSING ---
    # Accept either a string ("USD 11,000-28,000/Year") or a number (30000) or None.
    if budget is None or budget == "" or budget == 0:
        budget_display = "Not specified — agent should capture this during consultation"
    elif isinstance(budget, (int, float)):
        budget_display = f"USD ${budget:,.0f}/year"
    else:
        # It's a string — use it as-is (already formatted by the agent)
        budget_display = str(budget).strip() or "Not specified"

    # --- FIELD INTERESTS ---
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
            "Factor this gap into recommendations and flag it clearly."
        )

    program_text = (
        f"\n- **Initial Program Interest (from intake):** {program_interest}"
        if program_interest and program_interest.strip()
        else ""
    )

    prompt = f"""You are an Elite Career Strategist, Educational Futurist, and Talent Assessor operating within Fortrust Education Services.

Generate a **comprehensive, clean Strategic Assessment Report** that can be shared with the student and parents.

Base analysis ONLY on raw data provided (report cards, profiling test results, agent notes). Use your knowledge from the web and psychological/educational journals to enrich recommendations. Disregard any prior analysis already inside the uploaded documents — re-analyze from raw data only.

# CRITICAL FORMATTING RULES
1. Use `##` for major sections, `###` for sub-sections.
2. **DO NOT use `---` horizontal rule separators between sections.** They make the PDF look cluttered. Use blank lines instead.
3. Tables should use clean markdown without surrounding `---` lines.
4. Keep paragraphs tight. No walls of text.
5. Bullets within a group should not have blank lines between them.

# STUDENT BRIEF
- **Name:** {student_name}
- **Target Destination:** {destination}
- **Annual Budget:** {budget_display}{program_text}
- **Agent Notes:** {notes}
- **Student's Declared Interests:** {interests_text}

# HOW TO READ THE UPLOADED DOCUMENTS
Documents may be in English OR Bahasa Indonesia. Extract data from BOTH languages equally.

## Indonesian Report Card (Rapor/Rapot) Recognition

| Indonesian | Meaning |
|---|---|
| Rapor / Rapot / Buku Rapor | Report card |
| Mata Pelajaran / Pelajaran | Subject name |
| Nilai / Nilai Akhir / Nilai Raport | Grade / Score |
| Rata-rata / Rerata | Average |
| Semester | Semester |
| Tahun Ajaran / TA | Academic year |
| Peringkat Kelas | Class rank |
| SMA / SMK / MA / MAN | Senior high school |
| IPA | Science track |
| IPS | Social science track |
| UAS / PAS / UTS / PTS | Final / mid-term exam |
| KKM | Minimum passing grade |

**Rule: If you see a table with "Mata Pelajaran" and "Nilai" columns → that IS a report card. Extract ALL subject names and scores. Do NOT say "no report card found."**

## Profiling Test Recognition
Look for IQ scores, cognitive subscores, personality dimensions, HCC letterhead, Holland Code (RIASEC), MBTI types, "Logika", "Verbal", "Numerik", aptitude scores.

# UPLOADED DOCUMENTS
```
{pdf_excerpt}
```

# REPORT STRUCTURE — FOLLOW EXACTLY

Use this structure. Every section required. Use blank lines between sections — NEVER `---` separators.

## Executive Summary

Strictly under 200 words. Include:

- **Cognitive Profile Label:** A memorable archetype name based on their strongest cognitive pattern (e.g., "The Visual-Systematic Profile", "The Methodical Social Connector").
- **IQ & Abilities:** Explain their IQ context. Identify their distinct **Superpower** and main **Struggle**. Cite specific scores.
- **Strategic Direction:** Ideal career trajectory. How it leverages their superpower while aligning with their declared interests and constraints.

## Top 3 Recommended University Majors & Career Paths

Three options. For each:

### Option 1: [MAJOR NAME IN CAPS]
**Category:** The Sweet Spot (Best Fit) — Low/Moderate Cost, High Value (Optimal ROI)

**Best Fit Summary:** One sentence why this is optimal for this specific student.

| Criteria | Analysis | Score (1-10) |
|---|---|---|
| Cognitive Fit | Max 2 sentences. Cite specific scores. | X/10 |
| Interest Alignment | Max 2 sentences. Map to declared interests. | X/10 |
| Personality Fit | Max 2 sentences. Day-to-day match. | X/10 |
| Career Outlook | Max 2 sentences. Demand in {destination}. | X/10 |
| Risk Factor | Max 2 sentences. Mismatch or automation risk. | Low / Med / High |

**Future Proofing Strategy (5-9 Years)**

| | |
|---|---|
| The Shift | What disruption will reshape this field? |
| Actionable Advice | Specific skills/certs to pursue now |
| Salary Expectation | Entry to senior, in currency of {destination} |

### Option 2: [MAJOR NAME IN CAPS]
**Category:** The Strong Contender — High Value, High Cost (Recommended with financial capability)

[Same table structure as Option 1]

### Option 3: [MAJOR NAME IN CAPS]
**Category:** The Safety Backup — Pragmatic Choice (Lower risk, steady demand)

[Same table structure as Option 1]

## Critical Success Factors

Identify 3 Critical Success Factors {student_name} MUST adopt for any of the above paths to succeed.

Format each as:
- **[CSF Name]:** [Specific risk from their data] → [Precise, behavioral action to mitigate]

## 5-Year Development Roadmap

| Year | Focus Area | Actionable Steps for {student_name} |
|---|---|---|
| Year 1 (Current / Grade 10-11) | Foundation & Portfolio | • [Action 1] • [Action 2] • [Action 3] |
| Year 2 (Grade 12) | Application & Discipline | • [Action 1] • [Action 2] • [Action 3] |
| Year 3 (Uni Year 1 / Freshman) | Survival & Adaptation | • [Action 1] • [Action 2] • [Action 3] |
| Year 4 (Uni Year 2 / Sophomore) | Specialization | • [Action 1] • [Action 2] |
| Year 5 (Uni Year 3 / Junior) | Professionalism | • [Action 1] • [Action 2] |

## Academic Performance Analysis

Search ALL document sections (including OTHER DOCUMENTS) for subject-score pairs.

Extract:
- **Strongest subjects** with specific evidence
- **Weakest subjects** with specific evidence
- **Semester trends** — improving, stable, or declining
- **Track** — IPA or IPS if identifiable
- **Class rank or GPA** if mentioned

If zero subject-score pairs exist anywhere: "⚠️ No report card data was extractable. Recommendations are based on profiling test and declared interests only. Agent should upload Rapor/report cards for a complete analysis."

## City & University Matching

Use Google Search to find 4-5 REAL, currently-operating universities in **{destination}** that match the recommended majors AND fit within the student's actual budget of **{budget_display}**.

For each institution:
- **University name** and city
- **Focus:** Specific relevant program offered
- **Why fit:** Cite the student's cognitive/interest profile
- **Cost note:** Approximate annual international tuition in local currency. **CRITICAL: respect the student's stated budget range. If their budget is USD 11,000-28,000/Year, DO NOT recommend universities costing USD $40,000/year. Find ones within range.**

Then present a matching matrix:

| City | Key Institution(s) | Primary Vibe | Best Fit for {student_name} | Risk / Cost |
|---|---|---|---|---|

End with:
- **Top Pick (Balanced):** [University + City + one sentence why]
- **Top Pick (Safety/Budget):** [University + City + one sentence why]

## Scholarship Match List

This section is critical. Use Google Search to find 5-7 REAL, currently-available scholarships for Indonesian international students studying in {destination}. Mix government, university-specific, and private foundation scholarships.

For each scholarship, format as a sub-heading:

### [Scholarship Name]
- **Provider:** [Government / University / Foundation name]
- **Amount:** [Value in local currency]
- **Eligibility:** [Key requirements — GPA cutoff, nationality, program type, age]
- **Deadline:** [Application window — be specific if possible, otherwise note "annual intake"]
- **Application Process:** [Brief: "Apply via [portal]" or "Automatic upon admission"]
- **Fit for {student_name}:** [Realistic assessment — "Achievable if GPA improves to 85%+" or "Strong fit, matches profile"]

Include a mix of:
- **Government scholarships** (e.g., Chevening for UK, Australia Awards for AU, Fulbright for US, Canada-ASEAN SEED, MEXT for Japan, China Government Scholarship/CSC, Swiss Government Excellence)
- **University-specific entrance scholarships** for the 4-5 universities you recommended above
- **Private/foundation scholarships** open to Indonesian students

For Indonesia-specific options also consider: LPDP (Indonesian government), Beasiswa Indonesia Maju.

## Budget-Optimized Strategy

Based on the student's actual budget of **{budget_display}** and destination **{destination}**:

**Strategy 1: [Name]**
Primary pathway. Include: institution type, program, estimated annual cost in target currency, why it fits the risk profile.

**Strategy 2: [Name]**
Lower-cost alternative. Include: institution, pathway, estimated cost, tradeoffs.

**Strategy 3: [Name]**
Scholarship-heavy strategy OR foundation/diploma-to-degree bridge pathway.

**Summary of Savings Potential**

| Strategy | Est. Annual Tuition | Risk Factor | Notes |
|---|---|---|---|
| [Strategy 1 name] | [Amount in target currency] | [Low/Med/High] | [Key tradeoff] |
| [Strategy 2 name] | [Amount] | [Low/Med/High] | [Key tradeoff] |
| [Strategy 3 name] | [Amount] | [Low/Med/High] | [Key tradeoff] |
| Total Potential Savings | [Range] | — | [Overall conclusion] |

## Conclusion

Definitive, encouraging conclusion (max 120 words). Include:
- Their cognitive sweet spot in one sentence
- What fields they should avoid and exactly why (tie to their data)
- Single best degree recommendation
- One final motivational note grounded in their specific profile

# GLOBAL RULES
- Use `##` for major sections, `###` for sub-sections
- **NO `---` separators between sections** — they look ugly in the PDF render
- Tables use clean markdown
- Be SPECIFIC — cite actual grades, test scores, declared interests
- Use Google Search to verify tuition fees, scholarship amounts, and university programs for {destination}
- **Respect the student's stated budget** ({budget_display}) — recommend universities and pathways that fit within it
- Never invent data — flag missing info explicitly
- Length: 1,800–2,500 words
- Tone: Professional, direct, data-driven

Begin the report for {student_name} now.
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

        # POST-PROCESS: strip any --- horizontal rules the AI added anyway.
        # These render as ugly black lines in the PDF.
        # Remove standalone --- lines (3 or more dashes alone on a line)
        report_text = re.sub(r'^\s*-{3,}\s*$', '', report_text, flags=re.MULTILINE)
        # Collapse multiple blank lines into max 2
        report_text = re.sub(r'\n{3,}', '\n\n', report_text)

        return report_text.strip()

    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise Exception(f"AI generation failed: {str(e)}")