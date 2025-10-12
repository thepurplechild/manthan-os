import sys
import os

print("=" * 60)
print("MANTHAN WORKER STARTUP DIAGNOSTICS")
print("=" * 60)

# Check environment variables first
print("\n1. CHECKING ENVIRONMENT VARIABLES:")
required_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VOYAGE_API_KEY", "WORKER_SECRET", "PORT"]
for var in required_vars:
    value = os.getenv(var)
    if value:
        # Mask secrets but show they exist
        if "KEY" in var or "SECRET" in var:
            print(f"   ✓ {var}: ***{value[-4:]} (length: {len(value)})")
        else:
            print(f"   ✓ {var}: {value}")
    else:
        print(f"   ✗ {var}: MISSING!")

# Test imports one by one
print("\n2. TESTING IMPORTS:")
try:
    print("   Importing flask...")
    from flask import Flask, request, jsonify
    print("   ✓ Flask imported")
except Exception as e:
    print(f"   ✗ Flask import failed: {e}")
    sys.exit(1)

try:
    print("   Importing logging...")
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    print("   ✓ Logging configured")
except Exception as e:
    print(f"   ✗ Logging failed: {e}")
    sys.exit(1)

try:
    print("   Importing main module...")
    from main import extract_document_text, generate_document_embeddings
    print("   ✓ Main module imported")
except Exception as e:
    print(f"   ✗ Main module import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n3. INITIALIZING FLASK APP:")
app = Flask(__name__)
print("   ✓ Flask app created")

# Security check
WORKER_SECRET = os.getenv("WORKER_SECRET")
if not WORKER_SECRET:
    print("   ✗ WORKER_SECRET not set!")
    sys.exit(1)
print(f"   ✓ Worker secret configured")

def verify_auth():
    """Verify Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return False
    token = auth_header.split("Bearer ")[1]
    return token == WORKER_SECRET

@app.route("/health", methods=["GET"])
def health():
    """Health check."""
    return jsonify({"status": "ok"})

@app.route("/extract", methods=["POST"])
def extract():
    """Extract text from document."""
    if not verify_auth():
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.json
        document_id = data.get("documentId")
        storage_url = data.get("storageUrl")

        if not document_id or not storage_url:
            return jsonify({"error": "Missing documentId or storageUrl"}), 400

        logger.info(f"Extraction request for document {document_id}")
        result = extract_document_text(document_id, storage_url)

        status_code = 200 if result.get("success") else 500
        return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Extract endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/embed", methods=["POST"])
def embed():
    """Generate embeddings."""
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
    print(f"\n4. STARTING SERVER ON PORT {port}")
    print("=" * 60)
    logger.info(f"Manthan Worker starting on port {port}")
    app.run(host="0.0.0.0", port=port)