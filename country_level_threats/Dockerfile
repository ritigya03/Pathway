FROM pathwaycom/pathway:latest

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libreoffice \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Copy requirements file
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Additional packages for FastAPI proxy
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    pydantic

# Copy all application files
COPY . .

# Run the combined app
CMD ["python", "main.py"]