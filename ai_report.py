import os
import re
from typing import List, Tuple, Optional, Union
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


def generate_strategic_report(
    student_name: str,
    destination: str = "Global (AI Recommended)",
    budget=None,  # str ("USD 11,000-28,000/Year") or number or None
    notes: str = "No notes provided.",
    pdf_data: str = "",  # Optional text fallback (e.g. extracted text or document summaries)
    pdf_files: Optional[List[Tuple[str, bytes, str]]] = None,  # (label, bytes, mime_type)
    field_interests: list = None,
    program_interest: str = ""
) -> str:
    """
    Generate a strategic assessment report.
    
    Args:
        student_name: Student's full name
        destination: Target country / "Global"
        budget: Free-text or numeric budget
        notes: Agent's free-text notes
        pdf_data: (Optional) Pre-extracted text from documents — used as supplementary context
        pdf_files: (NEW, preferred) List of (filename, bytes) tuples. Gemini reads PDFs natively.
        field_interests: List of declared interest fields
        program_interest: Free-text initial program interest
    """
    if not _client:
        raise Exception("GEMINI_API_KEY is not configured on the server.")

    # --- BUDGET PARSING ---
    if budget is None or budget == "" or budget == 0:
        budget_display = "Not specified — agent should capture this during consultation"
    elif isinstance(budget, (int, float)):
        budget_display = f"USD ${budget:,.0f}/year"
    else:
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

    # --- BUILD DOCUMENT CONTEXT BLOCK ---
    has_pdf_files = pdf_files and len(pdf_files) > 0
    has_pdf_text = pdf_data and pdf_data.strip()

    if has_pdf_files:
        doc_count = len(pdf_files)
        # Tolerate both 2-tuple (legacy) and 3-tuple (new with mime_type)
        file_names = ", ".join([item[0] for item in pdf_files])
        doc_block = f"""I have attached {doc_count} document file(s) directly to this request: {file_names}

You will see these as attachments (PDFs and/or images) in this conversation. They may include:
- Indonesian high school report cards (Rapor / Rapot) — often as scanned images
- Psychological profiling tests (HCC, MBTI, IQ, RIASEC)
- Other supporting transcripts

**IMPORTANT for scanned PDFs:** If a PDF appears to be a scanned image (low text quality, CamScanner watermark, photographs of paper documents), use your native vision capability to READ THE IMAGES. Indonesian rapors are almost always scanned — you must visually read the tables to extract subject names and scores. Do NOT report "no report card found" if the document is visibly a rapor — extract the data from the image directly."""
    elif has_pdf_text:
        MAX_PDF_CHARS = 60000
        pdf_excerpt = pdf_data[:MAX_PDF_CHARS]
        if len(pdf_data) > MAX_PDF_CHARS:
            pdf_excerpt += "\n\n[... documents truncated for length ...]"
        doc_block = f"""Documents (text extracted from uploaded files):
```
{pdf_excerpt}
```"""
    else:
        doc_block = "⚠️ No documents have been uploaded for this student yet. Flag this clearly in the report — recommendations will be limited."

    # --- BUILD THE PROMPT TEXT ---
    prompt_text = f"""You are an Elite Career Strategist, Educational Futurist, and Talent Assessor operating within Fortrust Education Services.

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

The most common Indonesian rapor format has this exact structure that you MUST recognize:

| Header field | Meaning |
|---|---|
| Nama Sekolah | School name (e.g., SMA SANTA THERESIA) |
| Nama Siswa | Student name |
| NIS / NISN | Student ID number |
| Kelas / No. Absen | Class / Roll number |
| Fase | Phase (E = grade 10, F = grade 11) |
| Semester | Ganjil (odd/1st) or Genap (even/2nd) |
| Tahun Pelajaran | Academic year (e.g., 2024/2025) |
| LAPORAN HASIL BELAJAR | "Learning Results Report" — the TITLE of a rapor |
| Mata Pelajaran | Subject name |
| Nilai Akhir | Final grade (numeric, usually 0-100) |
| Capaian Kompetensi | Competency description (text narrative per subject) |
| KETIDAKHADIRAN | Absences (Sakit/Izin/Tanpa Keterangan) |
| EKSTRAKURIKULER | Extracurriculars with Predikat (A/B/C grade) |
| CATATAN WALI KELAS | Homeroom teacher's notes |
| PRESTASI | Achievements |
| Wali Kelas | Homeroom teacher (signature block) |

**Common subjects (Mata Pelajaran) you should recognize:**
Pendidikan Agama, Pendidikan Pancasila, Bahasa Indonesia, Bahasa Inggris, Matematika, Sejarah, Fisika, Kimia, Biologi, Informatika, Ekonomi, Geografi, Sosiologi, Prakarya dan Kewirausahaan, Pendidikan Jasmani (PJOK), Seni Budaya, Bahasa Mandarin, Sejarah Tingkat Lanjut.

**Rule: If you see "LAPORAN HASIL BELAJAR" or a table with Mata Pelajaran + Nilai Akhir columns, that IS a rapor. Extract EVERY single subject-score pair, the semester, and the academic year. Do NOT say "no report card found." Multiple rapors from different semesters tell you the trend over time — track this carefully.**

## Profiling Test Recognition
Look for IQ scores, cognitive subscores, personality dimensions, HCC (Human Care Consulting) letterhead, Holland Code (RIASEC), MBTI types, terms like "Logika Verbal/Numerik/Figural/Keteknikan", "Daya Analisa", "Kepatuhan", "Sistematika Belajar", "Motivasi Belajar", "Kesigapan", "Minat Sosial", "Kepekaan & Kepedulian".

# UPLOADED DOCUMENTS
{doc_block}

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

**MANDATORY STEP-BY-STEP PROCESS:**

1. **Open each attached PDF** and look for "LAPORAN HASIL BELAJAR" header or any table with subject names + numeric grades.
2. **For each rapor found, extract ALL subject-score pairs into a working table.** Note the semester (Ganjil/Genap) and academic year for each.
3. **List EVERY subject** found across all rapors. Do not summarize — be exhaustive.
4. **Compare across semesters** for the same subject. Compute trend per subject (improving / stable / declining).
5. **Rank subjects by average score** to identify strongest and weakest.
6. **Identify the academic track** (IPA / IPS / Bahasa) from class designation (e.g., X-3, XI-4) and subject mix.

**Present the analysis as:**

**Extracted Grade Data**

| Subject (Mata Pelajaran) | [Semester 1 grade] | [Semester 2 grade] | [Semester 3 grade] | Trend | Avg |
|---|---|---|---|---|---|
| Matematika | 79 | 76 | 68 | ⬇️ Declining sharply | 74.3 |
| Informatika | 93 | 95 | 93 | ➡️ Excellent & stable | 93.7 |

(Build the full table with EVERY subject across ALL available semesters.)

**Strongest subjects (with evidence):** [Top 3 with average scores]

**Weakest subjects (with evidence):** [Bottom 3 with average scores, especially anything declining]

**Semester trends:** [Overall pattern — is overall GPA improving, declining, mixed?]

**Track:** [IPA / IPS / Bahasa — based on class and subject mix]

**Class rank / GPA:** [Only if explicitly stated in rapor]

**Attendance pattern:** [Sakit (sick) / Izin (excused) / Tanpa Keterangan (unexcused) — flag if absences spiking]

**Extracurriculars & achievements:** [Cite specific activities and predikat ratings]

If — and only if — after careful visual inspection of EVERY page of EVERY PDF you genuinely find ZERO subject-score data anywhere, then write: "⚠️ No report card data was extractable from uploaded files. The rapors may be missing or unreadable. Agent should re-upload clearer scans."

## City & University Matching

Use Google Search to find 4-5 REAL, currently-operating universities in **{destination}** that match the recommended majors AND fit within the student's actual budget of **{budget_display}**.

For each institution:
- **University name** and city
- **Focus:** Specific relevant program offered
- **Why fit:** Cite the student's cognitive/interest profile AND specific grade data
- **Cost note:** Approximate annual international tuition in local currency. **CRITICAL: respect the student's stated budget range. If their budget is USD 11,000-28,000/Year, DO NOT recommend universities costing USD $40,000/year.**

Then present a matching matrix:

| City | Key Institution(s) | Primary Vibe | Best Fit for {student_name} | Risk / Cost |
|---|---|---|---|---|

End with:
- **Top Pick (Balanced):** [University + City + one sentence why]
- **Top Pick (Safety/Budget):** [University + City + one sentence why]

## Scholarship Match List

Use Google Search to find 5-7 REAL, currently-available scholarships for Indonesian international students studying in {destination}. Mix government, university-specific, and private foundation scholarships.

For each scholarship, format as a sub-heading:

### [Scholarship Name]
- **Provider:** [Government / University / Foundation name]
- **Amount:** [Value in local currency]
- **Eligibility:** [Key requirements — GPA cutoff, nationality, program type, age]
- **Deadline:** [Application window]
- **Application Process:** [Brief: "Apply via [portal]" or "Automatic upon admission"]
- **Fit for {student_name}:** [Realistic assessment based on their actual extracted grades]

Include a mix of:
- **Government scholarships** (Chevening for UK, Australia Awards for AU, Fulbright for US, Canada-ASEAN SEED, MEXT for Japan, China Government Scholarship/CSC, Swiss Government Excellence)
- **University-specific entrance scholarships** for the 4-5 universities you recommended above
- **Private/foundation scholarships** open to Indonesian students

For Indonesia-specific options: LPDP (Indonesian government), Beasiswa Indonesia Maju.

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
- **NO `---` separators between sections**
- Tables use clean markdown
- Be SPECIFIC — cite actual extracted grades, test scores, declared interests
- Use Google Search to verify tuition fees, scholarship amounts, university programs
- **Respect the student's stated budget** ({budget_display})
- **READ THE ATTACHED PDFS VISUALLY** — do not skip rapor analysis just because the PDF is a scan
- Length: 1,800–2,500 words
- Tone: Professional, direct, data-driven

Begin the report for {student_name} now.
"""

    # --- BUILD CONTENTS FOR GEMINI ---
    # When PDF files are provided, build a multipart content list:
    # [Part(text=prompt), Part(file=pdf1), Part(file=pdf2), ...]
    if has_pdf_files:
        parts = [types.Part.from_text(text=prompt_text)]
        for item in pdf_files:
            # Defensive: handle both 2-tuple (legacy) and 3-tuple (new with mime_type)
            if len(item) == 3:
                filename, file_bytes, mime_type = item
            else:
                filename, file_bytes = item
                # Fallback: infer from filename extension
                ext = "." + filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
                mime_type = {
                    ".pdf": "application/pdf",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".webp": "image/webp",
                    ".heic": "image/heic",
                    ".heif": "image/heif",
                }.get(ext, "application/pdf")
            try:
                parts.append(
                    types.Part.from_bytes(
                        data=file_bytes,
                        mime_type=mime_type
                    )
                )
                print(f"[ai_report] Attached {mime_type} to Gemini: {filename} ({len(file_bytes):,} bytes)")
            except Exception as part_err:
                print(f"[ai_report] Failed to attach {filename}: {part_err}")
                continue
        contents = parts
    else:
        # Text-only path (backward compat)
        contents = prompt_text

    # --- CALL GEMINI ---
    try:
        response = _client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config={
                "tools": [{"google_search": {}}],
            }
        )
        report_text = (response.text or "").strip()
        if not report_text:
            raise Exception("AI returned an empty response.")

        # POST-PROCESS: strip --- horizontal rules
        report_text = re.sub(r'^\s*-{3,}\s*$', '', report_text, flags=re.MULTILINE)
        # Collapse multiple blank lines
        report_text = re.sub(r'\n{3,}', '\n\n', report_text)

        return report_text.strip()

    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise Exception(f"AI generation failed: {str(e)}")