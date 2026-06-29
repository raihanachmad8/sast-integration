/**
 * Health check service.
 *
 * Purpose: Orchestrates health checks by calling repositories.
 * Keeps route handlers thin — route only parses request and returns response.
 *
 * @module server/modules/health/health.service
 */

import { logger } from '@/server/lib/logger';

import { healthRepository } from './health.repository';

export const healthService = {
  /**
   * Check application and database health.
   *
   * @returns Object with status, checks, and HTTP status code
   */
  async check() {
    logger.app.debug('health check:start');

    const dbHealthy = await healthRepository.checkDatabase();
    const checks: Record<string, string> = {
      app: 'healthy',
      database: dbHealthy ? 'healthy' : 'unhealthy',
    };

    const allHealthy = Object.values(checks).every((s) => s === 'healthy');
    const status = allHealthy ? 'healthy' : 'degraded';
    const statusCode = allHealthy ? 200 : 503;

    logger.app.debug('health check:completed', { status, checks });
    return { status, checks, statusCode };
  },
};
