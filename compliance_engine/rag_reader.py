from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
import re
import os
import json

# Get from environment variables
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
ROOT_FOLDER_ID = os.getenv("ROOT_FOLDER_ID", "1oLE60NfEO8K0BNBK_48Q_VqznUX7Ypxi")
CREDS_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")

# Try to import PDF libraries
try:
    import PyPDF2
    PDF_SUPPORT = True
    print("✅ PDF support enabled (PyPDF2)", flush=True)
except ImportError:
    PDF_SUPPORT = False
    print("⚠️  PyPDF2 not available - PDFs will be matched by filename only", flush=True)

def extract_pdf_text(pdf_bytes):
    """Extract text from PDF bytes"""
    if not PDF_SUPPORT:
        return ""
    
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text_parts = []
        # Extract from first 3 pages (or all if less)
        for page_num in range(min(3, len(pdf_reader.pages))):
            page = pdf_reader.pages[page_num]
            text_parts.append(page.extract_text())
        
        return " ".join(text_parts)
    except Exception as e:
        print(f"  ⚠️  PDF extraction failed: {str(e)[:50]}", flush=True)
        return ""

def normalize_company_name(name):
    """Normalize company name for matching"""
    # Remove common suffixes
    name = re.sub(r'\b(Pvt\.?|Ltd\.?|Co\.?|Inc\.?|Corp\.?|LLC)\b', '', name, flags=re.IGNORECASE)
    # Remove special characters
    name = re.sub(r'[^\w\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name)
    return name.strip().lower()

def is_relevant_document(doc_name, doc_text, buyer_name, supplier_name):
    """Check if document is relevant to buyer or supplier"""
    if not buyer_name and not supplier_name:
        return True
    
    doc_name_lower = doc_name.lower()
    doc_text_lower = doc_text.lower()
    
    # Normalize names
    norm_buyer = normalize_company_name(buyer_name) if buyer_name else ""
    norm_supplier = normalize_company_name(supplier_name) if supplier_name else ""
    norm_doc_name = normalize_company_name(doc_name)
    
    # Check buyer
    if buyer_name:
        # Exact match in filename
        if buyer_name.lower() in doc_name_lower:
            return True
        # Normalized match
        if norm_buyer in norm_doc_name:
            return True
        # Word parts (e.g., "Orbinex" from "Orbinex Components Ltd.")
        buyer_words = norm_buyer.split()
        for word in buyer_words:
            if len(word) > 3 and word in norm_doc_name:
                return True
        # In document text
        if buyer_name.lower() in doc_text_lower[:3000]:
            return True
    
    # Check supplier
    if supplier_name:
        if supplier_name.lower() in doc_name_lower:
            return True
        if norm_supplier in norm_doc_name:
            return True
        supplier_words = norm_supplier.split()
        for word in supplier_words:
            if len(word) > 3 and word in norm_doc_name:
                return True
        if supplier_name.lower() in doc_text_lower[:3000]:
            return True
    
    return False

def load_documents(buyer_name=None, supplier_name=None):
    """Load documents from Google Drive, filtered by buyer/supplier names"""
    print(f"🔗 Connecting to Google Drive (Folder ID: {ROOT_FOLDER_ID})...", flush=True)
    
    if not os.path.exists(CREDS_FILE):
        raise FileNotFoundError(f"Credentials file not found: {CREDS_FILE}")
    
    try:
        creds = service_account.Credentials.from_service_account_file(
            CREDS_FILE, scopes=SCOPES
        )
        service = build("drive", "v3", credentials=creds)
    except Exception as e:
        raise Exception(f"Failed to authenticate with Google Drive: {e}")

    policy_docs = []
    company_docs = []
    total_files = 0

    def fetch_files(folder_id, path=""):
        nonlocal policy_docs, company_docs, total_files
        
        try:
            results = service.files().list(
                q=f"'{folder_id}' in parents",
                fields="files(id, name, mimeType)",
                pageSize=100
            ).execute()

            files = results.get("files", [])

            for f in files:
                file_id = f["id"]
                name = f["name"]
                mime = f["mimeType"]
                full_path = f"{path}/{name}" if path else name

                # Folders - recurse
                if mime == "application/vnd.google-apps.folder":
                    print(f"📁 Opening folder: {name}", flush=True)
                    fetch_files(file_id, full_path)
                    continue

                total_files += 1
                fh = io.BytesIO()
                text = ""

                try:
                    # Handle PDFs
                    if mime == "application/pdf":
                        print(f"  📄 Processing PDF: {name}", flush=True)
                        
                        # Download PDF
                        request = service.files().get_media(fileId=file_id)
                        downloader = MediaIoBaseDownload(fh, request)
                        done = False
                        while not done:
                            _, done = downloader.next_chunk()
                        
                        # Extract text
                        pdf_bytes = fh.getvalue()
                        text = extract_pdf_text(pdf_bytes)
                        
                        # If no text extracted, use filename
                        if not text or len(text.strip()) < 20:
                            text = f"Document: {name}\nThis is a company profile document containing business information."
                        
                        file_type = "PDF"
                    
                    # Google Docs → export as text
                    elif mime.startswith("application/vnd.google-apps"):
                        request = service.files().export(
                            fileId=file_id,
                            mimeType="text/plain"
                        )
                        downloader = MediaIoBaseDownload(fh, request)
                        done = False
                        while not done:
                            _, done = downloader.next_chunk()
                        text = fh.getvalue().decode("utf-8", errors="ignore")
                        file_type = "Google Doc"
                    
                    # Other files
                    else:
                        request = service.files().get_media(fileId=file_id)
                        downloader = MediaIoBaseDownload(fh, request)
                        done = False
                        while not done:
                            _, done = downloader.next_chunk()
                        text = fh.getvalue().decode("utf-8", errors="ignore")
                        file_type = "File"

                    # Clean text
                    text = clean_text(text)
                    
                    doc_data = {
                        "name": name,
                        "text": text[:10000],  # Keep up to 10k chars
                        "id": file_id,
                        "path": full_path,
                        "type": file_type
                    }
                    
                    # Categorize
                    name_lower = name.lower()
                    
                    if "policy" in name_lower or "compliance" in name_lower:
                        policy_docs.append(doc_data)
                        print(f"  📋 Policy doc: {name}", flush=True)
                    else:
                        # Check relevance
                        if is_relevant_document(name, text, buyer_name, supplier_name):
                            company_docs.append(doc_data)
                            print(f"  ✅ Relevant: {name}", flush=True)
                        else:
                            print(f"  ⏭️  Skipping: {name}", flush=True)

                except Exception as e:
                    print(f"  ⚠️  Error with {name}: {str(e)[:80]}", flush=True)

        except Exception as e:
            print(f"⚠️  Error in folder {path}: {e}", flush=True)

    # Start fetching
    fetch_files(ROOT_FOLDER_ID)
    
    # Combine docs
    all_docs = policy_docs + company_docs
    
    print(f"\n📊 Document Summary:", flush=True)
    print(f"   📁 Total files scanned: {total_files}", flush=True)
    print(f"   📋 Policy documents: {len(policy_docs)}", flush=True)
    print(f"   📄 Relevant company docs: {len(company_docs)}", flush=True)
    print(f"   📑 Total for analysis: {len(all_docs)}", flush=True)
    
    if buyer_name:
        print(f"   🔍 Buyer: {buyer_name}", flush=True)
    if supplier_name:
        print(f"   🔍 Supplier: {supplier_name}", flush=True)
    
    if len(company_docs) == 0:
        print(f"\n⚠️  WARNING: No relevant company documents found!", flush=True)
        print(f"   Make sure PDF filenames contain company names:", flush=True)
        print(f"   - {buyer_name if buyer_name else 'Buyer name'}", flush=True)
        print(f"   - {supplier_name if supplier_name else 'Supplier name'}", flush=True)
    
    return all_docs

def clean_text(text):
    """Clean text for better processing"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()