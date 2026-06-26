import type { StorageDriver } from './storage.interface';
import { LocalStorageDriver } from './drivers/local.driver';
import { logger } from '@/server/lib/logger';

type StorageProvider = 'local' | 's3' | 'cloudinary';

let _instance: StorageDriver | null = null;

/**
 * Returns the configured storage driver singleton.
 *
 * Resolution order:
 * 1. STORAGE_PROVIDER env var → create matching driver
 * 2. If the target driver is not configured → fall back to local
 * 3. Unknown provider → fall back to local
 *
 * The driver is cached after first creation (singleton pattern).
 */
export async function getStorageDriver(): Promise<StorageDriver> {
  if (_instance) return _instance;

  const provider = (process.env.STORAGE_PROVIDER ?? 'local') as StorageProvider;

  _instance = await createDriver(provider);
  logger.storage.info('storage driver initialized', { provider, configured: _instance.isConfigured() });

  // If the chosen driver reports not configured, fall back to local
  if (!_instance.isConfigured()) {
    logger.storage.warn(`${provider} driver not configured, falling back to local`);
    _instance = new LocalStorageDriver();
  }

  return _instance;
}

async function createDriver(provider: StorageProvider): Promise<StorageDriver> {
  switch (provider) {
    case 's3': {
      const { S3StorageDriver } = await import('./drivers/s3.driver');
      return new S3StorageDriver();
    }
    case 'cloudinary': {
      const { CloudinaryStorageDriver } = await import('./drivers/cloudinary.driver');
      return new CloudinaryStorageDriver();
    }
    case 'local':
    default:
      return new LocalStorageDriver();
  }
}

/**
 * Reset the singleton. For testing only.
 */
export function resetStorageDriver(): void {
  _instance = null;
}
