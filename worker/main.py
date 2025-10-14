import os
import sys
import logging
import requests
from typing import Dict, Any

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


from processors.pdf_extractor import extract_text_from_pdf
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

def extract_document_text(document_id: str, storage_url: str) -> Dict[str, Any]:
    """Extract text from uploaded PDF"""
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

        # Extract text
        extracted_text = extract_text_from_pdf(file_data)
        logger.info(f"Extracted {len(extracted_text)} characters")

        # Update document with extracted text
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
            supabase_request(
                "PATCH",
                f"documents?id=eq.{document_id}",
                {"processing_status": "EXTRACTION_FAILED"}
            )
        except:
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