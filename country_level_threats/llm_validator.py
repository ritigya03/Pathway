# llm_validator.py
import os
import json
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY not set")

# Gemini 2.0 Flash (fast + cheap, REST)
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1/models/"
    "gemini-2.0-flash:generateContent"
)

def is_real_supply_chain_threat(country: str, headline: str, description: str) -> bool:
    """
    Returns True if Gemini says this is a real supply-chain threat,
    False if it is a false positive.
    """

    prompt = f"""
You are a supply chain risk analyst. Evaluate if this news is a REAL supply chain threat.

Country being evaluated: {country}
Headline: {headline}
Description: {description}

STRICT CRITERIA - Answer YES only if ALL of these are true:
1. The event is physically happening IN {country} (not other countries)
<<<<<<< HEAD:country_level_threats/llm_validator.py
2. The event DIRECTLY affects: factories, ports, transportation, logistics, manufacturing, or supplier operations in a harful manner
=======
2. The event DIRECTLY affects: factories, ports, transportation, logistics, manufacturing, or supplier operations
>>>>>>> bb25e63f08f1b25cc68a9d99dbb4dc4af013f82c:supply_chain/llm_validator.py
3. The event is NOT just political commentary, financial news, or metaphorical language
4. Keywords like "fire", "strike", "war" refer to LITERAL events, not metaphors (e.g., "draws fire" = criticism = NO)

REJECT if:
- Event is in a different country than {country}
- "Fire" means criticism/controversy (not literal fire)
- "War" or "strike" is about other countries' conflicts
- Only about stock prices, regulations, or policy debates
- About finished consumer products (chips, phones) not raw materials/manufacturing

Answer with ONLY one word: YES or NO
"""

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 5
        }
    }

    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=10,
        )

        resp.raise_for_status()
        data = resp.json()

        answer = (
            data["candidates"][0]["content"]["parts"][0]["text"]
            .strip()
            .upper()
        )

        return answer.startswith("YES")

    except Exception as e:
        print(f"❌ Gemini validation error: {e}")
        # Fail-safe: treat as NOT a threat
        return False