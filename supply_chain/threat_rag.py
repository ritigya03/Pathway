# threat_rag.py
import os
import json
import pathway as pw
from dotenv import load_dotenv

from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.embedders import GeminiEmbedder
from pathway.xpacks.llm.llms import LiteLLMChat
from pathway.xpacks.llm.question_answering import AdaptiveRAGQuestionAnswerer
from pathway.stdlib.indexing import BruteForceKnnFactory, TantivyBM25Factory, HybridIndexFactory, BruteForceKnnMetricKind

# Import validated threats from alert pipeline
from alert_pipeline import validated_threats

# ============================================================
# CONFIG
# ============================================================
load_dotenv()

THREAT_POLICIES_FOLDER_ID = os.getenv("THREAT_POLICIES_FOLDER_ID")
GOOGLE_CREDS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not THREAT_POLICIES_FOLDER_ID:
    raise RuntimeError("❌ THREAT_POLICIES_FOLDER_ID missing")
if not GOOGLE_CREDS:
    raise RuntimeError("❌ GOOGLE_APPLICATION_CREDENTIALS missing")
if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY missing")

# ============================================================
# 1. LOAD THREAT POLICIES FROM GOOGLE DRIVE
# ============================================================
print("📂 Loading threat policies from Google Drive...")

# Read policies as binary data with metadata
policies_raw = pw.io.gdrive.read(
    object_id=THREAT_POLICIES_FOLDER_ID,
    service_user_credentials_file=GOOGLE_CREDS,
    name_pattern=[
        "operational_threat_policy.jsonl",
        "geopolitical_threat_policy.jsonl",
    ],
    with_metadata=True,
    refresh_interval=300,  # Refresh every 5 minutes
)

# Parse JSONL policies into structured text and return as bytes
@pw.udf
def parse_policy_jsonl_to_bytes(data: bytes) -> bytes:
    """Parse JSONL policy file into readable text - specialized for section-based format"""
    try:
        content = data.decode('utf-8').strip()
        if not content:
            return b""
        
        lines = content.split('\n')
        
        # Group lines by policy
        policy_sections = {}
        for line in lines:
            if line.strip():
                try:
                    item = json.loads(line)
                    policy_name = item.get("policy", "Unknown Policy")
                    section = item.get("section", "unknown")
                    content_data = item.get("content", {})
                    
                    if policy_name not in policy_sections:
                        policy_sections[policy_name] = {}
                    
                    policy_sections[policy_name][section] = content_data
                except json.JSONDecodeError as e:
                    print(f"❌ Error parsing policy line: {e}")
                    continue
        
        # Format each policy
        formatted_policies = []
        for policy_name, sections in policy_sections.items():
            policy_text = f"POLICY DOCUMENT: {policy_name}\n"
            policy_text += "=" * 60 + "\n\n"
            
            # Process each section
            for section_name, section_content in sections.items():
                # Format section name
                readable_section = section_name.replace('_', ' ').title()
                policy_text += f"## {readable_section}\n"
                
                if isinstance(section_content, dict):
                    if section_name == "classification_rules":
                        policy_text += "Classification rules for threat assessment:\n"
                        for rule_name, rule_data in section_content.items():
                            readable_rule = rule_name.replace('_', ' ').title()
                            conditions = rule_data.get("conditions", [])
                            label = rule_data.get("label", "No label")
                            policy_text += f"\n- {readable_rule}:\n"
                            policy_text += f"  Conditions: {', '.join(conditions)}\n"
                            policy_text += f"  Label: {label}\n"
                    
                    elif section_name == "severity_rules":
                        policy_text += "Severity assessment rules:\n"
                        for severity, rule_data in section_content.items():
                            triggers = rule_data.get("trigger", [])
                            action = rule_data.get("action", "No action specified")
                            policy_text += f"\n- {severity.upper()} severity:\n"
                            policy_text += f"  Triggers: {', '.join(triggers)}\n"
                            policy_text += f"  Required action: {action}\n"
                    
                    elif section_name == "actions":
                        policy_text += "Predefined actions for different scenarios:\n"
                        for action_name, action_desc in section_content.items():
                            readable_action = action_name.replace('_', ' ').title()
                            policy_text += f"\n- {readable_action}:\n"
                            policy_text += f"  {action_desc}\n"
                    
                    elif section_name == "severity_keywords":
                        policy_text += "Keywords indicating severity levels:\n"
                        for severity_level, keywords in section_content.items():
                            policy_text += f"\n- {severity_level.upper()}: {', '.join(keywords)}\n"
                    
                    elif section_name == "threat_categories":
                        policy_text += "Categories of threats:\n"
                        for category, keywords in section_content.items():
                            readable_category = category.replace('_', ' ').title()
                            policy_text += f"\n- {readable_category}: {', '.join(keywords)}\n"
                    
                    else:
                        # General dictionary sections
                        for key, value in section_content.items():
                            readable_key = key.replace('_', ' ').title()
                            if isinstance(value, list):
                                policy_text += f"\n- {readable_key}: {', '.join(value)}\n"
                            elif isinstance(value, dict):
                                policy_text += f"\n- {readable_key}:\n"
                                for sub_key, sub_value in value.items():
                                    readable_sub_key = sub_key.replace('_', ' ').title()
                                    if isinstance(sub_value, list):
                                        policy_text += f"  * {readable_sub_key}: {', '.join(sub_value)}\n"
                                    else:
                                        policy_text += f"  * {readable_sub_key}: {sub_value}\n"
                            else:
                                policy_text += f"\n- {readable_key}: {value}\n"
                
                elif isinstance(section_content, list):
                    policy_text += f"\nItems: {', '.join(str(item) for item in section_content)}\n"
                else:
                    policy_text += f"\nContent: {section_content}\n"
                
                policy_text += "\n"
            
            formatted_policies.append(policy_text.strip())
        
        if not formatted_policies:
            return b"No valid policies found in file."
        
        result_text = "\n\n" + "=" * 80 + "\n\n".join(formatted_policies)
        return result_text.encode('utf-8')
        
    except Exception as e:
        print(f"❌ Error parsing policy file: {e}")
        import traceback
        traceback.print_exc()
        return b"Error loading policies"

