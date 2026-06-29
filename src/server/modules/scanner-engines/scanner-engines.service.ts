import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

import { scannerEnginesRepository } from './scanner-engines.repository';

export const scannerEnginesService = {
  /**
   * List all registered scanner engines.
   *
   * @returns Array of scanner engine records
   */
  async list() {
    logger.scannerEngine.info('list scanner engines');
    const result = await scannerEnginesRepository.list();
    logger.scannerEngine.info('list scanner engines completed', { count: result.length });
    return result;
  },

  /**
   * Retrieve a single scanner engine by ID.
   *
   * @param id - Scanner engine UUID
   * @returns Scanner engine record
   * @throws {AppError} If scanner engine is not found (404)
   */
  async getById(id: string) {
    logger.scannerEngine.info('get scanner engine by id', { id });
    const engine = await scannerEnginesRepository.getById(id);
    if (!engine) {
      throw new AppError('Scanner engine not found', 404, 'NOT_FOUND');
    }
    logger.scannerEngine.info('get scanner engine by id completed', { id });
    return engine;
  },
};
