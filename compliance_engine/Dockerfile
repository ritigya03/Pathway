FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip

# Install core dependencies first
RUN pip install --no-cache-dir \
    chromadb>=1.0.0 \
    google-generativeai>=0.3.0 \
    python-dotenv>=1.0.0 \
    google-auth>=2.17.0 \
    google-auth-oauthlib>=1.0.0 \
    google-auth-httplib2>=0.1.0 \
    google-api-python-client>=2.80.0 \
    numpy>=1.24.0 \
    requests>=2.31.0 \
    PyPDF2>=3.0.0 \
    pdfplumber>=0.10.0

# Copy requirements and install remaining
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy all application files
COPY . .

# Set environment variables for unbuffered output
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=UTF-8
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json
ENV CHROMA_DB_PATH=/app/chroma_data

# Create writable directory for ChromaDB (inside app for persistence)
RUN mkdir -p /app/chroma_data && chmod 777 /app/chroma_data

# Default command with unbuffered output
CMD ["python", "-u", "app.py"]