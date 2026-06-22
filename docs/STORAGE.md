# Storage System

> **Last Updated:** 2026-06-18

## Overview

The storage system provides a unified interface for file operations across multiple backends. It's used for storing scan results, reports, and uploaded files.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Storage Service                          │
│                    (storage.service.ts)                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              StorageDriver Interface                 │   │
│  │              (storage.interface.ts)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         ▼                ▼                ▼                │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │   Local    │   │     S3     │   │ Cloudinary │         │
│  │   Driver   │   │   Driver   │   │   Driver   │         │
│  └────────────┘   └────────────┘   └────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Drivers

### Local Storage (Default)

**File:** `src/server/modules/storage/drivers/local.driver.ts`

- Stores files on local filesystem
- Default path: `<cwd>/storage`
- Default URL: `APP_URL + '/storage'`
- Always available (fallback driver)

**Configuration:**
```env
STORAGE_PROVIDER=local
# STORAGE_LOCAL_PATH is optional — defaults to ./storage
```

**Key Features:**
- Creates directories recursively
- Serves files via Next.js static file serving
- Graceful fallback when other drivers fail

### S3/MinIO Storage

**File:** `src/server/modules/storage/drivers/s3.driver.ts`

- Uses AWS SDK v3 (`@aws-sdk/client-s3`)
- Supports AWS S3, MinIO, and S3-compatible services
- Dynamic import (not bundled when unused)

**Configuration:**
```env
STORAGE_PROVIDER=s3
S3_BUCKET=sast-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
# S3_ENDPOINT is optional — for MinIO/custom endpoints
```

**Key Features:**
- Path-style URLs for MinIO (`forcePathStyle: true`)
- Supports custom endpoints for self-hosted solutions
- Metadata and content-type support

### Cloudinary Storage

**File:** `src/server/modules/storage/drivers/cloudinary.driver.ts`

- Uses Cloudinary SDK
- Dynamic import (not bundled when unused)
- Automatic resource type detection

**Configuration:**
```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=sast
```

**Key Features:**
- Automatic image optimization
- CDN delivery via Cloudinary's global network
- Format conversion on-the-fly

## Driver Selection

The driver is selected based on `STORAGE_PROVIDER`:

1. `STORAGE_PROVIDER` env var → create matching driver
2. If the chosen driver reports `isConfigured() === false` → fall back to local
3. Unknown provider → fall back to local

**Resolution code:**
```typescript
// storage.service.ts
const provider = process.env.STORAGE_PROVIDER ?? 'local';
_instance = await createDriver(provider);

if (!_instance.isConfigured()) {
  _instance = new LocalStorageDriver(); // fallback
}
```

## Storage Interface

All drivers implement the `StorageDriver` interface:

```typescript
interface StorageDriver {
  upload(buffer: Buffer, key: string, options?: UploadOptions): Promise<UploadResult>;
  getUrl(key: string): string;
  getStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  isConfigured(): boolean;
}

interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

interface UploadResult {
  key: string;      // Storage key/path
  url: string;      // Public URL
  size: number;     // File size in bytes
}
```

## Usage Examples

### Upload File

```typescript
import { getStorageDriver } from '@/server/modules/storage/storage.service';

const driver = await getStorageDriver();
const result = await driver.upload(buffer, 'scans/scan-123/semgrep.json', {
  contentType: 'application/json',
});

console.log(result.url); // https://s3.amazonaws.com/bucket/scans/scan-123/semgrep.json
```

### Get File URL

```typescript
const url = driver.getUrl('scans/scan-123/semgrep.json');
// Returns public URL for the file
```

### Stream File

```typescript
const stream = await driver.getStream('scans/scan-123/semgrep.json');
// Returns Readable stream for piping
```

### Delete File

```typescript
await driver.delete('scans/scan-123/semgrep.json');
```

## File Organization

Files are stored with this key structure:

```
{scanId}/{scanner}-{timestamp}.{format}
```

Example:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890/semgrep-1718726400000.json
a1b2c3d4-e5f6-7890-abcd-ef1234567890/gitleaks-1718726401000.json
```

## Database Schema

The `storage_files` table tracks all stored files:

```sql
CREATE TABLE storage_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',
  storage_key VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMP
);
```

## Cleanup

The `cleanup-old-scan-files` queue job removes old files:

- Runs periodically via pg-boss
- Removes files older than configured retention period
- Uses `storage_files.expires_at` for cleanup scheduling

## Production Recommendations

| Provider | Use Case | Notes |
|----------|----------|-------|
| **local** | Development, small deployments | Simple, no external dependencies |
| **s3** | Production, high availability | Recommended for production |
| **cloudinary** | Media-heavy applications | Best for image/video processing |

**Security Notes:**
- Never commit AWS credentials to version control
- Use IAM roles in production (ECS, EC2, Lambda)
- Enable S3 bucket versioning for data protection
- Configure CORS for browser uploads if needed

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | No | `local` | Storage backend: `local`, `s3`, `cloudinary` |
| `STORAGE_LOCAL_PATH` | No | `./storage` | Local storage directory |
| `S3_BUCKET` | Yes* | — | S3 bucket name |
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | Yes* | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes* | — | AWS secret key |
| `S3_ENDPOINT` | No | — | Custom S3 endpoint (MinIO) |
| `CLOUDINARY_CLOUD_NAME` | Yes* | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes* | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes* | — | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | No | `sast` | Cloudinary folder |

*Required when using the respective provider.
