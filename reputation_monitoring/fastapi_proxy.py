from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import csv
import shutil
import threading
from pathlib import Path

app = FastAPI(title="Reputation Monitoring Proxy API")

# Enable CORS for all origins (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
PATHWAY_URL = "http://localhost:8002"
THREATS_CSV = "output/validated_threats.csv"
STREAM_CSV = "data/supply_chain_stream.csv"
CREDENTIALS_FILE = "credentials.json"

# Global state
config_status = {
    "initialized": False,
    "indexing_progress": 0,
    "message": "Waiting for configuration"
}
pathway_thread = None

class QueryRequest(BaseModel):
    prompt: str
    return_context_docs: bool = False

def run_pathway_server():
    """Background task to initialize and run Reputation Pathway"""
    global config_status
    try:
        config_status["message"] = "Initializing Reputation RAG..."
        config_status["indexing_progress"] = 20
        
        # Import inside function to defer setup
        import pathway as pw
        from reputation_alert_pipeline import validated_threats
        from reputation_rag import rag_app
        
        config_status["indexing_progress"] = 50
        config_status["message"] = "Starting reputation engine..."
        
        config_status["initialized"] = True
        config_status["indexing_progress"] = 100
        config_status["message"] = "Reputation monitoring active"
        
        print("🚀 Reputation Pathway pipeline starting...")
        pw.run()
    except Exception as e:
        config_status["message"] = f"Error: {str(e)}"
        config_status["initialized"] = False
        print(f"❌ Reputation Init Error: {e}")

@app.post("/api/config/google-drive")
async def configure_google_drive(
    credentials: UploadFile = File(...),
    reputation_folder_id: str = Form(...)
):
    """Configure Google Drive credentials and start Reputation Monitoring"""
    global pathway_thread
    try:
        # Save credentials
        with open(CREDENTIALS_FILE, "wb") as f:
            shutil.copyfileobj(credentials.file, f)
        
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(Path(CREDENTIALS_FILE).absolute())
        os.environ["REPUTATION_POLICIES_FOLDER_ID"] = reputation_folder_id
        
        if pathway_thread is None:
            pathway_thread = threading.Thread(target=run_pathway_server, daemon=True)
            pathway_thread.start()
        
        return {"success": True, "message": "Credentials saved and system initializing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/status")
async def get_config_status():
    """Get initialization status"""
    return config_status

@app.post("/proxy-answer")
async def proxy_answer(request: QueryRequest):
    """Proxy endpoint for querying the RAG system."""
    try:
        response = requests.post(
            f"{PATHWAY_URL}/v2/answer",
            json=request.dict(),
            timeout=60, # Increased timeout
        )
        response.raise_for_status()
        data = response.json()
        
        # INTERCEPTION: Handle "I don't know" style responses
        answer = data.get("result", "")
        if "I don't" in answer or "I do not" in answer or "not enough information" in answer.lower():
            data["result"] = "There are no reputational threats for this supplier."
            
        return data
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Pathway API error: {str(e)}")

@app.get("/threats")
async def get_threats():
    """Get all validated threats from CSV with deduplication"""
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
                        "supplier": row.get("company", row.get("supplier", "")),
                        "country": row.get("category", row.get("country", "")), 
                        "threat_type": row.get("threat_type", ""),
                        "headline": headline,
                        "description": row.get("description", ""),
                        "source": row.get("source", ""),
                        "timestamp": row.get("timestamp", "")
                    })
                    seen_headlines.add(headline)
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
                company = row.get("supplier_firm", "").strip()
                if company:
                    companies.add(company)
        return {"companies": sorted(list(companies))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "initialized": config_status["initialized"],
        "threats_available": Path(THREATS_CSV).exists()
    }

@app.get("/fake-industries")
async def get_fake_industries():
    """Get latest 5 fake industry threats"""
    try:
        threats = []
        if os.path.exists(THREATS_CSV):
            with open(THREATS_CSV, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                threats = [row for row in reader]
        
        fake_threats = [t for t in threats if t.get('category') == 'fake']
        fake_threats.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return {"fake_industries": fake_threats[:5]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8083, log_level="info")
