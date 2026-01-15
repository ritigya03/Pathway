# threat_rag.py
import os
import json
import re
import pathway as pw
from dotenv import load_dotenv

from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.embedders import GeminiEmbedder
from pathway.xpacks.llm.llms import LiteLLMChat
from pathway.xpacks.llm.question_answering import BaseRAGQuestionAnswerer
from pathway.stdlib.indexing import (
    BruteForceKnnFactory,
    TantivyBM25Factory,
    HybridIndexFactory,
)

# ------------------------------------------------------------
# ENV
# ------------------------------------------------------------
load_dotenv()

THREAT_POLICIES_FOLDER_ID = os.getenv("THREAT_POLICIES_FOLDER_ID")
GOOGLE_CREDS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if not THREAT_POLICIES_FOLDER_ID:
    raise RuntimeError("THREAT_POLICIES_FOLDER_ID missing")

# ------------------------------------------------------------
# 🔑 REQUIRED UDF (forces STR type for query)
# ------------------------------------------------------------
@pw.udf(return_type=str)
def build_query(country, threat_type, headline, description):
    return (
        "You are a supply-chain risk analyst.\n\n"
        "Assess severity (LOW, MEDIUM, HIGH, CRITICAL)\n"
        "and suggest 2–3 mitigation actions.\n\n"
        "Respond ONLY with valid JSON:\n"
        "{\"severity\": \"...\", \"actions\": [\"...\", \"...\"]}\n\n"
        f"Country: {country}\n"
        f"Threat Type: {threat_type}\n"
        f"Headline: {headline}\n"
        f"Details: {description}"
    )

# ------------------------------------------------------------
# JSON SAFETY (runtime only)
# ------------------------------------------------------------
def extract_json_from_text(text: str) -> dict:
    if not text:
        return {"severity": "MEDIUM", "actions": ["Monitor", "Review", "Escalate"]}

    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass

    for lvl in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        if lvl in text.upper():
            return {"severity": lvl, "actions": ["Monitor", "Review", "Escalate"]}

    return {"severity": "MEDIUM", "actions": ["Monitor", "Review", "Escalate"]}

# ------------------------------------------------------------
# DOCUMENT STORE
# ------------------------------------------------------------
def build_threat_policy_store() -> DocumentStore:
    print("📋 Loading threat policy documents from Google Drive")

    raw = pw.io.gdrive.read(
        object_id=THREAT_POLICIES_FOLDER_ID,
        service_user_credentials_file=GOOGLE_CREDS,
        name_pattern=[
            "operational_threat_policy.jsonl",
            "geopolitical_threat_policy.jsonl",
        ],
        with_metadata=True,
        refresh_interval=300,
    )

    docs = raw.select(data=raw.data, _metadata=raw._metadata)

    embedder = GeminiEmbedder(model="models/text-embedding-004")

    knn = BruteForceKnnFactory(
        embedder=embedder,
        metric=pw.engine.BruteForceKnnMetricKind.COS,
    )

    bm25 = TantivyBM25Factory()

    return DocumentStore(
        docs=[docs],
        retriever_factory=HybridIndexFactory([knn, bm25]),
    )

# ------------------------------------------------------------
# RAG PIPELINE (SCHEMA-CORRECT)
# ------------------------------------------------------------
def build_threat_rag(threats_table: pw.Table) -> pw.Table:
    store = build_threat_policy_store()

    llm = LiteLLMChat(
        model="gemini/gemini-2.0-flash",
        temperature=0.2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )

    rag = BaseRAGQuestionAnswerer(
        llm=llm,
        indexer=store,
        search_topk=3,
        prompt_template="{context}\n\n{query}",
    )

    # --------------------------------------------------------
    # STEP 1 — build STR-typed query
    # --------------------------------------------------------
    base_queries = threats_table.select(
        query=build_query(
            pw.this.country,
            pw.this.threat_type,
            pw.this.headline,
            pw.this.description,
        ),

        _country=pw.this.country,
        _threat_type=pw.this.threat_type,
        _headline=pw.this.headline,
        _description=pw.this.description,
    )

    # --------------------------------------------------------
    # STEP 2 — retriever + RAG fields (DOC-CORRECT TYPES)
    # --------------------------------------------------------
    pw_ai_queries = base_queries.select(
        query=pw.this.query,
        prompt=pw.this.query,

        # Required by RAG
        filters=pw.apply(lambda _: {}, pw.this.query),

        # Required by retriever
        k=pw.apply(lambda _: 3, pw.this.query),

        # ✅ MUST be Optional[str]
        metadata_filter=pw.apply(lambda _: None, pw.this.query),
        filepath_globpattern=pw.apply(lambda _: None, pw.this.query),

        _country=pw.this._country,
        _threat_type=pw.this._threat_type,
        _headline=pw.this._headline,
        _description=pw.this._description,
    )

    responses = rag.answer_query(pw_ai_queries)

    combined = responses.join(
        pw_ai_queries,
        pw.left.id == pw.right.id,
    ).select(
        country=pw.right._country,
        threat_type=pw.right._threat_type,
        headline=pw.right._headline,
        description=pw.right._description,
        result=pw.left.result,
    )

    return combined.select(
        pw.this.country,
        pw.this.threat_type,
        pw.this.headline,
        pw.this.description,
        severity=pw.apply(lambda r: extract_json_from_text(r)["severity"], pw.this.result),
        actions=pw.apply(
            lambda r: json.dumps(extract_json_from_text(r)["actions"]),
            pw.this.result,
        ),
    )
