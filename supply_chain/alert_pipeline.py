# alert_pipeline.py
import os
import json
import requests
import pathway as pw
from datetime import datetime
from dotenv import load_dotenv
from supply_chain_stream import supply_chain_table
from llm_validator import is_real_supply_chain_threat

# ============================================================
# CONFIG
# ============================================================
load_dotenv()
GNEWS_API_KEY = os.getenv("G_NEWS_API_KEY")  # Match your .env variable name
FAKE_NEWS_FILE = "data/synthetic_country_disaster.jsonl"
LOG_FILE = "output/threat_detection.log"

RISK_KEYWORDS = [
    "strike", "sanction", "war", "conflict", "shutdown", 
    "port", "earthquake", "flood", "cyclone", "fire"
]

# ============================================================
# LOGGING
# ============================================================
os.makedirs("output", exist_ok=True)

# Initialize log file
with open(LOG_FILE, "w", encoding="utf-8") as f:
    f.write(f"=== Threat Detection Log Started at {datetime.now()} ===\n\n")

def log(message: str):
    """Write to both console and log file"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_msg = f"[{timestamp}] {message}"
    print(log_msg, flush=True)  # Force flush to see immediately
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_msg + "\n")
            f.flush()  # Force write to disk
    except Exception as e:
        print(f"ERROR writing to log: {e}")

# ============================================================
# HELPERS
# ============================================================
def keyword_match(text: str):
    """Check if text contains any risk keywords (not as part of another word)"""
    text = text.lower()
    for kw in RISK_KEYWORDS:
        # Use word boundaries to avoid matching "war" in "Warsaw" or "award"
        import re
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, text):
            return kw
    return None

# ============================================================
# NEWS SOURCES
# ============================================================
def fetch_gnews(country: str):
    """Fetch news articles from GNews API"""
    log(f"📡 fetch_gnews called for country: {country}")
    log(f"📡 GNEWS_API_KEY present: {bool(GNEWS_API_KEY)}")
    
    if not GNEWS_API_KEY:
        log("⚠️ No GNEWS_API_KEY found - skipping GNews")
        return []
    
    query = country + " (" + " OR ".join(RISK_KEYWORDS) + ")"
    url = (
        "https://gnews.io/api/v4/search"
        f"?q={query}&lang=en&max=3&apikey={GNEWS_API_KEY}"
    )
    
    log(f"📡 Making GNews API call to: {url[:80]}...")
    
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        articles = r.json().get("articles", [])
        log(f"✅ GNews returned {len(articles)} articles for {country}")
        return articles
    except Exception as e:
        log(f"❌ GNews error for {country}: {e}")
        return []

def load_fake_news():
    """Load synthetic news from JSONL file"""
    articles = []
    try:
        with open(FAKE_NEWS_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    articles.append(json.loads(line))
        log(f"✅ Loaded {len(articles)} synthetic news articles")
    except Exception as e:
        log(f"❌ Fake news read error: {e}")
    return articles

FAKE_NEWS = load_fake_news()

# ============================================================
# THREAT PROCESSING
# ============================================================
def process_threats_for_supplier(supplier: str, country: str) -> list[dict]:
    """
    Check news sources for threats and validate with LLM.
    Returns list of validated threats.
    """
    threats = []
    seen_headlines = set()  # Track duplicates
    log(f"🔍 Checking: {supplier} | {country}")
    
    # Check GNews
    for art in fetch_gnews(country):
        headline = art.get("title", "")
        description = art.get("description", "")
        
        # Skip duplicates
        if headline in seen_headlines:
            log(f"⏭️  Skipping duplicate: {headline[:50]}...")
            continue
        
        kw = keyword_match(headline + " " + description)
        
        if not kw:
            continue
        
        seen_headlines.add(headline)
        log(f"⚠️  Keyword match [{kw}]: {headline[:50]}...")
        
        if not kw:
            continue
            
        log(f"⚠️  Keyword match [{kw}]: {headline[:50]}...")
        
        # LLM validation
        is_threat = is_real_supply_chain_threat(country, headline, description)
        log(f"   LLM validation result: {is_threat}")
        
        if is_threat:
            log(f"🚨 REAL THREAT | {supplier} | {country} | {kw}")
            threats.append({
                "supplier": supplier,
                "country": country,
                "threat_type": kw,
                "headline": headline,
                "description": description,
                "source": "gnews",
            })
        else:
            log(f"✅ LLM rejected: Not a supply chain threat")
    
    # Check Synthetic News
    for art in FAKE_NEWS:
        if art.get("country", "").lower() != country.lower():
            continue
            
        headline = art.get("headline", "")
        description = art.get("description", "")
        kw = keyword_match(headline + " " + description)
        
        if not kw:
            continue
            
        log(f"⚠️  Keyword match [{kw}]: {headline[:50]}...")
        
        # LLM validation
        if is_real_supply_chain_threat(country, headline, description):
            log(f"🚨 REAL THREAT | {supplier} | {country} | {kw}")
            threats.append({
                "supplier": supplier,
                "country": country,
                "threat_type": kw,
                "headline": headline,
                "description": description,
                "source": "synthetic",
            })
        else:
            log(f"✅ LLM rejected: Not a supply chain threat")
    
    if threats:
        log(f"✅ Found {len(threats)} validated threat(s) for {supplier}")
    
    return threats

# ============================================================
# PATHWAY PIPELINE
# ============================================================

log("🚀 Starting Supply Chain Threat Alert Pipeline")
log("=" * 60)
log(f"📂 Working directory: {os.getcwd()}")
log(f"📂 Output directory: {os.path.abspath('output')}")
log(f"📂 CSV will be written to: {os.path.abspath('output/validated_threats.csv')}")

# Get unique supplier/country combinations
unique_suppliers = supply_chain_table.groupby(
    pw.this.supplier_firm,
    pw.this.source_country
).reduce(
    supplier=pw.this.supplier_firm,
    country=pw.this.source_country,
)

# Process threats for each supplier/country
threats_with_lists = unique_suppliers.select(
    supplier=pw.this.supplier,
    country=pw.this.country,
    threats_list=pw.apply(
        process_threats_for_supplier,
        pw.this.supplier,
        pw.this.country
    )
)

# Flatten to get one row per threat
validated_threats = threats_with_lists.flatten(pw.this.threats_list).select(
    supplier=pw.this.threats_list["supplier"],
    country=pw.this.threats_list["country"],
    threat_type=pw.this.threats_list["threat_type"],
    headline=pw.this.threats_list["headline"],
    description=pw.this.threats_list["description"],
    source=pw.this.threats_list["source"],
)

# Write to CSV
pw.io.csv.write(validated_threats, "output/validated_threats.csv")

# Log each validated threat
@pw.udf
def log_threat(supplier: str, country: str, threat_type: str, headline: str, source: str) -> str:
    short_headline = headline[:70] + "..." if len(headline) > 70 else headline
    log("")
    log("=" * 60)
    log("💥 THREAT ALERT VALIDATED")
    log(f"   Supplier: {supplier}")
    log(f"   Country: {country}")
    log(f"   Type: {threat_type.upper()}")
    log(f"   Source: {source}")
    log(f"   Headline: {short_headline}")
    log("=" * 60)
    return "logged"

validated_threats.select(
    log_result=log_threat(
        pw.this.supplier,
        pw.this.country,
        pw.this.threat_type,
        pw.this.headline,
        pw.this.source
    )
)

log("✅ Pipeline configured. Now monitoring for threats...")
log("📝 Check output/threat_detection.log for detailed logs")
log("📊 Validated threats saved to output/validated_threats.csv")

# ============================================================
# RUN
# ============================================================
if __name__ == "__main__":
    pw.run()