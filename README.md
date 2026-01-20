# Pathway Intelligence Platform

A real-time intelligence and compliance monitoring platform built with Pathway, featuring supply chain threat detection, compliance analysis, and reputational risk monitoring.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [System Components](#system-components)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

This platform provides three core intelligence modules accessible through a unified React dashboard:

1. **Supply Chain Threat Monitoring** - Real-time detection of geopolitical and operational threats
2. **Compliance Engine** - AI-powered compliance analysis with Google Drive integration
3. **Reputational Risk Monitoring** - Continuous monitoring of company reputational threats

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)                │
│                         Port 5173                               │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─────────────────┬──────────────────┬───────────────┐
             ▼                 ▼                  ▼               ▼
    ┌────────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐
    │  Compliance    │  │   Threat    │  │  Reputation  │  │  Stream  │
    │    Engine      │  │  Monitoring │  │  Monitoring  │  │Simulator │
    │   Port 8001    │  │ Ports 8081  │  │ Ports 8002   │  │          │
    │                │  │      8082   │  │      8083    │  │          │
    └────────────────┘  └─────────────┘  └──────────────┘  └──────────┘
             │                 │                  │
             └─────────────────┴──────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │   Data Sources     │
                    │  - Google Drive    │
                    │  - CSV Streams     │
                    │  - JSONL Files     │
                    └────────────────────┘
```

## Features

### Supply Chain Threat Monitoring

- Real-time CSV streaming and threat detection
- LLM-powered validation using Gemini 2.0 Flash
- Country-specific threat categorization
- Adaptive RAG for intelligent queries
- Hybrid search (KNN + BM25)

### Compliance Engine

- Dual document store (company docs + threat policies)
- AI-powered transaction risk assessment
- Real-time Google Drive synchronization
- Supplier risk scoring and violation tracking
- Persistent analysis caching

### Reputational Risk Monitoring

- Category-specific threat detection (fake, legitimate, restricted companies)
- LLM validation for threat authenticity
- Policy-driven classification
- Real-time streaming and validation
- Comprehensive threat logging

### Unified Dashboard

- Real-time data visualization with Recharts
- Interactive threat intelligence displays
- Multi-page navigation
- Responsive design with Tailwind CSS

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js (v18+) and npm
- Google Cloud Service Account with Drive API access
- Gemini API Key from [Google AI Studio](https://ai.google.dev/)

### Setup

1. **Navigate to the project directory**

```bash
cd g:\projs\pthy\Pathway
```

2. **Configure environment variables**

Create `.env` files in each module directory with the following:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PATHWAY_LICENSE_KEY=your_pathway_license_key_here
GOOGLE_APPLICATION_CREDENTIALS=credentials.json
COMPANY_DOCS_FOLDER_ID=your_google_drive_folder_id
THREAT_POLICIES_FOLDER_ID=your_threat_policies_folder_id
REPUTATION_POLICIES_FOLDER_ID=your_policies_folder_id
```

Add your `credentials.json` file to each module directory that requires Google Drive access.

3. **Prepare Google Drive folders**

- Create folders in Google Drive for company documents and policies
- Share folders with your service account email
- Copy folder IDs from URLs and add to `.env` files

4. **Install frontend dependencies**

```bash
cd frontend
npm install
cd ..
```

### Running the Application

From the base `Pathway` directory, start all services with a single command:

```bash
docker-compose up --build
```

This will start all containers:

- Compliance Engine (port 8001)
- Supply Chain Threat Monitoring (ports 8081, 8082)
- Reputation Monitoring (ports 8002, 8083)
- Stream Simulator
- All data processing pipelines

In a separate terminal, start the frontend:

```bash
cd frontend
npm run dev
```

### Accessing the Platform

- **Frontend Dashboard**: http://localhost:5173
- **Compliance API**: http://localhost:8001
- **Threat Monitoring**: http://localhost:8081 (proxy), http://localhost:8082 (RAG)
- **Reputation Monitoring**: http://localhost:8083 (proxy), http://localhost:8002 (RAG)

## System Components

### 1. Compliance Engine

**Location**: `compliance_engine/`

**Purpose**: AI-powered compliance analysis using Pathway RAG

**Key Files**:

- `app.py` - Pathway RAG analyzer with dual document stores
- `api.py` - FastAPI REST endpoints
- `docker-compose.yml` - Container configuration

**Workflow**:

1. Connects to Google Drive for documents and policies
2. Indexes using hybrid search (KNN + BM25)
3. Processes compliance requests via API
4. Uses Gemini for risk assessment
5. Returns structured compliance reports

**Main Endpoints**:

- `POST /api/config/google-drive` - Configure Google Drive
- `GET /api/suppliers` - List suppliers with analysis status
- `POST /api/analyze/batch` - Run compliance analysis
- `GET /health` - Health check

### 2. Supply Chain Threat Monitoring

**Location**: `country_monitoring/country_level_threats/`

**Purpose**: Real-time geopolitical and operational threat detection

