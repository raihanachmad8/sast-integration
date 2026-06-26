/**
 * Unit tests for CloudinaryStorageDriver
 *
 * Tests:
 * - Public/private asset support
 * - Constructor with custom folder
 * - isConfigured checks
 * - getUrl generates correct Cloudinary URL
 * - Interface compliance
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const originalEnv = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('CLOUDINARY_') || key === 'STORAGE_PROVIDER') {
      delete process.env[key];
    }
  }
  Object.assign(process.env, overrides);
}

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('CLOUDINARY_') || key === 'STORAGE_PROVIDER') {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
}

describe('CloudinaryStorageDriver', () => {
  beforeEach(() => {
    resetEnv();
    vi.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('+ should return true when all credentials present', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      expect(new CloudinaryStorageDriver().isConfigured()).toBe(true);
    });

    it('- should return false when cloud name missing', async () => {
      setEnv({ CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      expect(new CloudinaryStorageDriver().isConfigured()).toBe(false);
    });

    it('- should return false when api key missing', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_SECRET: 'secret' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      expect(new CloudinaryStorageDriver().isConfigured()).toBe(false);
    });

    it('- should return false when api secret missing', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_KEY: 'key' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      expect(new CloudinaryStorageDriver().isConfigured()).toBe(false);
    });

    it('- should return false when all credentials missing', async () => {
      setEnv({});
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      expect(new CloudinaryStorageDriver().isConfigured()).toBe(false);
    });
  });

  describe('constructor', () => {
    it('+ should use default folder from env', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'c', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's', CLOUDINARY_FOLDER: 'custom-folder' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      const driver = new CloudinaryStorageDriver();
      expect(driver).toBeDefined();
    });

    it('+ should use custom folder from options', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'c', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      const driver = new CloudinaryStorageDriver({ folder: 'my-app' });
      expect(driver).toBeDefined();
    });
  });

  describe('getUrl - public assets', () => {
    it('+ should return public Cloudinary URL', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      const driver = new CloudinaryStorageDriver();
      expect(driver.getUrl('image.png')).toBe('https://res.cloudinary.com/mycloud/image/upload/sast/image.png');
    });

    it('+ should use custom folder in URL', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      const driver = new CloudinaryStorageDriver({ folder: 'production' });
      expect(driver.getUrl('report.pdf')).toBe('https://res.cloudinary.com/mycloud/image/upload/production/report.pdf');
    });

    it('+ should handle nested keys', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      const driver = new CloudinaryStorageDriver();
      expect(driver.getUrl('scans/2024/file.json')).toContain('scans/2024/file.json');
    });
  });

  describe('public vs private assets', () => {
    it('+ should support public folder for public assets', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      const publicDriver = new CloudinaryStorageDriver({ folder: 'public' });
      expect(publicDriver.getUrl('logo.png')).toContain('/public/');
    });

    it('+ should support private folder for internal assets', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      const privateDriver = new CloudinaryStorageDriver({ folder: 'private' });
      expect(privateDriver.getUrl('report.pdf')).toContain('/private/');
    });

    it('+ should keep public and private folders isolated', async () => {
      setEnv({ CLOUDINARY_CLOUD_NAME: 'mycloud', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' });
      const { CloudinaryStorageDriver } = await import('@/server/modules/storage/drivers/cloudinary.driver');
      const pubDriver = new CloudinaryStorageDriver({ folder: 'public' });
      const privDriver = new CloudinaryStorageDriver({ folder: 'private' });

      const pubUrl = pubDriver.getUrl('file.txt');
      const privUrl = privDriver.getUrl('file.txt');

      expect(pubUrl).toContain('/public/');
      expect(privUrl).toContain('/private/');
      expect(pubUrl).not.toBe(privUrl);
    });
  });
});
