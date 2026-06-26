import { createReadStream } from 'node:fs';
import { mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Readable } from 'node:stream';
import type { StorageDriver, UploadOptions, UploadResult } from '../storage.interface';
import { logger } from '@/server/lib/logger';

/**
 * Local filesystem storage driver.
 * Writes files to a local directory and serves them via app URL.
 *
 * Default storage path: <cwd>/storage
 * Default base URL: APP_URL + '/storage'
 */
export class LocalStorageDriver implements StorageDriver {
  private basePath: string;
  private baseUrl: string;

  constructor(options?: { basePath?: string; baseUrl?: string }) {
    this.basePath = options?.basePath ?? join(process.cwd(), 'storage');
    this.baseUrl = options?.baseUrl ?? (process.env.APP_URL ?? 'http://localhost:3000') + '/storage';
  }

  async upload(buffer: Buffer, key: string, _options?: UploadOptions): Promise<UploadResult> {
    const filePath = join(this.basePath, key);
    logger.storage.info('upload:start', { key, size: buffer.length, filePath });

    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, buffer);
      logger.storage.info('upload:done', { key, size: buffer.length });
    } catch (error) {
      logger.storage.error('upload:failed', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }

    return {
      key,
      url: `${this.baseUrl}/${key}`,
      size: buffer.length,
    };
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  async getStream(key: string): Promise<Readable> {
    const filePath = join(this.basePath, key);
    logger.storage.info('getStream', { key, filePath });

    try {
      await access(filePath);
    } catch {
      logger.storage.error('getStream:fileNotFound', { key, filePath });
      throw new Error(`File not found in storage: ${key}`);
    }

    return createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.basePath, key);
    try {
      await unlink(filePath);
      logger.storage.info('delete:done', { key });
    } catch {
      logger.storage.warn('delete:fileNotFound', { key });
    }
  }

  isConfigured(): boolean {
    return true; // Local driver is always available
  }
}
