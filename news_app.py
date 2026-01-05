import pathway as pw
import os
import json
import requests
import time
from dotenv import load_dotenv
from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.splitters import TokenCountSplitter
from pathway.xpacks.llm.embedders import GeminiEmbedder
from pathway.stdlib.indexing import BruteForceKnnFactory, TantivyBM25Factory, HybridIndexFactory

load_dotenv()
pw.set_license_key("C9602B-C84476-AB9915-36D2D6-92FC0E-V3")

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

def setup_news_document_store():
    """Setup and return the news document store"""
    print("📰 Setting up News Document Store...")
    
    api_key = os.environ.get("G_NEWS_API_KEY")
    if not api_key:
        raise ValueError("G_NEWS_API_KEY environment variable is not set!")
    
    connector = GNewsConnector(api_key=api_key, refresh_interval=300)
    news_table = pw.io.python.read(connector, schema=GNewsSchema, autocommit_duration_ms=5000)
    news_table = news_table.filter(news_table.doc != "")
    news_table_fixed = news_table.select(data=news_table.doc, _metadata=news_table._metadata)
    
    news_splitter = TokenCountSplitter(min_tokens=100, max_tokens=500)
    
    news_embedder = GeminiEmbedder(
        model="models/embedding-001",
        cache_strategy=pw.udfs.DefaultCache(),
        retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=3)
    )
    
    news_knn_index = BruteForceKnnFactory(
        reserved_space=500, 
        embedder=news_embedder, 
        metric=pw.engine.BruteForceKnnMetricKind.COS
    )
    news_bm25_index = TantivyBM25Factory()
    news_retriever_factory = HybridIndexFactory(retriever_factories=[news_knn_index, news_bm25_index])
    
    news_document_store = DocumentStore(
        docs=[news_table_fixed],
        parser=None,
        splitter=news_splitter,
        retriever_factory=news_retriever_factory
    )
    
    print("✅ News Document Store ready!")
    return news_document_store