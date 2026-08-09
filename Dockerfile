# ── Stage 1: Build the Next.js frontend ──
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend
COPY teledrive/package.json teledrive/package-lock.json ./
RUN npm ci --silent
COPY teledrive/ ./

# Disable backend auto-launch during build (no Python in this stage)
ENV NEXT_PRIVATE_WORKER=true
RUN npm run build

# ── Stage 2: Production runtime ──
FROM python:3.12-slim

# Install Node.js in the production image
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Backend setup
WORKDIR /app/backend
COPY teledrive-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY teledrive-backend/ ./
RUN mkdir -p sessions local_cache

# Frontend setup — copy built assets and node_modules
WORKDIR /app/frontend
COPY --from=frontend-build /app/frontend/.next ./.next
COPY --from=frontend-build /app/frontend/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/package.json ./
COPY --from=frontend-build /app/frontend/next.config.ts ./
COPY --from=frontend-build /app/frontend/public ./public
COPY --from=frontend-build /app/frontend/src ./src
COPY --from=frontend-build /app/frontend/tsconfig.json ./

# Startup script
WORKDIR /app
COPY <<'EOF' /app/start.sh
#!/bin/bash
set -e

# Start backend
cd /app/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "[TeleDrive] Waiting for backend..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo "[TeleDrive] Backend is ready!"
    break
  fi
  sleep 1
done

# Start frontend (skip auto backend launch — already running)
cd /app/frontend
export TELEDRIVE_SKIP_BACKEND=true
npx next start --port 3000 &
FRONTEND_PID=$!

echo "[TeleDrive] Running on http://localhost:3000"

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
EOF

RUN chmod +x /app/start.sh

EXPOSE 3000 8000

CMD ["/app/start.sh"]
