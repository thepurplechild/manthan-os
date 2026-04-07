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

def _get_extension_from_url(storage_url: str) -> str:
    path = urlparse(storage_url).path.lower()
    if "." not in path:
        return ""
    return path.rsplit(".", 1)[-1]

def _extract_with_router(file_data: bytes, mime_type: str = None, storage_url: str = "") -> str:
    mime = (mime_type or "").lower().strip()
    ext = _get_extension_from_url(storage_url)

    logger.info(f"Extractor routing: mime_type={mime or 'unknown'}, extension={ext or 'unknown'}")

    # PDF
    if mime == "application/pdf" or ext == "pdf":
        return extract_text_from_pdf(file_data)

    # DOCX / DOC (best effort via python-docx)
    if mime in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ) or ext in ("docx", "doc"):
        return extract_docx(file_data)

    # PPTX / PPT (best effort via python-pptx)
    if mime == "application/vnd.openxmlformats-officedocument.presentationml.presentation" or ext in ("pptx", "ppt"):
        return extract_pptx(file_data)

    # Images
    if mime in ("image/jpeg", "image/png", "image/webp") or ext in ("jpg", "jpeg", "png", "webp"):
        return extract_image(file_data)

    # Plain text / markdown
    if mime in ("text/plain", "text/markdown") or ext in ("txt", "md", "markdown"):
        return extract_text(file_data)

    # Unknown -> PDF fallback
    logger.warning(
        f"Unknown mime_type/extension (mime={mime or 'n/a'}, ext={ext or 'n/a'}). Falling back to PDF extractor."
    )
    return extract_text_from_pdf(file_data)

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

def extract_document_text(document_id: str, storage_url: str, mime_type: str = None) -> Dict[str, Any]:
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

        # Extract text using format router
        extracted_text = _extract_with_router(file_data, mime_type=mime_type, storage_url=storage_url)
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