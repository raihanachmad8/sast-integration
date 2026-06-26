#!/bin/sh
set -e

# =============================================================================
# SAST Integration — Docker Entrypoint
# =============================================================================
# Pattern: Gitea / SonarQube style
#   1. Validate required env vars
#   2. Wait for database connectivity
#   3. Start application
#
# Migrations are run separately:
#   docker exec sast-app node drizzle/migrate.js
#   Or via docker-compose init container
# =============================================================================

echo "==> SAST Integration starting..."

# --- Validate required environment variables ---
if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL is required"
  exit 1
fi

if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
  echo "FATAL: JWT_SECRET must be at least 32 characters"
  exit 1
fi

# --- Wait for database ---
# Extract host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_PORT=${DB_PORT:-5432}

echo "==> Waiting for database at $DB_HOST:$DB_PORT..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if nc -z -w2 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "==> Database is reachable"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "    Attempt $RETRY_COUNT/$MAX_RETRIES - waiting 2s..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "WARNING: Could not verify database connectivity after ${MAX_RETRIES} attempts"
  echo "         Application will attempt to connect on startup"
fi

# --- Start application ---
echo "==> Starting SAST Integration on port ${PORT:-3000}..."
exec node server.js
