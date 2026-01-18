import pathway as pw

# -----------------------------
# 1. Define schema (NO __key__)
# -----------------------------
class SupplyChainSchema(pw.Schema):
    record_id: str
    buyer_firm: str
    supplier_firm: str
    contract_id: str

    # Product & contract context
    product_name: str
    product_category: str
    quantity: float
    unit: str
    start_date: str
    end_date: str
    last_updated: str

    # Location context (for news correlation)
    source_country: str
    source_region: str
    source_city: str
    destination_country: str

    # Supplier operational context
    supplier_industry: str 

    primary_transport_mode: str      # sea, air, road, rail
    port_dependency: str  


# -----------------------------
# 2. Read CSV as LIVE stream
# -----------------------------
supply_chain_table = pw.io.csv.read(
    "data/supply_chain_stream.csv",
    schema=SupplyChainSchema,
    mode="streaming",
)

# -----------------------------
# 3. Assign primary key
# -----------------------------
supply_chain_table = supply_chain_table.with_columns(
    __key__=pw.this.record_id
)
import json

# ============================================================
# RISK KEYWORDS
# ============================================================

RISK_KEYWORDS = [
    "strike",
    "war",
    "shutdown",
    "port",
    "flood",
    "earthquake",
    "cyclone",
    "sanction",
    "fire",
]

def contains_risk_keyword(text: str):
    text = text.lower()
    for kw in RISK_KEYWORDS:
        if kw in text:
            return kw
    return None


# ============================================================
# FAKE API (STATIC JSONL FILE)
# ============================================================

FAKE_API_PATH = "data/synthetic_country_disaster.jsonl"

def load_fake_api_articles():
    articles = []
    try:
        with open(FAKE_API_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    articles.append(json.loads(line))
    except Exception as e:
        print(f"❌ Failed to load fake API file: {e}")
    return articles


FAKE_API_ARTICLES = load_fake_api_articles()
