export function normalizeRepoName(repoName: string, repoUrl?: string): string {
  if (repoUrl && !repoUrl.startsWith('external://')) {
    try {
      const url = new URL(repoUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const org = parts.slice(0, -1).join('/');
        const repo = parts[parts.length - 1].replace(/\.git$/, '');
        return `${org}/${repo}`;
      }
    } catch { /* invalid URL, fallback to repoName */ }
  }
  return repoName;
}
