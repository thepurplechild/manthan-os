from io import BytesIO
from typing import List

from docx import Document


def _clean_lines(lines: List[str]) -> str:
    cleaned = []
    for line in lines:
        value = (line or "").strip()
        if value:
            cleaned.append(value)
    return "\n\n".join(cleaned)


def extract(file_bytes: bytes) -> str:
    """
    Extract text from DOCX bytes.
    Includes paragraph text, headings, and table cells.
    """
    try:
        doc = Document(BytesIO(file_bytes))
        chunks: List[str] = []

        # Paragraphs (with markdown-style heading hierarchy)
        for paragraph in doc.paragraphs:
            text = (paragraph.text or "").strip()
            if not text:
                continue

            style_name = (paragraph.style.name or "").lower() if paragraph.style else ""
            if style_name.startswith("heading"):
                parts = style_name.split()
                level = 1
                if len(parts) > 1 and parts[1].isdigit():
                    level = max(1, min(int(parts[1]), 6))
                chunks.append(f"{'#' * level} {text}")
            else:
                chunks.append(text)

        # Tables
        for table_index, table in enumerate(doc.tables, start=1):
            table_rows: List[str] = []
            for row in table.rows:
                cells = []
                for cell in row.cells:
                    value = " ".join((cell.text or "").split())
                    if value:
                        cells.append(value)
                if cells:
                    table_rows.append(" | ".join(cells))

            if table_rows:
                chunks.append(f"## Table {table_index}")
                chunks.extend(table_rows)

        result = _clean_lines(chunks)
        if not result:
            raise ValueError("No readable text found in DOCX")

        return result
    except Exception as exc:
        raise Exception(f"DOCX extraction failed: {exc}") from exc
