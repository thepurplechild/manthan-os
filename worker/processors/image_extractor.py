import base64
import os
from io import BytesIO


PROMPT = (
    "You are analyzing a reference image uploaded by a writer developing a story. "
    "Extract and describe: 1) Any visible text, titles, or written content "
    "2) The visual mood, tone, and atmosphere "
    "3) Key visual themes, symbols, or motifs "
    "4) Color palette and its emotional quality "
    "5) Any narrative elements visible. "
    "Format as structured text a writer can use as story reference material."
)


def _detect_media_type(file_bytes: bytes) -> str:
    from PIL import Image

    with Image.open(BytesIO(file_bytes)) as img:
        fmt = (img.format or "").upper()
        if fmt == "PNG":
            return "image/png"
        if fmt == "WEBP":
            return "image/webp"
    return "image/jpeg"


def extract(file_bytes: bytes) -> str:
    """
    Extract structured narrative reference text from image bytes via Claude Vision.
    """
    try:
        from anthropic import Anthropic

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")

        media_type = _detect_media_type(file_bytes)
        b64_data = base64.b64encode(file_bytes).decode("utf-8")

        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": PROMPT},
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_data,
                            },
                        },
                    ],
                }
            ],
        )

        parts = []
        for block in response.content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text.strip())

        result = "\n\n".join([p for p in parts if p]).strip()
        if not result:
            raise ValueError("Claude returned empty image analysis")

        return result
    except Exception as exc:
        raise Exception(f"Image extraction failed: {exc}") from exc
