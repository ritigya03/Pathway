import pathway as pw
import json
import os

# ============================================================
# SCHEMA DEFINITIONS
# ============================================================

class SupplyChainSchema(pw.Schema):
    record_id: str
    buyer_firm: str
    supplier_firm: str
    contract_id: str
    product_name: str
    product_category: str
    quantity: float
    unit: str
    start_date: str
    end_date: str
    last_updated: str
    source_country: str
    source_region: str
    source_city: str
    destination_country: str
    supplier_industry: str 
    primary_transport_mode: str
    port_dependency: str  

# ============================================================
# DATA STREAM
# ============================================================

# Read Supply Chain CSV as the primary driver stream
supply_chain_stream = pw.io.csv.read(
    "data/supply_chain_stream.csv",
    schema=SupplyChainSchema,
    mode="streaming",
)

# Assign primary key
supply_chain_stream = supply_chain_stream.with_columns(
    __key__=pw.this.record_id
)

# ============================================================
# RISK KEYWORDS FOR REPUTATIONAL THREATS
# ============================================================

RISK_KEYWORDS = [
    "fraud", "scam", "fake", "impersonation", "misleading",
    "unverifiable", "inconsistent", "authenticity", "questioned",
    "restricted", "frustration", "negative", "concerns",
    "allegations", "complaints", "clarification",
]

def contains_risk_keyword(text: str) -> str | None:
    text = text.lower()
    for kw in RISK_KEYWORDS:
        if kw in text:
            return kw
    return None

# ============================================================
# MOCK DATA LOADER
# ============================================================

MOCK_NEWS_PATH = "mock_reputational_news.jsonl"

def load_mock_news():
    """Load mock reputational news from JSONL file"""
    articles = []
    if not os.path.exists(MOCK_NEWS_PATH):
        print(f"⚠️  Warning: {MOCK_NEWS_PATH} not found")
        return []
        
    try:
        with open(MOCK_NEWS_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    articles.append(json.loads(line))
    except Exception as e:
        print(f"❌ Failed to load mock news file: {e}")
    return articles

MOCK_NEWS_ARTICLES = load_mock_news()
