from io import BytesIO
from typing import List

from pptx import Presentation


def _shape_text(shape) -> str:
    if not getattr(shape, "has_text_frame", False):
        return ""
    text = shape.text or ""
    return " ".join(text.split()).strip()


def extract(file_bytes: bytes) -> str:
    """
    Extract text from PPTX bytes with slide-wise formatting.
    """
    try:
        prs = Presentation(BytesIO(file_bytes))
        slides_output: List[str] = []

        for idx, slide in enumerate(prs.slides, start=1):
            title = ""
            if slide.shapes.title is not None:
                title = " ".join((slide.shapes.title.text or "").split()).strip()

            lines: List[str] = []
            for shape in slide.shapes:
                value = _shape_text(shape)
                if value:
                    lines.append(value)

            # Remove duplicate title in body lines when present
            if title:
                lines = [line for line in lines if line != title]

            section_parts: List[str] = [f"Slide {idx}:"]
            if title:
                section_parts.append(f"Title: {title}")
            if lines:
                section_parts.append("\n".join(lines))

            slides_output.append("\n".join(section_parts).strip())

        result = "\n\n".join([s for s in slides_output if s.strip()])
        if not result:
            raise ValueError("No readable text found in PPTX")

        return result
    except Exception as exc:
        raise Exception(f"PPTX extraction failed: {exc}") from exc
