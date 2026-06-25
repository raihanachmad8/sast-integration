import { Readable } from 'node:stream';
import type { StorageDriver, UploadOptions, UploadResult } from '../storage.interface';
import { logger } from '@/server/lib/logger';

/**
 * Cloudinary storage driver.
 * Uses dynamic import for cloudinary to avoid bundling when not used.
 *
 * Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Optional: CLOUDINARY_FOLDER (default: sast)
 */
export class CloudinaryStorageDriver implements StorageDriver {
  private folder: string;

  constructor(options?: { folder?: string }) {
    this.folder = options?.folder ?? process.env.CLOUDINARY_FOLDER ?? 'sast';
  }

  isConfigured(): boolean {
    return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  }

  private async getClient() {
    const cloudinary = (await import('cloudinary')).v2;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    return cloudinary;
  }

  private getResourceType(key: string): 'image' | 'raw' | 'video' {
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    // Cloudinary treats PDF same as image — always use 'image' for PDF
    if (ext === 'pdf') return 'image';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    return imageExts.includes(ext) ? 'image' : 'raw';
  }

  async upload(buffer: Buffer, key: string, _options?: UploadOptions): Promise<UploadResult> {
    const cloudinary = await this.getClient();
    const resourceType = this.getResourceType(key);
    const ext = key.split('.').pop()?.toLowerCase() ?? '';

    const result = await new Promise<{ secure_url: string; bytes: number }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          public_id: key.replace(/\.[^/.]+$/, ''), // strip extension
          resource_type: resourceType,
          format: ext || undefined,
          access_type: 'public',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string; bytes: number });
        },
      );
      uploadStream.end(buffer);
    });

    logger.storage.info('uploaded', { key, size: result.bytes, resourceType, provider: 'cloudinary' });

    return {
      key,
      url: result.secure_url,
      size: result.bytes,
    };
  }

  getUrl(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    const resourceType = this.getResourceType(key);
    const publicId = key.replace(/\.[^/.]+$/, '');
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/${this.folder}/${publicId}${ext ? '.' + ext : ''}`;
  }

  /**
   * Fetch file via Cloudinary SDK (authenticated) then download.
   * Handles both public and private/unsigned raw files.
   */
  async getStream(key: string): Promise<Readable> {
    const cloudinary = await this.getClient();
    const resourceType = this.getResourceType(key);
    const publicId = `${this.folder}/${key.replace(/\.[^/.]+$/, '')}`;

    try {
      // Get resource info via API (authenticated — handles private files)
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      if (!resource?.secure_url) {
        throw new Error(`Resource not found in Cloudinary: ${key}`);
      }

      // Download via the secure_url returned by the API
      const response = await fetch(resource.secure_url);
      if (!response.ok) {
        throw new Error(`Failed to download ${key}: ${response.status} ${response.statusText}`);
      }

      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      if (buffer.length === 0) throw new Error(`Downloaded file is empty: ${key}`);

      logger.storage.info('getStream', { key, size: buffer.length, method: 'api-resource' });
      return Readable.from(buffer);
    } catch (error) {
      // Fallback: try public URL
      logger.storage.warn('getStream:api-failed, trying public URL', { key, error: (error as Error).message });
      const url = this.getUrl(key);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${key} (both API and public URL failed): ${response.status}`);
      }

      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      if (buffer.length === 0) throw new Error(`Downloaded file is empty: ${key}`);

      logger.storage.info('getStream', { key, size: buffer.length, method: 'public-url-fallback' });
      return Readable.from(buffer);
    }
  }

  async delete(key: string): Promise<void> {
    const cloudinary = await this.getClient();
    const resourceType = this.getResourceType(key);
    const publicId = `${this.folder}/${key.replace(/\.[^/.]+$/, '')}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    logger.storage.info('deleted', { key, provider: 'cloudinary' });
  }
}