# Transform to data format (bytes) - keep _metadata as is
policies_docs = policies_raw.select(
    data=parse_policy_jsonl_to_bytes(pw.this.data),
    _metadata=pw.this._metadata
)

# ============================================================
# 2. FORMAT VALIDATED THREATS AS DOCUMENTS
# ============================================================
print("🚨 Formatting validated threats as documents...")

@pw.udf
def format_threat_document_to_bytes(
    supplier: str,
    country: str, 
    threat_type: str,
    headline: str,
    description: str,
    source: str
) -> bytes:
    """Format threat alert as a readable document and return as bytes"""
    # Convert all inputs to strings explicitly to handle Pathway types
    supplier = str(supplier) if supplier is not None else "Unknown"
    country = str(country) if country is not None else "Unknown"
    threat_type = str(threat_type) if threat_type is not None else "unknown"
    headline = str(headline) if headline is not None else "No headline"
    description = str(description) if description is not None else "No description"
    source = str(source) if source is not None else "unknown"
    
    text = f"""
ACTIVE THREAT ALERT
===================

Supplier: {supplier}
Country: {country}
Threat Type: {threat_type.upper()}
Source: {source}

Headline: {headline}

Description: {description}
"""
    return text.encode('utf-8')

# Create threats documents with data column (bytes)
threats_docs = validated_threats.select(
    data=format_threat_document_to_bytes(
        pw.this.supplier,
        pw.this.country,
        pw.this.threat_type,
        pw.this.headline,
        pw.this.description,
        pw.this.source
    )
)

# Add empty metadata to threats - using pw.this reference properly
@pw.udf
def create_empty_metadata_dict(data: bytes) -> dict:
    """Create empty metadata dict - needs at least one arg from table"""
    return {}

threats_docs = threats_docs.select(
    data=pw.this.data,
    _metadata=create_empty_metadata_dict(pw.this.data)
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
    model="models/text-embedding-004"
)

# Create KNN index factory
knn_index = BruteForceKnnFactory(
    reserved_space=1000,
    embedder=embedder,
    metric=BruteForceKnnMetricKind.COS
)

# Create BM25 index factory
bm25_index = TantivyBM25Factory(
    ram_budget=1073741824,  # 1GB
    in_memory_index=True
)

# Create hybrid index with both factories
hybrid_index = HybridIndexFactory(
    retriever_factories=[knn_index, bm25_index]
)

# Create document store with hybrid search
doc_store = DocumentStore(
    docs=all_docs,
    retriever_factory=hybrid_index,
)

# ============================================================
# 4. CREATE ADAPTIVE RAG QUESTION ANSWERER
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
    n_starting_documents=3,  # Start with 3 documents
    factor=2,  # Double each iteration
    max_iterations=4,  # Max 4 iterations (3, 6, 12, 24 docs)
    prompt_template="""You are a supply chain risk management assistant.

Use the following context to answer the question about supply chain threats and policies.

Context:
{context}

Question: {query}

Provide a clear, actionable answer that:
1. Identifies relevant threats and their severity based on policy rules
2. Recommends specific actions from policy documents
3. Highlights which suppliers/countries are affected
4. Suggests escalation procedures from policy guidelines
5. References specific policy sections when applicable

If you find matching policy information, say: "Based on [Policy Name] policy section [Section Name]..."

If the context doesn't contain enough information to answer, say "I don't have enough information to answer this question."

Answer:
"""
)

# ============================================================
# 5. START REST API SERVER
# ============================================================
print("🚀 Starting RAG API server...")
print("=" * 60)
print("📡 Endpoint: POST http://localhost:8000/v2/answer")
print("=" * 60)
print("")
print("Example PowerShell query:")
print("  Invoke-RestMethod -Uri http://localhost:8000/v2/answer `")
print("    -Method Post `")
print('    -ContentType "application/json" `')
print('    -Body \'{"prompt": "What threats are affecting China suppliers?"}\'')
print("=" * 60)

# Use build_server method
rag_app.build_server(host="0.0.0.0", port=8000)

# ============================================================
# RUN
# ============================================================
# if __name__ == "__main__":
#     pw.run()