# main.py
import pathway as pw
from alert_pipeline import validated_threats  # Sets up alert pipeline
from threat_rag import rag_app  # Sets up RAG pipeline

print("🚀 Starting unified supply chain monitoring system...")
print("=" * 60)
print("✅ Alert pipeline: Monitoring threats")
print("✅ RAG pipeline: API server on http://0.0.0.0:8000")
print("=" * 60)

if __name__ == "__main__":
    pw.run()