/**
 * Supported SCM providers configuration.
 * Single source of truth for provider metadata, icons, and features.
 */

export interface ScmProviderConfig {
  id: string;
  name: string;
  icon: string;
  modeDetail: string;
  features: string[];
}

export const SCM_PROVIDERS: ScmProviderConfig[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: 'fa-brands fa-github',
    modeDetail: 'GitHub App · App installation',
    features: ['Commits', 'PR review', 'CODEOWNERS', 'Webhooks'],
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: 'fa-brands fa-gitlab',
    modeDetail: 'OAuth app · OAuth callback',
    features: ['Merge request review', 'CODEOWNERS', 'Webhooks'],
  },
  {
    id: 'gitea',
    name: 'Gitea',
    icon: 'fa-solid fa-code-fork',
    modeDetail: 'OAuth app · OAuth callback',
    features: ['Local OAuth', 'Repository import', 'Webhooks'],
  },


];

export function getProviderConfig(id: string): ScmProviderConfig | undefined {
  return SCM_PROVIDERS.find((p) => p.id === id);
}
