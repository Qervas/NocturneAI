#!/bin/bash

# Intelligence Empire Backend Startup Script
echo "🚀 Starting Intelligence Empire Backend..."
echo "📍 Distributed Architecture with Load Balancing"
echo ""

# Kill any existing process on port 8000
echo "🔍 Checking for existing processes on port 8000..."
EXISTING_PID=$(lsof -ti:8000 2>/dev/null)
if [ ! -z "$EXISTING_PID" ]; then
    echo "🛑 Killing existing process(es): $EXISTING_PID"
    kill $EXISTING_PID 2>/dev/null
    sleep 2
    echo "✅ Port 8000 is now free"
else
    echo "✅ Port 8000 is available"
fi
echo ""

# Set Python path and activate virtual environment
export PYTHONPATH=/home/frankyin/Workspace/lab/intelligence-empire/backend
cd /home/frankyin/Workspace/lab/intelligence-empire/backend

echo "🔧 Activating virtual environment..."
source venv/bin/activate

echo "✅ Backend starting on http://localhost:8000"
echo "📚 API Docs available at http://localhost:8000/docs"
echo ""

python main.py 