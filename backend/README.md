# Intelligence Empire Backend

## Quick Start

### Start Backend

```bash
./start.sh
```

### Alternative Methods

```bash
# Method 1: Using the startup script (recommended)
./start.sh

# Method 2: Direct command
PYTHONPATH=/home/frankyin/Workspace/lab/intelligence-empire/backend python app/main.py

# Method 3: From project root
cd /home/frankyin/Workspace/lab/intelligence-empire && python -m backend.app.main
```

## Services

- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000

## Architecture

✅ Distributed routing with load balancing
✅ Service-based organization:

- `/api/v1/*` → Core services
- `/api/ai/*` → AI processing
- `/api/data/*` → Data operations
- `/api/agents/*` → Agent services
- `/api/system/*` → Monitoring

## Status Check

```bash
curl http://localhost:8000/api/v1/status
```
