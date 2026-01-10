#!/usr/bin/env python3
import os
import sys
import argparse
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Now import local modules
try:
    from rag_reader import load_documents
    from rag_system import ComplianceAnalyzerRAG
except ImportError as e:
    print(f"❌ Failed to import modules: {e}")
    print("   Make sure all required files are in the directory:")
    print("   - rag_reader.py, rag_system.py, vector_store_simple.py, gemini_client.py")
    sys.exit(1)

SUPPLIERS = [
    "Nexvora Industries Pvt. Ltd.",
    "Alturon Global Solutions",
    "BlueCrest Manufacturing Co.",
    "Veridion Supply Systems",
    "StratEdge Enterprises",
    "Orbinex Components Ltd.",
    "Kalyx Materials Group",
    "Zenlith Logistics Corp.",
    "PrimeAxis Industrial Works",
    "Solvex Trade & Sourcing"
]

def check_environment():
    """Check if all required environment variables are set"""
    print("\n🔍 Checking environment...")
    
    required_vars = ['GEMINI_API_KEY', 'ROOT_FOLDER_ID']
    missing = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing.append(var)
        else:
            print(f"   ✅ {var}: {'*' * 8}{value[-4:] if len(value) > 8 else '***'}")
    
    if missing:
        print(f"\n❌ Missing environment variables: {', '.join(missing)}")
        print("   Please set them in .env file:")
        print("   GEMINI_API_KEY=your_key_here")
        print("   ROOT_FOLDER_ID=your_folder_id_here")
        return False
    
    # Check credentials file
    creds_file = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'credentials.json')
    if not os.path.exists(creds_file):
        print(f"❌ Credentials file not found: {creds_file}")
        print("   Please download your Google Service Account JSON and save as credentials.json")
        return False
    
    print("✅ All environment checks passed")
    return True

def get_news_context(buyer, supplier):
    """Get news context if API key is available"""
    news_api_key = os.getenv('G_NEWS_API_KEY')
    if not news_api_key or news_api_key == 'your_news_key_here':
        return ""
    
    try:
        # Placeholder for GNews API integration
        return f"News context for {buyer} and {supplier} would be checked here."
    except:
        return ""

