# --- Stage 1: Tactical Frontend Build ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Command Grid ---
FROM python:3.9-slim-bullseye
WORKDIR /app

# Install production dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend mission intelligence
COPY backend/ ./backend/
# Copy compiled tactical assets
COPY --from=builder /app/dist ./frontend/dist

# Environment configuration
ENV PORT=7860
ENV PYTHONUNBUFFERED=1
EXPOSE 7860

# Execute Mission
CMD ["python", "backend/main.py"]
