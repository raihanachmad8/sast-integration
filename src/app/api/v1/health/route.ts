import { ApiResponse } from '@/server/http/response';
import { db } from '@/server/db/client';
import { sql } from 'drizzle-orm';

export async function GET() {
  const checks: Record<string, string> = { app: 'healthy' };

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  const allHealthy = Object.values(checks).every((s) => s === 'healthy');
  const status = allHealthy ? 200 : 503;

  return new Response(
    JSON.stringify({
      success: true,
      data: { status: allHealthy ? 'healthy' : 'degraded', checks, timestamp: new Date().toISOString() },
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}