**Key Files**:

- `main.py` - Orchestrates alert pipeline and RAG API
- `alert_pipeline.py` - Streaming threat detection
- `threat_rag.py` - Adaptive RAG implementation
- `llm_validator.py` - Gemini-based validation

**Workflow**:

1. Stream simulator generates supply chain events
2. Alert pipeline monitors for threat keywords
3. LLM validates genuine threats
4. Threats indexed in RAG system
5. API serves intelligent queries

### 3. Reputational Risk Monitoring

**Location**: `reputation_monitoring/`

**Purpose**: Continuous monitoring of company reputational threats

**Key Files**:

- `main.py` - System orchestrator
- `reputation_alert_pipeline.py` - Threat detection
- `reputation_rag.py` - Adaptive RAG
- `llm_validator.py` - Category-specific validation

**Data Sources**:

- `mock_reputational_news.jsonl` - 91 news items across 10 companies
- `policies/` - Category-specific policy files

**Company Categories**:

- **Fake**: Fraud, impersonation, misleading claims
- **Legitimate**: Operational complaints, clarifications needed
- **Restricted**: Extended approvals, strict policies

### 4. Frontend Dashboard

**Location**: `frontend/`

**Technology**: React 18, TypeScript, Vite, TanStack Query, Recharts, shadcn/ui, Tailwind CSS

**Pages**:

- Landing, Dashboard, Compliance, Threats, Reputation, Register

## API Reference

### Compliance Engine (Port 8001)

```bash
# Configure Google Drive
POST /api/config/google-drive
Content-Type: multipart/form-data

# Get suppliers
GET /api/suppliers

# Analyze transaction
POST /api/analyze/batch
Body: {"buyer_name": "Company A", "supplier_name": "Company B"}
```

### Threat Monitoring (Port 8081)

```bash
# Query RAG
POST /proxy-answer
Body: {"prompt": "What are the current threats in China?"}

# List documents
POST /proxy-list-documents
```

### Reputation Monitoring (Port 8083)

```bash
# Query RAG
POST /proxy-answer
Body: {"prompt": "What are the fraud indicators for fake companies?"}

# List documents
POST /proxy-list-documents
```

## Configuration

### LLM Parameters

Adjust in `llm_validator.py` files:

```python
temperature: 0.0  # Consistency (0.0) vs creativity (1.0)
maxOutputTokens: 5  # Response length
```

### Adaptive RAG

Adjust in RAG implementation files:

```python
n_starting_documents: 3  # Initial retrieval count
factor: 2  # Expansion multiplier
max_iterations: 4  # Maximum expansions
```

### Stream Simulation

Adjust in simulator files:

```python
INTERVAL_SEC: 5  # Delay between data items (seconds)
```

## Troubleshooting

### Common Issues

**"GEMINI_API_KEY not set"**

- Verify `.env` file exists with valid API key
- Check `python-dotenv` is installed

**"Failed to connect to Google Drive"**

- Verify `credentials.json` location
- Check service account has folder access
- Confirm folder IDs in `.env`

**"Pathway API error"**

- Wait 5-10 seconds for Pathway to start
- Check port availability
- Review Docker logs: `docker-compose logs`

**"No threats detected"**

- Verify stream simulator is running
- Check CSV files in `data/` folders
- Review risk keywords in configuration

**Frontend connection errors**

- Ensure all backend services are running
- Check CORS configuration
- Verify API endpoints match

### Docker Commands

```bash
# View logs
docker-compose logs

# Rebuild without cache
docker-compose build --no-cache

# Stop all services
docker-compose down

# Clean Docker system
docker system prune -a
```

## Project Structure

```
Pathway/
├── docker-compose.yml          # Main orchestration file
├── compliance_engine/          # Compliance analysis
│   ├── app.py
│   ├── api.py
│   └── docker-compose.yml
├── country_monitoring/         # Supply chain monitoring
│   ├── country_level_threats/
│   ├── simulate_data_stream/
│   └── docker-compose.yml
├── reputation_monitoring/      # Reputation monitoring
│   ├── main.py
│   ├── reputation_alert_pipeline.py
│   └── docker-compose.yml
├── frontend/                   # React dashboard
│   ├── src/
│   └── package.json
└── simulate_data_stream/       # Shared utilities
```

## Technology Stack

**Backend**: Pathway, FastAPI, Python 3.11, Gemini 2.0 Flash, Google Drive API

**Frontend**: React 18, TypeScript, Vite, TanStack Query, Recharts, Tailwind CSS

**Data Processing**: Pathway RAG, Hybrid Indexing (KNN + BM25), Gemini Embeddings

**Infrastructure**: Docker, Docker Compose

## Additional Resources

- [Pathway Documentation](https://pathway.com/developers)
- [Gemini API Reference](https://ai.google.dev/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## License

This project follows the Pathway project license terms.

---

**Built with**: Pathway, Gemini 2.0 Flash, FastAPI, React, TypeScript, Docker
