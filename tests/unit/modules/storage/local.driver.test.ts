/**
 * Unit tests for LocalStorageDriver
 *
 * Tests:
 * - Public/private path support
 * - Constructor with custom paths
 * - Upload writes to disk with correct structure
 * - getUrl generates correct public URL
 * - getStream returns readable stream
 * - delete handles missing files gracefully
 * - isConfigured always returns true
 * - Interface compliance
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(process.cwd(), 'test-storage-local');

describe('LocalStorageDriver', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  describe('isConfigured', () => {
    it('+ should always return true', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      expect(new LocalStorageDriver({ basePath: TEST_DIR }).isConfigured()).toBe(true);
    });
  });

  describe('constructor', () => {
    it('+ should use custom basePath', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      expect(driver).toBeDefined();
    });

    it('+ should use custom baseUrl', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'https://cdn.example.com/files' });
      const url = driver.getUrl('test.txt');
      expect(url).toBe('https://cdn.example.com/files/test.txt');
    });
  });

  describe('upload', () => {
    it('+ should write file to disk', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      const result = await driver.upload(Buffer.from('hello world'), 'test/file.txt');

      expect(result.key).toBe('test/file.txt');
      expect(result.size).toBe(11);
      expect(existsSync(join(TEST_DIR, 'test/file.txt'))).toBe(true);
    });

    it('+ should create nested directories', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      await driver.upload(Buffer.from('data'), 'a/b/c/deep.txt');
      expect(existsSync(join(TEST_DIR, 'a/b/c/deep.txt'))).toBe(true);
    });

    it('+ should overwrite existing file', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      await driver.upload(Buffer.from('first'), 'file.txt');
      await driver.upload(Buffer.from('second'), 'file.txt');
      expect(readFileSync(join(TEST_DIR, 'file.txt'), 'utf8')).toBe('second');
    });

    it('+ should return correct URL', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'https://app.com/files' });
      const result = await driver.upload(Buffer.from('x'), 'doc.pdf');
      expect(result.url).toBe('https://app.com/files/doc.pdf');
    });
  });

  describe('getUrl', () => {
    it('+ should return public URL with baseUrl', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'https://storage.example.com' });
      expect(driver.getUrl('uploads/image.png')).toBe('https://storage.example.com/uploads/image.png');
    });

    it('+ should handle root-level keys', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      expect(driver.getUrl('file.txt')).toBe('http://localhost:3000/storage/file.txt');
    });
  });

  describe('getStream', () => {
    it('+ should return readable stream for existing file', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      await driver.upload(Buffer.from('stream content'), 'stream.txt');
      const stream = await driver.getStream('stream.txt');
      expect(stream).toBeDefined();
      expect(typeof stream.pipe).toBe('function');

      // Consume the stream to prevent lingering file handles across tests
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(Buffer.concat(chunks).toString('utf8')).toBe('stream content');
    });

    it('- should throw for non-existent file', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      await expect(driver.getStream('missing.txt')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('+ should delete existing file', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      await driver.upload(Buffer.from('x'), 'to-delete.txt');
      expect(existsSync(join(TEST_DIR, 'to-delete.txt'))).toBe(true);
      await driver.delete('to-delete.txt');
      expect(existsSync(join(TEST_DIR, 'to-delete.txt'))).toBe(false);
    });

    it('+ should not throw when deleting non-existent file', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const driver = new LocalStorageDriver({ basePath: TEST_DIR, baseUrl: 'http://localhost:3000/storage' });
      await expect(driver.delete('ghost.txt')).resolves.not.toThrow();
    });
  });

  describe('public vs private paths', () => {
    it('+ should support public path for public assets', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const publicDir = join(TEST_DIR, 'public');
      const driver = new LocalStorageDriver({ basePath: publicDir, baseUrl: 'https://app.com/public' });
      const result = await driver.upload(Buffer.from('public'), 'logo.png');
      expect(result.url).toBe('https://app.com/public/logo.png');
      expect(existsSync(join(publicDir, 'logo.png'))).toBe(true);
    });

    it('+ should support private path for internal assets', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const privateDir = join(TEST_DIR, 'private');
      const driver = new LocalStorageDriver({ basePath: privateDir, baseUrl: 'https://app.com/internal' });
      const result = await driver.upload(Buffer.from('secret'), 'report.pdf');
      expect(result.url).toBe('https://app.com/internal/report.pdf');
      expect(existsSync(join(privateDir, 'report.pdf'))).toBe(true);
    });

    it('+ should keep public and private paths isolated', async () => {
      const { LocalStorageDriver } = await import('@/server/modules/storage/drivers/local.driver');
      const pubDir = join(TEST_DIR, 'pub');
      const privDir = join(TEST_DIR, 'priv');
      const pubDriver = new LocalStorageDriver({ basePath: pubDir, baseUrl: 'https://app.com/pub' });
      const privDriver = new LocalStorageDriver({ basePath: privDir, baseUrl: 'https://app.com/priv' });

      await pubDriver.upload(Buffer.from('public'), 'file.txt');
      await privDriver.upload(Buffer.from('private'), 'file.txt');

      expect(existsSync(join(pubDir, 'file.txt'))).toBe(true);
      expect(existsSync(join(privDir, 'file.txt'))).toBe(true);
      expect(readFileSync(join(pubDir, 'file.txt'), 'utf8')).toBe('public');
      expect(readFileSync(join(privDir, 'file.txt'), 'utf8')).toBe('private');
    });
  });
});
