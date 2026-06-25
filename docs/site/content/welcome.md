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

- **[Installation](getting-started/installation.md)** — Set up your environment
- **[First Scan](getting-started/first-scan.md)** — Run your first security scan
- **[Architecture](architecture/overview.md)** — Understand the system design
- **[API Reference](reference/api-overview.md)** — REST API documentation

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
| Session | Redis |
| AI | LLM providers with QLoRA fine-tuning |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/sast-integration.git

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

See the [Installation Guide](getting-started/installation.md) for detailed setup instructions.
