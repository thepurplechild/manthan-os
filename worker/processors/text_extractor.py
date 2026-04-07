def extract(file_bytes: bytes) -> str:
    """
    Extract text from plain text / markdown bytes.
    Tries UTF-8 first, then latin-1 fallback.
    """
    try:
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1")

        # Minimal cleaning: normalize newlines and trim edge whitespace
        text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not text:
            raise ValueError("File is empty after decoding")

        return text
    except Exception as exc:
        raise Exception(f"Text extraction failed: {exc}") from exc
