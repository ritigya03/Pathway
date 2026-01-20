from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from pathlib import Path
import shutil
import threading
import os
import csv
import requests

app = FastAPI(title="Supply Chain Threat Proxy")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
THREATS_CSV = "output/validated_threats.csv"
SUPPLY_CHAIN_CSV = "data/supply_chain_stream.csv"
DATA_DIR = Path("data")
CREDENTIALS_FILE = "credentials.json"

# Global state for initialization (mimicking compliance engine)
config_status = {
    "initialized": False,
    "indexing_progress": 0,
    "message": "Waiting for configuration"
}
pathway_thread = None

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 500
    temperature: Optional[float] = 0.1

def run_pathway_server():
    """Background task to initialize and run Pathway"""
    global config_status
    try:
        config_status["message"] = "Initializing Pathway..."
        config_status["indexing_progress"] = 20
        
        # Import here to avoid early initialization before credentials exist
        import pathway as pw
        from alert_pipeline import validated_threats
        from threat_rag import rag_app
        
        config_status["indexing_progress"] = 50
        config_status["message"] = "Starting computation engine..."
        
        # Mark as initialized so frontend knows setup is done
        config_status["initialized"] = True
        config_status["indexing_progress"] = 100
        config_status["message"] = "All systems active"
        
        print("🚀 Pathway pipeline starting...")
        pw.run()
    except Exception as e:
        config_status["message"] = f"Error: {str(e)}"
        config_status["initialized"] = False
        print(f"❌ Pathway Init Error: {e}")

@app.post("/api/config/google-drive")
async def configure_google_drive(
    credentials: UploadFile = File(...),
    threat_folder_id: str = Form(...)
):
    """Configure Google Drive credentials and start Pathway"""
    global pathway_thread
    try:
        # Save credentials locally
        with open(CREDENTIALS_FILE, "wb") as f:
            shutil.copyfileobj(credentials.file, f)
        
        # Set environment variables for the pipeline
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(Path(CREDENTIALS_FILE).absolute())
        os.environ["THREAT_POLICIES_FOLDER_ID"] = threat_folder_id
        
        # Start Pathway in a background thread if not already running
        if pathway_thread is None:
            pathway_thread = threading.Thread(target=run_pathway_server, daemon=True)
            pathway_thread.start()
        
        return {"success": True, "message": "Credentials saved and system initializing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/status")
async def get_config_status():
    """Get initialization status for the frontend"""
    return config_status

@app.post("/api/config/supplier-data")
async def upload_supplier_data(
    file: UploadFile = File(...)
):
    """Upload master supply chain CSV to the simulator directory"""
    try:
        # Save to simulate_data_stream directory (shared volume)
        dest_path = Path("/app/simulate_data_stream/master_supply_chain.csv")
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        return {"success": True, "message": f"Supplier data saved to {dest_path}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/proxy-answer")
async def proxy_answer(request: PromptRequest):
    """Proxy requests to Pathway RAG service"""
    try:
        pathway_url = "http://localhost:8082/v2/answer"
        payload = {
            "prompt": request.prompt,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature
        }
        
        # Connection timeout 10s, read timeout 60s
        response = requests.post(
            pathway_url,
            json=payload,
            timeout=(10, 60)
        )
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Pathway RAG service is not available. Ensure it's initialized."
        )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Pathway service timed out. The RAG engine might be busy."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Pathway service: {str(e)}"
        )

@app.get("/threats")
async def get_threats():
    """Get all validated threats with deduplication"""
    try:
        threats = []
        seen_headlines = set()
        
        if not Path(THREATS_CSV).exists():
            return {"threats": []}
        
        with open(THREATS_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                headline = row.get("headline", "").strip()
                if headline and headline not in seen_headlines:
                    threats.append({
                        "supplier": row.get("supplier", ""),
                        "country": row.get("country", ""),
                        "threat_type": row.get("threat_type", ""),
                        "headline": headline,
                        "description": row.get("description", ""),
                        "source": row.get("source", "")
                    })
                    seen_headlines.add(headline)
        
        return {"threats": threats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/countries")
async def get_countries():
    """Get unique countries from the stream"""
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "initialized": config_status["initialized"],
        "threats_available": Path(THREATS_CSV).exists()
    }

@app.get("/")
async def root():
    return {
        "message": "Supply Chain Threat Proxy Service",
        "status": config_status
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081, reload=False)
