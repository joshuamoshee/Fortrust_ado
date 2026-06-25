"""
Fortrust Application Form PDF generator.
Overlays student data onto Mami's blank PDF template.

Approach: 
1. Use ReportLab to render text-only overlay PDF in memory
2. Use pypdf to merge overlay on top of original template
3. Output filled PDF as bytes

Coordinate system note:
- pdfplumber uses 'top' (Y from top of page)
- ReportLab uses Y from BOTTOM of page
- Page is A4: 595 x 842 points
- Conversion: y_rl = 842 - y_top - 2 (small offset so text sits on the dotted line)
"""
import io
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

PAGE_W, PAGE_H = A4  # 595 x 842

# Text baseline offset — text needs to sit slightly above the dotted line
BASELINE_OFFSET = 3


def y_from_top(top_y, offset=BASELINE_OFFSET):
    """Convert pdfplumber 'top' Y coord to ReportLab Y (from bottom)."""
    return PAGE_H - top_y - offset


def generate_application_form_pdf(student: dict, template_path: str) -> bytes:
    """
    Generate filled application form PDF.
    
    Args:
        student: dict with all student fields (scalar + arrays)
        template_path: path to Mami's blank Fortrust_Application_Form.pdf
    
    Returns:
        bytes of filled PDF
    """
    # 1. Create overlay PDF in memory
    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=A4)
    
    # =========================================================
    # PAGE 1
    # =========================================================
    _draw_page_1(c, student)
    c.showPage()
    
    # =========================================================
    # PAGE 2
    # =========================================================
    _draw_page_2(c, student)
    c.showPage()
    
    c.save()
    
    # 2. Merge overlay onto original template
    overlay_buffer.seek(0)
    overlay_pdf = PdfReader(overlay_buffer)
    template_pdf = PdfReader(template_path)
    
    writer = PdfWriter()
    for page_idx, template_page in enumerate(template_pdf.pages):
        if page_idx < len(overlay_pdf.pages):
            template_page.merge_page(overlay_pdf.pages[page_idx])
        writer.add_page(template_page)
    
    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    return output_buffer.getvalue()


