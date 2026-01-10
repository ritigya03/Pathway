#!/bin/bash

# Docker Run Script for Compliance Analyzer
# This ensures proper output streaming and interactive mode

echo "=================================================="
echo "   RAG Compliance Analyzer - Docker Runner"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create .env with your API keys"
    exit 1
fi

# Check if credentials.json exists
if [ ! -f credentials.json ]; then
    echo "❌ Error: credentials.json not found!"
    echo "   Please add your Google Service Account credentials"
    exit 1
fi

# Create chroma_data directory if it doesn't exist
mkdir -p chroma_data

echo ""
echo "🔧 Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting compliance analyzer..."
echo "   Press Ctrl+C to stop"
echo ""

# Run with proper TTY and unbuffered output
docker-compose run --rm compliance-analyzer

echo ""
echo "✅ Analysis complete!"