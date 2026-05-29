/**
 * Next.js instrumentation - runs once on server startup.
 * Validates environment variables early so missing config is caught immediately.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { env } = await import('@/server/env');
    void env.NODE_ENV;
    console.log('[env] Environment validated');

    // Warn if SMTP configured but host not reachable
    if (process.env.MAIL_PROVIDER === 'smtp' && !process.env.SMTP_HOST) {
      console.warn('[mail] MAIL_PROVIDER=smtp but SMTP_HOST not set');
    }
  }
}
