---
title: RoadFireWall App
emoji: 🏎️
colorFrom: red
colorTo: gray
sdk: docker
pinned: false
---
# RoadFireWall X - Tactical Safety System

## 🚀 Deployment & Builds

### 📱 Android APK Build
The project is configured with GitHub Actions to build a production-ready APK automatically.
1. Go to your GitHub Repository -> **Actions** tab.
2. Select the **"Build Android APK"** workflow.
3. Download the `app-debug` artifact.

**Note**: To make the APK connect to your live backend, add a GitHub Secret named `VITE_API_URL` with your Railway/Render URL.

### 🌐 Backend Deployment (Railway)
This project is Railway-ready via the `railway.json` and `Dockerfile`.
1. Connect your GitHub repo to Railway.app.
2. Railway will automatically pick up the `Dockerfile`.
3. The backend handles dynamic port assignment via the `PORT` environment variable.

## 🛠️ Local Development
1. Run `start_full_stack.bat` to launch both Frontend and Backend.
2. Frontend: `http://localhost:3000`
3. Backend: `http://localhost:8000`

## 🛡️ QA & Security
- **Deterministic Logic**: O(1) terrain mapping for high-speed machine recommendations.
- **Resilient Geolocation**: Graceful degradation when GPS link is severed.
- **A11y Optimized**: WCAG AA compliant contrast and ARIA patterns.
