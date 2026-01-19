# fastapi_proxy.py
"""
FastAPI proxy to add CORS support for the Pathway RAG API.
This allows frontend applications to query the RAG system.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import csv

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


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "reputation-monitoring-proxy"}



# Paths
THREATS_CSV = "output/validated_threats.csv"

@app.get("/threats")
async def get_threats():
    """
    Get all validated threats from CSV
    """
    try:
        threats = []
        
        if not os.path.exists(THREATS_CSV):
            return {"threats": []}
        
        with open(THREATS_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                threats.append(row)
        
        return {"threats": threats}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading threats: {str(e)}"
        )

@app.get("/fake-industries")
async def get_fake_industries():
    """
    Get latest 5 fake industry threats
    """
    try:
        threats = []
        if os.path.exists(THREATS_CSV):
            with open(THREATS_CSV, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                threats = [row for row in reader]
        
        # Filter for 'fake' category and sort by timestamp descending
        fake_threats = [t for t in threats if t.get('category') == 'fake']
        fake_threats.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return {"fake_industries": fake_threats[:5]}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading fake industries: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8083, log_level="info")
