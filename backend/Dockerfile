FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LIBREOFFICE_BIN=/usr/bin/soffice

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /root/.local /root/.local

# LibreOffice is needed for DOCX -> PDF conversion (soffice --headless)
# This is optional - remove if PDF conversion is not needed
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libreoffice \
       libreoffice-writer \
       fonts-dejavu-core \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Ensure .local/bin is in PATH
ENV PATH=/root/.local/bin:$PATH

# Copy only application code (exclude tests, .env, etc.)
COPY server.py .
COPY config.py .
COPY db.py .
COPY auth/ auth/
COPY models/ models/
COPY routers/ routers/
COPY reporting/ reporting/
COPY templates/ templates/

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]