# ==============================================================
# Casca Backend Production Multi-Stage Dockerfile
# ==============================================================

# Stage 1: Build TypeScript workspace
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Clean install all dependencies (including devDependencies needed for compiling TS)
RUN npm ci

# Copy source trees for shared library and backend
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared package and backend
RUN npm run build --workspace=@casca/shared && \
    npm run build --workspace=@casca/backend && \
    mkdir -p backend/dist/db/migrations && \
    cp -r backend/src/db/migrations/* backend/dist/db/migrations/

# Stage 2: Minimal Production Image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime tools (curl for healthcheck)
RUN apk add --no-cache curl

# Copy package manifests for workspace resolution
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install ONLY production dependencies to minimize image size and attack surface
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/dist/db/migrations ./backend/dist/db/migrations

# Expose HTTP port
EXPOSE 4000

# Container healthcheck using backend /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start the Casca backend server
CMD ["node", "backend/dist/index.js"]