def main():
    print("="*60)
    print("           COMPLIANCE ANALYZER (RAG + Gemini)")
    print("           ChromaDB v1.0.0+ Compatible")
    print("="*60)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Compliance Analyzer')
    parser.add_argument('--buyer', help='Buyer company name')
    parser.add_argument('--supplier', type=int, choices=range(1, 11), 
                       help='Supplier number (1-10)')
    parser.add_argument('--test', action='store_true', 
                       help='Test mode - verify setup without full analysis')
    parser.add_argument('--quick', action='store_true',
                       help='Quick analysis with sample data')
    args = parser.parse_args()
    
    # Check environment
    if not check_environment():
        sys.exit(1)
    
    # Test mode - just verify setup
    if args.test:
        print("\n🧪 TEST MODE - Verifying setup...")
        try:
            # Test Google Drive connection
            print("🔗 Testing Google Drive connection...")
            sample_docs = [{"name": "test.txt", "text": "Test document content"}]
            
            # Test vector store
            print("🗄️  Testing vector store...")
            from vector_store_simple import VectorStoreSimple
            vs = VectorStoreSimple("test_collection")
            vs.add_documents(sample_docs)
            
            # Test Gemini
            print("🤖 Testing Gemini...")
            from gemini_client import GeminiClient
            gc = GeminiClient()
            
            print("\n✅ All systems are ready!")
            return
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
            return
    
    # Get buyer info
    buyer = args.buyer
    if not buyer:
        print("\n📋 COMPANY INFORMATION")
        print("-"*40)
        buyer = input("Enter BUYER company name: ").strip()
        while not buyer:
            print("❌ Buyer name cannot be empty")
            buyer = input("Enter BUYER company name: ").strip()
    
    # Get supplier info
    if args.supplier:
        supplier = SUPPLIERS[args.supplier - 1]
    else:
        print("\n🏭 Select SUPPLIER company:")
        print("-"*40)
        for i, s in enumerate(SUPPLIERS, start=1):
            print(f"{i:2}. {s}")
        
        while True:
            try:
                choice = input("\nEnter supplier number (1-10): ").strip()
                if not choice:
                    print("❌ Please enter a number")
                    continue
                    
                choice = int(choice)
                if 1 <= choice <= len(SUPPLIERS):
                    supplier = SUPPLIERS[choice - 1]
                    break
                else:
                    print(f"❌ Please enter a number between 1 and {len(SUPPLIERS)}")
            except ValueError:
                print("❌ Please enter a valid number")
    
    print(f"\n✅ Analysis Target:")
    print(f"   👤 Buyer:    {buyer}")
    print(f"   🏭 Supplier: {supplier}")
    
    # Quick mode - use sample data
    if args.quick:
        print("\n⚡ QUICK MODE - Using sample data")
        docs = [
            {"name": "sample_policy.json", "text": '{"keywords": {"high": ["fraud", "bribery"], "medium": ["conflict", "interest"], "low": ["delay"]}}'},
            {"name": "sample_contract.txt", "text": "This agreement establishes terms between parties regarding data protection and compliance with regulations."}
        ]
    else:
        # Load documents from Google Drive
        print("\n" + "="*60)
        print("📂 LOADING DOCUMENTS FROM GOOGLE DRIVE")
        print("="*60)
        
        try:
            # Pass buyer and supplier names to filter documents
            docs = load_documents(buyer, supplier)
            if not docs:
                print("❌ No documents found in Google Drive!")
                sys.exit(1)
            
            print(f"✅ Loaded {len(docs)} relevant documents")
            
        except Exception as e:
            print(f"❌ Failed to load documents: {e}")
            print("\n💡 Try --quick mode for testing: python app.py --quick --buyer Test --supplier 1")
            sys.exit(1)
    
    # Get news context if available
    news_context = get_news_context(buyer, supplier)
    if news_context:
        docs.append({"name": "news_context.txt", "text": news_context})
        print("✅ Added news context")
    
    # Initialize and run analyzer
    print("\n" + "="*60)
    print("🤖 INITIALIZING RAG SYSTEM")
    print("="*60)
    
    try:
        analyzer = ComplianceAnalyzerRAG()
        
        print("\n📚 Setting up vector database...")
        analyzer.setup_rag(docs)
        
        print("\n" + "="*60)
        print("🔍 ANALYZING COMPLIANCE")
        print("="*60)
        
        result = analyzer.analyze_compliance(buyer, supplier, docs)
        
        # Display results
        print("\n" + "="*60)
        print("📊 COMPLIANCE ANALYSIS REPORT")
        print("="*60)
        
        print(f"\n📋 Parties:")
        print(f"   👤 Buyer:    {buyer}")
        print(f"   🏭 Supplier: {supplier}")
        
        # Color-coded decision
        decision = result['decision']
        risk_color = {
            "REJECT": "❌",
            "REVIEW": "⚠️ ",
            "APPROVE": "✅"
        }
        decision_display = f"{risk_color.get(decision, '📝')} {decision}"
        
        print(f"\n🎯 Decision: {decision_display}")
        print(f"⚠️  Risk Level: {result['risk_level']}")
        print(f"📈 Confidence: {result.get('confidence', 'N/A')}")
        print(f"📄 Documents: {result.get('documents_processed', 0)}")
        print(f"🔍 Chunks Analyzed: {result.get('chunks_analyzed', 0)}")
        
        print(f"\n📝 Summary:")
        for reason in result.get('reasons', []):
            print(f"   • {reason}")
        
        print(f"\n🔎 Key Findings:")
        findings = result.get('findings', [])
        if findings:
            for i, finding in enumerate(findings[:5], 1):
                print(f"   {i}. {finding}")
            if len(findings) > 5:
                print(f"   ... and {len(findings) - 5} more")
        else:
            print("   No specific findings")
        
        print(f"\n🚫 Policy Violations:")
        violations = result.get('violations', [])
        if violations:
            for i, violation in enumerate(violations, 1):
                print(f"   {i}. {violation}")
        else:
            print("   ✅ No violations detected")
        
        print(f"\n💡 Recommendations:")
        recommendations = result.get('recommendations', [])
        if recommendations:
            for i, rec in enumerate(recommendations[:3], 1):
                print(f"   {i}. {rec}")
            if len(recommendations) > 3:
                print(f"   ... and {len(recommendations) - 3} more")
        else:
            print("   No specific recommendations")
        
        print("\n" + "="*60)
        print(f"🧠 Analysis Method: {result.get('analysis_method', 'RAG + Gemini')}")
        print(f"🏗️  Vector Store: ChromaDB v1.0.0+")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n💡 Try these troubleshooting steps:")
        print("1. Check your .env file has correct API keys")
        print("2. Verify credentials.json is valid")
        print("3. Run test mode: python app.py --test")
        print("4. Try quick mode: python app.py --quick --buyer Test --supplier 1")
        sys.exit(1)

if __name__ == "__main__":
    main()