# main.py
"""
Main orchestration file for the Reputation Monitoring System.
Runs both the alert pipeline and RAG API concurrently.
"""

import threading
import time
import pathway as pw
from reputation_alert_pipeline import validated_threats  # Sets up alert pipeline
from reputation_rag import rag_app  # Sets up RAG pipeline (build_server called at module level)

print("🚀 Starting unified reputation monitoring system...")
print("=" * 60)


def run_pathway():
    """Run Pathway in a separate thread"""
    pw.run()


def run_fastapi_proxy():
    """Run FastAPI proxy in a separate thread"""
    from fastapi_proxy import app
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8083, log_level="info")


if __name__ == "__main__":
    print("✅ Alert pipeline: Monitoring reputational threats")
    print("✅ RAG pipeline: API server on http://0.0.0.0:8002")
    print("✅ Proxy service: CORS-enabled API on http://0.0.0.0:8083")
    print("=" * 60)
    print("\nFrontend should use: POST http://localhost:8083/proxy-answer")
    print("")
    print("Example query:")
    print('  {"prompt": "What are the fraud indicators for fake companies?"}')
    print("=" * 60)
    
    # Run both services
    
    # Start Pathway in a thread
    pathway_thread = threading.Thread(target=run_pathway, daemon=True)
    pathway_thread.start()
    
    # Give Pathway time to start
    print("\n⏳ Starting Pathway pipeline...")
    time.sleep(5)  # Give more time for RAG server to initialize
    
    # Start FastAPI proxy (this will block)
    print("⏳ Starting FastAPI proxy...\n")
    run_fastapi_proxy()
