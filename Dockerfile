# =============================================================================
# SAST Integration — Docker Build (Multi-stage, Production)
# =============================================================================
# Build:  docker build -t sast-integration .
# Run:    docker compose up -d
#
# Build with scanners:
#   docker build --build-arg INCLUDE_SCANNERS=true -t sast-integration .
#
# Supported scanners: semgrep, flawfinder, cppcheck, gitleaks, clang-tidy, gcc
# =============================================================================

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps
RUN npm install -g pnpm@10
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
RUN npm install -g pnpm@10
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
RUN pnpm run build

# --- Stage 3: Production runtime ---
FROM node:22-alpine AS runner
WORKDIR /app

ARG INCLUDE_SCANNERS=false

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN npm install -g pnpm@10 && \
    apk add --no-cache wget ca-certificates tini && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/storage/uploads && \
    chown -R nextjs:nodejs /app

# Install scanners if enabled
RUN if [ "$INCLUDE_SCANNERS" = "true" ]; then \
      apk add --no-cache python3 py3-pip cppcheck gcc clang clang18-extra-tools && \
      ln -s /usr/lib/llvm18/bin/clang-tidy /usr/local/bin/clang-tidy && \
      pip3 install --break-system-packages semgrep flawfinder && \
      wget -qO- https://github.com/gitleaks/gitleaks/releases/download/v8.18.4/gitleaks_8.18.4_linux_x64.tar.gz | tar xz -C /usr/local/bin gitleaks ; \
    fi

# Copy Next.js build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
