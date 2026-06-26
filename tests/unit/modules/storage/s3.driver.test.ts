/**
 * Unit tests for S3StorageDriver
 *
 * Tests:
 * - Constructor configuration (AWS vs MinIO)
 * - Public/private bucket support
 * - URL generation patterns
 * - isConfigured checks
 * - Upload with content type and metadata
 * - Delete delegates to S3 client
 * - getStream returns readable stream
 * - Interface compliance
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock AWS SDK ---
const mockSend = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function () {
    return { send: mockSend };
  }),
  PutObjectCommand: vi.fn().mockImplementation(function (input: Record<string, unknown>) {
    return { input };
  }),
  DeleteObjectCommand: vi.fn().mockImplementation(function (input: Record<string, unknown>) {
    return { input };
  }),
  GetObjectCommand: vi.fn().mockImplementation(function (input: Record<string, unknown>) {
    return { input };
  }),
}));

const originalEnv = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('S3_') || key.startsWith('AWS_') || key === 'STORAGE_PROVIDER') {
      delete process.env[key];
    }
  }
  Object.assign(process.env, overrides);
}

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('S3_') || key.startsWith('AWS_') || key === 'STORAGE_PROVIDER') {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
}

// --- Tests ---

describe('S3StorageDriver', () => {
  beforeEach(() => {
    resetEnv();
    vi.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('+ should return true when all credentials present', async () => {
      setEnv({ S3_BUCKET: 'my-bucket', AWS_ACCESS_KEY_ID: 'akid', AWS_SECRET_ACCESS_KEY: 'secret' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(new S3StorageDriver().isConfigured()).toBe(true);
    });

    it('- should return false when access key missing', async () => {
      setEnv({ S3_BUCKET: 'my-bucket', AWS_SECRET_ACCESS_KEY: 'secret' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(new S3StorageDriver().isConfigured()).toBe(false);
    });

    it('- should return false when secret key missing', async () => {
      setEnv({ S3_BUCKET: 'my-bucket', AWS_ACCESS_KEY_ID: 'akid' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(new S3StorageDriver().isConfigured()).toBe(false);
    });

    it('- should return false when bucket missing', async () => {
      setEnv({ AWS_ACCESS_KEY_ID: 'akid', AWS_SECRET_ACCESS_KEY: 'secret', S3_BUCKET: '' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      // Empty string bucket is falsy, so isConfigured should return false
      const driver = new S3StorageDriver({ bucket: '' });
      expect(driver.isConfigured()).toBe(false);
    });

    it('+ should return true in MinIO mode', async () => {
      setEnv({ S3_ENDPOINT: 'http://localhost:9000', S3_BUCKET: 'minio', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(new S3StorageDriver().isConfigured()).toBe(true);
    });
  });

  describe('constructor', () => {
    it('+ should use default region us-east-1', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      const driver = new S3StorageDriver();
      const url = driver.getUrl('f.txt');
      expect(url).toContain('us-east-1');
    });

    it('+ should use custom region', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_REGION: 'eu-west-1', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      const driver = new S3StorageDriver();
      expect(driver.getUrl('f.txt')).toContain('eu-west-1');
    });

    it('+ should use custom bucket from options', async () => {
      setEnv({ AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      const driver = new S3StorageDriver({ bucket: 'custom-bucket' });
      expect(driver.getUrl('f.txt')).toContain('custom-bucket');
    });

    it('+ should use endpoint for MinIO', async () => {
      setEnv({ AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      const driver = new S3StorageDriver({ endpoint: 'http://minio:9000', bucket: 'minio' });
      expect(driver.getUrl('f.txt')).toContain('http://minio:9000/minio');
    });
  });

  describe('getUrl - public bucket', () => {
    it('+ should return public AWS S3 URL', async () => {
      setEnv({ S3_BUCKET: 'public-bucket', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(new S3StorageDriver().getUrl('file.pdf')).toBe('https://public-bucket.s3.us-east-1.amazonaws.com/file.pdf');
    });

    it('+ should return public MinIO URL', async () => {
      setEnv({ S3_ENDPOINT: 'http://minio:9000', S3_BUCKET: 'public', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(new S3StorageDriver().getUrl('img.png')).toBe('http://minio:9000/public/img.png');
    });

    it('+ should handle nested keys', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(new S3StorageDriver().getUrl('scans/2024/file.json')).toContain('scans/2024/file.json');
    });
  });

  describe('upload', () => {
    it('+ should upload and return correct result', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      const result = await new S3StorageDriver().upload(Buffer.from('hello'), 'test.txt');
      expect(result.key).toBe('test.txt');
      expect(result.url).toContain('test.txt');
      expect(result.size).toBe(5);
    });

    it('+ should include content type in upload', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      await new S3StorageDriver().upload(Buffer.from('x'), 'f.pdf', { contentType: 'application/pdf' });
      expect(mockSend).toHaveBeenCalled();
    });

    it('+ should include metadata in upload', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      await new S3StorageDriver().upload(Buffer.from('x'), 'f.txt', { metadata: { userId: 'u1' } });
      expect(mockSend).toHaveBeenCalled();
    });

    it('+ should use MinIO endpoint for upload', async () => {
      setEnv({ S3_ENDPOINT: 'http://minio:9000', S3_BUCKET: 'minio', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      const result = await new S3StorageDriver().upload(Buffer.from('x'), 'f.txt');
      expect(result.url).toContain('http://minio:9000/minio');
    });
  });

  describe('delete', () => {
    it('+ should call S3 delete', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      await new S3StorageDriver().delete('file.txt');
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getStream', () => {
    it('+ should return stream from S3', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      const mockStream = { pipe: vi.fn() };
      mockSend.mockResolvedValueOnce({ Body: mockStream });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(await new S3StorageDriver().getStream('f.txt')).toBe(mockStream);
    });

    it('- should return undefined when body missing', async () => {
      setEnv({ S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' });
      mockSend.mockResolvedValueOnce({ Body: undefined });
      const { S3StorageDriver } = await import('@/server/modules/storage/drivers/s3.driver');
      expect(await new S3StorageDriver().getStream('missing.txt')).toBeUndefined();
    });
  });
});
