# Storage

## Overview

Scan results and reports are stored in object storage (S3-compatible or local filesystem).

## Storage Structure

```
{scanId}/
├── semgrep-{timestamp}.json
├── gitleaks-{timestamp}.json
├── flawfinder-{timestamp}.sarif
├── cppcheck-{timestamp}.xml
├── clang-tidy-{timestamp}.txt
└── gcc-fanalyzer-{timestamp}.txt
```

## Storage Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_PROVIDER` | `local` or `s3` | `local` |
| `STORAGE_PATH` | Local storage path | `./storage` |
| `S3_BUCKET` | S3 bucket name | — |
| `AWS_REGION` | S3 region | — |
| `AWS_ACCESS_KEY_ID` | S3 access key | — |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | — |

### Local Storage

```bash
STORAGE_PROVIDER=local
STORAGE_PATH=./storage
```

### S3 Storage

```bash
STORAGE_PROVIDER=s3
S3_BUCKET=my-sast-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

## Retention

| Policy | Default |
|--------|---------|
| Scan files | 90 days |
| Reports | 30 days |
| Cleanup schedule | Daily |

### Cleanup Job

```bash
# Automatic cleanup via queue job
cleanup-old-scan-files
```

## File Size Limits

| Scanner | Max Output |
|---------|-----------|
| semgrep | 50MB |
| gitleaks | 50MB |
| flawfinder | 50MB |
| cppcheck | 50MB |
| clang-tidy | 50MB |
| gcc-fanalyzer | 50MB |
