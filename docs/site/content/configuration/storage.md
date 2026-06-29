---
title: Storage
description: Configure file storage for scan results and reports
---

# Storage

## Overview

Scan results and reports are stored in object storage (S3-compatible, Cloudinary, or local filesystem).

## Storage Providers

| Provider | Use Case | Configuration |
|----------|----------|---------------|
| **Local** | Development | `STORAGE_PROVIDER=local` |
| **S3** | Production | `STORAGE_PROVIDER=s3` |
| **Cloudinary** | CDN + optimization | `STORAGE_PROVIDER=cloudinary` |

## Local Storage

```bash
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./storage
```

**Docker:** Must mount volume to persist data:

```bash
docker run -d -v sast-storage:/app/storage ...
```

## S3 Storage

```bash
STORAGE_PROVIDER=s3
SAST_BUCKET=sast-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
```

## Cloudinary Storage

```bash
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
CLOUDINARY_FOLDER=sast
```

## File Cleanup

The `cleanup-old-scan-files` worker runs daily at 2 AM to remove old scan artifacts.
