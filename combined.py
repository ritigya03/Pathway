import pathway as pw
import os
import requests
import time
from dotenv import load_dotenv
from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.splitters import TokenCountSplitter
from pathway.xpacks.llm.llms import LiteLLMChat
from pathway.xpacks.llm.embedders import GeminiEmbedder
from pathway.xpacks.llm.parsers import SlideParser
from pathway.xpacks.llm.servers import QARestServer
from pathway.xpacks.llm.question_answering import BaseRAGQuestionAnswerer
from pathway.stdlib.indexing import BruteForceKnnFactory, TantivyBM25Factory, HybridIndexFactory

load_dotenv()
pw.set_license_key("C9602B-C84476-AB9915-36D2D6-92FC0E-V3")

# ============================================================================
# NEWS CONNECTOR
# ============================================================================
class GNewsSchema(pw.Schema):
    doc: str
    _metadata: dict

class GNewsConnector(pw.io.python.ConnectorSubject):
    def __init__(self, api_key: str, refresh_interval: int = 300):
        super().__init__()
        self.api_key = api_key
        self.refresh_interval = refresh_interval
        
    def run(self):
        while True:
            try:
                url = f"https://gnews.io/api/v4/top-headlines?category=general&apikey={self.api_key}"
                print(f"📡 Fetching news from GNews API...")
                
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                data = response.json()
                articles = data.get("articles", [])
                
                print(f"✅ Fetched {len(articles)} articles")
                
                for art in articles:
                    text_content = f"Headline: {art.get('title', 'No title')}\nSummary: {art.get('description', 'No description')}"
                    
                    self.next(
                        doc=text_content,
                        _metadata={
                            "url": art.get("url", ""),
                            "source": "gnews_api",
                            "title": art.get('title', ''),
                            "published_at": art.get('publishedAt', '')
                        }
                    )
                
                print(f"⏳ Waiting {self.refresh_interval} seconds before next fetch...")
                time.sleep(self.refresh_interval)
                
            except Exception as e:
                print(f"❌ Error fetching news: {e}")
                time.sleep(60)

# ============================================================================
# UNIFIED DOCUMENT STORE SETUP
# ============================================================================
def setup_unified_document_store():
    """Setup and return a unified document store combining all sources"""
    print("🚀 Setting up Unified Document Store...")
    
    # ========================================================================
    # SOURCE 1 & 2: Local Data Folder + Google Drive (need parsing)
    # ========================================================================
    print("📁 Setting up file sources (local + Google Drive)...")
    local_docs = pw.io.fs.read(
        path="data", 
        format="binary", 
        with_metadata=True
    )
    
    gdrive_docs = pw.io.gdrive.read(
        object_id="1oLE60NfEO8K0BNBK_48Q_VqznUX7Ypxi",
        service_user_credentials_file="gdrive_indexer.json",
        name_pattern=["*.pdf", "*.pptx"],
        with_metadata=True,
        refresh_interval=30
    )
    
    # ========================================================================
    # PARSER SETUP (for PDFs and PPTX only)
    # ========================================================================
    print("🔧 Setting up parser for documents...")
    parser_llm = LiteLLMChat(
        model="gemini/gemini-2.0-flash",
        retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=2),
        cache_strategy=pw.udfs.DefaultCache(),
        temperature=0
    )
    
    parse_prompt = """Apply OCR to following page and respond in markdown. 
Tables should be formatted as markdown tables. Make sure to include table information such as title in a readable format.
Spell out all the text that is on the page."""
    
    parser = SlideParser(
        llm=parser_llm,
        parse_prompt=parse_prompt,
        image_size=(800, 1200),
        cache_strategy=pw.udfs.DefaultCache()
    )
    
    # ========================================================================
    # SOURCE 3: News API (no parsing needed - already text)
    # ========================================================================
    print("📰 Setting up News API source...")
    api_key = os.environ.get("G_NEWS_API_KEY")
    if not api_key:
        raise ValueError("G_NEWS_API_KEY environment variable is not set!")
    
    connector = GNewsConnector(api_key=api_key, refresh_interval=300)
    news_table = pw.io.python.read(
        connector, 
        schema=GNewsSchema, 
        autocommit_duration_ms=5000
    )
    news_table = news_table.filter(news_table.doc != "")
    # Keep news as string data - don't convert to bytes
    news_table_formatted = news_table.select(
        data=news_table.doc, 
        _metadata=news_table._metadata
    )
    
    # ========================================================================
    # EMBEDDER AND INDEXING (shared)
    # ========================================================================
    print("🧠 Setting up embedder and indexing...")
    embedder = GeminiEmbedder(
        model="models/embedding-001",
        cache_strategy=pw.udfs.DefaultCache(),
        retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=3)
    )
    
    splitter = TokenCountSplitter(min_tokens=150, max_tokens=600)
    
    # Hybrid index combining KNN and BM25
    knn_index = BruteForceKnnFactory(
        reserved_space=2000,
        embedder=embedder, 
        metric=pw.engine.BruteForceKnnMetricKind.COS
    )
    bm25_index = TantivyBM25Factory()
    retriever_factory = HybridIndexFactory(
        retriever_factories=[knn_index, bm25_index]
    )
    
    # ========================================================================
    # CREATE TWO SEPARATE DOCUMENT STORES
    # ========================================================================
    print("📚 Creating document store for files...")
    file_document_store = DocumentStore(
        docs=[local_docs, gdrive_docs],
        parser=parser,
        splitter=splitter,
        retriever_factory=retriever_factory
    )
    
    print("📰 Creating document store for news (no parsing)...")
    news_document_store = DocumentStore(
        docs=[news_table_formatted],
        parser=None,  # No parser needed for text
        splitter=splitter,
        retriever_factory=retriever_factory
    )
    
    print("✅ Document Stores ready!")
    return file_document_store, news_document_store

