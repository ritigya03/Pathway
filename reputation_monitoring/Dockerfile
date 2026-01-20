FROM pathwaycom/pathway:latest

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Copy requirements first
COPY requirements.txt .

# Install Python dependencies
# (pathway is already in the base image, but keeping requirements.txt install for other libs)
RUN pip install --no-cache-dir -r requirements.txt

# Copy mock news file
COPY mock_reputational_news.jsonl /mock_reputational_news.jsonl

# Copy application files
COPY . .

# Create output directory
RUN mkdir -p output data

# Expose ports
EXPOSE 8002 8083

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["python", "main.py"]
