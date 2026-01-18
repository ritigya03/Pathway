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


def is_real_reputational_threat(
    company: str, 
    category: str, 
    headline: str, 
    content: str
) -> bool:
    """
    Returns True if Gemini says this is a real reputational threat,
    False if it is a false positive.
    
    Validation criteria varies by company category:
    - fake: fraud, impersonation, unverifiable claims
    - legitimate: operational issues, complaints, clarifications
    - restricted: accessibility concerns, policy issues
    """

    # Build category-specific criteria
    if category == "fake":
        criteria = """
STRICT CRITERIA - Answer YES only if the news indicates:
1. Inconsistent or unverifiable public records
2. Impersonation attempts or identity fraud
3. Misleading branding or operational claims
4. Evidence of fraudulent business practices

REJECT if:
- Just general business news
- Normal operational updates
- Minor complaints without fraud indicators
"""
    elif category == "legitimate":
        criteria = """
STRICT CRITERIA - Answer YES only if the news indicates:
1. Public complaints or negative customer feedback
2. Need for company clarification or corrective action
3. Operational issues affecting reputation
4. Stakeholder concerns requiring response

REJECT if:
- Positive news or normal operations
- Minor issues without reputational impact
- Just routine business updates
"""
    elif category == "restricted":
        criteria = """
STRICT CRITERIA - Answer YES only if the news indicates:
1. Extended approval timelines causing frustration
2. Strict onboarding or contract policies
3. Operational accessibility concerns
4. Partnership or collaboration difficulties

REJECT if:
- Normal business procedures
- Positive operational news
- Minor procedural updates
"""
    else:
        # Unknown category, be conservative
        criteria = """
STRICT CRITERIA - Answer YES only if there is clear reputational risk.
"""

    prompt = f"""
You are a corporate reputation analyst. Evaluate if this news represents a REAL reputational threat.

Company: {company}
Category: {category}
Headline: {headline}
Content: {content}

{criteria}

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
