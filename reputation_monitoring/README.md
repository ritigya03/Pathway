# Reputational Threat Monitoring System

A real-time monitoring system for detecting and analyzing company reputational threats using Pathway, LLM validation, and Adaptive RAG.

## 🎯 Overview

This system monitors reputational news about companies and provides intelligent threat detection and policy-based analysis. It mirrors the architecture of the supply chain monitoring system but focuses on company reputation rather than operational disruptions.

### Key Features

- **Real-time Streaming**: Processes reputational news as it arrives
- **AI-Powered Validation**: Uses Gemini 2.0 Flash to validate genuine threats
- **Category-Specific Analysis**: Different validation logic for fake, legitimate, and restricted companies
- **Adaptive RAG**: Intelligent question-answering with policy integration
- **REST API**: CORS-enabled API for frontend integration

## 📊 Architecture

```
Mock News JSONL → CSV Stream → Alert Pipeline → LLM Validator → Validated Threats
                                                                        ↓
Policy Files (Google Drive) → Document Store ← Validated Threats
                                    ↓
                            Adaptive RAG API
                                    ↓
                            FastAPI Proxy (CORS)
```

## 🚀 Quick Start

> **Windows Users**: Pathway is Linux-only. You **must** use Docker. See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for detailed instructions.

### Running with Docker (Recommended for Windows)

```bash
# Build and start the container
docker-compose up --build

# In a separate terminal, run the stream simulator
cd ../simulate_data_stream
python reputation_stream_simulator.py
```

The system will be available at:
- RAG API: `http://localhost:8000`
- CORS Proxy: `http://localhost:8081`

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for complete Docker instructions.

### Running Locally (Linux/Mac only)

### Prerequisites

- Python 3.9+
- Pathway library
- Google Cloud credentials (for Drive integration)
- Gemini API key

### Installation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Add your `GEMINI_API_KEY`
   - Add your Google Drive `REPUTATION_POLICIES_FOLDER_ID`
   - Ensure `credentials.json` is in the directory

3. **Upload policy files to Google Drive**:
   - Upload the three policy files from `policies/` folder to your Google Drive
   - Use the folder ID in your `.env` file

### Running the System

#### Option 1: Full System (Alert Pipeline + RAG API)

```bash
cd reputation_monitoring
python main.py
```

This starts:
- Alert pipeline monitoring threats
- RAG API server on `http://localhost:8000`
- CORS proxy on `http://localhost:8081`

#### Option 2: Stream Simulator (for testing)

In a separate terminal:

```bash
cd simulate_data_stream
python reputation_stream_simulator.py
```

This simulates real-time data by streaming news items every 5 seconds.

## 📡 API Usage

### Query the RAG System

**Endpoint**: `POST http://localhost:8081/proxy-answer`

**PowerShell Example**:
```powershell
Invoke-RestMethod -Uri http://localhost:8081/proxy-answer `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"prompt": "What are the fraud indicators for fake companies?"}'
```

**cURL Example**:
```bash
curl -X POST http://localhost:8081/proxy-answer \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What companies have fraud concerns?"}'
```

### List Indexed Documents

**Endpoint**: `POST http://localhost:8081/proxy-list-documents`

```powershell
Invoke-RestMethod -Uri http://localhost:8081/proxy-list-documents -Method Post
```

## 📁 Project Structure

```
reputation_monitoring/
├── main.py                          # Main orchestration
├── reputation_alert_pipeline.py     # Threat detection pipeline
├── reputation_rag.py                # RAG system with policies
├── reputation_stream.py             # Data schema and streaming
├── llm_validator.py                 # Gemini-based validation
├── fastapi_proxy.py                 # CORS-enabled API proxy
├── .env                             # Environment configuration
├── requirements.txt                 # Python dependencies
├── credentials.json                 # Google Cloud credentials
├── data/
│   └── reputation_stream.csv        # Streaming data (generated)
├── output/
│   ├── validated_threats.csv        # Detected threats
│   └── reputation_threats.log       # Processing log
└── policies/
    ├── fake_company_policy.jsonl
    ├── legitimate_company_policy.jsonl
    └── restricted_company_policy.jsonl
```

## 🏷️ Company Categories

### Fake Companies
**Indicators**: Fraud, impersonation, unverifiable claims, misleading branding

**Policy Actions**: Immediate investigation, no business engagement, fraud reporting

### Legitimate Companies
**Indicators**: Operational complaints, clarifications needed, minor reputation issues

**Policy Actions**: Monitor sentiment, engage for clarification, maintain relationship

### Restricted Companies
**Indicators**: Extended approvals, strict policies, accessibility concerns

**Policy Actions**: Patient engagement, complete documentation, respect compliance

