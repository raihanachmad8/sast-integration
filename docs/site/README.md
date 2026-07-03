# SAST Integration — User Guide

Enterprise user documentation for the SAST Integration platform.

This guide is for **end users** — security team members and workspace administrators who use the application daily.

## Structure

```
docs/site/content/
├── welcome.md                          # Overview, roles, scenarios
├── getting-started/
│   └── authentication.md               # Sign in, sign up, password reset
├── features/
│   ├── dashboard.md                    # Workspace overview
│   ├── repositories.md                 # Import and manage code
│   ├── scans.md                        # Run and monitor scans
│   ├── findings.md                     # Review and triage findings
│   ├── reports.md                      # Generate security reports
│   ├── profile.md                      # Account settings
│   ├── source-control.md               # Connect GitHub, GitLab, Gitea
│   ├── ai-models.md                    # Configure LLM providers
│   └── knowledge-base.md               # CWE & NVD reference
└── reference/
    ├── glossary.md                     # Terms and definitions
    └── troubleshooting.md              # Common issues
```

## Features Covered

1. **Dashboard** — workspace overview and metrics
2. **Repositories** — import and manage code
3. **Scans** — run manual and CI/CD scans
4. **Findings** — review, triage, assign
5. **Reports** — generate PDF/XLSX exports
6. **Members** — invite and manage team members
7. **Teams** — organize members into teams
8. **Projects** — group repos and manage access
9. **Profile** — account settings and security
10. **Source Control** — connect GitHub/GitLab/Gitea
11. **AI Models** — configure LLM verification
12. **Knowledge Base** — CWE/NVD reference

## What's NOT Here (Developer Docs)

These topics are in the main [docs/](../) folder:

- Installation & setup
- Docker deployment
- Environment variables
- API reference
- RBAC technical details
- Architecture deep-dives

## Serving

The docs are served by the Next.js app at `/docs`. The markdown files in `content/` are loaded by the app's docs layout.
