from flask import Flask, request, jsonify
import os
import logging
from main import extract_document_text, generate_document_embeddings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Security: Verify bearer token
WORKER_SECRET = os.getenv("WORKER_SECRET")

def verify_auth():
    """Verify Authorization header contains correct bearer token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return False
    token = auth_header.split("Bearer ")[1]
    return token == WORKER_SECRET

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for Railway."""
    return jsonify({
        "status": "healthy",
        "service": "manthan-worker",
        "version": "1.0.0"
    })

@app.route("/extract", methods=["POST"])
def extract():
    """
    Extract text from uploaded document.

    Request body:
        {
            "documentId": "uuid",
            "storagePath": "path/to/file"
        }

    Returns:
        {
            "success": bool,
            "textLength": int,
            "message": str
        }
    """
    if not verify_auth():
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.json
        document_id = data.get("documentId")
        storage_path = data.get("storagePath")

        if not document_id or not storage_path:
            return jsonify({"error": "Missing documentId or storagePath"}), 400

        logger.info(f"Extraction request for document {document_id}")

        result = extract_document_text(document_id, storage_path)

        status_code = 200 if result.get("success") else 500
        return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Extract endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/embed", methods=["POST"])
def embed():
    """
    Generate embeddings for document.

    Request body:
        {
            "documentId": "uuid"
        }

    Returns:
        {
            "success": bool,
            "numChunks": int,
            "message": str
        }
    """
    if not verify_auth():
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.json
        document_id = data.get("documentId")

        if not document_id:
            return jsonify({"error": "Missing documentId"}), 400

        logger.info(f"Embedding request for document {document_id}")

        result = generate_document_embeddings(document_id)

        status_code = 200 if result.get("success") else 500
        return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Embed endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting Manthan Worker on port {port}")
    app.run(host="0.0.0.0", port=port)