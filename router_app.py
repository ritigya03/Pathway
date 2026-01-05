import pathway as pw
from dotenv import load_dotenv
from pathway.xpacks.llm.llms import LiteLLMChat
from pathway.xpacks.llm.servers import QARestServer
from pathway.xpacks.llm.question_answering import BaseRAGQuestionAnswerer

# Import setup functions
from news_app import setup_news_document_store
from doc_app import setup_doc_document_store

load_dotenv()
pw.set_license_key("C9602B-C84476-AB9915-36D2D6-92FC0E-V3")

print("🚀 Starting Agentic Router RAG System...")

# Setup document stores
print("\n📰 Initializing News QA System...")
news_document_store = setup_news_document_store()

print("\n📄 Initializing Document QA System...")
doc_document_store = setup_doc_document_store()

print("\n✅ Both document stores initialized!")

# Create LLMs for both QA systems
news_llm = LiteLLMChat(
    model="gemini/gemini-2.0-flash",
    retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=2),
    cache_strategy=pw.udfs.DefaultCache(),
    temperature=0.1,
    verbose=False
)

doc_llm = LiteLLMChat(
    model="gemini/gemini-2.0-flash",
    retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=2),
    cache_strategy=pw.udfs.DefaultCache(),
    temperature=0,
    verbose=False
)

news_prompt = """You are a real-time news assistant. Use the following news snippets to answer the question. 
If the information is not in the context, respond ONLY with: I do not have enough information.

Context:
{context}

Question: {query}
Answer:"""

doc_prompt = """You are a corporate document specialist. Answer the user's question based strictly on the provided technical documents. 
If the answer is not present in the text, you MUST say: NOT_FOUND

Context:
{context}

Question: {query}
Helpful Answer:"""

# Create Question Answerers
print("\n🔧 Creating Question Answerers...")

news_question_answerer = BaseRAGQuestionAnswerer(
    llm=news_llm,
    indexer=news_document_store,
    prompt_template=news_prompt,
    search_topk=5
)
doc_question_answerer = BaseRAGQuestionAnswerer(
    llm=doc_llm,
    indexer=doc_document_store,
    prompt_template=doc_prompt, 
    search_topk=5
)

print("✅ Question answerers created!")

# Improved router with better prompt and keyword detection
router_llm = LiteLLMChat(model="gemini/gemini-2.0-flash", temperature=0)

def improved_router(query: str):
    """
    Determines which tool to use with improved logic
    """
    query_lower = query.lower()
    
    # Keyword-based routing (fast path)
    news_keywords = ['news', 'headline', 'today', 'latest', 'recent', 'breaking', 
                     'current events', 'happening now', 'this week', 'yesterday']
    doc_keywords = ['document', 'presentation', 'report', 'slide', 'pdf', 
                    'technical', 'specification', 'manual']
    
    # Check for explicit keywords first
    has_news_keyword = any(kw in query_lower for kw in news_keywords)
    has_doc_keyword = any(kw in query_lower for kw in doc_keywords)
    
    if has_news_keyword and not has_doc_keyword:
        print(f"🔀 Routing to NEWS (keyword match)")
        return news_question_answerer
    elif has_doc_keyword and not has_news_keyword:
        print(f"🔀 Routing to DOCUMENTS (keyword match)")
        return doc_question_answerer
    
    # Use LLM for ambiguous cases
    prompt = f"""Classify this query as either NEWS or DOCUMENTS.

NEWS queries ask about:
- Current events, headlines, breaking news
- Recent happenings, today's events
- Latest updates, what's happening now

DOCUMENTS queries ask about:
- Technical documentation, presentations, reports
- Company documents, PDFs, specifications
- Internal information, manuals

Query: "{query}"

Respond with ONLY one word: NEWS or DOCUMENTS"""
    
    try:
        decision = router_llm.chat(messages=[{"role": "user", "content": prompt}])
        clean_decision = decision.strip().upper()
        print(f"🤖 LLM decision: '{clean_decision}' for query: '{query}'")
        
        if "NEWS" in clean_decision:
            print(f"🔀 Routing to NEWS")
            return news_question_answerer
        else:
            print(f"🔀 Routing to DOCUMENTS")
            return doc_question_answerer
    except Exception as e:
        print(f"⚠️ Router LLM error: {e}, defaulting to DOCUMENTS")
        return doc_question_answerer

# Wrapper with debugging
class RoutedQA:
    def answer(self, query, **kwargs):
        print(f"\n📥 Received query: '{query}'")
        answerer = improved_router(query)
        print(f"🎯 Using answerer: {type(answerer).__name__}")
        result = answerer.answer(query=query, **kwargs)
        print(f"✅ Answer generated")
        return result
    
    def summarize(self, query, **kwargs):
        print(f"\n📥 Received summarize request: '{query}'")
        answerer = improved_router(query)
        return answerer.summarize(query=query, **kwargs)

    def __getattr__(self, name):
        # Fallback for server calls like 'get_vector_store'
        return getattr(doc_question_answerer, name)

# Start Server
print("\n🌐 Starting REST API server...")
server = QARestServer(
    host="0.0.0.0", 
    port=8080, 
    rag_question_answerer=RoutedQA()
)

print("🚀 Agentic Router Running!")
print("📡 Test with queries like:")
print("   - 'What are the latest news headlines?'")
print("   - 'Tell me about today's news'")
print("   - 'What's in the technical documentation?'")
pw.run()