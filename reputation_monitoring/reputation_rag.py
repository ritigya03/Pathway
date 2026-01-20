# reputation_rag.py
import os
import json
from datetime import datetime
import pathway as pw
from dotenv import load_dotenv

from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.embedders import GeminiEmbedder
from pathway.xpacks.llm.llms import LiteLLMChat
from pathway.xpacks.llm.question_answering import AdaptiveRAGQuestionAnswerer
from pathway.xpacks.llm.vector_store import VectorStoreServer
from pathway.stdlib.indexing import BruteForceKnnFactory, BruteForceKnnMetricKind

from reputation_alert_pipeline import validated_threats

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_CREDS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
REPUTATION_POLICIES_FOLDER_ID = os.getenv("REPUTATION_POLICIES_FOLDER_ID")

if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY not set")

print("=" * 60)
print("🤖 Initializing Reputational Threat RAG System")
print("=" * 60)

# ============================================================
# 1. LOAD REPUTATION POLICIES FROM GOOGLE DRIVE
# ============================================================
print("📂 Loading reputation policies from Google Drive...")

# Read policies as binary data with metadata
policies_raw = pw.io.gdrive.read(
    object_id=REPUTATION_POLICIES_FOLDER_ID,
    service_user_credentials_file=GOOGLE_CREDS,
    name_pattern=[
        "fake_company_policy.jsonl",
        "legitimate_company_policy.jsonl",
        "restricted_company_policy.jsonl",
    ],
    with_metadata=True,
    refresh_interval=300,  # Refresh every 5 minutes
)


def parse_policy_jsonl_to_bytes(data: bytes) -> bytes:
    """
    Parse JSONL policy file into readable text - specialized for section-based format.
    Returns bytes for Pathway document store.
    """
    try:
        text = data.decode("utf-8")
        lines = text.strip().split("\n")
        
        sections = []
        for line in lines:
            if not line.strip():
                continue
            
            try:
                obj = json.loads(line)
                section_name = obj.get("section", "general")
                content = obj.get("content", "")
                
                sections.append(f"## {section_name.upper()}\n{content}\n")
            except json.JSONDecodeError:
                continue
        
        result = "\n".join(sections)
        return result.encode("utf-8")
    
    except Exception as e:
        print(f"⚠️  Policy parsing error: {e}")
        return b"Error parsing policy"


# Transform to data format (bytes) - keep _metadata as is
policies_docs = policies_raw.select(
    data=pw.apply(parse_policy_jsonl_to_bytes, pw.this.data),
    _metadata=pw.this._metadata
)


# ============================================================
# 2. FORMAT VALIDATED THREATS AS DOCUMENTS
# ============================================================
print("🚨 Formatting validated threats as documents...")


def format_threat_document_to_bytes(
    company: str,
    category: str, 
    threat_type: str,
    headline: str,
    description: str,
    source: str,
    timestamp: str
) -> bytes:
    """Format threat alert as a readable document and return as bytes"""
    
    doc = f"""
# REPUTATIONAL THREAT ALERT

**Company**: {company}
**Category**: {category}
**Threat Type**: {threat_type}
**Timestamp**: {timestamp}
**Source**: {source}

## Headline
{headline}

## Description
{description}

## Risk Assessment
This alert was validated by AI analysis and represents a genuine reputational concern for {company}.
"""
    
    return doc.encode("utf-8")


# Create threats documents with data column (bytes)
threats_docs = validated_threats.select(
    data=pw.apply(
        format_threat_document_to_bytes,
        pw.this.company,
        pw.this.category,
        pw.this.threat_type,
        pw.this.headline,
        pw.this.description,
        pw.this.source,
        pw.this.timestamp
    )
)


# Add empty metadata to threats to match policies schema
def create_empty_metadata_dict(data: bytes) -> dict:
    """Create empty metadata dict - helps with schema compatibility"""
    return {"source": "alert_pipeline", "timestamp": str(datetime.now())}


threats_docs = threats_docs.select(
    data=pw.this.data,
    _metadata=pw.apply(create_empty_metadata_dict, pw.this.data)
)


# ============================================================
# 3. BUILD DOCUMENT STORE WITH HYBRID INDEXING
# ============================================================
print("📚 Building document store with hybrid indexing...")

# Combine policies and threats - both have data (bytes) and _metadata columns
all_docs = pw.Table.concat_reindex(policies_docs, threats_docs)

# Create embedder
embedder = GeminiEmbedder(
    api_key=GEMINI_API_KEY,
    model="models/text-embedding-004",
)

# Create KNN index factory
knn_index = BruteForceKnnFactory(
    reserved_space=1000,
    embedder=embedder,
    metric=BruteForceKnnMetricKind.COS
)

# Build document store
doc_store = DocumentStore(
    docs=all_docs,
    retriever_factory=knn_index,
)


# ============================================================
# 4. SETUP ADAPTIVE RAG
# ============================================================
print("🤖 Initializing Adaptive RAG system...")

llm = LiteLLMChat(
    model="gemini/gemini-2.0-flash-exp",
    api_key=GEMINI_API_KEY,
    temperature=0.1,
)

rag_app = AdaptiveRAGQuestionAnswerer(
    llm=llm,
    indexer=doc_store,
    n_starting_documents=10,  # Start with 10 documents for better coverage
    factor=2,  # Double each iteration
    max_iterations=4,  # Max 4 iterations (10, 20, 40, 80 docs)
    prompt_template="""
You are a corporate reputation analyst assistant specializing in threat assessment and policy guidance.

Your task is to provide comprehensive, actionable answers about company reputational threats and policies.

**Instructions:**
1. **Aggregate information** - If multiple companies or threats are relevant, summarize ALL of them, not just one.
2. **Include policy guidance** - Always reference relevant policy documents when available.
3. **Be specific** - Mention company names, categories, and key details from headlines.
4. **Organize clearly** - Use bullet points.
5. **Bold important terms** - Bold company names, threat types, and dates.
6. **No threats found?** - If no relevant threats are found in the context for the specific company or query, respond EXACTLY with: "There are no reputational threats for this supplier." Do not provide any other explanation or "I don't know" style responses.

Context:
{context}

Question: {query}

Answer:
""",
)


# ============================================================
# 5. BUILD REST API SERVER
# ============================================================
print("🌐 Building REST API server...")
print("=" * 60)
print("")
print("✅ RAG System Ready!")
print("=" * 60)
print("📡 API Endpoints:")
print("  - POST http://0.0.0.0:8002/v2/answer")
print("  - POST http://0.0.0.0:8002/v2/list_documents")
print("=" * 60)
print("")
print("Example PowerShell query:")
print("  Invoke-RestMethod -Uri http://localhost:8002/v2/answer `")
print("    -Method Post `")
print('    -ContentType "application/json" `')
print('    -Body \'{"prompt": "What are the fraud indicators for fake companies?"}\'')
print("=" * 60)

# Build the server at module level (will be started when pw.run() is called)
rag_app.build_server("0.0.0.0", 8002)
