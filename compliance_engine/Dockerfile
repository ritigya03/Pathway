FROM pathwaycom/pathway:latest

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libreoffice \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py ./
COPY api.py ./
COPY .env ./

# Create data directories
RUN mkdir -p /app/data/company_docs /app/data/credentials

# Expose port
EXPOSE 8001

# Set environment variable for pathway license
ENV PATHWAY_LICENSE_KEY=${PATHWAY_LICENSE_KEY}

# Run FastAPI
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]