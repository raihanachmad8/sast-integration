import { logger } from '@/server/lib/logger';
import { healthService } from '@/server/modules/health/health.service';

export async function GET() {
  logger.app.debug('GET /api/v1/health');
  const result = await healthService.check();

  return new Response(
    JSON.stringify({
      success: true,
      data: { status: result.status, checks: result.checks, timestamp: new Date().toISOString() },
    }),
    { status: result.statusCode, headers: { 'Content-Type': 'application/json' } },
  );
}
