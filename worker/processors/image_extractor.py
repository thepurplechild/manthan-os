import anthropic
import base64
import os


def extract(file_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    try:
        client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
        if not os.environ.get("ANTHROPIC_API_KEY"):
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        image_data = base64.standard_b64encode(file_bytes).decode("utf-8")
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": """You are analyzing a reference image uploaded by a 
writer developing a story. Extract and describe:
1) Any visible text, titles, or written content
2) The visual mood, tone, and atmosphere
3) Key visual themes, symbols, or motifs
4) Color palette and its emotional quality
5) Any narrative elements visible

Format as structured text a writer can use as 
story reference material.""",
                        },
                    ],
                }
            ],
        )
        if not message.content or not hasattr(message.content[0], "text"):
            raise ValueError("Claude returned empty image analysis")
        return message.content[0].text
    except Exception as exc:
        raise Exception(f"Image extraction failed: {exc}") from exc
