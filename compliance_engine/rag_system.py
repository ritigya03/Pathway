import json
import os
import re
import sys
from vector_store_simple import VectorStoreSimple as VectorStore
from gemini_client import GeminiClient

class ComplianceAnalyzerRAG:
    def __init__(self):
        print("🧠 Initializing RAG system with ChromaDB v1.0.0+...")
        sys.stdout.flush()
        
        try:
            self.vector_store = VectorStore()
            self.gemini_client = GeminiClient()
            self.policy = None
            print("✅ RAG system initialized successfully")
            sys.stdout.flush()
        except Exception as e:
            print(f"❌ Failed to initialize RAG system: {e}")
            raise
    
    def parse_jsonl_policy(self, text):
        """Parse JSONL (JSON Lines) policy file"""
        print("📄 Parsing JSONL policy file...")
        sys.stdout.flush()
        
        policy_lines = []
        
        for line in text.splitlines():
            line = line.strip()
            if line:
                try:
                    policy_data = json.loads(line)
                    policy_lines.append(policy_data)
                except json.JSONDecodeError:
                    # Try to fix common JSON issues
                    try:
                        # Remove comments if any
                        line = re.sub(r'//.*', '', line)
                        policy_data = json.loads(line)
                        policy_lines.append(policy_data)
                    except:
                        print(f"⚠️ Skipping invalid JSON line: {line[:50]}...")
        
        if policy_lines:
            if len(policy_lines) == 1:
                return policy_lines[0]
            else:
                # Merge all policy lines
                merged_policy = {}
                for line in policy_lines:
                    if isinstance(line, dict):
                        for key, value in line.items():
                            if key in merged_policy:
                                if isinstance(merged_policy[key], list) and isinstance(value, list):
                                    merged_policy[key].extend(value)
                                elif isinstance(merged_policy[key], dict) and isinstance(value, dict):
                                    merged_policy[key].update(value)
                                else:
                                    merged_policy[key] = value
                            else:
                                merged_policy[key] = value
                return merged_policy
        return None
    
    def setup_rag(self, docs):
        """Setup RAG with documents"""
        print("📚 Setting up RAG with documents...")
        sys.stdout.flush()
        
        # Find policy document
        policy_doc = None
        company_docs = []
        
        for d in docs:
            name_lower = d["name"].lower()
            if "compliance_policy" in name_lower or "policy" in name_lower:
                policy_doc = d
                print(f"📋 Found policy document: {d['name']}")
            else:
                company_docs.append(d)
        
        if not policy_doc:
            print("❌ No compliance policy document found!")
            raise ValueError("Compliance policy not found in documents")
        
        # Load policy
        print("📄 Parsing policy document...")
        sys.stdout.flush()
        
        # Try JSONL parsing
        self.policy = self.parse_jsonl_policy(policy_doc["text"])
        
        # If JSONL parsing failed, try regular JSON
        if not self.policy:
            try:
                self.policy = json.loads(policy_doc["text"])
            except json.JSONDecodeError:
                # Try to extract JSON from text
                json_match = re.search(r'\{.*\}', policy_doc["text"], re.DOTALL)
                if json_match:
                    try:
                        self.policy = json.loads(json_match.group())
                    except:
                        print("⚠️ Could not parse as JSON, using text as policy")
                        self.policy = {"raw_policy": policy_doc["text"][:2000]}
        
        if isinstance(self.policy, dict):
            print(f"✅ Policy loaded successfully")
            if 'keywords' in self.policy:
                high = len(self.policy['keywords'].get('high', []))
                medium = len(self.policy['keywords'].get('medium', []))
                low = len(self.policy['keywords'].get('low', []))
                print(f"   📊 Keywords: {high} high, {medium} medium, {low} low risk")
        else:
            print(f"⚠️ Policy format unknown")
        
        sys.stdout.flush()
        
        # Add company documents to vector store
        print(f"\n📚 Adding {len(company_docs)} company documents to vector database...")
        sys.stdout.flush()
        
        if company_docs:
            num_chunks = self.vector_store.add_documents(company_docs)
            print(f"✅ Created {num_chunks} vector chunks")
        else:
            print("⚠️ No company documents found to add to vector store")
        
        sys.stdout.flush()
    
    def analyze_compliance(self, buyer, supplier, docs):
        """Main analysis using RAG"""
        print(f"\n🔍 Analyzing compliance for:")
        print(f"   👤 Buyer: {buyer}")
        print(f"   🏭 Supplier: {supplier}")
        sys.stdout.flush()
        
        if not self.policy:
            print("🔥 Setting up RAG for first time...")
            self.setup_rag(docs)
        
        # Build targeted query
        query = f"""
        COMPLIANCE RISK ANALYSIS
        
        Transaction between:
        - Buyer: {buyer}
        - Supplier: {supplier}
        
        Analyze the relationship and documents for:
        1. Compliance with policy requirements
        2. Regulatory risks
        3. Contractual obligations
        4. Data protection measures
        5. Governance and oversight
        
        Provide specific findings and risk assessment.
        """
        
        # Search for relevant context
        print("\n🔍 Searching for relevant document chunks...")
        sys.stdout.flush()
        
        search_results = self.vector_store.search(query, n_results=8)
        
        if not search_results['documents'] or not search_results['documents'][0]:
            print("⚠️ No relevant documents found in vector store")
            # Fallback: use document text directly
            context = "\n".join([d["text"][:1000] for d in docs if "policy" not in d["name"].lower()][:3])
            chunks_found = 0
        else:
            # Combine top results
            context_chunks = []
            for i, doc in enumerate(search_results['documents'][0][:5]):
                if i < len(search_results['metadatas'][0]):
                    source = search_results['metadatas'][0][i].get('source', 'Unknown')
                    context_chunks.append(f"[From: {source}]\n{doc}")
            
            context = "\n\n--- DOCUMENT EXCERPT ---\n\n".join(context_chunks)
            chunks_found = len(context_chunks)
            print(f"✅ Found {chunks_found} relevant document chunks")
        
        sys.stdout.flush()
        
        # Analyze with Gemini
        print("\n🤖 Analyzing with Gemini LLM...")
        print("   This may take 10-30 seconds...")
        sys.stdout.flush()
        
        try:
            analysis = self.gemini_client.analyze_with_context(
                context=context,
                policy=self.policy,
                query=query
            )
        except Exception as e:
            print(f"❌ Gemini analysis failed: {e}")
            # Return default result
            analysis = {
                "risk_assessment": "ERROR",
                "key_findings": [f"Analysis failed: {str(e)}"],
                "policy_violations": [],
                "recommendations": ["Retry analysis or check API configuration"],
                "confidence_score": 0.0,
                "summary": "Analysis could not be completed due to API error"
            }
        
        # Make decision based on analysis
        risk_level = analysis.get('risk_assessment', 'MEDIUM').upper()
        
        if risk_level == "HIGH":
            decision = "REJECT"
        elif risk_level == "MEDIUM":
            decision = "REVIEW"
        elif risk_level == "ERROR":
            decision = "ERROR"
        else:
            decision = "APPROVE"
        
        # Generate reasons
        reasons = []
        violations = analysis.get('policy_violations', [])
        if violations:
            reasons.append(f"Found {len(violations)} policy violation(s)")
        
        findings = analysis.get('key_findings', [])
        if findings and len(findings) > 0:
            reasons.append(f"{len(findings)} compliance issues identified")
        
        confidence = analysis.get('confidence_score', 0.0)
        if confidence < 0.5:
            reasons.append("Low confidence - manual review recommended")
        
        if not reasons:
            reasons.append("No significant compliance issues detected")
        
        print(f"\n✅ Analysis complete!")
        sys.stdout.flush()
        
        return {
            "decision": decision,
            "risk_level": risk_level,
            "findings": findings[:10],
            "violations": violations,
            "recommendations": analysis.get('recommendations', []),
            "reasons": reasons,
            "confidence": f"{confidence:.1%}",
            "analysis_method": "RAG + Gemini 1.5",
            "chunks_analyzed": chunks_found,
            "documents_processed": len(docs)
        }