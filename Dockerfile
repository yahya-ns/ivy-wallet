# ==============================================================================
# Ivy Wallet - Ultra-lightweight Single Binary Container (Go + Vite SPA)
# ==============================================================================

# Stage 1: Build Frontend SPA
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go Single Binary
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend

# Install CA certificates and build tools if needed
RUN apk add --no-cache ca-certificates tzdata

COPY backend/go.mod backend/go.sum* ./
RUN go mod download

# Copy backend source
COPY backend/ ./

# Copy built frontend assets into Go embed path
COPY --from=frontend-builder /app/backend/cmd/server/dist ./cmd/server/dist

# Compile static binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/ivy-wallet ./cmd/server

# Stage 3: Minimal Production Image (~15MB)
FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata sqlite-libs

# Create unprivileged user
RUN addgroup -S ivy && adduser -S ivy -G ivy

# Create persistent data directory
RUN mkdir -p /data && chown -R ivy:ivy /data /app

# Copy binary from builder
COPY --from=backend-builder /app/ivy-wallet /app/ivy-wallet

USER ivy

ENV PORT=3000 \
    DATA_DIR=/data \
    DB_PATH=/data/ivy-wallet.db

EXPOSE 3000

VOLUME ["/data"]

ENTRYPOINT ["/app/ivy-wallet"]
