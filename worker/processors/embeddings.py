import os
import voyageai
import requests
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_voyage_client():
    """Get Voyage AI client"""
    return voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
    """Split text into overlapping chunks"""
    chunks = []
    start = 0
    text_len = len(text)
    chunk_index = 0

    while start < text_len:
        end = start + chunk_size
        chunk_text = text[start:end]

        chunks.append({
            'text': chunk_text,
            'metadata': {
                'chunk_index': chunk_index,
                'chunk_length': len(chunk_text),
                'start_position': start,
                'end_position': end
            }
        })

        start = end - overlap
        chunk_index += 1

    logger.info(f"Created {len(chunks)} chunks from text")
    return chunks

def insert_embeddings(records: List[Dict]) -> None:
    """Insert embeddings into Supabase using REST API"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    url = f"{SUPABASE_URL}/rest/v1/document_sections"
    response = requests.post(url, headers=headers, json=records)
    response.raise_for_status()

def generate_embeddings(document_id: str, text: str) -> int:
    """Generate embeddings using Voyage AI and store in database"""
    try:
        # Chunk the text
        chunks = chunk_text(text)

        # Get Voyage client
        vo = get_voyage_client()

        # Generate embeddings in batches
        batch_size = 128
        total_embedded = 0

        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i:i + batch_size]
            batch_texts = [chunk['text'] for chunk in batch_chunks]

            logger.info(f"Generating embeddings for batch {i//batch_size + 1}")

            # Call Voyage AI API
            result = vo.embed(
                batch_texts,
                model="voyage-3-lite",
                input_type="document"
            )

            embeddings = result.embeddings

            # Prepare records for insertion
            records = []
            for chunk, embedding in zip(batch_chunks, embeddings):
                records.append({
                    "document_id": document_id,
                    "content": chunk['text'],
                    "embedding": embedding,
                    "metadata": chunk['metadata']
                })

            # Insert using REST API
            insert_embeddings(records)

            total_embedded += len(batch_texts)
            logger.info(f"Stored {total_embedded}/{len(chunks)} embeddings")

        return len(chunks)

    except Exception as e:
        logger.error(f"Embedding generation error: {str(e)}")
        raise