def _draw_page_1(c: canvas.Canvas, s: dict):
    """Draw all overlay text on page 1."""
    
    # ============ PERSONAL DETAILS ============
    c.setFont("Helvetica", 9)
    
    # Title (Mr/Mrs/Ms/Other) — circle or X the right one at top of Personal Details
    # The label "Mr / Mrs / Ms / Other :" ends around x=138. Title text goes after.
    title = s.get("title", "")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(140, y_from_top(115.8), title or "")
    
    # Gender (Male / Female) — draw a rectangle outline around the chosen one
    gender = s.get("gender", "")
    if gender == "Male":
        c.rect(251, 717, 31, 13, stroke=1, fill=0)
    elif gender == "Female":
        c.rect(293, 717, 41, 13, stroke=1, fill=0)
    c.setFont("Helvetica", 9)
    
    # Date of birth: format DD / MM / YYYY
    # Dots are at x=472, x=508 approximately
    # Fill: DD before first /, MM between first and second /, YYYY after second /
    dob = s.get("date_of_birth", "")
    if dob and len(dob) >= 10:
        # Assume YYYY-MM-DD
        yyyy, mm, dd = dob[:4], dob[5:7], dob[8:10]
        c.drawString(455, y_from_top(115.8), dd)
        c.drawString(485, y_from_top(115.8), mm)
        c.drawString(520, y_from_top(115.8), yyyy)
    
    # First Name (after "First name :" at x=131)
    c.drawString(140, y_from_top(135.2), s.get("first_name", "") or "")
    
    # Family Name (after "Family name :" at x=131)
    c.drawString(140, y_from_top(154.9), s.get("family_name", "") or "")
    
    # Nationality (label "Nationality" ends at ~x=98)
    c.drawString(100, y_from_top(175.5), s.get("nationality", "") or "")
    
    # Country of permanent residence (label ends at ~x=355)
    c.drawString(355, y_from_top(175.5), s.get("country_of_residence", "") or "")
    
    # Passport No (label "No:" ends at ~x=494)
    c.drawString(495, y_from_top(175.5), s.get("passport_no", "") or "")
    
    # Permanent home address — multi-line. Label ends at ~x=160
    home_address = s.get("home_address", "") or ""
    # Split into lines if too long. Roughly 70 chars per line.
    addr_lines = _wrap_text(home_address, 75)
    if len(addr_lines) >= 1:
        c.drawString(165, y_from_top(195.0), addr_lines[0])
    if len(addr_lines) >= 2:
        c.drawString(45, y_from_top(210.0), addr_lines[1])
    
    # Postcode (label "Postcode" ends at ~x=400)
    c.drawString(405, y_from_top(226.2), s.get("postcode", "") or "")
    
    # Tel 1 (label ends at ~x=73)
    c.drawString(80, y_from_top(245.6), s.get("tel_1", "") or "")
    
    # Tel 2 (label ends at ~x=203)
    c.drawString(210, y_from_top(245.6), s.get("tel_2", "") or "")
    
    # HP (label ends at ~x=315) — use the main phone field
    c.drawString(320, y_from_top(245.6), s.get("phone", "") or "")
    
    # Fax (label ends at ~x=435)
    c.drawString(440, y_from_top(245.6), s.get("fax", "") or "")
    
    # Email (label "Email" ends at ~x=72)
    c.drawString(80, y_from_top(266.5), s.get("email", "") or "")
    
    # ============ PROGRAM PREFERENCES ============
    program_prefs = s.get("program_preferences", []) or []
    pref_y_positions = [315.7, 331.3, 346.6, 362.2, 377.8]
    
    for i, pos_y in enumerate(pref_y_positions):
        if i < len(program_prefs):
            pref = program_prefs[i]
            # Institution text starts at ~x=135 (after "Institution :")
            inst = (pref.get("institution") or "")[:35]
            c.drawString(140, y_from_top(pos_y), inst)
            # Course text starts at ~x=355 (after "Course :")
            course = (pref.get("course") or "")[:30]
            c.drawString(355, y_from_top(pos_y), course)
    
    # Month & Year of Entry (label ends at ~x=147)
    c.drawString(155, y_from_top(402.8), s.get("entry_month_year", "") or "")
    
    # Level of entry (label ends at ~x=372)
    c.drawString(380, y_from_top(402.8), s.get("entry_level", "") or "")
    
    # ============ PREVIOUS STUDY TABLE ============
    # Table rows start around y=505. 5 rows possible. Each row ~18 points tall.
    prev_studies = s.get("previous_studies", []) or []
    study_row_ys = [510, 528, 546, 564, 582]  # top Y for each row
    
    c.setFont("Helvetica", 8)
    for i, pos_y in enumerate(study_row_ys):
        if i < len(prev_studies):
            study = prev_studies[i]
            # Column 1: From Month/Year (x ~45-95)
            c.drawString(50, y_from_top(pos_y), str(study.get("from_date") or "")[:12])
            # Column 2: To Month/Year (x ~100-150)
            c.drawString(105, y_from_top(pos_y), str(study.get("to_date") or "")[:12])
            # Column 3: Qualification (x ~155-360)
            c.drawString(160, y_from_top(pos_y), str(study.get("qualification") or "")[:42])
            # Column 4: Institution (x ~365-490)
            c.drawString(370, y_from_top(pos_y), str(study.get("institution") or "")[:28])
            # Column 5: Country (x ~495-580)
            c.drawString(500, y_from_top(pos_y), str(study.get("country") or "")[:18])
    
    # ============ WORK EXPERIENCE TABLE ============
    # Table rows start around y=680. 3 rows possible. Each row ~36 points tall (bigger).
    work_exps = s.get("work_experiences", []) or []
    work_row_ys = [680, 716, 752]  # top Y for each row start
    
    for i, pos_y in enumerate(work_row_ys):
        if i < len(work_exps):
            work = work_exps[i]
            # Column 1: From (x ~45-95)
            c.drawString(50, y_from_top(pos_y), str(work.get("from_date") or "")[:12])
            # Column 2: To (x ~100-150)
            c.drawString(105, y_from_top(pos_y), str(work.get("to_date") or "")[:12])
            # Column 3: Organisation (x ~155-300)
            c.drawString(160, y_from_top(pos_y), str(work.get("organisation") or "")[:28])
            # Column 4: Position (x ~305-415)
            c.drawString(310, y_from_top(pos_y), str(work.get("position") or "")[:22])
            # Column 5: Type of Work/Duties (x ~420-525)
            duties_lines = _wrap_text(str(work.get("duties") or ""), 22)
            for j, line in enumerate(duties_lines[:2]):
                c.drawString(425, y_from_top(pos_y + j*10), line)
            # Column 6: FT/PT (x ~530-560)
            c.drawString(540, y_from_top(pos_y), str(work.get("ft_pt") or "")[:3])


