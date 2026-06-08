/**
 * Docs content utility.
 * Provides doc content from a built-in content map.
 * Set DOC_CONTENT_<SLUG_UCAPS>=<content> env var to override any page.
 */

function getEnvContent(slug: string): string | undefined {
  const key = `DOC_CONTENT_${slug.replace(/[-]/g, '_').toUpperCase()}`;
  return process.env[key] ?? undefined;
}

/**
 * Default placeholder content shown when no env override is set.
 * Describes the page and invites the user to supply content.
 */
const PLACEHOLDER_CONTENT = `## Content Coming Soon

This page is a placeholder. The actual documentation content was removed from the file system.

### How to add content

Set an environment variable \`DOC_CONTENT_${'SLUG_UCAPS'}\` with your markdown content:

\`\`\`bash
DOC_CONTENT_ARCHITECTURE="# Architecture\\n\\nDescribe your architecture here." pnpm dev
\`\`\`

Replace \`SLUG_UCAPS\` with the uppercased slug (e.g. \`ARCHITECTURE\`, \`GETTING_STARTED\`).
`;

/** Built-in content map for each doc slug */
const CONTENT_MAP: Record<string, string> = {
  overview: `## Overview

SAST Integration is a platform for managing Static Application Security Testing (SAST) scans, findings, and remediation workflows.

### Key Capabilities

- **Scan Management** — Run and schedule SAST scans across multiple repositories
- **AI Verification** — Reduce false positives with model-based finding classification
- **Findings Triage** — Track, assign, and remediate security findings
- **Quality Gates** — Enforce security standards before merges
- **Integrations** — Connect with GitHub, GitLab, and other source control platforms

### Getting Started

See the [Getting Started](/docs/getting-started) guide to deploy and run your first scan.`,

  'getting-started': `## Getting Started

Follow this guide to set up SAST Integration and run your first scan.

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- pnpm 9+

### Quick Start

1. **Clone the repository**
2. **Install dependencies** — \`pnpm install\`
3. **Set up environment** — Copy \`.env.example\` to \`.env\` and configure
4. **Run database migrations** — \`pnpm db:migrate\`
5. **Start the dev server** — \`pnpm dev\`

Your app will be available at \`http://localhost:3000\`.`,

  architecture: `## Architecture

The SAST Integration platform follows a modern full-stack architecture.

### High-Level Diagram

\`\`\`mermaid
graph TD
    A[Next.js App] -->|API Routes| B[Service Layer]
    B --> C[Repository Layer]
    C --> D[(PostgreSQL)]
    B --> E[Scanner Adapters]
    E --> F[Semgrep]
    E --> G[CodeQL]
    E --> H[SonarQube]

    I[Background Jobs] --> B
    J[Webhook Handlers] --> B
\`\`\`

### Layers

- **Presentation** — Next.js App Router with React Server Components
- **API** — Next.js Route Handlers with validation (Zod)
- **Service** — Business logic, orchestration, auth
- **Repository** — Drizzle ORM with PostgreSQL
- **Scanner** — Adapter pattern for SAST engines`,

  scanning: `## Scanning

SAST Integration supports multiple scanner engines through a unified adapter interface.

### Supported Engines

- **Semgrep** — Fast, multi-language pattern matching
- **CodeQL** — Deep semantic analysis (GitHub integration)
- **SonarQube** — Comprehensive code quality and security

### Pipeline

1. **Trigger** — Manual, webhook, or scheduled
2. **Dispatch** — Scan request queued to background worker
3. **Execute** — Scanner runs against the target repository
4. **Collect** — Findings parsed and stored
5. **Verify** — AI model classifies findings (optional)
6. **Notify** — Results sent to configured channels`,

  'ai-verification': `## AI Verification

The AI Verification module reduces false positives by classifying scanner findings using machine learning models.

### How It Works

1. Scanner finds a potential issue
2. Finding sent to the configured AI model
3. Model returns classification: \`true_positive\`, \`false_positive\`, or \`uncertain\`
4. Classification recorded alongside the finding
5. Quality gates can filter by verification status

### Supported Models

- **Built-in Classifier** — Lightweight rule-based model (no external dependency)
- **OpenAI / Anthropic** — LLM-based classification for complex cases
- **Custom** — Bring your own model via API`,

  'api-reference': `## API Reference

The SAST Integration platform exposes a REST API under \`/api/v1\`.

### Authentication

All API requests require a Bearer token obtained from the \`/auth/signin\` endpoint.

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /auth/signin | Sign in |
| POST   | /auth/signup | Create account |
| POST   | /auth/refresh | Refresh access token |
| GET    | /auth/me | Current user |
| POST   | /auth/signout | Sign out |

### Rate Limiting

API requests are rate-limited per user. See the \`X-RateLimit-*\` response headers.`,
};

/**
 * Read doc content for a given filename.
 *
 * Checks, in order:
 * 1. Environment variable override (DOC_CONTENT_<SLUG>)
 * 2. Built-in content map
 * 3. Placeholder fallback
 */
export function readDocFile(filename: string): string {
  const slug = filename.replace(/\.mdx$/, '');
  const envContent = getEnvContent(slug);
  if (envContent) return envContent;

  return CONTENT_MAP[slug] ?? PLACEHOLDER_CONTENT;
}

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter: Record<string, string> = {};
  match[1].split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  });

  return { frontmatter, body: match[2] };
}
