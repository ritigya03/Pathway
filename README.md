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

All services are orchestrated through a single Docker Compose configuration for seamless deployment.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Dashboard (Nginx)                   │
│                         Port 3000                               │
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
             │                 │                  │               │
             └─────────────────┴──────────────────┴───────────────┘
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

- Dual document store (company docs and threat policies)
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

- Production-ready React application served via Nginx
- Real-time data visualization with Recharts
- Interactive threat intelligence displays
- Multi-page navigation
- Responsive design with Tailwind CSS

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Google Cloud Service Account with Drive API access
- Gemini API Key from [Google AI Studio](https://ai.google.dev/)

### Setup

1. **Navigate to the project directory**

```bash
cd g:\projs\pthy\Pathway
```

2. **Configure environment variables**

Create `.env` files in the following directories:

**compliance_engine/.env**

```env
GEMINI_API_KEY=your_gemini_api_key_here
PATHWAY_LICENSE_KEY=your_pathway_license_key_here
GOOGLE_APPLICATION_CREDENTIALS=credentials.json
COMPANY_DOCS_FOLDER_ID=your_google_drive_folder_id
THREAT_POLICIES_FOLDER_ID=your_threat_policies_folder_id
```

**country_monitoring/country_level_threats/.env**

```env
GEMINI_API_KEY=your_gemini_api_key_here
PATHWAY_LICENSE_KEY=your_pathway_license_key_here
GOOGLE_APPLICATION_CREDENTIALS=credentials.json
THREAT_POLICIES_FOLDER_ID=your_policies_folder_id
```

**reputation_monitoring/.env**

```env
GEMINI_API_KEY=your_gemini_api_key_here
PATHWAY_LICENSE_KEY=your_pathway_license_key_here
GOOGLE_APPLICATION_CREDENTIALS=credentials.json
REPUTATION_POLICIES_FOLDER_ID=your_policies_folder_id
```

3. **Add Google Drive credentials**

Place your `credentials.json` file in:

- `compliance_engine/credentials.json`
- `country_monitoring/country_level_threats/credentials.json`
- `reputation_monitoring/credentials.json`

4. **Prepare Google Drive folders**

- Create folders in Google Drive for company documents and policies
- Share folders with your service account email
- Copy folder IDs from URLs and add to `.env` files

### Running the Application

From the base `Pathway` directory, start all services with a single command:

```bash
docker-compose up --build
```

This command will start all five containers:

1. **threat-monitor** - Country-level threat monitoring (ports 8081, 8082)
2. **stream-simulator** - Data stream generator
3. **compliance-engine** - Compliance analysis API (port 8001)
4. **reputation-monitoring** - Reputation risk monitoring (ports 8002, 8083)
5. **frontend** - React dashboard served via Nginx (port 3000)

### Accessing the Platform

Once all services are running:

- **Frontend Dashboard**: http://localhost:3000
- **Compliance API**: http://localhost:8001
- **Threat Monitoring Proxy**: http://localhost:8081
- **Threat Monitoring RAG**: http://localhost:8082
- **Reputation Proxy**: http://localhost:8083
- **Reputation RAG**: http://localhost:8002

## System Components

### 1. Compliance Engine

**Container**: `compliance-engine`  
**Location**: `compliance_engine/`  
**Port**: 8001

**Purpose**: AI-powered compliance analysis using Pathway RAG

**Key Files**:

- `app.py` - Pathway RAG analyzer with dual document stores
- `api.py` - FastAPI REST endpoints
- `Dockerfile` - Container configuration

**Workflow**:

1. Connects to Google Drive for documents and policies
2. Indexes using hybrid search (KNN + BM25)
3. Processes compliance requests via API
4. Uses Gemini for risk assessment
5. Returns structured compliance reports with caching

**Main Endpoints**:

- `POST /api/config/google-drive` - Configure Google Drive
- `GET /api/suppliers` - List suppliers with analysis status
- `POST /api/analyze/batch` - Run compliance analysis
- `GET /health` - Health check

### 2. Supply Chain Threat Monitoring

**Container**: `threat-monitor`  
**Location**: `country_monitoring/country_level_threats/`  
**Ports**: 8081 (proxy), 8082 (RAG)

**Purpose**: Real-time geopolitical and operational threat detection

**Key Files**:

- `main.py` - Orchestrates alert pipeline and RAG API
- `alert_pipeline.py` - Streaming threat detection
- `threat_rag.py` - Adaptive RAG implementation
- `llm_validator.py` - Gemini-based validation
- `fastapi_proxy.py` - CORS-enabled API proxy

**Workflow**:

1. Receives supply chain events from stream simulator
2. Alert pipeline monitors for threat keywords
3. LLM validates genuine threats
4. Threats indexed in RAG system
5. API serves intelligent queries

### 3. Reputational Risk Monitoring

**Container**: `reputation-monitoring`  
**Location**: `reputation_monitoring/`  
**Ports**: 8002 (RAG), 8083 (proxy)

**Purpose**: Continuous monitoring of company reputational threats

**Key Files**:

- `main.py` - System orchestrator
- `reputation_alert_pipeline.py` - Threat detection pipeline
- `reputation_rag.py` - Adaptive RAG
- `llm_validator.py` - Category-specific validation
- `fastapi_proxy.py` - CORS proxy for frontend

**Data Sources**:

- `mock_reputational_news.jsonl` - News items across multiple companies
- `policies/` - Category-specific policy files

**Company Categories**:

- **Fake**: Fraud, impersonation, misleading claims
- **Legitimate**: Operational complaints, clarifications needed
- **Restricted**: Extended approvals, strict policies

### 4. Stream Simulator

**Container**: `stream-simulator`  
**Location**: `simulate_data_stream/`  
**No exposed ports**

**Purpose**: Simulates real-time data streams for both threat monitoring systems

**Key Files**:

- `stream_simulator.py` - Data stream generator
- `master_supply_chain.csv` - Master dataset

**Configuration**:

- Streams data to both threat monitor and reputation monitor
- Configurable interval (default: 2 seconds)
- Writes to multiple destinations simultaneously

**Environment Variables**:

- `STREAM_FILES` - Comma-separated list of output CSV paths
- `MASTER_FILE` - Path to master data file
- `INTERVAL_SEC` - Delay between records (default: 2)

### 5. Frontend Dashboard

**Container**: `frontend`  
**Location**: `frontend/`  
**Port**: 3000

**Purpose**: Production-ready React dashboard served via Nginx

**Technology Stack**:

- React 18 with TypeScript
- Vite for build tooling
- Nginx for production serving
- TanStack Query for data fetching
- Recharts for data visualization
- shadcn/ui component library
- Tailwind CSS for styling

**Build Process**:

- Multi-stage Docker build
- Node.js build stage compiles React app
- Nginx production stage serves static files
- SPA routing configured for client-side navigation

**Pages**:

- Landing, Dashboard, Compliance, Threats, Register

## API Reference

### Compliance Engine (Port 8001)

```bash
# Configure Google Drive
POST /api/config/google-drive
Content-Type: multipart/form-data
Body: credentials (file), company_folder_id, threat_folder_id

# Get suppliers list
GET /api/suppliers

# Analyze transaction
POST /api/analyze/batch
Content-Type: application/json
Body: {"buyer_name": "Company A", "supplier_name": "Company B"}

# Health check
GET /health
```

### Threat Monitoring (Port 8081)

```bash
# Query RAG system
POST /proxy-answer
Content-Type: application/json
Body: {"prompt": "What are the current threats in China?"}

# List indexed documents
POST /proxy-list-documents
```

### Reputation Monitoring (Port 8083)

```bash
# Query reputation RAG
POST /proxy-answer
Content-Type: application/json
Body: {"prompt": "What are the fraud indicators for fake companies?"}

# List indexed documents
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

Adjust in `simulate_data_stream/stream_simulator.py`:

```python
INTERVAL_SEC: 2  # Delay between data items (seconds)
```

### Docker Compose

The main `docker-compose.yml` orchestrates all services:

- **Service dependencies**: Frontend depends on all backend services
- **Volume mounts**: Data and output directories mounted for persistence
- **Restart policies**: All services set to `unless-stopped`
- **Environment files**: Each service loads its own `.env` file

## Troubleshooting

### Common Issues

**"GEMINI_API_KEY not set"**

- Verify `.env` file exists in the module directory
- Check API key is valid and not expired

**"Failed to connect to Google Drive"**

- Verify `credentials.json` is in the correct location
- Check service account has folder access
- Confirm folder IDs in `.env` files

**"Pathway API error"**

- Wait 5-10 seconds for Pathway to start
- Check port availability
- Review Docker logs: `docker-compose logs [service-name]`

**"No threats detected"**

- Verify stream simulator is running
- Check CSV files in `data/` folders
- Review logs: `docker-compose logs stream-simulator`

**Frontend not loading**

- Ensure all backend services are healthy
- Check browser console for errors
- Verify API endpoints are accessible

### Docker Commands

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs threat-monitor
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f

# Rebuild without cache
docker-compose build --no-cache

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart specific service
docker-compose restart frontend

# Clean Docker system
docker system prune -a
```

### Service Health Checks

```bash
# Check compliance engine
curl http://localhost:8001/health

# Check threat monitoring
curl -X POST http://localhost:8081/proxy-list-documents

# Check reputation monitoring
curl -X POST http://localhost:8083/proxy-list-documents

# Check frontend
curl http://localhost:3000
```

## Project Structure

```
Pathway/
├── docker-compose.yml          # Main orchestration file (all 5 services)
│
├── compliance_engine/          # Compliance analysis module
│   ├── app.py                 # Pathway RAG analyzer
│   ├── api.py                 # FastAPI endpoints
│   ├── Dockerfile             # Container build
│   ├── .env                   # Environment config
│   ├── credentials.json       # Google Drive credentials
│   └── data/                  # Data directory
│
├── country_monitoring/         # Supply chain monitoring
│   ├── country_level_threats/ # Threat detection service
│   │   ├── main.py           # Main orchestrator
│   │   ├── alert_pipeline.py # Threat detection
│   │   ├── threat_rag.py     # RAG implementation
│   │   ├── llm_validator.py  # LLM validation
│   │   ├── fastapi_proxy.py  # CORS proxy
│   │   ├── Dockerfile        # Container build
│   │   ├── .env              # Environment config
│   │   ├── credentials.json  # Google Drive credentials
│   │   └── data/             # Streaming data
│   └── docker-compose.yml     # Individual service config
│
├── reputation_monitoring/      # Reputation monitoring
│   ├── main.py                # Main orchestrator
│   ├── reputation_alert_pipeline.py
│   ├── reputation_rag.py      # Adaptive RAG
│   ├── llm_validator.py       # Threat validation
│   ├── fastapi_proxy.py       # CORS proxy
│   ├── mock_reputational_news.jsonl
│   ├── Dockerfile             # Container build
│   ├── .env                   # Environment config
│   ├── credentials.json       # Google Drive credentials
│   ├── policies/              # Policy files
│   └── output/                # Results
│
├── simulate_data_stream/       # Shared data stream simulator
│   ├── stream_simulator.py    # Stream generator
│   ├── master_supply_chain.csv # Master dataset
│   └── Dockerfile             # Container build
│
└── frontend/                   # React dashboard
    ├── src/
    │   ├── pages/            # Page components
    │   ├── components/       # Reusable components
    │   └── App.tsx           # Main app
    ├── Dockerfile            # Multi-stage build
    ├── package.json          # Dependencies
    └── vite.config.ts        # Build config
```

## Technology Stack

**Backend**: Pathway, FastAPI, Python 3.11, Gemini 2.0 Flash, Google Drive API, Uvicorn

**Frontend**: React 18, TypeScript, Vite, TanStack Query, Recharts, Tailwind CSS, Nginx

**Data Processing**: Pathway RAG, Hybrid Indexing (KNN + BM25), Gemini Embeddings

**Infrastructure**: Docker, Docker Compose, Multi-stage builds

## Additional Resources

- [Pathway Documentation](https://pathway.com/developers)
- [Gemini API Reference](https://ai.google.dev/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## License

This project follows the Pathway project license terms.

---

**Built with**: Pathway, Gemini 2.0 Flash, FastAPI, React, TypeScript, Docker, Nginx