def _draw_page_2(c: canvas.Canvas, s: dict):
    """Draw all overlay text on page 2."""
    c.setFont("Helvetica", 9)
    
    # ============ LANGUAGE TESTS ============
    # Table starts around y=145, 4 rows roughly
    lang_tests = s.get("language_tests", []) or []
    lang_row_ys = [148, 168, 188]
    
    for i, pos_y in enumerate(lang_row_ys):
        if i < len(lang_tests):
            t = lang_tests[i]
            # Type of Test column (~x=55-310)
            c.drawString(60, y_from_top(pos_y), str(t.get("type") or "")[:35])
            # Date of Test column (~x=315-455)
            c.drawString(320, y_from_top(pos_y), str(t.get("test_date") or "")[:20])
            # Result column (~x=460-580)
            c.drawString(465, y_from_top(pos_y), str(t.get("result") or "")[:18])
    
    # ============ REFEREES ============
    referees = s.get("referees", []) or []
    
    # Referee 1 — labels at these Y positions on page 2
    if len(referees) >= 1:
        ref = referees[0]
        c.drawString(140, y_from_top(228.8), str(ref.get("name") or "")[:60])
        c.drawString(140, y_from_top(249.4), str(ref.get("institution") or "")[:60])
        c.drawString(140, y_from_top(270.3), str(ref.get("position") or "")[:60])
        # Address may span 2 lines
        addr_lines = _wrap_text(str(ref.get("address") or ""), 70)
        if len(addr_lines) >= 1:
            c.drawString(140, y_from_top(291.0), addr_lines[0])
        if len(addr_lines) >= 2:
            c.drawString(45, y_from_top(305.0), addr_lines[1])
        c.drawString(80, y_from_top(332.2), str(ref.get("tel_1") or "")[:25])
        c.drawString(210, y_from_top(332.2), str(ref.get("tel_2") or "")[:25])
        c.drawString(320, y_from_top(332.2), str(ref.get("hp") or "")[:25])
        c.drawString(440, y_from_top(332.2), str(ref.get("fax") or "")[:25])
        c.drawString(80, y_from_top(353.1), str(ref.get("email") or "")[:60])
    
    # Referee 2
    if len(referees) >= 2:
        ref = referees[1]
        c.drawString(140, y_from_top(394.4), str(ref.get("name") or "")[:60])
        c.drawString(140, y_from_top(415.0), str(ref.get("institution") or "")[:60])
        c.drawString(140, y_from_top(435.7), str(ref.get("position") or "")[:60])
        addr_lines = _wrap_text(str(ref.get("address") or ""), 70)
        if len(addr_lines) >= 1:
            c.drawString(140, y_from_top(456.6), addr_lines[0])
        if len(addr_lines) >= 2:
            c.drawString(45, y_from_top(470.0), addr_lines[1])
        c.drawString(80, y_from_top(497.8), str(ref.get("tel_1") or "")[:25])
        c.drawString(210, y_from_top(497.8), str(ref.get("tel_2") or "")[:25])
        c.drawString(320, y_from_top(497.8), str(ref.get("hp") or "")[:25])
        c.drawString(440, y_from_top(497.8), str(ref.get("fax") or "")[:25])
        c.drawString(80, y_from_top(518.5), str(ref.get("email") or "")[:60])


