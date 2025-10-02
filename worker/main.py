import os
import sys
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

from supabase import create_client, Client
from processors.pdf_extractor import extract_text_from_pdf
from processors.embeddings import generate_embeddings

# Initialize Supabase client with service role
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

def extract_document_text(document_id: str, storage_path: str) -> Dict[str, Any]:
    """
    Extract text from uploaded PDF.

    Args:
        document_id: Document UUID
        storage_path: Path in Supabase Storage

    Returns:
        Result dictionary with success status and metadata
    """
    try:
        logger.info(f"Starting text extraction for document {document_id}")

        # Update status to EXTRACTING
        supabase.table("documents").update({
            "processing_status": "EXTRACTING"
        }).eq("id", document_id).execute()

        # Download file from Supabase Storage
        logger.info(f"Downloading file from {storage_path}")
        file_data = supabase.storage.from_("creator-assets").download(storage_path)

        # Extract text
        extracted_text = extract_text_from_pdf(file_data)

        logger.info(f"Extracted {len(extracted_text)} characters")

        # Update document with extracted text
        supabase.table("documents").update({
            "extracted_text": extracted_text,
            "processing_status": "EXTRACTED"
        }).eq("id", document_id).execute()

        return {
            "success": True,
            "textLength": len(extracted_text),
            "message": "Text extraction completed"
        }

    except Exception as e:
        logger.error(f"Text extraction failed for {document_id}: {str(e)}", exc_info=True)

        # Update status to failed
        supabase.table("documents").update({
            "processing_status": "EXTRACTION_FAILED"
        }).eq("id", document_id).execute()

        return {
            "success": False,
            "error": str(e)
        }

def generate_document_embeddings(document_id: str) -> Dict[str, Any]:
    """
    Generate embeddings for document chunks.

    Args:
        document_id: Document UUID

    Returns:
        Result dictionary with success status and metadata
    """
    try:
        logger.info(f"Starting embedding generation for document {document_id}")

        # Update status
        supabase.table("documents").update({
            "processing_status": "EMBEDDING"
        }).eq("id", document_id).execute()

        # Get document text
        doc = supabase.table("documents").select("extracted_text").eq("id", document_id).single().execute()

        if not doc.data or not doc.data.get("extracted_text"):
            raise Exception("No extracted text found")

        text = doc.data["extracted_text"]

        # Generate embeddings and store
        num_chunks = generate_embeddings(document_id, text, supabase)

        logger.info(f"Generated embeddings for {num_chunks} chunks")

        # Update status to READY
        supabase.table("documents").update({
            "processing_status": "READY"
        }).eq("id", document_id).execute()

        return {
            "success": True,
            "numChunks": num_chunks,
            "message": "Embeddings generated successfully"
        }

    except Exception as e:
        logger.error(f"Embedding generation failed for {document_id}: {str(e)}", exc_info=True)

        supabase.table("documents").update({
            "processing_status": "EMBEDDING_FAILED"
        }).eq("id", document_id).execute()

        return {
            "success": False,
            "error": str(e)
        }