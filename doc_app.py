import pathway as pw
from dotenv import load_dotenv
from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.splitters import TokenCountSplitter
from pathway.xpacks.llm.llms import LiteLLMChat
from pathway.xpacks.llm.embedders import GeminiEmbedder
from pathway.xpacks.llm.parsers import SlideParser
from pathway.stdlib.indexing import BruteForceKnnFactory, TantivyBM25Factory, HybridIndexFactory

load_dotenv()
pw.set_license_key("C9602B-C84476-AB9915-36D2D6-92FC0E-V3")

def setup_doc_document_store():
    """Setup and return the document document store"""
    print("📄 Setting up Document Store...")
    
    # Document sources
    sources = [
        pw.io.fs.read(path="data", format="binary", with_metadata=True),
        pw.io.gdrive.read(
            object_id="1oLE60NfEO8K0BNBK_48Q_VqznUX7Ypxi",
            service_user_credentials_file="gdrive_indexer.json",
            name_pattern=["*.pdf", "*.pptx"],
            with_metadata=True,
            refresh_interval=30
        )
    ]
    
    # Parser
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
    
    # Embedder and retriever
    doc_embedder = GeminiEmbedder(
        model="models/embedding-001",
        cache_strategy=pw.udfs.DefaultCache(),
        retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=3)
    )
    
    doc_splitter = TokenCountSplitter(min_tokens=200, max_tokens=750)
    
    doc_knn_index = BruteForceKnnFactory(
        reserved_space=1000, 
        embedder=doc_embedder, 
        metric=pw.engine.BruteForceKnnMetricKind.COS
    )
    doc_bm25_index = TantivyBM25Factory()
    doc_retriever_factory = HybridIndexFactory(retriever_factories=[doc_knn_index, doc_bm25_index])
    
    doc_document_store = DocumentStore(
        docs=sources,
        parser=parser,
        splitter=doc_splitter,
        retriever_factory=doc_retriever_factory
    )
    
    print("✅ Document Store ready!")
    return doc_document_store
