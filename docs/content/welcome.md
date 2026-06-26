# Welcome to SAST Integration

> Multi-scanner static application security testing platform with AI-powered false positive reduction.

SAST Integration is a comprehensive security scanning platform that combines 6 scanner engines with LLM-based verification to deliver actionable security findings with minimal false positives.

## Key Capabilities

| Feature | Description |
|---------|-------------|
| **6 Scanner Engines** | Semgrep, Gitleaks, Flawfinder, Cppcheck, Clang-Tidy, GCC Fanalyzer |
| **AI Verification** | QLoRA-tuned LLM reduces false positives by 70%+ |
| **Source Control** | GitHub, GitLab, and Gitea integration |
| **Knowledge Base** | CWE, NVD, and MITRE ATT&CK context enrichment |
| **RBAC** | 4 roles with 37 granular permissions |
| **Reporting** | PDF and XLSX security report generation |

## Quick Links

- **[Installation](/docs/installation)** — Set up your environment
- **[First Scan](/docs/first-scan)** — Run your first security scan
- **[Architecture](/docs/overview)** — Understand the system design
- **[API Reference](/docs/api-overview)** — REST API documentation

## How It Works

1. **Connect** — Import repositories from GitHub, GitLab, or Gitea
2. **Scan** — Run multi-engine static analysis with 6 scanners
3. **Verify** — AI verifies findings and reduces false positives
4. **Report** — Generate PDF/XLSX security reports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS, Ant Design |
| Backend | Next.js API Routes, TypeScript |
| Database | PostgreSQL with Drizzle ORM |
| Queue | pg-boss (PostgreSQL-based job queue) |
| Session | PostgreSQL |
| AI | LLM providers with QLoRA fine-tuning |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/raihanachmad8/sast-integration.git

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

See the [Installation Guide](/docs/installation) for detailed setup instructions.
