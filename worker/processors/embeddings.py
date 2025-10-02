import os
import voyageai
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Initialize Voyage AI client
vo = voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks with metadata.

    Args:
        text: Full document text
        chunk_size: Maximum characters per chunk
        overlap: Character overlap between chunks

    Returns:
        List of chunk dictionaries with text and metadata
    """
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

def generate_embeddings(document_id: str, text: str, supabase) -> int:
    """
    Generate embeddings using Voyage AI and store in database.

    Args:
        document_id: Document UUID
        text: Full extracted text
        supabase: Supabase client instance

    Returns:
        Number of chunks embedded

    Raises:
        Exception: If embedding generation fails
    """
    try:
        # Chunk the text
        chunks = chunk_text(text)

        # Generate embeddings in batches (Voyage supports up to 128 docs/request)
        batch_size = 128
        total_embedded = 0

        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i:i + batch_size]
            batch_texts = [chunk['text'] for chunk in batch_chunks]

            logger.info(f"Generating embeddings for batch {i//batch_size + 1} ({len(batch_texts)} chunks)")

            # Call Voyage AI API
            result = vo.embed(
                batch_texts,
                model="voyage-3-lite",  # 512 dimensions
                input_type="document"
            )

            embeddings = result.embeddings

            # Prepare records for database insertion
            records = []
            for chunk, embedding in zip(batch_chunks, embeddings):
                records.append({
                    "document_id": document_id,
                    "content": chunk['text'],
                    "embedding": embedding,
                    "metadata": chunk['metadata']
                })

            # Batch insert into document_sections
            response = supabase.table("document_sections").insert(records).execute()

            if not response.data:
                raise Exception("Database insert failed")

            total_embedded += len(batch_texts)
            logger.info(f"Stored {total_embedded}/{len(chunks)} embeddings")

        return len(chunks)

    except Exception as e:
        logger.error(f"Embedding generation error: {str(e)}")
        raise Exception(f"Failed to generate embeddings: {str(e)}")