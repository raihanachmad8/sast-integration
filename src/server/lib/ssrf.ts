/**
 * SSRF protection — blocks requests to internal/private IP ranges.
 * Shared across webhook and AI model endpoints.
 *
 * Set ALLOW_LOCAL_AI_MODELS=true in .env to permit localhost/127.0.0.1
 * for AI model calls (Ollama running locally).
 */
export function isPrivateOrInternal(hostname: string, allowLocal = false): boolean {
  if (allowLocal) {
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
  }

  const blocked = ['localhost', '127.0.0.1', '::1', '0.0.0.0', 'metadata.google.internal', '169.254.169.254'];
  if (blocked.includes(hostname)) return true;

  const parts = hostname.split('.');
  if (parts.length === 4) {
    const [a, b] = parts.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
  }

  if (hostname.endsWith('.localhost') || hostname.endsWith('.local')) return true;

  return false;
}
