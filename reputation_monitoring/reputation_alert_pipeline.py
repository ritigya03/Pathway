# reputation_alert_pipeline.py
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import pathway as pw
from reputation_stream import supply_chain_stream, contains_risk_keyword, MOCK_NEWS_ARTICLES
from llm_validator import is_real_reputational_threat

# Load environment variables
load_dotenv()

# ============================================================
# CONFIGURATION
# ============================================================

LOG_FILE = "output/reputation_threats.log"

# Ensure output directory exists
os.makedirs("output", exist_ok=True)

# Initialize log file
with open(LOG_FILE, "w", encoding="utf-8") as f:
    f.write(f"=== Reputational Threat Detection Log Started at {datetime.now()} ===\n\n")


# ============================================================
# LOGGING
# ============================================================

def log(message: str):
    """Write to both console and log file"""
    print(message)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"{message}\n")
    except Exception as e:
        print(f"⚠️  Log write failed: {e}")


# ============================================================
# THREAT PROCESSING
# ============================================================

def process_threats_for_company(company: str, industry: str) -> list[dict]:
    """
    Check mock news for reputational threats and validate with LLM.
    Returns list of validated threats.
    """
    
    threats = []
    
    # Filter news for this company
    company_news = [
        article for article in MOCK_NEWS_ARTICLES
        if article.get("supplier", "").strip().lower() == company.strip().lower()
    ]
    
    if not company_news:
        return threats
    
    log(f"\n{'='*60}")
    log(f"🔍 Processing supplier: {company} (Industry: {industry})")
    log(f"   Found {len(company_news)} news articles")
    
    for article in company_news:
        headline = article.get("headline", "")
        description = article.get("description", "")
        threat_type = article.get("threat_type", "reputational_risk")
        timestamp = article.get("published_at", "")
        
        # Check for risk keywords
        keyword = contains_risk_keyword(headline + " " + description)
        
        if not keyword:
            continue
        
        log(f"\n   ⚠️  Risk keyword '{keyword}' detected")
        log(f"   📰 Headline: {headline[:80]}...")
        
        # Validate with LLM
        try:
            is_threat = is_real_reputational_threat(
                company=company,
                category=industry,
                headline=headline,
                content=description
            )
            
            if is_threat:
                log(f"   ✅ LLM VALIDATED as reputational threat")
                
                # CRITICAL: Use plain Python types only
                threats.append({
                    "company": str(company),
                    "category": str(industry),
                    "threat_type": str(threat_type),
                    "headline": str(headline),
                    "description": str(description),
                    "source": "MockNews",
                    "timestamp": str(timestamp),
                })
            else:
                log(f"   ❌ LLM rejected as false positive")
                
        except Exception as e:
            log(f"   ⚠️  Validation error: {e}")
    
    log(f"\n   📊 Total validated threats: {len(threats)}")
    
    return threats


# ============================================================
# PATHWAY PIPELINE
# ============================================================

log("🚀 Starting Reputational Threat Alert Pipeline")
log("=" * 60)

# Get unique companies from stream
companies = supply_chain_stream.groupby(
    pw.this.supplier_firm, pw.this.supplier_industry
).reduce(
    company=pw.this.supplier_firm,
    industry=pw.this.supplier_industry,
)

# Process threats for each company
threats_by_company = companies.select(
    company=pw.this.company,
    industry=pw.this.industry,
    threats_list=pw.apply(
        process_threats_for_company,
        pw.this.company,
        pw.this.industry
    )
)

# Flatten the list of threats
validated_threats = threats_by_company.flatten(pw.this.threats_list).select(
    company=pw.this.threats_list["company"],
    category=pw.this.threats_list["category"],
    threat_type=pw.this.threats_list["threat_type"],
    headline=pw.this.threats_list["headline"],
    description=pw.this.threats_list["description"],
    source=pw.this.threats_list["source"],
    timestamp=pw.this.threats_list["timestamp"],
)

# Write to CSV
pw.io.csv.write(validated_threats, "output/validated_threats.csv")


# ============================================================
# LOGGING CALLBACK
# ============================================================

def log_threat(
    company: str,
    category: str,
    threat_type: str,
    headline: str,
    source: str
) -> str:
    """Log each validated threat"""
    msg = f"""
{'='*60}
🚨 VALIDATED THREAT DETECTED
{'='*60}
Company:      {company}
Category:     {category}
Threat Type:  {threat_type}
Headline:     {headline}
Source:       {source}
Time:         {datetime.now()}
{'='*60}
"""
    log(msg)
    return "logged"


# Apply logging to each threat
validated_threats.select(
    log_result=pw.apply(
        log_threat,
        pw.this.company,
        pw.this.category,
        pw.this.threat_type,
        pw.this.headline,
        pw.this.source
    )
)

log("✅ Pipeline configured. Now monitoring for threats...")
log("📁 Log file: " + LOG_FILE)
log("📊 Validated threats saved to output/validated_threats.csv")
log("=" * 60)
