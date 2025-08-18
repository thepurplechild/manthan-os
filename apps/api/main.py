import os, io, json, base64, textwrap
from typing import Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
from google.cloud import storage
from google.cloud import firestore
from reportlab.pdfgen import canvas
from docx import Document

# Load .env only if present (nice for local dev; harmless on Cloud Run)
try:
    load_dotenv()
except Exception:
    pass

# --- Core Config ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-5")  # keep your default
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "project-manthan-468609")
BUCKET_NAME = os.getenv("GCS_BUCKET", "manthan-assets")
NAMESPACE = os.getenv("FIRESTORE_NAMESPACE", "prod")
ENABLE_IMAGE_GEN = os.getenv("ENABLE_IMAGE_GEN", "false").lower() == "true"

# Allow single origin, comma-separated list, or wildcard "*"
_raw_allowed = os.getenv("ALLOWED_ORIGIN", "http://localhost:3000").strip()
if "," in _raw_allowed:
    ALLOWED_ORIGINS = [o.strip() for o in _raw_allowed.split(",") if o.strip()]
else:
    ALLOWED_ORIGINS = ["*"] if _raw_allowed == "*" else [_raw_allowed]

# --- App ---
app = FastAPI(title="Manthan Creator Suite API", version="0.2.1")

# FastAPI CORS behavior: if using wildcard, must NOT set allow_credentials=True
_allow_credentials = not (len(ALLOWED_ORIGINS) == 1 and ALLOWED_ORIGINS[0] == "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Clients (lazy) ---
def _openai_headers():
    if not OPENAI_API_KEY:
        # Raise immediately so callers return 500/502 with a clear message
        raise RuntimeError("OPENAI_API_KEY missing")
    return {"Authorization": f"Bearer {OPENAI_API_KEY}"}

def _firestore():
    return firestore.Client(project=PROJECT_ID)

def _storage():
    return storage.Client(project=PROJECT_ID)

# --- Schemas ---
class IdeaReq(BaseModel):
    genre: str
    tone: str
    seed: str
    language: str = "en"

class OutlineReq(BaseModel):
    logline: str
    structure: str = "film"
    style: str = "Bollywood high-concept thriller"
    language: str = "en"

class ScriptReq(BaseModel):
    outline: str
    style: str
    language: str = "en"

class DeckReq(BaseModel):
    title: str
    logline: str
    synopsis: str
    characters: str
    world: str
    comps: str
    toneboard: Optional[str] = None
    language: str = "en"

class ExportReq(BaseModel):
    deck_json: Dict[str, Any]
    format: str  # pdf | docx

# --- Helpers ---
async def call_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Robust wrapper around OpenAI Chat Completions.
    - Times out cleanly
    - Returns 502 on upstream issues (FastAPI will serialize HTTPException)
    """
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(url, headers=_openai_headers(), json=payload)
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            if not isinstance(content, str):
                content = json.dumps(content, ensure_ascii=False)
            return content
    except httpx.HTTPStatusError as e:
        # Surface upstream model errors with some context
        raise HTTPException(status_code=502, detail=f"LLM upstream error: {e.response.text[:500]}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM request failed: {str(e)[:500]}")

def save_pdf_from_text(title: str, text: str) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.setTitle(title)
    y = 800
    for line in text.splitlines():
        if y < 50:
            c.showPage()
            y = 800
        # ensure we don't overflow the page width
        c.drawString(40, y, line[:120])
        y -= 18
    c.showPage()
    c.save()
    return buf.getvalue()

def save_docx_from_text(title: str, text: str) -> bytes:
    doc = Document()
    doc.add_heading(title, 0)
    for line in text.splitlines():
        doc.add_paragraph(line)
    bio = io.BytesIO()
    doc.save(bio)
    return bio.getvalue()

def _safe_path_segment(seg: str) -> str:
    # cheap sanitization for filenames/paths stored in GCS
    bad = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for b in bad:
        seg = seg.replace(b, "_")
    return seg.strip() or "untitled"

def upload_bytes(path: str, data: bytes, content_type: str) -> str:
    client = _storage()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(path)
    blob.upload_from_string(data, content_type=content_type)
    # public by default for quick downloads; switch to signed URLs later if needed
    blob.make_public()
    return blob.public_url

# --- Routes ---
@app.get("/")
def root():
    return {"status": "up", "service": "manthan-backend", "version": "0.2.1"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "0.2.1",
        "project": PROJECT_ID,
        "bucket": BUCKET_NAME,
        "namespace": NAMESPACE,
    }

@app.get("/runtime-env")
def runtime_env():
    """Return only the safe Firebase env vars to the frontend."""
    return {
        "FIREBASE_API_KEY": os.getenv("NEXT_PUBLIC_FIREBASE_API_KEY", ""),
        "FIREBASE_AUTH_DOMAIN": os.getenv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", ""),
        "FIREBASE_PROJECT_ID": os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", ""),
        "FIREBASE_APP_ID": os.getenv("NEXT_PUBLIC_FIREBASE_APP_ID", ""),
        "FIREBASE_STORAGE_BUCKET": os.getenv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", ""),
        "FIREBASE_MESSAGING_SENDER_ID": os.getenv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", ""),
    }

@app.post("/gen/idea")
async def gen_idea(req: IdeaReq):
    sys = "You are a multilingual film/series ideation assistant for Indian markets. Return 5 sharp loglines and a 1-paragraph premise."
    user = f"Language: {req.language}\nGenre: {req.genre}\nTone: {req.tone}\nSeed: {req.seed}"
    content = await call_llm(sys, user)
    return {"content": content}

@app.post("/gen/outline")
async def gen_outline(req: OutlineReq):
    sys = "You are a professional story editor. Produce a beat-sheet with acts/episodes, character bios, and world notes. Keep it concise and production-ready."
    user = f"Structure: {req.structure}\nStyle: {req.style}\nLanguage: {req.language}\nLogline: {req.logline}"
    content = await call_llm(sys, user)
    return {"content": content}

@app.post("/gen/script")
async def gen_script(req: ScriptReq):
    sys = "You are a screenwriter. Expand the outline into screenplay pages in Fountain-like format. Keep dialogue punchy; format with scene headers."
    user = f"Style: {req.style}\nLanguage: {req.language}\nOutline:\n{req.outline}"
    content = await call_llm(sys, user)
    return {"content": content}

@app.post("/gen/deck")
async def gen_deck(req: DeckReq):
    sys = "You are a pitch-deck producer for film/series. Create structured JSON with slides: Title, Logline, Synopsis, Characters, World, Toneboard, Comparables, CTA."
    user = json.dumps(req.model_dump(), ensure_ascii=False)
    content = await call_llm(sys, user)
    try:
        deck = json.loads(content)
    except Exception:
        deck = {"raw": content}
    return {"deck": deck}

@app.post("/ingest/upload")
async def ingest_upload(file: UploadFile = File(...), language: str = Form("en")):
    # Best effort text extraction for plaintext uploads.
    # (If you later accept PDFs/DOCX here, add proper parsing.)
    raw = await file.read()
    try:
        text = raw.decode(errors="ignore")
    except Exception:
        text = ""
    sys = "You are a development exec. From the uploaded script text, extract: title, logline, synopsis, characters, world, themes, and comparables."
    user = f"Language: {language}\nTEXT:\n{text[:15000]}"
    content = await call_llm(sys, user)
    return {"extracted": content}

@app.post("/export")
async def export(req: ExportReq):
    deck = req.deck_json
    title = deck.get("title") or (deck.get("raw", "Pitch Deck")[:40])
    safe_title = _safe_path_segment(title)

    text = json.dumps(deck, ensure_ascii=False, indent=2) if "raw" not in deck else str(deck["raw"])

    if req.format == "pdf":
        data = save_pdf_from_text(safe_title, text)
        url = upload_bytes(f"exports/{safe_title}.pdf", data, "application/pdf")
        return {"url": url}
    elif req.format == "docx":
        data = save_docx_from_text(safe_title, text)
        url = upload_bytes(
            f"exports/{safe_title}.docx", data,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        return {"url": url}
    else:
        raise HTTPException(status_code=400, detail="unsupported format")

@app.post("/images/concepts")
async def concepts(prompt: str = Form(...)):
    if not ENABLE_IMAGE_GEN:
        return {"enabled": False}
    # stub: you can later wire this to an image model or stored concepts
    return {"enabled": True, "images": [f"https://storage.googleapis.com/{BUCKET_NAME}/concepts/sample1.png"]}