## 🔍 How It Works

### 1. Data Ingestion
- Mock news loaded from `mock_reputational_news.jsonl`
- Streamed to CSV format for real-time processing
- 91 news items across 10 companies

### 2. Threat Detection
- Risk keywords: fraud, scam, fake, impersonation, misleading, etc.
- Filters news by company and category
- Detects potential threats based on keywords

### 3. LLM Validation
- Gemini 2.0 Flash validates each potential threat
- Category-specific validation criteria
- Filters out false positives

### 4. RAG Integration
- Validated threats indexed as documents
- Policy files loaded from Google Drive
- Adaptive RAG retrieves relevant context
- Answers questions with policy + threat data

## 📊 Sample Queries

**Fraud Detection**:
```
"What are the fraud indicators for fake companies?"
"Which companies have impersonation concerns?"
```

**Operational Issues**:
```
"What complaints are affecting legitimate companies?"
"Which companies need to issue clarifications?"
```

**Accessibility Concerns**:
```
"What companies have extended approval timelines?"
"Which restricted companies have partnership issues?"
```

**Specific Company**:
```
"What are the reputational threats for Nexvora Industries?"
"Is Alturon Global Solutions legitimate?"
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key

# Google Drive Integration
GOOGLE_APPLICATION_CREDENTIALS=credentials.json
REPUTATION_POLICIES_FOLDER_ID=your_folder_id
```

### Adjustable Parameters

**Stream Simulator** (`reputation_stream_simulator.py`):
- `INTERVAL_SEC`: Delay between news items (default: 5 seconds)

**LLM Validator** (`llm_validator.py`):
- `temperature`: LLM randomness (default: 0.0 for consistency)
- `maxOutputTokens`: Response length (default: 5)

**Adaptive RAG** (`reputation_rag.py`):
- `n_starting_documents`: Initial retrieval count (default: 3)
- `factor`: Expansion multiplier (default: 2)
- `max_iterations`: Maximum expansions (default: 4)

## 📝 Output Files

### validated_threats.csv
Contains all validated reputational threats:
- company, category, threat_type, headline, description, source, timestamp

### reputation_threats.log
Detailed processing log:
- Threat detection events
- LLM validation results
- Pipeline status updates

## 🧪 Testing

### Test Data Flow

1. **Start the system**:
   ```bash
   python main.py
   ```

2. **Run stream simulator** (separate terminal):
   ```bash
   python ../simulate_data_stream/reputation_stream_simulator.py
   ```

3. **Monitor logs**:
   - Watch console for threat detection
   - Check `output/reputation_threats.log`
   - Verify `output/validated_threats.csv`

4. **Query the API**:
   ```bash
   curl -X POST http://localhost:8081/proxy-answer \
     -H "Content-Type: application/json" \
     -d '{"prompt": "What threats were detected?"}'
   ```

### Expected Results

- **91 news items** processed
- **~30 threats detected** (companies with risk keywords)
- **~15 validated threats** (after LLM filtering)
- **API responds** with policy + threat context

## 🐛 Troubleshooting

### Common Issues

**"GEMINI_API_KEY not set"**
- Ensure `.env` file exists with valid API key
- Check that `python-dotenv` is installed

**"Failed to load mock news file"**
- Verify `mock_reputational_news.jsonl` exists in parent directory
- Check file path in `reputation_stream.py`

**"Pathway API error"**
- Ensure Pathway server is running (port 8000)
- Wait a few seconds after starting `main.py`
- Check firewall settings

**No threats detected**
- Verify stream simulator is running
- Check `data/reputation_stream.csv` is being populated
- Review risk keywords in `reputation_stream.py`

## 🔄 Comparison with Supply Chain System

| Aspect | Supply Chain | Reputation Monitoring |
|--------|-------------|----------------------|
| **Data Source** | CSV + GNews API | JSONL (mock data) |
| **Focus** | Operational disruptions | Company reputation |
| **Categories** | Countries | Company types |
| **Keywords** | strike, war, flood | fraud, scam, impersonation |
| **Validation** | Supply chain impact | Reputational threat |

## 📚 Additional Resources

- [Pathway Documentation](https://pathway.com/developers)
- [Gemini API Reference](https://ai.google.dev/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 🤝 Contributing

To extend this system:

1. **Add new company categories**: Update schema and validation logic
2. **Add new risk keywords**: Modify `RISK_KEYWORDS` in `reputation_stream.py`
3. **Customize policies**: Edit JSONL files in `policies/` folder
4. **Adjust RAG parameters**: Tune retrieval and generation settings

## 📄 License

This project follows the same license as the parent Pathway project.

---

**Built with**: Pathway • Gemini 2.0 Flash • FastAPI • Python
