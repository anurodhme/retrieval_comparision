"""
Utility functions for document processing
"""
from io import BytesIO
from pypdf import PdfReader


def extract_text_from_pdf(pdf_content: bytes) -> str:
    """
    Extract text from PDF file
    
    Args:
        pdf_content: PDF file content as bytes
        
    Returns:
        Extracted text from the PDF
    """
    try:
        pdf_file = BytesIO(pdf_content)
        reader = PdfReader(pdf_file)
        
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n\n"
        
        return text.strip()
        
    except Exception as e:
        raise ValueError(f"Error extracting text from PDF: {str(e)}")


def clean_text(text: str) -> str:
    """
    Clean and normalize text
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text
    """
    # Remove excessive whitespace
    text = ' '.join(text.split())
    
    # Remove special characters if needed
    # text = re.sub(r'[^\w\s.,!?-]', '', text)
    
    return text
