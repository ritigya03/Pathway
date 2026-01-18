# Running with Docker (Windows)

Since Pathway is a Linux-based library, you need to run it in a Docker container on Windows.

## Prerequisites

1. **Docker Desktop** installed and running
2. **WSL 2** enabled (Docker Desktop will prompt you if needed)

## Quick Start

### 1. Build the Docker Image

Open PowerShell in the `reputation_monitoring` directory:

```powershell
cd G:\projs\Pathway\reputation_monitoring
docker-compose build
```

This will:
- Create a Linux container with Python 3.11
- Install Pathway and all dependencies
- Copy your application files

### 2. Start the Container

```powershell
docker-compose up
```

Or run in detached mode (background):

```powershell
docker-compose up -d
```

The system will start with:
- **Pathway RAG API** on `http://localhost:8000`
- **FastAPI Proxy** on `http://localhost:8081`

### 3. Run the Stream Simulator

In a **separate PowerShell window**, run the simulator on your Windows host:

```powershell
cd G:\projs\Pathway\simulate_data_stream
python reputation_stream_simulator.py
```

This will populate the `data/reputation_stream.csv` file, which is mounted into the Docker container.

### 4. Query the API

```powershell
Invoke-RestMethod -Uri http://localhost:8081/proxy-answer `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"prompt": "What are the fraud indicators for fake companies?"}'
```

## Docker Commands

### View Logs
```powershell
docker-compose logs -f
```

### Stop the Container
```powershell
docker-compose down
```

### Restart the Container
```powershell
docker-compose restart
```

### Access Container Shell
```powershell
docker-compose exec reputation-monitoring bash
```

### Rebuild After Code Changes
```powershell
docker-compose down
docker-compose build
docker-compose up
```

## Volume Mounts

The following directories are mounted from Windows to the container:

- `./data` → Container reads streaming CSV here
- `./output` → Container writes validated threats and logs here
- `./credentials.json` → Google Cloud credentials (read-only)
- `./policies` → Policy JSONL files (read-only)

This means:
- ✅ You can view output files on Windows in real-time
- ✅ Stream simulator on Windows writes to `data/` which container reads
- ✅ Changes to policy files are reflected in container

## Troubleshooting

### "Cannot connect to Docker daemon"
- Ensure Docker Desktop is running
- Check WSL 2 is enabled in Docker Desktop settings

### "Port already in use"
- Stop other services using ports 8000 or 8081
- Or change ports in `docker-compose.yml`:
  ```yaml
  ports:
    - "8002:8000"  # Use 8002 on host instead
    - "8083:8081"  # Use 8083 on host instead
  ```

### Container exits immediately
- Check logs: `docker-compose logs`
- Verify `.env` file has correct API keys
- Ensure `credentials.json` exists

### No data being processed
- Verify stream simulator is running on Windows
- Check `data/reputation_stream.csv` is being created
- Ensure volume mount is working: `docker-compose exec reputation-monitoring ls -la /app/data`

## File Structure

```
reputation_monitoring/
├── Dockerfile              ← Docker image definition
├── docker-compose.yml      ← Container orchestration
├── .dockerignore          ← Files to exclude from image
├── .env                   ← Environment variables
├── credentials.json       ← Google Cloud credentials
├── data/                  ← Mounted volume (streaming data)
│   └── reputation_stream.csv
├── output/                ← Mounted volume (results)
│   ├── validated_threats.csv
│   └── reputation_threats.log
└── policies/              ← Mounted volume (policies)
    ├── fake_company_policy.jsonl
    ├── legitimate_company_policy.jsonl
    └── restricted_company_policy.jsonl
```

## Development Workflow

1. **Make code changes** on Windows (in VS Code, etc.)
2. **Rebuild container**: `docker-compose build`
3. **Restart**: `docker-compose up`
4. **Test changes**: Query the API

## Production Deployment

For production, consider:
- Using Docker secrets for API keys instead of `.env`
- Setting up health checks
- Using a reverse proxy (nginx) in front
- Enabling container auto-restart policies
- Monitoring with Docker logs aggregation

---

**Note**: The stream simulator runs on Windows (not in Docker) because it's just a Python script that writes CSV files. The Pathway application runs in Docker because it requires Linux.
