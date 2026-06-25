# Installation

## Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Runtime |
| PostgreSQL | 15+ | Database |
| Redis | 7+ | Session store |
| Git | 2.x | Repository cloning |
| npm | 10+ | Package management |

## Scanner Dependencies

Install the scanners you need (all are optional):

```bash
# Semgrep (multi-language, 30+ languages)
pip install semgrep

# Gitleaks (secrets detection)
# Download from: https://github.com/gitleaks/gitleaks/releases

# Flawfinder (C/C++ buffer overflows)
pip install flawfinder

# Cppcheck (C/C++ static analysis)
# Ubuntu: sudo apt install cppcheck
# macOS: brew install cppcheck

# Clang-Tidy (C/C++ linter)
# Ubuntu: sudo apt install clang-tidy
# macOS: brew install llvm

# GCC Fanalyzer (C/C++ static analysis)
# Requires GCC 10+ with --enable analyzer
```

## Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Required variables
DATABASE_URL=postgresql://user:pass@localhost:5432/sast
REDIS_URL=redis://localhost:6379
AUTH_SECRET=your-random-secret-here

# Feature flags (enable/disable features)
FEATURE_FLAG_TEAMS=true
FEATURE_FLAG_PROJECTS=true
FEATURE_FLAG_KNOWLEDGE_BASE=true
FEATURE_FLAG_SCANNER_ENGINES=true
FEATURE_FLAG_AI_MODELS=true
```

## Database Setup

```bash
# Generate Drizzle schema
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

## Start Development

```bash
npm run dev
```

The application runs at `http://localhost:3000`.

## Production Build

```bash
npm run build
npm start
```

## Docker (Alternative)

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, and the application server.
