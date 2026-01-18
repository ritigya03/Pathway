import pathway as pw
import json

# ============================================================
# SCHEMA DEFINITION
# ============================================================

class ReputationNewsSchema(pw.Schema):
    """Schema for reputational news stream"""
    news_id: str
    stream_order: int
    timestamp: str
    company: str
    company_category: str  # fake, legitimate, restricted
    headline: str
    content: str
    source_type: str  # media, social, etc.


# ============================================================
# RISK KEYWORDS FOR REPUTATIONAL THREATS
# ============================================================

RISK_KEYWORDS = [
    "fraud",
    "scam",
    "fake",
    "impersonation",
    "misleading",
    "unverifiable",
    "inconsistent",
    "authenticity",
    "questioned",
    "restricted",
    "frustration",
    "negative",
    "concerns",
    "allegations",
    "complaints",
    "clarification",
]


def contains_risk_keyword(text: str) -> str | None:
    """
    Check if text contains any risk keywords.
    Returns the first matched keyword or None.
    """
    text = text.lower()
    for kw in RISK_KEYWORDS:
        if kw in text:
            return kw
    return None


# ============================================================
# DATA STREAM
# ============================================================

# Read CSV as LIVE stream
reputation_stream = pw.io.csv.read(
    "data/reputation_stream.csv",
    schema=ReputationNewsSchema,
    mode="streaming",
)

# Assign primary key
reputation_stream = reputation_stream.with_columns(
    __key__=pw.this.news_id
)


# ============================================================
# MOCK DATA LOADER (for processing)
# ============================================================

import os

# Try multiple paths for mock news file
POSSIBLE_PATHS = [
    "/mock_reputational_news.jsonl",  # Docker (root)
    "../mock_reputational_news.jsonl",  # Local development
    "/app/../mock_reputational_news.jsonl",  # Docker (parent of /app)
    "mock_reputational_news.jsonl",  # Same directory
]

MOCK_NEWS_PATH = None
for path in POSSIBLE_PATHS:
    if os.path.exists(path):
        MOCK_NEWS_PATH = path
        break

if MOCK_NEWS_PATH is None:
    print("⚠️  Warning: mock_reputational_news.jsonl not found in any expected location")
    MOCK_NEWS_PATH = "../mock_reputational_news.jsonl"  # Fallback


def load_mock_news():
    """Load mock reputational news from JSONL file"""
    articles = []
    try:
        with open(MOCK_NEWS_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    articles.append(json.loads(line))
    except Exception as e:
        print(f"❌ Failed to load mock news file: {e}")
    return articles


MOCK_NEWS_ARTICLES = load_mock_news()
