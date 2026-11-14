import io
from typing import Tuple
from pypdf import PdfReader
from docx import Document


def extract_text_from_file(filename: str, file_bytes: bytes) -> Tuple[str, int]:
    """
    Extracts plain text from uploaded files (PDF, DOCX, TXT, CSV, MD).
    Returns (extracted_text, num_units) where num_units is pages or paragraphs.
    """
    filename_lower = filename.lower()

    if filename_lower.endswith('.pdf'):
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        pages_text = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)
        text = "\n\n".join(pages_text)
        return text.strip(), len(reader.pages)

    elif filename_lower.endswith('.docx'):
        docx_file = io.BytesIO(file_bytes)
        doc = Document(docx_file)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n".join(paragraphs)
        return text.strip(), len(paragraphs)

    elif any(filename_lower.endswith(ext) for ext in ['.txt', '.csv', '.md', '.json', '.log']):
        try:
            text = file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            text = file_bytes.decode('latin-1', errors='replace')
        lines = text.splitlines()
        return text.strip(), len(lines)

    else:
        # Fallback to text decoding
        try:
            text = file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            text = file_bytes.decode('latin-1', errors='replace')
        return text.strip(), 1
