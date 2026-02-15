from fpdf import FPDF
import datetime

class AbigailPDF(FPDF):
    def header(self):
        # --- LEFT SIDE: LOGO & TITLE ---
        self.set_font('Arial', 'B', 14)
        self.set_text_color(0, 51, 102) # Fortrust Dark Blue
        self.cell(100, 6, 'FORTRUST', 0, 1, 'L')
        
        self.set_font('Arial', 'I', 10)
        self.cell(100, 5, 'education services', 0, 1, 'L')
        
        # --- RIGHT SIDE: ADDRESS (Manually positioned) ---
        self.set_xy(120, 10)
        self.set_font('Arial', '', 8)
        self.set_text_color(80, 80, 80)
        self.multi_cell(80, 4, "Menara BCA Lt. 50\nJl. MH Thamrin No. 1\nJakarta 10310\nPhone: 021 23585686\nwww.fortrust.com", align='R')
        
        # --- BLUE LINE SEPARATOR ---
        self.set_xy(10, 35)
        self.set_draw_color(0, 51, 102)
        self.set_line_width(0.5)
        self.line(10, 32, 200, 32)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(128)
        self.cell(0, 10, f'Confidential Profile | Page {self.page_no()}', 0, 0, 'C')

    def student_info_block(self, student_name, test_name="NAVIGATHER - HCC"):
        self.set_font('Arial', 'B', 10)
        self.set_text_color(0)
        
        # Label Column
        self.cell(40, 6, "STUDENT NAME", 0, 0)
        self.cell(5, 6, ":", 0, 0)
        self.set_font('Arial', 'B', 12)
        self.cell(0, 6, student_name.upper(), 0, 1)
        
        # Profiling Result Column
        self.set_font('Arial', 'B', 10)
        self.cell(40, 6, "PROFILING RESULT", 0, 0)
        self.cell(5, 6, ":", 0, 0)
        self.set_font('Arial', '', 10)
        self.cell(0, 6, test_name, 0, 1)
        self.ln(5)

    def section_bar(self, title):
        self.ln(3)
        self.set_font('Arial', 'B', 11)
        self.set_fill_color(230, 240, 255) # Light Blue
        self.set_text_color(0, 51, 102)
        self.cell(0, 8, f"  {title.upper()}", 0, 1, 'L', fill=True)
        self.ln(2)

    def body_text(self, text):
        self.set_font('Arial', '', 10)
        self.set_text_color(0)
        self.multi_cell(0, 5, text)
        self.ln(2)

    def draw_quadrants(self, matrix_data):
        # Coordinates
        x = self.get_x() + 5
        y = self.get_y()
        w = 85
        h = 40
        
        # 1. PREMIUM (Top Left)
        self.set_fill_color(255, 235, 235) # Light Red
        self.rect(x, y, w, h, 'F')
        self.set_xy(x, y+2)
        self.set_font('Arial', 'B', 9)
        self.set_text_color(150, 0, 0)
        self.cell(w, 5, "PREMIUM INVESTMENT", 0, 1, 'C')
        self.set_font('Arial', '', 8)
        self.set_text_color(0)
        self.set_xy(x+2, y+8)
        self.multi_cell(w-4, 4, ", ".join(matrix_data.get('premium', [])), align='C')

        # 2. GOLDEN TICKET (Top Right)
        self.set_fill_color(235, 255, 235) # Light Green
        self.rect(x+w+5, y, w, h, 'F')
        self.set_xy(x+w+5, y+2)
        self.set_font('Arial', 'B', 9)
        self.set_text_color(0, 100, 0)
        self.cell(w, 5, "GOLDEN TICKET (Best Value)", 0, 1, 'C')
        self.set_font('Arial', '', 8)
        self.set_text_color(0)
        self.set_xy(x+w+7, y+8)
        self.multi_cell(w-4, 4, ", ".join(matrix_data.get('golden_ticket', [])), align='C')

        # 3. QUESTIONABLE (Bottom Left)
        self.set_fill_color(245, 245, 245) # Grey
        self.rect(x, y+h+5, w, h, 'F')
        self.set_xy(x, y+h+7)
        self.set_font('Arial', 'B', 9)
        self.set_text_color(80)
        self.cell(w, 5, "QUESTIONABLE UTILITY", 0, 1, 'C')
        self.set_font('Arial', '', 8)
        self.set_text_color(0)
        self.set_xy(x+2, y+h+13)
        self.multi_cell(w-4, 4, ", ".join(matrix_data.get('questionable', [])), align='C')

        # 4. PASSION (Bottom Right)
        self.set_fill_color(255, 255, 224) # Light Yellow
        self.rect(x+w+5, y+h+5, w, h, 'F')
        self.set_xy(x+w+5, y+h+7)
        self.set_font('Arial', 'B', 9)
        self.set_text_color(200, 150, 0)
        self.cell(w, 5, "PASSION PROJECT", 0, 1, 'C')
        self.set_font('Arial', '', 8)
        self.set_text_color(0)
        self.set_xy(x+w+7, y+h+13)
        self.multi_cell(w-4, 4, ", ".join(matrix_data.get('passion', [])), align='C')
        
        # Reset position
        self.set_xy(10, y + (h*2) + 15)
        
        # Scholarship Note
        if matrix_data.get('scholarship_impact'):
            self.set_font('Arial', 'BI', 9)
            self.set_text_color(0, 51, 102)
            self.cell(0, 6, f"SCHOLARSHIP IMPACT: {matrix_data.get('scholarship_impact')}", 0, 1, 'C')
            self.ln(5)

    def draw_simple_table(self, headers, rows, col_widths):
        # Header
        self.set_font('Arial', 'B', 9)
        self.set_fill_color(240, 240, 240)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, 1, 0, 'C', fill=True)
        self.ln()
        
        # Rows
        self.set_font('Arial', '', 9)
        for row in rows:
            max_h = 6
            # Calculate max height needed for this row
            for i, txt in enumerate(row):
                # crude estimate
                lines = len(str(txt)) // (col_widths[i] // 2) + 1
                if lines * 5 > max_h: max_h = lines * 5
            
            # Draw Cells
            x_start = self.get_x()
            y_start = self.get_y()
            for i, txt in enumerate(row):
                x_curr = self.get_x()
                self.multi_cell(col_widths[i], max_h, str(txt), border=1, align='L')
                self.set_xy(x_curr + col_widths[i], y_start) # Move right
            
            self.set_xy(x_start, y_start + max_h) # Move down line

