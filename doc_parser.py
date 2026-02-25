import pdfplumber

def extract_text_from_pdf(uploaded_file):
    """
    Reads a PDF file object (from Streamlit) and returns the full text.
    """
    if uploaded_file is None:
        return ""
    
    full_text = ""
    try:
        with pdfplumber.open(uploaded_file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
    except Exception as e:
        return f"Error reading PDF: {str(e)}"
        
    return full_text