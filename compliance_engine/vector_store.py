import chromadb
from chromadb.utils import embedding_functions
import hashlib
import tiktoken

class VectorStore:
    def __init__(self, collection_name="compliance_docs"):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        # Try to get existing collection or create new
        try:
            self.collection = self.client.get_collection(
                name=collection_name,
                embedding_function=self.embedding_function
            )
        except:
            self.collection = self.client.create_collection(
                name=collection_name,
                embedding_function=self.embedding_function
            )
    
    def chunk_text(self, text, chunk_size=500, overlap=50):
        """Split text into overlapping chunks"""
        chunks = []
        start = 0
        
        # Simple character-based chunking (you can improve this)
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
            
        return chunks
    
    def add_documents(self, documents):
        """Add documents to vector store"""
        all_chunks = []
        all_metadatas = []
        all_ids = []
        
        for doc in documents:
            name = doc["name"]
            text = doc["text"]
            
            # Skip very short documents
            if len(text.strip()) < 50:
                continue
            
            # Chunk the document
            chunks = self.chunk_text(text)
            
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.md5(f"{name}_{i}".encode()).hexdigest()
                
                all_chunks.append(chunk)
                all_metadatas.append({
                    "source": name,
                    "doc_type": "company_document" if "compliance_policy" not in name.lower() else "policy"
                })
                all_ids.append(chunk_id)
        
        # Add to collection
        if all_chunks:
            self.collection.add(
                documents=all_chunks,
                metadatas=all_metadatas,
                ids=all_ids
            )
            
        return len(all_chunks)
    
    def search(self, query, n_results=5):
        """Search for relevant chunks"""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        return results