def create_pdf(student_name, data):
    pdf = AbigailPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # --- PAGE 1: EXECUTIVE SUMMARY ---
    pdf.add_page()
    pdf.student_info_block(student_name)
    
    # 1. Executive Summary
    pdf.section_bar("1. Executive Summary & Profile")
    pdf.set_font("Arial", "B", 10)
    pdf.cell(0, 6, "The Profile Verdict:", 0, 1)
    pdf.body_text(data.get('executive_summary', ''))
    
    pdf.ln(2)
    ana = data.get('analysis', {})
    pdf.set_text_color(0, 100, 0); pdf.cell(30, 6, "SUPERPOWERS:", 0, 0); pdf.set_text_color(0)
    pdf.multi_cell(0, 6, ana.get('superpowers', '-'))
    pdf.set_text_color(150, 0, 0); pdf.cell(30, 6, "KRYPTONITE:", 0, 0); pdf.set_text_color(0)
    pdf.multi_cell(0, 6, ana.get('kryptonite', '-'))
    pdf.ln(2)
    
    # 2. Roadmap (Moved to Page 1 for impact)
    pdf.section_bar("2. 5-Year Strategic Roadmap")
    roadmap_data = []
    for r in data.get('roadmap', []):
        roadmap_data.append([r.get('phase'), r.get('action')])
    pdf.draw_simple_table(["Timeline", "Strategic Focus & Action"], roadmap_data, [40, 150])
    pdf.ln(5)

    # --- PAGE 2: DETAILED OPTIONS ---
    pdf.add_page()
    pdf.section_bar("3. Top 3 Recommended Career Paths")
    
    for i, rec in enumerate(data.get('recommendations', [])):
        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 8, f"OPTION {i+1}: {rec.get('role', 'Career')}", 0, 1)
        
        # Yellow Box for Future Proofing
        pdf.set_fill_color(255, 250, 230)
        pdf.rect(pdf.get_x(), pdf.get_y(), 190, 18, 'F')
        pdf.set_font("Arial", "", 9)
        pdf.multi_cell(0, 6, f"   Future-Proof Strategy: {rec.get('future_proofing')}")
        pdf.multi_cell(0, 6, f"   Salary Outlook: {rec.get('salary_map')}")
        pdf.ln(5)

    # --- PAGE 3: MATRICES ---
    pdf.add_page()
    
    # Value Matrix
    pdf.section_bar("4. Education Value Matrix (ROI Analysis)")
    pdf.draw_quadrants(data.get('value_matrix', {}))
    
    # City Matrix
    pdf.section_bar("5. City & University Match")
    city_rows = []
    for r in data.get('city_matrix', []):
        city_rows.append([r.get('city'), r.get('institution'), r.get('risk')])
    pdf.draw_simple_table(["City", "Institution", "Risk Factor"], city_rows, [40, 80, 70])
    pdf.ln(5)

    # Fit vs Friction
    pdf.section_bar("6. Fit vs Friction Comparison")
    fit_rows = []
    for r in data.get('fit_vs_friction', []):
        fit_rows.append([r.get('pathway'), r.get('fit'), r.get('friction'), r.get('score')])
    pdf.draw_simple_table(["Pathway", "Fit (Cognitive)", "Friction (Personality)", "Score"], fit_rows, [40, 60, 70, 20])
    
    # Parent Analysis
    pdf.ln(5)
    pdf.set_font("Arial", "B", 10)
    pdf.cell(0, 6, "Parent Preference Analysis:", 0, 1)
    par = data.get('parent_analysis', {})
    pdf.set_font("Arial", "", 10)
    pdf.multi_cell(0, 6, f"Preference: {par.get('preference')}\nVerdict: {par.get('verdict')}")

    # Output
    filename = f"Abigail_Style_Report_{student_name.replace(' ', '_')}.pdf"
    pdf.output(filename)
    return filename