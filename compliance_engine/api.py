import os
import json
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import shutil
from pathlib import Path
import time
import threading

# Import your existing analyzer
from app import PathwayComplianceAnalyzer

app = FastAPI(title="Pathway Compliance API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
analyzer = None
config_status = {
    "initialized": False,
    "source_type": None,
    "message": "Not configured",
    "indexing_progress": 0
}

# Data directory for local uploads
DATA_DIR = Path("/app/data")
DATA_DIR.mkdir(exist_ok=True)
(DATA_DIR / "company_docs").mkdir(exist_ok=True)
(DATA_DIR / "credentials").mkdir(exist_ok=True)
(DATA_DIR / "analysis_results").mkdir(exist_ok=True)

# In-memory cache for supplier analysis results
# Format: { "supplier_name": { "score": 85, "risk": "low", "timestamp": "...", "violations": [...] } }
analysis_cache = {}

# File to persist analysis results
CACHE_FILE = DATA_DIR / "analysis_results" / "analysis_cache.json"

# Load existing cache on startup
def load_cache():
    global analysis_cache
    try:
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r') as f:
                analysis_cache = json.load(f)
            print(f"✓ Loaded {len(analysis_cache)} cached analyses")
    except Exception as e:
        print(f"Cache load error: {e}")
        analysis_cache = {}

def save_cache():
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(analysis_cache, f, indent=2)
    except Exception as e:
        print(f"Cache save error: {e}")

# Load cache on startup
load_cache()


# ============================================================================
# REQUEST MODELS
# ============================================================================

class AnalyzeRequest(BaseModel):
    buyer_name: str
    supplier_name: str


# ============================================================================
# CONFIGURATION ENDPOINTS
# ============================================================================

@app.post("/api/config/google-drive")
async def configure_google_drive(
    credentials: UploadFile = File(...),
    company_folder_id: str = Form(...),
    threat_folder_id: str = Form(...)
):
    """Configure Google Drive data source"""
    global analyzer, config_status
    
    try:
        print(f"\n{'='*60}")
        print("CONFIGURING GOOGLE DRIVE")
        print(f"{'='*60}")
        print(f"Company Folder: {company_folder_id}")
        print(f"Threat Folder: {threat_folder_id}")
        
        # Save credentials
        cred_path = DATA_DIR / "credentials" / "credentials.json"
        with open(cred_path, "wb") as f:
            shutil.copyfileobj(credentials.file, f)
        
        print(f"✓ Credentials saved to {cred_path}")
        
        # Update environment variables
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(cred_path)
        os.environ["COMPANY_DOCS_FOLDER_ID"] = company_folder_id
        os.environ["THREAT_POLICIES_FOLDER_ID"] = threat_folder_id
        
        config_status["message"] = "Initializing Pathway..."
        config_status["indexing_progress"] = 10
        
        # Initialize analyzer in background
        def init_analyzer():
            global analyzer, config_status
            try:
                print("\n🔄 Initializing Pathway analyzer...")
                config_status["indexing_progress"] = 20
                
                analyzer = PathwayComplianceAnalyzer()
                
                print("✓ Pathway analyzer initialized")
                config_status["indexing_progress"] = 100
                config_status["initialized"] = True
                config_status["source_type"] = "google_drive"
                config_status["message"] = "Google Drive configured successfully"
                
            except Exception as e:
                print(f"❌ Analyzer init error: {e}")
                config_status["message"] = f"Error: {str(e)}"
                config_status["indexing_progress"] = 0
        
        # Start in background
        thread = threading.Thread(target=init_analyzer, daemon=True)
        thread.start()
        
        return JSONResponse({
            "success": True,
            "message": "Google Drive connection initiated. Indexing in progress...",
            "status": config_status
        })
        
    except Exception as e:
        print(f"❌ Config error: {e}")
        config_status["message"] = f"Error: {str(e)}"
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/config/local-upload")
async def upload_local_files(
    files: list[UploadFile] = File(...),
    document_type: str = Form("company")
):
    """Upload files locally"""
    try:
        print(f"\n📤 Uploading {len(files)} files (type: {document_type})")
        
        uploaded = []
        for file in files:
            file_path = DATA_DIR / "company_docs" / file.filename
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            uploaded.append(file.filename)
            print(f"  ✓ {file.filename}")
        
        return JSONResponse({
            "success": True,
            "message": f"Uploaded {len(uploaded)} files",
            "files": uploaded
        })
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config/status")
async def get_status():
    """Get current configuration status"""
    return JSONResponse(config_status)


# ============================================================================
# DATA DISCOVERY ENDPOINTS
# ============================================================================

@app.get("/api/suppliers")
async def get_suppliers():
    """Get list of suppliers from Google Drive with cached analysis results"""
    if not analyzer:
        # Return empty but valid response
        return JSONResponse({
            "success": False,
            "suppliers": [],
            "message": "System not configured. Please setup Google Drive first."
        })
    
    try:
        print("\n📋 Fetching supplier list...")
        
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        
        credentials = service_account.Credentials.from_service_account_file(
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
        service = build('drive', 'v3', credentials=credentials)
        
        folder_id = os.getenv("COMPANY_DOCS_FOLDER_ID")
        results = service.files().list(
            q=f"'{folder_id}' in parents",
            fields="files(id, name, modifiedTime)"
        ).execute()
        
        files = results.get('files', [])
        print(f"  Found {len(files)} files in Google Drive")
        
        suppliers = []
        for idx, f in enumerate(files, 1):
            # Extract clean company name
            name = f['name'].replace('.pdf', '').replace('.json', '').replace('.jsonl', '')
            name = name.replace('_', ' ').replace('-', ' ').strip()
            
            # Check if we have cached analysis for this supplier
            cached_analysis = analysis_cache.get(name)
            
            if cached_analysis:
                # Use cached data
                suppliers.append({
                    "id": idx,
                    "name": name,
                    "status": "indexed",  # Changed from "ready" to show it's been analyzed
                    "score": cached_analysis.get("score", 0),
                    "risk": cached_analysis.get("risk", "low"),
                    "analyzed_at": cached_analysis.get("timestamp", None),
                    "violations_count": len(cached_analysis.get("violations", []))
                })
                print(f"  {idx}. {name} - Score: {cached_analysis.get('score')}% (cached)")
            else:
                # No analysis yet
                suppliers.append({
                    "id": idx,
                    "name": name,
                    "status": "ready",
                    "score": 0,  # Explicitly 0 to indicate NOT analyzed
                    "risk": "unknown",  # Changed from "low" to "unknown"
                    "analyzed_at": None,
                    "violations_count": 0
                })
                print(f"  {idx}. {name} - Not analyzed yet")
        
        return JSONResponse({
            "success": True,
            "suppliers": suppliers,
            "count": len(suppliers),
            "analyzed_count": len([s for s in suppliers if s["score"] > 0])
        })
        
    except Exception as e:
        print(f"❌ Supplier fetch error: {e}")
        return JSONResponse({
            "success": False,
            "suppliers": [],
            "error": str(e)
        })


# ============================================================================
# ANALYSIS ENDPOINTS
# ============================================================================

@app.post("/api/analyze/batch")
async def analyze_batch(request: AnalyzeRequest):
    """Run compliance analysis and cache results"""
    if not analyzer:
        raise HTTPException(
            status_code=400, 
            detail="System not configured. Please upload Google Drive credentials first."
        )
    
    try:
        print(f"\n{'='*60}")
        print(f"ANALYZING TRANSACTION")
        print(f"{'='*60}")
        print(f"Buyer:    {request.buyer_name}")
        print(f"Supplier: {request.supplier_name}")
        
        # Run analysis
        result = analyzer.analyze_transaction(
            request.buyer_name,
            request.supplier_name
        )
        
        print("\n✓ Analysis complete")
        
        # Parse result to extract key info
        risk_level = "medium"
        if "RISK LEVEL: HIGH" in result:
            risk_level = "high"
        elif "RISK LEVEL: LOW" in result:
            risk_level = "low"
        
        # Calculate score based on risk
        score_map = {"high": 55, "medium": 75, "low": 90}
        score = score_map.get(risk_level, 75)
        
        # Extract violations
        violations = []
        if "POLICY VIOLATIONS DETECTED:" in result:
            try:
                v_section = result.split("POLICY VIOLATIONS DETECTED:")[1]
                v_section = v_section.split("MANDATORY INFORMATION GAPS:")[0]
                for line in v_section.strip().split('\n'):
                    line = line.strip()
                    if line and (line[0].isdigit() or line.startswith('-')):
                        violations.append(line)
            except:
                pass
        
        # Build evidence list
        evidence = [
            "Buyer verification completed",
            "Supplier screening completed",
            "Policy compliance check performed"
        ]
        
        if violations:
            evidence.append(f"{len(violations)} policy violations detected")
        
        # CACHE THE RESULTS
        import datetime
        analysis_cache[request.supplier_name] = {
            "score": score,
            "risk": risk_level,
            "violations": violations,
            "timestamp": datetime.datetime.now().isoformat(),
            "buyer_name": request.buyer_name
        }
        
        # Save cache to disk
        save_cache()
        print(f"✓ Analysis cached for {request.supplier_name}")
        
        return JSONResponse({
            "success": True,
            "result": {
                "score": score,
                "risk": risk_level,
                "explanation": result,
                "evidence": evidence,
                "violations": violations if violations else [],
                "raw_analysis": result
            },
            "buyer_name": request.buyer_name,
            "supplier_name": request.supplier_name
        })
        
    except Exception as e:
        print(f"❌ Analysis error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/analysis/{supplier_name}")
async def delete_analysis(supplier_name: str):
    """Delete cached analysis for a supplier"""
    try:
        if supplier_name in analysis_cache:
            del analysis_cache[supplier_name]
            save_cache()
            return JSONResponse({
                "success": True,
                "message": f"Analysis deleted for {supplier_name}"
            })
        else:
            return JSONResponse({
                "success": False,
                "message": f"No cached analysis found for {supplier_name}"
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/analysis")
async def clear_all_analyses():
    """Clear all cached analyses"""
    try:
        global analysis_cache
        analysis_cache = {}
        save_cache()
        return JSONResponse({
            "success": True,
            "message": "All analyses cleared"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
async def root():
    return {
        "message": "Pathway Compliance API",
        "status": "running",
        "configured": config_status["initialized"],
        "cached_analyses": len(analysis_cache)
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "configured": config_status["initialized"],
        "source": config_status.get("source_type"),
        "cached_analyses": len(analysis_cache)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)