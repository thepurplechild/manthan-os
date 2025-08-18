# apps/api/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# (Optional) Small sys deps you may need later for exports
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libmagic1 \
 && rm -rf /var/lib/apt/lists/*

# Copy requirements FIRST for better layer caching
COPY apps/api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend source
COPY apps/api /app

EXPOSE 8080
ENV PORT=8080

# Cloud Run expects the container to listen on $PORT
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]


