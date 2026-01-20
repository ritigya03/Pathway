# fastapi_proxy.py
"""
FastAPI proxy to add CORS support for the Pathway RAG API.
This allows frontend applications to query the RAG system.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI(title="Reputation Monitoring Proxy API")

# Enable CORS for all origins (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pathway RAG server URL
PATHWAY_URL = "http://localhost:8002"


class QueryRequest(BaseModel):
    prompt: str
    return_context_docs: bool = False


class QueryResponse(BaseModel):
    response: str
    context_docs: list = None


@app.post("/proxy-answer")
async def proxy_answer(request: QueryRequest):
    """
    Proxy endpoint for querying the RAG system.
    Forwards requests to Pathway and returns responses.
    """
    try:
        response = requests.post(
            f"{PATHWAY_URL}/v2/answer",
            json=request.dict(),
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Pathway API error: {str(e)}")


@app.post("/proxy-list-documents")
async def proxy_list_documents():
    """
    Proxy endpoint for listing indexed documents.
    """
    try:
        response = requests.post(
            f"{PATHWAY_URL}/v2/list_documents",
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Pathway API error: {str(e)}")


import os
import csv
from pathlib import Path

# Paths
THREATS_CSV = "output/validated_threats.csv"
STREAM_CSV = "data/reputation_stream.csv"

@app.get("/threats")
async def get_threats():
    """Get all validated threats from CSV"""
    try:
        threats = []
        if not Path(THREATS_CSV).exists():
            return {"threats": []}
            
        with open(THREATS_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Map reputation monitoring fields to keys expected by frontend
                threats.append({
                    "supplier": row.get("company", ""),
                    "country": row.get("category", ""), # category plays role of country/grouping
                    "threat_type": row.get("threat_type", ""),
                    "headline": row.get("headline", ""),
                    "description": row.get("description", ""),
                    "source": row.get("source", ""),
                    "timestamp": row.get("timestamp", "")
                })
        return {"threats": threats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/companies")
async def get_companies():
    """Get unique companies from reputation stream"""
    try:
        companies = set()
        if not Path(STREAM_CSV).exists():
            return {"companies": []}
            
        with open(STREAM_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                company = row.get("company", "").strip()
                if company:
                    companies.add(company)
        return {"companies": sorted(list(companies))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "reputation-monitoring-proxy",
        "threats_available": Path(THREATS_CSV).exists(),
        "stream_available": Path(STREAM_CSV).exists()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8083, log_level="info")
