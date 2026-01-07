FROM pathwaycom/pathway:latest

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libreoffice \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Copy requirements file if you have one
COPY requirements.txt* ./

# Install Python dependencies (if requirements.txt exists)
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# Copy all application files
COPY . .

# Run the news app 
CMD ["python", "alert_pipeline.py"]