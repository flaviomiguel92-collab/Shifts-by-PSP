FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LIBREOFFICE_BIN=/usr/bin/soffice

WORKDIR /app

# LibreOffice é necessário para conversão DOCX -> PDF (soffice --headless)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libreoffice \
       libreoffice-writer \
       fonts-dejavu-core \
       xvfb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verifica se LibreOffice foi instalado
RUN which soffice || (echo "ERROR: soffice not found in PATH" && exit 1)

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
