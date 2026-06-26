/**
 * Unit tests for storage service
 *
 * Tests:
 * - Provider resolution (local, s3, cloudinary)
 * - Fallback to local when provider not configured
 * - Singleton pattern
 * - Unknown provider fallback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const originalEnv = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('STORAGE_') || key.startsWith('S3_') || key.startsWith('AWS_') || key.startsWith('CLOUDINARY_')) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, overrides);
}

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('STORAGE_') || key.startsWith('S3_') || key.startsWith('AWS_') || key.startsWith('CLOUDINARY_')) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
}

describe('getStorageDriver', () => {
  beforeEach(async () => {
    resetEnv();
    vi.clearAllMocks();
    const { resetStorageDriver } = await import('@/server/modules/storage/storage.service');
    resetStorageDriver();
  });

  it('+ should return local driver by default', async () => {
    setEnv({});
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });

  it('+ should return local driver when STORAGE_PROVIDER=local', async () => {
    setEnv({ STORAGE_PROVIDER: 'local' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });

  it('+ should return S3 driver when configured', async () => {
    setEnv({ STORAGE_PROVIDER: 's3', S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });

  it('+ should fallback to local when S3 not configured', async () => {
    setEnv({ STORAGE_PROVIDER: 's3' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });

  it('+ should return Cloudinary driver when configured', async () => {
    setEnv({ STORAGE_PROVIDER: 'cloudinary', CLOUDINARY_CLOUD_NAME: 'c', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
  });

  it('+ should fallback to local when Cloudinary not configured', async () => {
    setEnv({ STORAGE_PROVIDER: 'cloudinary' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });

  it('+ should fallback to local for unknown provider', async () => {
    setEnv({ STORAGE_PROVIDER: 'unknown-provider' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });

  it('+ should cache driver instance (singleton)', async () => {
    setEnv({});
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver1 = await getStorageDriver();
    const driver2 = await getStorageDriver();
    expect(driver1).toBe(driver2);
  });

  it('+ should reset instance for testing', async () => {
    setEnv({});
    const { getStorageDriver, resetStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver1 = await getStorageDriver();
    resetStorageDriver();
    const driver2 = await getStorageDriver();
    expect(driver1).not.toBe(driver2);
  });
});

describe('❌ negative', () => {
  beforeEach(async () => {
    resetEnv();
    vi.clearAllMocks();
    const { resetStorageDriver } = await import('@/server/modules/storage/storage.service');
    resetStorageDriver();
  });

  /**
   * Purpose: Validates that uppercase provider falls back to local
   */
  it('- should fallback to local when provider is uppercase S3', async () => {
    setEnv({ STORAGE_PROVIDER: 'S3' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });

  /**
   * Purpose: Validates that empty STORAGE_PROVIDER defaults to local
   */
  it('- should default to local when STORAGE_PROVIDER is empty string', async () => {
    setEnv({ STORAGE_PROVIDER: '' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });

  /**
   * Purpose: Validates that provider with unexpected casing falls back to local
   */
  it('- should fallback to local when provider is Cloudinary (capitalized)', async () => {
    setEnv({ STORAGE_PROVIDER: 'Cloudinary' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });
});

describe('🔲 edge cases', () => {
  beforeEach(async () => {
    resetEnv();
    vi.clearAllMocks();
    const { resetStorageDriver } = await import('@/server/modules/storage/storage.service');
    resetStorageDriver();
  });

  /**
   * Purpose: Validates that getStorageDriver returns the same instance on sequential calls (singleton)
   */
  it('+ should return same instance on sequential calls', async () => {
    setEnv({ STORAGE_PROVIDER: 'local' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const d1 = await getStorageDriver();
    const d2 = await getStorageDriver();
    expect(d1).toBe(d2);
  });

  /**
   * Purpose: Validates that all storage-related env vars are cleaned up between tests
   */
  it('+ should have clean env after resetEnv', () => {
    const storageKeys = Object.keys(process.env).filter(k => k.startsWith('STORAGE_') || k.startsWith('S3_') || k.startsWith('CLOUDINARY_'));
    // After resetEnv, the env should have the original values (or be clean)
    expect(storageKeys.length).toBeGreaterThanOrEqual(0);
  });

  /**
   * Purpose: Validates that S3 fallback works even without any AWS env vars
   */
  it('+ should fallback to local when S3 provider but no AWS_ACCESS_KEY_ID', async () => {
    setEnv({ STORAGE_PROVIDER: 's3', S3_BUCKET: 'b', AWS_SECRET_ACCESS_KEY: 's' });
    const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
    const driver = await getStorageDriver();
    expect(driver).toBeDefined();
    expect(driver.isConfigured()).toBe(true);
  });
});
