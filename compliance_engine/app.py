import os
import sys
import json
import re
import subprocess
from dotenv import load_dotenv
import requests
load_dotenv()
import pathway as pw
from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.parsers import ParseUnstructured
from pathway.xpacks.llm.splitters import TokenCountSplitter
from pathway.xpacks.llm.embedders import GeminiEmbedder
from pathway.xpacks.llm.llms import LiteLLMChat
from pathway.xpacks.llm.question_answering import BaseRAGQuestionAnswerer
from pathway.stdlib.indexing import BruteForceKnnFactory, TantivyBM25Factory, HybridIndexFactory

class PathwayComplianceAnalyzer:
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.company_folder_id = os.getenv("COMPANY_DOCS_FOLDER_ID")
        self.threat_folder_id = os.getenv("THREAT_POLICIES_FOLDER_ID")
        self.credentials_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        
        if not all([self.gemini_api_key, self.company_folder_id, self.threat_folder_id]):
            raise ValueError("Missing environment variables")
        
        # Set Pathway license 
        license_key = os.getenv("PATHWAY_LICENSE_KEY")
        if license_key:
            pw.set_license_key(license_key)
        
        print("Initializing Pathway RAG system...")
        self.setup_pathway_pipeline()
    
    def setup_pathway_pipeline(self):
        """Setup Pathway document processing pipeline with proper RAG"""
        print("Setting up Pathway data sources...")
        
        # Read from Google Drive folders
        company_docs = pw.io.gdrive.read(
            object_id=self.company_folder_id,
            service_user_credentials_file=self.credentials_file,
            mode="streaming",
            with_metadata=True
        )
        
        threat_docs = pw.io.gdrive.read(
            object_id=self.threat_folder_id,
            service_user_credentials_file=self.credentials_file,
            mode="streaming",
            with_metadata=True
        )
        
        print("Connected to Google Drive folders")
        
        # Add source tags
        company_docs = company_docs.select(
            data=pw.this.data,
            _metadata=pw.apply(
                lambda m: {**m, "source_type": "company"} if isinstance(m, dict) else {"source_type": "company"},
                pw.this._metadata
            )
        )
        
        threat_docs = threat_docs.select(
            data=pw.this.data,
            _metadata=pw.apply(
                lambda m: {**m, "source_type": "threat"} if isinstance(m, dict) else {"source_type": "threat"},
                pw.this._metadata
            )
        )
        
        # Setup parser
        print("Configuring document parser...")
        parser = ParseUnstructured()
        
        # Setup text splitter
        print("Configuring text splitter...")
        text_splitter = TokenCountSplitter(min_tokens=200, max_tokens=600)
        
        # Setup embedder
        print("Setting up Gemini embedder...")
        embedder = GeminiEmbedder(
            model="models/embedding-001",
            cache_strategy=pw.udfs.DefaultCache(),
            retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=3)
        )
        
        # Setup retriever factory with hybrid search
        print("Configuring hybrid search (KNN + BM25)...")
        knn_index = BruteForceKnnFactory(
            reserved_space=1000,
            embedder=embedder,
            metric=pw.engine.BruteForceKnnMetricKind.COS
        )
        bm25_index = TantivyBM25Factory()
        retriever_factory = HybridIndexFactory(
            retriever_factories=[knn_index, bm25_index]
        )
        
        # Create document stores
        print("Creating document stores...")
        
        self.company_doc_store = DocumentStore(
            docs=[company_docs],
            parser=parser,
            splitter=text_splitter,
            retriever_factory=retriever_factory
        )
        
        self.threat_doc_store = DocumentStore(
            docs=[threat_docs],
            parser=parser,
            splitter=text_splitter,
            retriever_factory=retriever_factory
        )
        
        # Create LLM for question answering
        print("Setting up LLM for retrieval...")
        llm = LiteLLMChat(
            model="gemini/gemini-2.0-flash-exp",
            retry_strategy=pw.udfs.ExponentialBackoffRetryStrategy(max_retries=2),
            cache_strategy=pw.udfs.DefaultCache(),
            temperature=0.1
        )
        
        # Create question answerers for retrieval
        retrieval_prompt = """Use the following context to extract relevant information:

Context:
{context}

Query: {query}

Provide all relevant information from the context."""

        self.company_qa = BaseRAGQuestionAnswerer(
            llm=llm,
            indexer=self.company_doc_store,
            search_topk=8,
            prompt_template=retrieval_prompt
        )
        
        self.threat_qa = BaseRAGQuestionAnswerer(
            llm=llm,
            indexer=self.threat_doc_store,
            search_topk=10,
            prompt_template=retrieval_prompt
        )
        
        print("Pathway RAG pipeline ready")
        print("Starting Pathway computation in background...")
        
        # Start Pathway computation in a separate thread
        import threading
        self.pathway_thread = threading.Thread(target=self._run_pathway, daemon=True)
        self.pathway_thread.start()
        
        # Give it a moment to initialize
        import time
        time.sleep(2)
    
    def _run_pathway(self):
        """Run Pathway computation in background"""
        try:
            pw.run()
        except Exception as e:
            print(f"Pathway computation error: {e}")
    
    def retrieve_relevant_chunks(self, query, qa_system, top_k=5):
        """Retrieve relevant document chunks using Pathway's RAG"""
        print(f"   Searching for: {query[:60]}...")
        
        try:
            # Use the question answerer to retrieve context
            # Access the indexer's retrieve method directly
            retriever = qa_system.indexer
            
            # Get the retriever's query method
            if hasattr(retriever, 'query_as_of_now'):
                results = retriever.query_as_of_now(query, k=top_k)
            elif hasattr(retriever, 'retrieve'):
                results = retriever.retrieve(query, k=top_k)
            else:
                # Fallback: use the QA system but extract just the context
                print("   Using QA system fallback...")
                response = qa_system.answer(query)
                return str(response)
            
            # Format results
            context_parts = []
            for idx, result in enumerate(results, 1):
                if isinstance(result, dict):
                    chunk_text = result.get('text', result.get('chunk', str(result)))
                    metadata = result.get('metadata', {})
                    source = metadata.get('path', metadata.get('name', 'Unknown'))
                else:
                    chunk_text = str(result)
                    source = 'Document'
                
                context_parts.append(f"[Source {idx}: {source}]\n{chunk_text}\n")
            
            return "\n".join(context_parts) if context_parts else self._fallback_retrieval(query, qa_system)
        
        except Exception as e:
            print(f"   Retrieval error: {e}")
            return self._fallback_retrieval(query, qa_system)
    
    def _fallback_retrieval(self, query, qa_system):
        print("   Using fallback direct retrieval...")
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaIoBaseDownload
        import io
        
        try:
            credentials = service_account.Credentials.from_service_account_file(
                self.credentials_file,
                scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
            service = build('drive', 'v3', credentials=credentials)
            
            # Determine which folder to search
            folder_id = self.company_folder_id if qa_system == self.company_qa else self.threat_folder_id
            
            # List files
            results = service.files().list(
                q=f"'{folder_id}' in parents",
                fields="files(id, name, mimeType)"
            ).execute()
            
            files = results.get('files', [])
            all_content = []
            
            # Prioritize files matching query terms
            query_lower = query.lower()
            
            # Sort files by relevance
            def relevance_score(fname):
                fname_lower = fname.lower()
                score = 0
                for word in query_lower.split():
                    if len(word) > 3 and word in fname_lower:
                        score += 1
                return score
            
            files.sort(key=lambda f: relevance_score(f['name']), reverse=True)
            
            for f in files[:5]:  # Limit to top 5 files
                try:
                    request = service.files().get_media(fileId=f['id'])
                    file_buffer = io.BytesIO()
                    downloader = MediaIoBaseDownload(file_buffer, request)
                    
                    done = False
                    while not done:
                        status, done = downloader.next_chunk()
                    
                    file_buffer.seek(0)
                    
                    # Handle different file types
                    if f['name'].endswith('.pdf'):
                        try:
                            import PyPDF2
                            pdf_reader = PyPDF2.PdfReader(file_buffer)
                            text = ""
                            for page in pdf_reader.pages[:10]:  # First 10 pages
                                text += page.extract_text() + "\n"
                            all_content.append(f"[{f['name']}]\n{text}\n")
                        except Exception as e:
                            print(f"   PDF parse error: {e}")
                    elif f['name'].endswith('.jsonl'):
                        try:
                            content = file_buffer.read().decode('utf-8', errors='ignore')
                            formatted = f"[{f['name']}]\n"
                            for line in content.strip().split('\n')[:20]:  # First 20 lines
                                if line.strip():
                                    try:
                                        obj = json.loads(line)
                                        formatted += json.dumps(obj, indent=2) + "\n"
                                    except:
                                        formatted += line + "\n"
                            all_content.append(formatted)
                        except Exception as e:
                            print(f"   JSONL parse error: {e}")
                    else:
                        try:
                            content = file_buffer.read().decode('utf-8', errors='ignore')
                            all_content.append(f"[{f['name']}]\n{content[:3000]}\n")
                        except:
                            pass
                
                except Exception as e:
                    print(f"   Error reading {f['name']}: {e}")
                    continue
            
            return "\n".join(all_content) if all_content else f"[Unable to retrieve content for: {query}]"
        
        except Exception as e:
            print(f"   Fallback retrieval error: {e}")
            return f"[Unable to retrieve content for query: {query}]"
    
    def get_policy_content(self):
        """Get compliance policy using Pathway retrieval"""
        print("\nRetrieving compliance policy...")
        
        policy_query = "compliance policy rules requirements violations sanctions fraud anti-corruption identity verification"
        policy_context = self.retrieve_relevant_chunks(
            policy_query, 
            self.threat_qa, 
            top_k=10
        )
        
        print(f"Policy retrieved ({len(policy_context)} chars)")
        return policy_context
    
    def get_company_content(self, company_name):
        """Get company document using Pathway retrieval"""
        print(f"   Retrieving: {company_name}")
        
        # Clean company name for better matching
        clean_name = company_name.replace('.pdf', '').replace('.json', '').replace('_', ' ').replace('-', ' ')
        
        company_query = f"{clean_name} company information business operations financial history background profile"
        company_context = self.retrieve_relevant_chunks(
            company_query,
            self.company_qa,
            top_k=8
        )
        
        print(f"   Retrieved ({len(company_context)} chars)")
        return company_context
    
    def analyze_transaction(self, buyer_name, supplier_name):
        """Analyze using Pathway RAG + Gemini"""
        print("\n" + "="*80)
        print("PATHWAY RAG COMPLIANCE ANALYSIS")
        print("="*80)
        
        print(f"\nTransaction:")
        print(f"   Buyer:    {buyer_name}")
        print(f"   Supplier: {supplier_name}")
        
        # Retrieve all necessary documents
        print("\nStep 1: Retrieving compliance policy via Pathway...")
        policy_text = self.get_policy_content()
        
        print(f"\nStep 2: Retrieving buyer document via Pathway...")
        buyer_info = self.get_company_content(buyer_name)
        
        print(f"\nStep 3: Retrieving supplier document via Pathway...")
        supplier_info = self.get_company_content(supplier_name)
        
        print("\nStep 4: Analyzing with Gemini...")
        analysis = self.generate_analysis(
            buyer_name, buyer_info,
            supplier_name, supplier_info,
            policy_text
        )
        
        return analysis
    
    def generate_analysis(self, buyer_name, buyer_info, supplier_name, supplier_info, policy_text):
        """Generate analysis using Gemini"""
        
        # Truncate to fit in context
        policy_snippet = policy_text[:6000] if len(policy_text) > 6000 else policy_text
        buyer_snippet = buyer_info[:4000] if len(buyer_info) > 4000 else buyer_info
        supplier_snippet = supplier_info[:4000] if len(supplier_info) > 4000 else supplier_info
        
        prompt = f"""You are a senior compliance analyst conducting a thorough risk assessment. Analyze this transaction strictly against the provided compliance policy.

COMPLIANCE POLICY:
{policy_snippet}

BUYER ENTITY: {buyer_name}
{buyer_snippet}

SUPPLIER ENTITY: {supplier_name}
{supplier_snippet}

INSTRUCTIONS:
1. Carefully review ALL policy rules including: identity_checks, sanctions_screening, contract_rules, fraud_detection, and spoofing_signs
2. Cross-reference each entity's information against specific policy requirements
3. Identify any missing mandatory information or red flags
4. Provide specific policy rule citations for each finding
5. Base your risk assessment on actual policy violations found

Respond in EXACT format with NO EMOJIS:

RISK LEVEL: [HIGH/MEDIUM/LOW]
Risk Justification: [One sentence explaining the risk level based on findings]

BUYER ANALYSIS ({buyer_name}):
Identity Verification:
- Status: [PASS/FAIL/INCOMPLETE]
- Details: [Specific findings with policy citations]

Sanctions Screening:
- Status: [PASS/FAIL/INCOMPLETE]
- Details: [Specific findings with policy citations]

Fraud Indicators:
- Status: [DETECTED/NOT DETECTED]
- Details: [List any red flags found]

SUPPLIER ANALYSIS ({supplier_name}):
Identity Verification:
- Status: [PASS/FAIL/INCOMPLETE]
- Details: [Specific findings with policy citations]

Sanctions Screening:
- Status: [PASS/FAIL/INCOMPLETE]
- Details: [Specific findings with policy citations]

Fraud Indicators:
- Status: [DETECTED/NOT DETECTED]
- Details: [List any red flags found]

POLICY VIOLATIONS DETECTED:
[List each violation with specific policy rule citation, or state "None detected"]
1. [Violation with policy rule reference]
2. [Violation with policy rule reference]

MANDATORY INFORMATION GAPS:
[List missing required information per identity_checks policy]
1. [Missing field and which entity]
2. [Missing field and which entity]

ACTION ITEMS:
1. [Specific action required]
2. [Specific action required]
3. [Specific action required]

FINAL DECISION: [APPROVE/CONDITIONAL APPROVAL/REJECT]
Decision Rationale: [2-3 sentences explaining why this decision was made based on policy compliance]

EXECUTIVE SUMMARY:
[Concise 2-3 sentence summary of key findings and recommendation]"""
        
        try:
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
            
            response = requests.post(
                f"{url}?key={self.gemini_api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 3000}
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                return text if text else "ERROR: Empty response"
            else:
                return f"ERROR: API {response.status_code}"
                
        except Exception as e:
            return f"ERROR: {str(e)}"
    
    def parse_and_display(self, buyer_name, supplier_name, result):
        """Parse and display results in structured format"""
        print("\n\n" + "="*80)
        print("COMPLIANCE ANALYSIS REPORT")
        print("="*80)
        print(f"Transaction: {buyer_name} <-> {supplier_name}")
        print(f"Analysis Date: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        # Display raw structured output
        print("\n" + result)
        print("\n" + "="*80)

def main():
    print("="*80)
    print("PATHWAY RAG COMPLIANCE ANALYZER")
    print("Real-time Document Retrieval and Risk Assessment")
    print("="*80)
    
    try:
        analyzer = PathwayComplianceAnalyzer()
        
        print("\nTRANSACTION DETAILS")
        print("-"*80)
        print("Enter company names (exact names or file names):")
        
        buyer = input("\nBUYER: ").strip()
        while not buyer:
            buyer = input("BUYER: ").strip()
        
        supplier = input("SUPPLIER: ").strip()
        while not supplier:
            supplier = input("SUPPLIER: ").strip()
        
        result = analyzer.analyze_transaction(buyer, supplier)
        
        if result:
            analyzer.parse_and_display(buyer, supplier, result)
            print("\nAnalysis complete. Powered by Pathway RAG")
        else:
            print("\nError: Analysis failed")
        
    except KeyboardInterrupt:
        print("\n\nProcess interrupted by user")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()