def _wrap_text(text: str, max_chars: int) -> list:
    """Simple word-wrap by char count."""
    if not text:
        return []
    words = text.split()
    lines = []
    current = ""
    for w in words:
        if not current:
            current = w
        elif len(current) + 1 + len(w) <= max_chars:
            current += " " + w
        else:
            lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


# =========================================================
# TEST WITH SAMPLE DATA
# =========================================================
if __name__ == "__main__":
    sample_student = {
        "title": "Mr",
        "gender": "Male",
        "date_of_birth": "2005-06-15",
        "first_name": "Rafael Benjamin",
        "family_name": "Sutanto",
        "nationality": "Indonesian",
        "country_of_residence": "Indonesia",
        "passport_no": "A1234567",
        "home_address": "Jl. Pondok Indah No. 45, RT 002 RW 005, Kebayoran Lama, Jakarta Selatan",
        "postcode": "12310",
        "tel_1": "+62 21 7654321",
        "tel_2": "+62 21 7654322",
        "phone": "+62 812 3456 7890",
        "fax": "+62 21 7654323",
        "email": "rafael.sutanto@example.com",
        "program_preferences": [
            {"institution": "University of Melbourne", "course": "Bachelor of Computer Science"},
            {"institution": "Monash University", "course": "BSc Software Engineering"},
            {"institution": "ANU", "course": "Bachelor of Information Technology"},
        ],
        "entry_month_year": "February 2027",
        "entry_level": "Year 1 Undergraduate",
        "previous_studies": [
            {"from_date": "07/2020", "to_date": "06/2023", "qualification": "SMA Diploma - Science Stream (IPA)", "institution": "SMAK Penabur Bintaro Jaya", "country": "Indonesia"},
            {"from_date": "07/2014", "to_date": "06/2020", "qualification": "Junior Secondary Certificate", "institution": "SMP Penabur Kemang", "country": "Indonesia"},
        ],
        "work_experiences": [
            {"from_date": "06/2023", "to_date": "08/2023", "organisation": "Tokopedia", "position": "Software Intern", "duties": "Built internal admin dashboard with React", "ft_pt": "FT"},
        ],
        "language_tests": [
            {"type": "IELTS Academic", "test_date": "March 2026", "result": "Overall 7.5"},
            {"type": "TOEFL iBT", "test_date": "January 2026", "result": "98"},
        ],
        "referees": [
            {
                "name": "Dr. Sarah Wijaya",
                "institution": "SMAK Penabur Bintaro Jaya",
                "position": "Mathematics Teacher & Counselor",
                "address": "Jl. Bintaro Utama Sektor 9, Tangerang Selatan, Banten",
                "tel_1": "+62 21 7456789",
                "tel_2": "",
                "hp": "+62 812 9999 8888",
                "fax": "",
                "email": "sarah.wijaya@penabur.sch.id"
            },
            {
                "name": "Prof. Budi Santoso",
                "institution": "Universitas Indonesia (Outreach)",
                "position": "Computer Science Lecturer",
                "address": "Kampus UI Depok, Jawa Barat",
                "tel_1": "+62 21 7867890",
                "tel_2": "",
                "hp": "+62 813 4567 8910",
                "fax": "",
                "email": "budi.santoso@cs.ui.ac.id"
            }
        ]
    }
    
    template = "/mnt/user-data/uploads/Fortrust_Application_Form__2_.pdf"
    output = generate_application_form_pdf(sample_student, template)
    
    out_path = "/home/claude/filled_form_test.pdf"
    with open(out_path, "wb") as f:
        f.write(output)
    print(f"Generated: {out_path} ({len(output)} bytes)")