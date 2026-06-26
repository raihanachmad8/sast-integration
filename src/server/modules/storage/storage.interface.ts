import type { Readable } from 'node:stream';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

export interface StorageDriver {
  upload(buffer: Buffer, key: string, options?: UploadOptions): Promise<UploadResult>;
  getUrl(key: string): string;
  getStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  isConfigured(): boolean;
}
