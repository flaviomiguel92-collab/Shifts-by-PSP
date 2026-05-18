FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /root/.local /root/.local

# Ensure .local/bin is in PATH
ENV PATH=/root/.local/bin:$PATH

# Copy the whole backend (a .dockerignore excludes tests/.env/caches).
# Selective COPY previously broke deploys whenever a new module dir was
# added (templates, then security/) — copying all + ignore is robust.
COPY . .

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]