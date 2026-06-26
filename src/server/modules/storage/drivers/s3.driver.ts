import type { Readable } from 'node:stream';
import type { StorageDriver, UploadOptions, UploadResult } from '../storage.interface';
import { logger } from '@/server/lib/logger';

/**
 * S3/MinIO storage driver.
 * Uses dynamic import for @aws-sdk/client-s3 to avoid bundling when not used.
 *
 * Required env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
 * Optional: AWS_REGION (default: us-east-1), S3_ENDPOINT (for MinIO)
 */
export class S3StorageDriver implements StorageDriver {
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private baseUrl: string;

  constructor(options?: { bucket?: string; region?: string; endpoint?: string }) {
    this.bucket = options?.bucket ?? process.env.S3_BUCKET ?? 'sast-uploads';
    this.region = options?.region ?? process.env.AWS_REGION ?? 'us-east-1';
    this.endpoint = options?.endpoint ?? process.env.S3_ENDPOINT;

    if (this.endpoint) {
      // MinIO or custom S3-compatible — use path-style
      this.baseUrl = `${this.endpoint}/${this.bucket}`;
    } else {
      this.baseUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    }
  }

  isConfigured(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && this.bucket);
  }

  private async getClient() {
    const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    const config: Record<string, unknown> = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    };
    if (this.endpoint) {
      config.endpoint = this.endpoint;
      config.forcePathStyle = true; // MinIO requires path-style
    }

    return { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, config };
  }

  async upload(buffer: Buffer, key: string, options?: UploadOptions): Promise<UploadResult> {
    const { S3Client, PutObjectCommand, config } = await this.getClient();
    const client = new S3Client(config);

    await client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
    }));

    logger.storage.info('uploaded', { key, size: buffer.length, provider: 's3', bucket: this.bucket });

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
    const { S3Client, GetObjectCommand, config } = await this.getClient();
    const client = new S3Client(config);

    const result = await client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    return result.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    const { S3Client, DeleteObjectCommand, config } = await this.getClient();
    const client = new S3Client(config);

    await client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    logger.storage.info('deleted', { key, provider: 's3' });
  }
}
