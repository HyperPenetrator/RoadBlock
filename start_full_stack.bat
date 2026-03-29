@echo off
echo ==========================================
echo Starting RoadFireWall X Full-Stack System
echo ==========================================

start cmd /k "echo Starting Backend... && cd backend && python main.py"
start cmd /k "echo Starting Frontend... && cd frontend && npm run dev"

echo System handles opened in separate windows.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
pause
