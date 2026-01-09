import os
import time as pytime
import json
import threading
import requests
import pathway as pw
from dotenv import load_dotenv

from supply_chain_stream import supply_chain_table

# ============================================================
# CONFIG
# ============================================================

load_dotenv()
GNEWS_API_KEY = os.getenv("G_NEWS_API_KEY")

FAKE_NEWS_FILE = "data/synthetic_country_disaster.jsonl"

RISK_KEYWORDS = [
    "strike",
    "sanction",
    "war",
    "conflict",
    "shutdown",
    "port",
    "earthquake",
    "flood",
]

CACHE_TTL_SEC = 30 * 60  # 30 minutes

# ============================================================
# CACHE
# ============================================================

country_risk_cache = {}
cache_lock = threading.Lock()

# ============================================================
# HELPERS
# ============================================================

def contains_risk_keyword(text: str):
    text = text.lower()
    for kw in RISK_KEYWORDS:
        if kw in text:
            return kw
    return None

# ============================================================
# GNEWS CHECK
# ============================================================

def check_gnews(country: str):
    query = country + " (" + " OR ".join(RISK_KEYWORDS) + ")"
    url = (
        "https://gnews.io/api/v4/search"
        f"?q={query}&lang=en&max=3&apikey={GNEWS_API_KEY}"
    )

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        articles = resp.json().get("articles", [])

        matches = []
        for a in articles:
            text = (a.get("title", "") + " " + a.get("description", "")).lower()
            kw = contains_risk_keyword(text)
            if kw:
                matches.append((a.get("title"), kw))

        return matches

    except Exception as e:
        print(f"❌ GNews error for {country}: {e}")
        return []

# ============================================================
# FAKE NEWS CHECK
# ============================================================

def check_fake_news(country: str):
    matches = []

    try:
        with open(FAKE_NEWS_FILE, "r", encoding="utf-8") as f:
            for line in f:
                article = json.loads(line)

                if article.get("country", "").lower() != country.lower():
                    continue

                text = (
                    article.get("headline", "") + " " +
                    article.get("description", "")
                ).lower()

                kw = contains_risk_keyword(text)
                if kw:
                    matches.append((article.get("headline"), kw))

    except Exception as e:
        print(f"❌ Fake news read error: {e}")

    return matches

# ============================================================
# SUPPLIER EVENT HANDLER (IMPORTANT PART)
# ============================================================

def on_supplier_event(key, row, time, is_addition):
    """
    NOTE:
    - `time` here is Pathway event timestamp (int)
    - DO NOT call time.time() here
    """

    country = row["source_country"]
    supplier = row["supplier_firm"]
    now = time  # Pathway-provided timestamp

    print(f"🔍 Checking supplier={supplier}, country={country}")

    # ---- CACHE CHECK ----
    with cache_lock:
        cached = country_risk_cache.get(country)
        if cached and (now - cached["checked_at"] < CACHE_TTL_SEC):
            for src, headline, kw in cached["alerts"]:
                print(
                    f"🚨 ALERT (CACHED) | Supplier={supplier} | "
                    f"Country={country} | Keyword={kw} | "
                    f"Source={src} | {headline}"
                )
            return

    alerts = []

    # ---- GNEWS ----
    for headline, kw in check_gnews(country):
        print(f"⚠️ [GNEWS MATCH] {country} | {kw} | {headline}")
        alerts.append(("gnews", headline, kw))

    # ---- FAKE NEWS ----
    for headline, kw in check_fake_news(country):
        print(f"⚠️ [FAKE MATCH] {country} | {kw} | {headline}")
        alerts.append(("fake_api", headline, kw))

    # ---- ALERT + CACHE ----
    if alerts:
        with cache_lock:
            country_risk_cache[country] = {
                "checked_at": now,
                "alerts": alerts,
            }

        for src, headline, kw in alerts:
            print(
                f"🚨 ALERT | Supplier={supplier} | "
                f"Country={country} | Keyword={kw} | "
                f"Source={src} | {headline}"
            )

# ============================================================
# SUBSCRIBE & RUN
# ============================================================

pw.io.subscribe(supply_chain_table, on_change=on_supplier_event)
pw.run(monitoring_level=pw.MonitoringLevel.NONE)
