import os
import sys
import logging
import requests
from urllib.parse import urlparse
from typing import Dict, Any

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


from processors.pdf_extractor import extract_text_from_pdf
from processors.docx_extractor import extract as extract_docx
from processors.pptx_extractor import extract as extract_pptx
from processors.image_extractor import extract as extract_image
from processors.text_extractor import extract as extract_text
from processors.embeddings import generate_embeddings

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def supabase_request(method: str, endpoint: str, json_data: Dict = None) -> Dict:
    """Make authenticated request to Supabase REST API"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    response = requests.request(method, url, headers=headers, json=json_data)
    response.raise_for_status()

    if response.text:
        return response.json()
    return {}

def download_from_signed_url(storage_url: str) -> bytes:
    """Download file from signed URL"""
    response = requests.get(storage_url)
    response.raise_for_status()
    return response.content

def route_extraction(file_bytes: bytes, mime_type: str = None, filename: str = "") -> str:
    mime = (mime_type or "").lower()
    ext = filename.rsplit(".", 1)[-1].lower() if filename and "." in filename else ""

    logger.info(f"Extractor routing: mime_type={mime or 'unknown'}, filename={filename or 'unknown'}, extension={ext or 'unknown'}")

    if mime == "application/pdf" or ext == "pdf":
        return extract_text_from_pdf(file_bytes)

    elif mime in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ) or ext in ("docx", "doc"):
        return extract_docx(file_bytes)

    elif mime in (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
    ) or ext in ("pptx", "ppt"):
        return extract_pptx(file_bytes)

    elif mime.startswith("image/") or ext in ("jpg", "jpeg", "png", "webp", "gif"):
        return extract_image(file_bytes, mime_type or "image/jpeg")

    elif mime in ("text/plain", "text/markdown") or ext in ("txt", "md"):
        return extract_text(file_bytes)

    else:
        try:
            return extract_text_from_pdf(file_bytes)
        except Exception:
            return extract_text(file_bytes)

def _update_extraction_failed(document_id: str, error_message: str) -> None:
    # Try storing descriptive error message if supported by DB schema.
    try:
        supabase_request(
            "PATCH",
            f"documents?id=eq.{document_id}",
            {"processing_status": "EXTRACTION_FAILED", "error_message": error_message[:1000]},
        )
        return
    except Exception:
        pass

    # Fallback if documents.error_message column does not exist.
    supabase_request(
        "PATCH",
        f"documents?id=eq.{document_id}",
        {"processing_status": "EXTRACTION_FAILED"},
    )

def extract_document_text(document_id: str, storage_url: str, mime_type: str = None, filename: str = None) -> Dict[str, Any]:
    """Extract text from uploaded files (PDF/DOCX/PPTX/image/text)."""
    try:
        # Trim any whitespace from document_id
        document_id = document_id.strip() if document_id else None

        if not document_id:
            raise ValueError('Document ID is required')

        logger.info(f"Processing document: {document_id}")
        logger.info(f"Starting text extraction for document {document_id}")

        # Update status to EXTRACTING
        supabase_request(
            "PATCH",
            f"documents?id=eq.{document_id}",
            {"processing_status": "EXTRACTING"}
        )

        # Download file from signed URL
        logger.info(f"Downloading file from signed URL")
        file_data = download_from_signed_url(storage_url)

        resolved_filename = filename
        if not resolved_filename:
            parsed_path = urlparse(storage_url).path
            resolved_filename = parsed_path.rsplit("/", 1)[-1] if parsed_path else ""

        # Extract text using format router
        extracted_text = route_extraction(file_data, mime_type=mime_type, filename=resolved_filename)
        logger.info(f"Extracted {len(extracted_text)} characters")

        # Update document with extracted text
        try:
            supabase_request(
                "PATCH",
                f"documents?id=eq.{document_id}",
                {
                    "extracted_text": extracted_text,
                    "processing_status": "EXTRACTED",
                    "error_message": None,
                }
            )
        except Exception:
            supabase_request(
                "PATCH",
                f"documents?id=eq.{document_id}",
                {
                    "extracted_text": extracted_text,
                    "processing_status": "EXTRACTED"
                }
            )


        return {
            "success": True,
            "textLength": len(extracted_text),
            "message": "Text extraction completed"
        }

    except Exception as e:
        logger.error(f"Text extraction failed for {document_id}: {str(e)}", exc_info=True)

        # Update status to failed
        try:
            _update_extraction_failed(document_id, str(e))
        except Exception:
            pass

        return {
            "success": False,
            "error": str(e)
        }

def generate_document_embeddings(document_id: str) -> Dict[str, Any]:
    """Generate embeddings for document chunks"""
    try:
        # Trim any whitespace from document_id
        document_id = document_id.strip() if document_id else None

        if not document_id:
            raise ValueError('Document ID is required')

        logger.info(f"Processing document: {document_id}")
        logger.info(f"Starting embedding generation for document {document_id}")

        # Update status
        supabase_request(
            "PATCH",
            f"documents?id=eq.{document_id}",
            {"processing_status": "EMBEDDING"}
        )

        # Get document text
        doc = supabase_request(
            "GET",
            f"documents?id=eq.{document_id}&select=extracted_text"
        )

        if not doc or not doc[0].get("extracted_text"):
            raise Exception("No extracted text found")

        text = doc[0]["extracted_text"]

        # Generate embeddings and store
        num_chunks = generate_embeddings(document_id, text)
        logger.info(f"Generated embeddings for {num_chunks} chunks")

        # Update status to READY
        supabase_request(
            "PATCH",
            f"documents?id=eq.{document_id}",
            {"processing_status": "READY"}
        )

        return {
            "success": True,
            "numChunks": num_chunks,
            "message": "Embeddings generated successfully"
        }

    except Exception as e:
        logger.error(f"Embedding generation failed for {document_id}: {str(e)}", exc_info=True)

        try:
            supabase_request(
                "PATCH",
                f"documents?id=eq.{document_id}",
                {"processing_status": "EMBEDDING_FAILED"}
            )
        except:
            pass

        return {
            "success": False,
            "error": str(e)
        }