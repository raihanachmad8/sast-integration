export interface DocItem {
  slug: string;
  title: string;
  description: string;
  file: string;
}

export interface DocSection {
  label: string;
  items: DocItem[];
}

export const DOCS_CONFIG: DocSection[] = [
  {
    label: 'Getting Started',
    items: [
      { slug: 'welcome', title: 'Welcome', description: 'Platform overview and guide', file: 'welcome.md' },
      { slug: 'authentication', title: 'Authentication', description: 'Sign in, sign up, password reset', file: 'getting-started/authentication.md' },
    ],
  },
  {
    label: 'Features',
    items: [
      { slug: 'dashboard', title: 'Dashboard', description: 'Workspace overview', file: 'features/dashboard.md' },
      { slug: 'repositories', title: 'Repositories', description: 'Import and manage code', file: 'features/repositories.md' },
      { slug: 'scans', title: 'Scans', description: 'Run and monitor scans', file: 'features/scans.md' },
      { slug: 'findings', title: 'Findings', description: 'Review and triage findings', file: 'features/findings.md' },
      { slug: 'reports', title: 'Reports', description: 'Generate security reports', file: 'features/reports.md' },
      { slug: 'members', title: 'Members', description: 'Invite and manage team members', file: 'features/members.md' },
      { slug: 'teams', title: 'Teams', description: 'Organize members into teams', file: 'features/teams.md' },
      { slug: 'projects', title: 'Projects', description: 'Group repos and manage access', file: 'features/projects.md' },
      { slug: 'profile', title: 'Profile', description: 'Account settings', file: 'features/profile.md' },
      { slug: 'source-control', title: 'Source Control', description: 'Connect GitHub, GitLab, Gitea', file: 'features/source-control.md' },
      { slug: 'ai-models', title: 'AI Models', description: 'Configure LLM providers', file: 'features/ai-models.md' },
      { slug: 'knowledge-base', title: 'Knowledge Base', description: 'CWE & NVD reference', file: 'features/knowledge-base.md' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { slug: 'glossary', title: 'Glossary', description: 'Terms and definitions', file: 'reference/glossary.md' },
      { slug: 'troubleshooting', title: 'Troubleshooting', description: 'Common issues', file: 'reference/troubleshooting.md' },
    ],
  },
];

export function getAllDocSlugs(): string[] {
  return DOCS_CONFIG.flatMap((section) => section.items.map((item) => item.slug));
}

export function getDocBySlug(slug: string): DocItem | undefined {
  return DOCS_CONFIG.flatMap((section) => section.items).find((item) => item.slug === slug);
}
