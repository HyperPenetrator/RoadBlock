#!/bin/bash
# Tactical Boot Service
echo "🚀 Initializing RoadFireWall X Services..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
