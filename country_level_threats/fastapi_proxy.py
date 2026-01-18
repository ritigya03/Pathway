# fastapi_proxy.py
import os
import csv
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from pathlib import Path

app = FastAPI(title="Supply Chain Threat Proxy")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
THREATS_CSV = "output/validated_threats.csv"
SUPPLY_CHAIN_CSV = "data/supply_chain_stream.csv"

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 500
    temperature: Optional[float] = 0.1

class ThreatResponse(BaseModel):
    supplier: str
    country: str
    threat_type: str
    headline: str
    description: str
    source: str

@app.post("/proxy-answer")
async def proxy_answer(request: PromptRequest):
    """
    Proxy requests to Pathway RAG service with CORS support
    """
    try:
        # CHANGED: Pathway RAG service now on port 8082
        pathway_url = "http://localhost:8082/v2/answer"
        
        # Prepare payload for Pathway
        payload = {
            "prompt": request.prompt,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature
        }
        
        # Call Pathway service
        response = requests.post(
            pathway_url,
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Pathway RAG service is not available. Ensure it's running on port 8082."
        )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Pathway service timed out. Try simplifying your query."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Pathway service: {str(e)}"
        )

@app.get("/threats")
async def get_threats():
    """
    Get all validated threats from CSV
    """
    try:
        threats = []
        
        if not Path(THREATS_CSV).exists():
            return {"threats": []}
        
        with open(THREATS_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                threats.append({
                    "supplier": row.get("supplier", ""),
                    "country": row.get("country", ""),
                    "threat_type": row.get("threat_type", ""),
                    "headline": row.get("headline", ""),
                    "description": row.get("description", ""),
                    "source": row.get("source", "")
                })
        
        return {"threats": threats}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading threats: {str(e)}"
        )

@app.get("/countries")
async def get_countries():
    """
    Get unique countries from supply chain stream
    """
    try:
        countries = set()
        
        if not Path(SUPPLY_CHAIN_CSV).exists():
            return {"countries": []}
        
        with open(SUPPLY_CHAIN_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                country = row.get("source_country", "").strip()
                if country:
                    countries.add(country)
        
        return {"countries": sorted(list(countries))}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading countries: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "proxy",
        "threats_available": Path(THREATS_CSV).exists(),
        "countries_available": Path(SUPPLY_CHAIN_CSV).exists()
    }

@app.get("/")
async def root():
    return {
        "message": "Supply Chain Threat Proxy Service",
        "endpoints": {
            "POST /proxy-answer": "Proxy to Pathway RAG",
            "GET /threats": "Get validated threats",
            "GET /countries": "Get unique supplier countries",
            "GET /health": "Service health check"
        },
        "pathway_target": "http://localhost:8082/v2/answer"  # Updated
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8081,
        reload=False
    )