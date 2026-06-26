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
      { slug: 'welcome', title: 'Welcome', description: 'Platform overview and quick links', file: 'welcome.md' },
      { slug: 'installation', title: 'Installation', description: 'Set up SAST Integration', file: 'installation.md' },
      { slug: 'authentication', title: 'Authentication', description: 'Login and user management', file: 'authentication.md' },
      { slug: 'first-scan', title: 'First Scan', description: 'Run your first security scan', file: 'first-scan.md' },
      { slug: 'scanner-installation', title: 'Scanner Installation', description: 'Install C/C++ scanners', file: 'scanner-installation.md' },
    ],
  },
  {
    label: 'Architecture',
    items: [
      { slug: 'overview', title: 'Overview', description: 'System architecture and components', file: 'overview.md' },
      { slug: 'scan-pipeline', title: 'Scan Pipeline', description: 'How scans are executed', file: 'scan-pipeline.md' },
      { slug: 'ai-verification', title: 'AI Verification', description: 'AI-powered finding verification', file: 'ai-verification.md' },
      { slug: 'workspace-model', title: 'Workspace Model', description: 'Data organization', file: 'workspace-model.md' },
    ],
  },
  {
    label: 'Features',
    items: [
      { slug: 'repositories', title: 'Repositories', description: 'Repository management', file: 'repositories.md' },
      { slug: 'scans', title: 'Scans', description: 'Scan configuration and execution', file: 'scans.md' },
      { slug: 'findings', title: 'Findings', description: 'Security finding management', file: 'findings.md' },
      { slug: 'reports', title: 'Reports', description: 'Report generation and export', file: 'reports.md' },
      { slug: 'arena', title: 'Arena', description: 'Scanner comparison workspace', file: 'arena.md' },
      { slug: 'knowledge-base', title: 'Knowledge Base', description: 'CWE, NVD, MITRE integration', file: 'knowledge-base.md' },
    ],
  },
  {
    label: 'Guides',
    items: [
      { slug: 'cpp-security', title: 'C/C++ Security', description: 'Complete C/C++ security guide', file: 'cpp-security.md' },
      { slug: 'custom-rules', title: 'Custom Rules', description: 'Write custom detection rules', file: 'custom-rules.md' },
      { slug: 'best-practices', title: 'Best Practices', description: 'Security best practices', file: 'best-practices.md' },
      { slug: 'troubleshooting', title: 'Troubleshooting', description: 'Common issues and solutions', file: 'troubleshooting.md' },
      { slug: 'quick-reference', title: 'Quick Reference', description: 'Quick reference card', file: 'quick-reference.md' },
      { slug: 'user-interaction-scenarios', title: 'User Scenarios', description: 'User interaction flows', file: 'user-interaction-scenarios.md' },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { slug: 'source-control', title: 'Source Control', description: 'GitHub, GitLab, Gitea', file: 'source-control.md' },
      { slug: 'webhooks', title: 'Webhooks', description: 'Automated scan triggers', file: 'webhooks.md' },
      { slug: 'ai-models', title: 'AI Models', description: 'AI provider configuration', file: 'ai-models.md' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { slug: 'scan-policies', title: 'Scan Policies', description: 'Define scan rules', file: 'scan-policies.md' },
      { slug: 'quality-gates', title: 'Quality Gates', description: 'Set quality thresholds', file: 'quality-gates.md' },
      { slug: 'schedules', title: 'Schedules', description: 'Recurring scans', file: 'schedules.md' },
      { slug: 'scanner-engines', title: 'Scanner Engines', description: 'Scanner configuration', file: 'scanner-engines.md' },
      { slug: 'storage', title: 'Storage', description: 'Storage configuration', file: 'storage.md' },
    ],
  },
  {
    label: 'Security',
    items: [
      { slug: 'rbac', title: 'RBAC', description: 'Role-based access control', file: 'rbac.md' },
      { slug: 'workspace-permissions', title: 'Workspace Permissions', description: 'Permission details', file: 'workspace-permissions.md' },
      { slug: 'api-tokens', title: 'API Tokens', description: 'API authentication', file: 'api-tokens.md' },
      { slug: 'audit-logs', title: 'Audit Logs', description: 'Activity logging', file: 'audit-logs.md' },
      { slug: 'project-access-control', title: 'Project Access', description: 'Project-level access control', file: 'project-access-control.md' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { slug: 'api-overview', title: 'API Overview', description: 'REST API documentation', file: 'api-overview.md' },
      { slug: 'cwe-mapping', title: 'CWE Mapping', description: 'Supported CWE list', file: 'cwe-mapping.md' },
      { slug: 'environment-variables', title: 'Environment Variables', description: 'Configuration options', file: 'environment-variables.md' },
    ],
  },
];

export function getAllDocSlugs(): string[] {
  return DOCS_CONFIG.flatMap((section) => section.items.map((item) => item.slug));
}

export function getDocBySlug(slug: string): DocItem | undefined {
  return DOCS_CONFIG.flatMap((section) => section.items).find((item) => item.slug === slug);
}
