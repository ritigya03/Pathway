import chromadb
import hashlib
import os
import sys

class VectorStoreSimple:
    def __init__(self, collection_name="compliance_docs"):
        print("🚀 Initializing ChromaDB (v1.0.0+)...", flush=True)
        
        # Use app directory for Docker persistence
        persist_directory = os.getenv("CHROMA_DB_PATH", "/app/chroma_data")
        os.makedirs(persist_directory, exist_ok=True)
        
        print(f"📁 ChromaDB directory: {persist_directory}", flush=True)
        
        try:
            self.client = chromadb.PersistentClient(path=persist_directory)
            print(f"✅ Created persistent client at: {persist_directory}", flush=True)
        except Exception as e:
            print(f"⚠️ Persistent client failed: {e}, falling back to in-memory...", flush=True)
            self.client = chromadb.Client()
        
        # Delete old collection if exists (fresh start each run)
        try:
            self.client.delete_collection(name=collection_name)
            print(f"🗑️ Deleted old collection: {collection_name}", flush=True)
        except:
            pass
        
        # Create new collection
        try:
            self.collection = self.client.create_collection(name=collection_name)
            print(f"✅ Created new collection: {collection_name}", flush=True)
        except Exception as create_error:
            print(f"❌ Failed to create collection: {create_error}", flush=True)
            raise
    
    def chunk_text(self, text, chunk_size=300, overlap=30):
        """Split text into smaller overlapping chunks"""
        if not text or not text.strip():
            return []
        
        words = text.split()
        if len(words) <= chunk_size:
            return [' '.join(words)]
        
        chunks = []
        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk = ' '.join(words[start:end])
            chunks.append(chunk)
            start = end - overlap
            if start >= len(words):
                break
        
        return chunks
    
    def add_documents(self, documents):
        """Add documents to vector store with progress tracking"""
        if not documents:
            print("⚠️ No documents to add", flush=True)
            return 0
        
        print(f"\n📄 Processing {len(documents)} documents...", flush=True)
        
        all_chunks = []
        all_metadatas = []
        all_ids = []
        
        for doc_idx, doc in enumerate(documents, 1):
            name = doc.get("name", f"document_{doc_idx}")
            text = doc.get("text", "")
            
            # Skip empty documents
            if not text or len(text.strip()) < 50:
                print(f"  ⚠️ Skipping empty doc: {name}", flush=True)
                continue
            
            # Chunk the document
            chunks = self.chunk_text(text)
            
            # Print progress immediately
            print(f"  📄 [{doc_idx}/{len(documents)}] {name}: {len(chunks)} chunks", flush=True)
            
            for i, chunk in enumerate(chunks):
                # Create unique ID
                chunk_id = hashlib.md5(f"{name}_{doc_idx}_{i}".encode()).hexdigest()
                
                all_chunks.append(chunk)
                all_metadatas.append({
                    "source": name,
                    "doc_idx": doc_idx,
                    "chunk_idx": i,
                    "doc_type": "company_document" if "compliance_policy" not in name.lower() else "policy"
                })
                all_ids.append(chunk_id)
        
        if not all_chunks:
            print("⚠️ No valid chunks extracted from documents", flush=True)
            return 0
        
        # Add chunks in smaller batches to avoid Docker memory issues
        print(f"\n📊 Adding {len(all_chunks)} chunks to database...", flush=True)
        
        batch_size = 25  # Smaller batches for Docker
        total_added = 0
        
        try:
            num_batches = (len(all_chunks) - 1) // batch_size + 1
            
            for i in range(0, len(all_chunks), batch_size):
                batch_num = i // batch_size + 1
                batch_end = min(i + batch_size, len(all_chunks))
                batch_chunks = all_chunks[i:batch_end]
                batch_metas = all_metadatas[i:batch_end]
                batch_ids = all_ids[i:batch_end]
                
                print(f"  📦 Batch {batch_num}/{num_batches}: Adding {len(batch_chunks)} chunks...", flush=True)
                
                self.collection.add(
                    documents=batch_chunks,
                    metadatas=batch_metas,
                    ids=batch_ids
                )
                
                total_added += len(batch_chunks)
                print(f"     ✅ Progress: {total_added}/{len(all_chunks)} chunks added", flush=True)
            
            print(f"\n✅ Successfully added all {total_added} chunks to vector database", flush=True)
            return total_added
            
        except Exception as e:
            print(f"❌ Failed to add documents to vector store: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return 0
    
    def search(self, query, n_results=5):
        """Search for relevant chunks"""
        if not query or not query.strip():
            print("⚠️ Empty query provided", flush=True)
            return {'documents': [[]], 'metadatas': [[]], 'ids': [[]], 'distances': [[]]}
        
        try:
            print(f"🔍 Searching vector database...", flush=True)
            
            results = self.collection.query(
                query_texts=[query],
                n_results=min(n_results, 10)
            )
            
            if results and results['documents'] and results['documents'][0]:
                print(f"✅ Found {len(results['documents'][0])} relevant chunks", flush=True)
            else:
                print("⚠️ No matching chunks found", flush=True)
            
            return results
        except Exception as e:
            print(f"⚠️ Search error: {e}", flush=True)
            return {'documents': [[]], 'metadatas': [[]], 'ids': [[]], 'distances': [[]]}