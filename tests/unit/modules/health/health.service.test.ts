import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/server/lib/logger', () => ({
  logger: { app: { debug: vi.fn(), info: vi.fn(), error: vi.fn() } },
}));

vi.mock('@/server/modules/health/health.repository', () => ({
  healthRepository: { checkDatabase: vi.fn() },
}));

import { healthService } from '@/server/modules/health/health.service';
import { healthRepository } from '@/server/modules/health/health.repository';

describe('healthService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('check', () => {
    it('should return healthy when database is up', async () => {
      vi.mocked(healthRepository.checkDatabase).mockResolvedValue(true);

      const result = await healthService.check();

      expect(result.status).toBe('healthy');
      expect(result.statusCode).toBe(200);
      expect(result.checks.app).toBe('healthy');
      expect(result.checks.database).toBe('healthy');
    });

    it('should return degraded when database is down', async () => {
      vi.mocked(healthRepository.checkDatabase).mockResolvedValue(false);

      const result = await healthService.check();

      expect(result.status).toBe('degraded');
      expect(result.statusCode).toBe(503);
      expect(result.checks.database).toBe('unhealthy');
    });

    it('should always report app as healthy', async () => {
      vi.mocked(healthRepository.checkDatabase).mockResolvedValue(true);

      const result = await healthService.check();

      expect(result.checks.app).toBe('healthy');
    });

    it('should call healthRepository.checkDatabase', async () => {
      vi.mocked(healthRepository.checkDatabase).mockResolvedValue(true);

      await healthService.check();

      expect(healthRepository.checkDatabase).toHaveBeenCalledOnce();
    });
  });
});
