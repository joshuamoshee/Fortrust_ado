from fpdf import FPDF
import datetime

class PDFReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 16)
        self.set_text_color(0, 51, 102) 
        self.cell(0, 10, 'FORTRUST EDUCATION STRATEGY', 0, 1, 'C')
        self.ln(5)
    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(128)
        self.cell(0, 10, f'Confidential Counsellor Document | Page {self.page_no()}', 0, 0, 'C')

def create_pdf(student_name, content_data):
    pdf = PDFReport()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font("Arial", "B", 12)
    pdf.set_text_color(0)
    pdf.cell(0, 10, f"STUDENT: {student_name.upper()}", 0, 1, 'L')
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 5, f"Date: {datetime.date.today()}", 0, 1, 'L')
    pdf.ln(5)
    
    # Content Blocks
    sections = [
        ("1. EXECUTIVE SUMMARY", content_data.get('executive_summary', 'No summary.')),
        ("2. COGNITIVE PROFILE", f"Type: {content_data.get('cognitive_profile', 'Unknown')}\nAnalysis: Based on intake interview."),
    ]
    
    for title, body in sections:
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 8, title, 0, 1, 'L', fill=True)
        pdf.ln(2)
        pdf.set_font("Arial", "", 10)
        pdf.multi_cell(0, 6, body)
        pdf.ln(5)

    # Recs
    rec = content_data.get('recommendation_1', {})
    if rec:
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 8, f"3. TOP RECOMMENDATION: {rec.get('name', 'Generic')}", 0, 1, 'L', fill=True)
        pdf.ln(2)
        pdf.set_font("Arial", "", 10)
        pdf.multi_cell(0, 6, f"Why: {rec.get('why', '-')}")
        pdf.ln(2)

    # Roadmap
    roadmap = content_data.get('roadmap', [])
    if roadmap:
        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 8, "4. 5-YEAR STRATEGIC ROADMAP", 0, 1, 'L', fill=True)
        pdf.ln(2)
        pdf.set_font("Arial", "B", 10)
        pdf.cell(40, 8, "Timeline", 1)
        pdf.cell(140, 8, "Action", 1)
        pdf.ln()
        pdf.set_font("Arial", "", 10)
        for step in roadmap:
            pdf.cell(40, 8, step.get('phase', '-'), 1)
            pdf.cell(140, 8, step.get('action', '-'), 1)
            pdf.ln()

    filename = f"report_{student_name.replace(' ', '_')}.pdf"
    pdf.output(filename)
    return filename