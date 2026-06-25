# SAST Integration Documentation Site

Static documentation site for the SAST Integration platform.

## Structure

```
docs/site/
├── index.html              # Landing page
├── docs.html               # Documentation viewer
├── start-docs.bat          # Windows launcher
├── README.md               # This file
└── content/                # Markdown documentation
    ├── welcome.md
    ├── getting-started/
    │   ├── installation.md
    │   ├── authentication.md
    │   ├── first-scan.md
    │   └── scanner-installation.md
    ├── architecture/
    │   ├── overview.md
    │   ├── scan-pipeline.md
    │   ├── ai-verification.md
    │   └── workspace-model.md
    ├── features/
    │   ├── repositories.md
    │   ├── scans.md
    │   ├── findings.md
    │   ├── reports.md
    │   ├── arena.md
    │   └── knowledge-base.md
    ├── guides/
    │   ├── cpp-security.md
    │   ├── custom-rules.md
    │   ├── best-practices.md
    │   ├── troubleshooting.md
    │   ├── quick-reference.md
    │   └── user-interaction-scenarios.md
    ├── integrations/
    │   ├── source-control.md
    │   ├── webhooks.md
    │   └── ai-models.md
    ├── configuration/
    │   ├── scan-policies.md
    │   ├── quality-gates.md
    │   ├── schedules.md
    │   ├── scanner-engines.md
    │   └── storage.md
    ├── security/
    │   ├── rbac.md
    │   ├── workspace-permissions.md
    │   ├── api-tokens.md
    │   ├── audit-logs.md
    │   └── project-access-control.md
    └── reference/
        ├── api-overview.md
        ├── cwe-mapping.md
        └── environment-variables.md
```

## Running Locally

### Windows

Double-click `start-docs.bat` or run:

```cmd
start-docs.bat
```

This starts a Python HTTP server on port 8000 and opens the browser.

### macOS/Linux

```bash
cd docs/site
python3 -m http.server 8000
```

Then open http://localhost:8000

## Dependencies

All dependencies are loaded via CDN (no build step required):

- **Tailwind CSS** — Styling
- **Font Awesome 6.5.1** — Icons
- **Inter** — Typography
- **marked.js** — Markdown rendering
- **highlight.js** — Code syntax highlighting
- **mermaid.js** — Diagram rendering

## Features

- Responsive design (mobile-friendly)
- Teal theme (#0f766e) consistent with main app
- Sidebar navigation with collapsible sections
- Table of contents on documentation pages
- Ctrl+K search modal
- Markdown rendering with syntax highlighting
- Mermaid diagram support
- Mobile menu toggle

## Theme

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #0f766e | Links, accents, CTAs |
| Dark | #115e59 | Hover states |
| Light | #14b8a6 | Highlights |
| Secondary | #10b981 | Emerald accents |
| Background | #0f172a | Dark sections |

## Links

- Landing page: `index.html`
- Documentation: `docs.html`
- Main application: `../`
