# =============================================================================
# SAST Integration — Multi-stage Docker Build with Scanner Binaries
# =============================================================================
# This Dockerfile installs all supported SAST scanner binaries so that
# managed scans can run inside the container without external dependencies.
#
# Supported scanners: semgrep, gitleaks, trivy, cppcheck, flawfinder
#
# Build:  docker build -t sast-integration .
# Run:    docker-compose up -d
# =============================================================================

# --- Base Stage ---
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache git

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- Scanner Dependencies ---
FROM base AS scanners
WORKDIR /app

# System dependencies for scanners
RUN apk add --no-cache \
    python3 \
    py3-pip \
    cppcheck \
    && pip3 install --break-system-packages semgrep flawfinder

# gitleaks (Go binary, ~6MB)
RUN wget -qO- https://github.com/gitleaks/gitleaks/releases/download/v8.18.4/gitleaks_8.18.4_linux_x64.tar.gz \
    | tar xz -C /usr/local/bin gitleaks

# trivy (Go binary, ~47MB)
RUN wget -qO- https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
    | sh -s -- -b /usr/local/bin

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy scanner binaries from scanners stage
COPY --from=scanners /usr/local/bin/semgrep /usr/local/bin/
COPY --from=scanners /usr/local/bin/gitleaks /usr/local/bin/
COPY --from=scanners /usr/local/bin/trivy /usr/local/bin/
COPY --from=scanners /usr/local/bin/cppcheck /usr/local/bin/
COPY --from=scanners /usr/local/bin/flawfinder /usr/local/bin/

# Copy Python runtime (needed by semgrep and flawfinder)
COPY --from=scanners /usr/lib/python3 /usr/lib/python3
COPY --from=scanners /usr/bin/python3 /usr/bin/python3

# Copy Next.js build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create storage directory
RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
