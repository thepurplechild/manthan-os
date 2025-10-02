import pdfplumber
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF using pdfplumber.
    Handles Indic Unicode scripts gracefully.

    Args:
        pdf_bytes: Raw PDF file bytes

    Returns:
        Extracted text with page markers

    Raises:
        Exception: If extraction fails completely
    """
    try:
        pdf_file = BytesIO(pdf_bytes)
        text_parts = []

        with pdfplumber.open(pdf_file) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f"Processing PDF with {total_pages} pages")

            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    page_text = page.extract_text()

                    if page_text and page_text.strip():
                        text_parts.append(f"[Page {page_num}/{total_pages}]\n{page_text}")

                    # Log progress every 10 pages
                    if page_num % 10 == 0:
                        logger.info(f"Processed {page_num}/{total_pages} pages")

                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num}: {str(e)}")
                    continue

        full_text = "\n\n".join(text_parts)

        if not full_text.strip():
            raise Exception("No text could be extracted from PDF")

        logger.info(f"Successfully extracted {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"PDF extraction error: {str(e)}")
        raise Exception(f"Failed to extract text from PDF: {str(e)}")