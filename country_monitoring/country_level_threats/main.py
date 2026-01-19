# main.py
import asyncio
import subprocess
import threading
import time
import signal
import sys
import pathway as pw
from alert_pipeline import validated_threats  # Sets up alert pipeline
from threat_rag import rag_app  # Sets up RAG pipeline

print("🚀 Starting unified supply chain monitoring system...")
print("=" * 60)

def run_pathway():
    """Run Pathway in a separate thread"""
    pw.run()

def run_fastapi_proxy():
    """Run FastAPI proxy in a separate thread"""
    from fastapi_proxy import app
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="info")

if __name__ == "__main__":
    print("✅ Alert pipeline: Monitoring threats")
    print("✅ RAG pipeline: API server on http://0.0.0.0:8082")
    print("✅ Proxy service: CORS-enabled API on http://0.0.0.0:8081")
    print("=" * 60)
    print("\n🎯 IMPORTANT: Your frontend on port 8000 should use:")
    print("   POST http://localhost:8081/proxy-answer")
    print("=" * 60)
    
    # Run both services
    import threading
    
    # Start Pathway in a thread
    pathway_thread = threading.Thread(target=run_pathway, daemon=True)
    pathway_thread.start()
    
    # Give Pathway time to start
    time.sleep(3)
    
    # Start FastAPI proxy (this will block)
    run_fastapi_proxy()