import os
import time
import threading
import requests
import pathway as pw
from dotenv import load_dotenv

from supply_chain_stream import supply_chain_table

# ---------------------------------
# 0. Config
# ---------------------------------
load_dotenv()
GNEWS_API_KEY = os.getenv("G_NEWS_API_KEY")

RISK_KEYWORDS = [
    "strike",
    "sanctions",
    "war",
    "conflict",
    "shutdown",
    "port disruption",
    "earthquake",
    "flood",
    "political unrest",
]

CACHE_TTL_SEC = 30 * 60  # 30 minutes

# ---------------------------------
# 1. Country Risk Cache
# ---------------------------------
country_risk_cache = {}
cache_lock = threading.Lock()


# ---------------------------------
# 2. GNews API call
# ---------------------------------
def fetch_country_risk(country: str):
    query = country + " " + " OR ".join(RISK_KEYWORDS)

    url = (
        "https://gnews.io/api/v4/search"
        f"?q={query}&lang=en&max=3&apikey={GNEWS_API_KEY}"
    )

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        articles = resp.json().get("articles", [])

        if articles:
            return {
                "status": "RISK",
                "headline": articles[0].get("title"),
                "checked_at": time.time(),
            }

        return {"status": "SAFE", "headline": None, "checked_at": time.time()}

    except Exception as e:
        print(f"❌ GNews error for {country}: {e}")
        return None


# ---------------------------------
# 3. Supplier event handler
# ---------------------------------
def on_supplier_event(key, row, time, is_addition):
    country = row["source_location"]
    supplier = row["supplier_firm"]
    now = time
    print(f"{country} {supplier}")
    with cache_lock:
        cached = country_risk_cache.get(country)
        if cached and (now - cached["checked_at"] < CACHE_TTL_SEC):
            if cached["status"] == "RISK":
                print(
                    f"🚨 ALERT | Supplier={supplier} | "
                    f"Country={country} | "
                    f"Issue={cached['headline']}"
                )
            return

    # Cache miss → async API call
    def async_check():
        result = fetch_country_risk(country)
        if not result:
            return

        with cache_lock:
            country_risk_cache[country] = result

        if result["status"] == "RISK":
            print(
                f"🚨 ALERT | Supplier={supplier} | "
                f"Country={country} | "
                f"Issue={result['headline']}"
            )

    threading.Thread(target=async_check, daemon=True).start()


# ---------------------------------
# 4. Subscribe to supplier stream
# ---------------------------------
pw.io.subscribe(supply_chain_table, on_change=on_supplier_event)

# ---------------------------------
# 5. Run Pathway engine
# ---------------------------------
pw.run(monitoring_level=pw.MonitoringLevel.NONE)
