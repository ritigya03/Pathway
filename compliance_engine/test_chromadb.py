#!/usr/bin/env python3
import chromadb
from chromadb.config import Settings
import os

print("🧪 Testing ChromaDB installation...")

try:
    # Test with SQLite backend
    client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory="/tmp/test_chroma",
        anonymized_telemetry=False
    ))
    
    collection = client.create_collection(name="test_collection")
    collection.add(
        documents=["This is a test document about compliance."],
        metadatas=[{"source": "test"}],
        ids=["id1"]
    )
    
    results = collection.query(query_texts=["compliance"], n_results=1)
    print(f"✅ ChromaDB test successful!")
    print(f"   Found: {results['documents'][0][0]}")
    
except Exception as e:
    print(f"❌ ChromaDB test failed: {e}")
    import traceback
    traceback.print_exc()