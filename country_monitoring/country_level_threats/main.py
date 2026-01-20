# main.py
import uvicorn
from fastapi_proxy import app

if __name__ == "__main__":
    print("🚀 Starting Supply Chain Threat Monitoring Proxy...")
    print("📌 Waiting for configuration from the frontend...")
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="info")