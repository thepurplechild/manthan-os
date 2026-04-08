def extract(file_bytes: bytes) -> str:
    try:
        for encoding in ["utf-8", "latin-1", "cp1252"]:
            try:
                return file_bytes.decode(encoding)
            except UnicodeDecodeError:
                continue
        return file_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        raise Exception(f"Text extraction failed: {exc}") from exc