# ============================================================================
# UNIFIED QUESTION ANSWERER
# ============================================================================
class UnifiedQuestionAnswerer:
    """Wrapper that queries both document stores and combines results"""
    
    def __init__(self, file_store, news_store, llm, prompt_template, search_topk=5):
        self.file_store = file_store
        self.news_store = news_store
        self.llm = llm
        self.prompt_template = prompt_template
        self.search_topk = search_topk
        
        # Create individual QA systems for retrieval compatibility
        self.file_qa = BaseRAGQuestionAnswerer(
            llm=llm,
            indexer=file_store,
            prompt_template=prompt_template,
            search_topk=search_topk // 2 + 1
        )
        self.news_qa = BaseRAGQuestionAnswerer(
            llm=llm,
            indexer=news_store,
            prompt_template=prompt_template,
            search_topk=search_topk // 2 + 1
        )
    
    def retrieve(self, query, **kwargs):
        """Retrieve from both stores and combine"""
        # Get results from both stores
        file_results = self.file_qa.retrieve(query=query, **kwargs)
        news_results = self.news_qa.retrieve(query=query, **kwargs)
        
        # Combine the results tables
        combined = pw.Table.concat_reindex(file_results, news_results)
        return combined
    
    def answer(self, query, **kwargs):
        """Query both stores and generate answer from combined context"""
        # Retrieve from both
        file_docs = self.file_qa.retrieve(query=query, k=self.search_topk // 2 + 1)
        news_docs = self.news_qa.retrieve(query=query, k=self.search_topk // 2 + 1)
        
        # Get the actual text content
        file_context = ""
        news_context = ""
        
        try:
            if file_docs is not None:
                file_df = file_docs.select(pw.this.data).to_pandas()
                if not file_df.empty:
                    file_context = "\n\n".join(file_df['data'].tolist())
        except:
            pass
            
        try:
            if news_docs is not None:
                news_df = news_docs.select(pw.this.data).to_pandas()
                if not news_df.empty:
                    news_context = "\n\n".join(news_df['data'].tolist())
        except:
            pass
        
        # Combine contexts
        combined_context = f"{file_context}\n\n{news_context}".strip()
        
        # Generate answer
        filled_prompt = self.prompt_template.format(
            context=combined_context if combined_context else "No relevant information found.",
            query=query
        )
        
        response = self.llm.chat(messages=[{"role": "user", "content": filled_prompt}])
        return response
    
    def summarize(self, query, **kwargs):
        return self.answer(query=query, **kwargs)
    
    def get_vector_store(self):
        """Return file store's vector store for server compatibility"""
        return self.file_store._retriever
    
    def __getattr__(self, name):
        # Fallback to file_qa for other server methods
        return getattr(self.file_qa, name)

# ============================================================================
# MAIN APPLICATION
# ============================================================================
print("🚀 Starting Unified RAG System...")

# Setup document stores
file_store, news_store = setup_unified_document_store()

# Create LLM for question answering
llm = LiteLLMChat(
    model="gemini/gemini-2.0-flash",
    retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=2),
    cache_strategy=pw.udfs.DefaultCache(),
    temperature=0.1,
    verbose=True
)

# Create prompt template
prompt_template = """You are a helpful AI assistant with access to multiple information sources including:
- Real-time news articles
- Corporate documents and presentations
- Technical documentation

Use the following context to answer the question accurately. If you cannot find the answer in the provided context, say so clearly.

Context:
{context}

Question: {query}

Answer:"""

# Create unified question answerer
print("🔧 Creating Unified Question Answerer...")
question_answerer = UnifiedQuestionAnswerer(
    file_store=file_store,
    news_store=news_store,
    llm=llm,
    prompt_template=prompt_template,
    search_topk=5
)

print("✅ Question Answerer created!")

# Start REST API server
print("🌐 Starting REST API server on http://0.0.0.0:8080")
server = QARestServer(
    host="0.0.0.0", 
    port=8080, 
    rag_question_answerer=question_answerer
)

print("🎉 Unified RAG System is running!")
print("📡 API endpoints available:")
print("   - POST http://0.0.0.0:8080/v1/pw_ai_answer")
print("   - POST http://0.0.0.0:8080/v1/pw_ai_summary")
print("   - GET  http://0.0.0.0:8080/v1/pw_list_documents")

pw.run()