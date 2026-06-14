import type { ScanDetail, Finding, ScanRow, ScanRepository } from '@/commons/types';

/**
 * Mock scan rows for the table.
 * Structured to match the future API response shape.
 */
export const MOCK_SCAN_ROWS: ScanRow[] = [
  {
    id: 'scan_100',
    repository: 'acme-corp/backend-api',
    repoSub: 'main • 2 hours ago',
    status: 'Completed',
    stage: 'Parsed',
    findings: 15,
    critical: 2,
    ai: '12/15',
    origin: 'external_upload',
    provider: 'github',
    connectionType: 'scm',
  },
  {
    id: 'scan_200',
    repository: 'acme-corp/frontend-app',
    repoSub: 'develop • 30 min ago',
    status: 'Running',
    stage: 'Scanning',
    findings: 9,
    critical: 0,
    ai: '—',
    origin: 'managed',
    provider: 'gitlab',
    connectionType: 'scm',
  },
  {
    id: 'scan_300',
    repository: 'acme-corp/mobile-sdk',
    repoSub: 'main • 1 hour ago',
    status: 'Failed',
    stage: 'Timeout',
    findings: 0,
    critical: 0,
    ai: '—',
    origin: 'external_upload',
    provider: null,
    connectionType: 'external',
  },
  {
    id: 'scan_400',
    repository: 'acme-corp/auth-service',
    repoSub: 'main • 3 hours ago',
    status: 'Completed',
    stage: 'Parsed',
    findings: 3,
    critical: 0,
    ai: '3/3',
    origin: 'managed',
    provider: 'gitea',
    connectionType: 'scm',
  },
];

/**
 * Mock repositories for the new scan modal.
 */
export const MOCK_SCAN_REPOSITORIES: ScanRepository[] = [
  {
    id: 'repo_01',
    name: 'acme-corp/backend-api',
    branch: 'main',
    provider: 'github',
    connectionType: 'scm',
  },
  {
    id: 'repo_02',
    name: 'acme-corp/frontend-app',
    branch: 'develop',
    provider: 'gitlab',
    connectionType: 'scm',
  },
  {
    id: 'repo_03',
    name: 'acme-corp/mobile-sdk',
    branch: 'main',
    provider: null,
    connectionType: 'external',
  },
  {
    id: 'repo_04',
    name: 'acme-corp/auth-service',
    branch: 'main',
    provider: 'gitea',
    connectionType: 'scm',
  },
];

/**
 * Mock scan detail data for development.
 * Structured to match the future API response shape.
 * When the real API is ready, replace with fetch call.
 */
export const MOCK_SCAN_DETAILS: Record<string, ScanDetail> = {
  'scan_100': {
    id: 'scan_100',
    repository: 'acme-corp/backend-api',
    branch: 'main',
    commitSha: 'a1b2c3d',
    origin: 'external_upload',
    status: 'completed',
    startedAt: '2026-05-31T14:23:10.000Z',
    completedAt: '2026-05-31T14:25:45.000Z',
    durationSeconds: 155,
    scannerResults: [
      { scanner: 'semgrep', status: 'completed', findingsCount: 12, durationSeconds: 89 },
      { scanner: 'gitleaks', status: 'completed', findingsCount: 3, durationSeconds: 34 },
    ],
    totalFindings: 15,
    severityBreakdown: {
      critical: 2,
      high: 5,
      medium: 6,
      low: 2,
      info: 0,
    },
    aiStats: {
      enabled: true,
      verified: 12,
      total: 15,
      truePositives: 10,
      falsePositives: 2,
      pending: 3,
    },
    timeline: [
      { id: 't1', type: 'triggered', description: 'Scan triggered via CI upload', timestamp: '2026-05-31T14:23:10.000Z' },
      { id: 't2', type: 'scanning', description: 'Semgrep scan started', timestamp: '2026-05-31T14:23:12.000Z', metadata: { scanner: 'semgrep', config: 'auto' } },
      { id: 't3', type: 'scanning', description: 'Gitleaks scan started', timestamp: '2026-05-31T14:24:41.000Z', metadata: { scanner: 'gitleaks' } },
      { id: 't4', type: 'parsing', description: 'Parsing semgrep results', timestamp: '2026-05-31T14:25:01.000Z', durationSeconds: 12 },
      { id: 't5', type: 'parsing', description: 'Parsing gitleaks results', timestamp: '2026-05-31T14:25:15.000Z', durationSeconds: 8 },
      { id: 't6', type: 'ai_verifying', description: 'AI verification started', timestamp: '2026-05-31T14:25:25.000Z', metadata: { model: 'qwen2.5-sva', findings: 15 } },
      { id: 't7', type: 'completed', description: 'Scan completed successfully', timestamp: '2026-05-31T14:25:45.000Z', durationSeconds: 155 },
    ],
  },
  'scan_200': {
    id: 'scan_200',
    repository: 'acme-corp/frontend-app',
    branch: 'develop',
    commitSha: 'e4f5g6h',
    origin: 'managed',
    status: 'processing',
    startedAt: '2026-05-31T14:30:00.000Z',
    scannerResults: [
      { scanner: 'semgrep', status: 'completed', findingsCount: 8, durationSeconds: 120 },
      { scanner: 'gitleaks', status: 'completed', findingsCount: 1, durationSeconds: 45 },
      { scanner: 'flawfinder', status: 'skipped', findingsCount: 0, error: 'Scanner binary not installed' },
    ],
    totalFindings: 9,
    severityBreakdown: {
      critical: 0,
      high: 3,
      medium: 4,
      low: 2,
      info: 0,
    },
    timeline: [
      { id: 't1', type: 'triggered', description: 'Manual scan triggered by user', timestamp: '2026-05-31T14:30:00.000Z' },
      { id: 't2', type: 'queued', description: 'Scan queued for execution', timestamp: '2026-05-31T14:30:01.000Z' },
      { id: 't3', type: 'cloning', description: 'Cloning repository', timestamp: '2026-05-31T14:30:05.000Z', durationSeconds: 18, metadata: { branch: 'develop', depth: 1 } },
      { id: 't4', type: 'scanning', description: 'Running scanners', timestamp: '2026-05-31T14:30:23.000Z', metadata: { scanners: 'semgrep, gitleaks, flawfinder' } },
      { id: 't5', type: 'skipped', description: 'Flawfinder skipped (not installed)', timestamp: '2026-05-31T14:31:45.000Z' },
    ],
  },
  'scan_300': {
    id: 'scan_300',
    repository: 'acme-corp/mobile-sdk',
    branch: 'main',
    commitSha: 'i7j8k9l',
    origin: 'external_upload',
    status: 'failed',
    startedAt: '2026-05-31T13:15:00.000Z',
    completedAt: '2026-05-31T13:16:30.000Z',
    durationSeconds: 90,
    scannerResults: [
      { scanner: 'semgrep', status: 'failed', findingsCount: 0, error: 'Timeout: scan exceeded 300s limit' },
    ],
    totalFindings: 0,
    severityBreakdown: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },
    timeline: [
      { id: 't1', type: 'triggered', description: 'Scan triggered via CI upload', timestamp: '2026-05-31T13:15:00.000Z' },
      { id: 't2', type: 'scanning', description: 'Semgrep scan started', timestamp: '2026-05-31T13:15:02.000Z' },
      { id: 't3', type: 'failed', description: 'Scan failed: timeout', timestamp: '2026-05-31T13:16:30.000Z', metadata: { error: 'Timeout: scan exceeded 300s limit' } },
    ],
  },
};

/**
 * Mock findings data with rich AI analysis.
 * Matches the structure from viewer/index.html and db.json.
 */
export const MOCK_SCAN_FINDINGS: Finding[] = [
  {
    id: 'f_001',
    scanner: 'semgrep',
    rule: 'c.lang.security.insecure-use-memset.insecure-use-memset',
    severity: 'medium',
    file: 'src/false-positives/safe-malloc.c',
    lineNumber: 15,
    message: 'When handling sensitive information in a buffer, use memset_s() instead of memset() to ensure secure erasure.',
    cwe: 'CWE-14: Compiler Removal of Code to Clear Buffers',
    verdict: 'FP',
    confidence: 100,
    model: 'sast-llama3-sva:latest',
    assignee: null,
    status: 'accepted',
    repo: 'acme-corp/backend-api',
    codeSnippet: `void safe_alloc(size_t size) {
    if (size == 0 || size > 1024 * 1024) {
        fprintf(stderr, "Invalid size\\n");
        return;
    }
    char *buf = malloc(size);
    if (!buf) {
        fprintf(stderr, "Allocation failed\\n");
        return;
    }
    memset(buf, 0, size);  // ← vulnerability
    printf("Allocated %zu bytes\\n", size);
    free(buf);
}`,
    sourceCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void safe_alloc(size_t size) {
    if (size == 0 || size > 1024 * 1024) {  // FP: size validated
        fprintf(stderr, "Invalid size\\n");
        return;
    }
    char *buf = malloc(size);
    if (!buf) {  // FP: null check after malloc
        fprintf(stderr, "Allocation failed\\n");
        return;
    }
    memset(buf, 0, size);
    printf("Allocated %zu bytes\\n", size);
    free(buf);
}

int main() {
    safe_alloc(256);
    return 0;
}`,
    cweIds: ['CWE-14'],
  },
  {
    id: 'f_002',
    scanner: 'semgrep',
    rule: 'c.lang.security.insecure-use-string-copy-fn.insecure-use-string-copy-fn',
    severity: 'medium',
    file: 'src/false-positives/safe-string-ops.c',
    lineNumber: 8,
    message: 'strcpy/strncpy can lead to buffer overflows. Use strcpy_s instead.',
    cwe: 'CWE-676: Use of Potentially Dangerous Function',
    verdict: 'FP',
    confidence: 100,
    model: 'sast-llama3-sva:latest',
    assignee: null,
    status: 'accepted',
    repo: 'acme-corp/backend-api',
    codeSnippet: `void safe_copy(const char *input) {
    char buf[64];
    strncpy(buf, input, sizeof(buf) - 1);  // ← vulnerability
    buf[sizeof(buf) - 1] = '\\0';
    printf("%s\\n", buf);
}`,
    sourceCode: `// FALSE POSITIVE - Safe String Operations
#include <stdio.h>
#include <string.h>

void safe_copy(const char *input) {
    char buf[64];
    strncpy(buf, input, sizeof(buf) - 1);  // FP: bounded copy
    buf[sizeof(buf) - 1] = '\\0';           // null-terminated
    printf("%s\\n", buf);                    // FP: literal format string
}

void safe_format() {
    const char *name = "world";
    printf("Hello, %s!\\n", name);  // FP: format string is a literal
    fprintf(stdout, "Count: %d\\n", 42);  // FP: literal format
}

int main() {
    safe_copy("test input");
    safe_format();
    return 0;
}`,
    cweIds: ['CWE-676'],
  },
  {
    id: 'f_003',
    scanner: 'semgrep',
    rule: 'c.lang.security.insecure-use-string-copy-fn.insecure-use-string-copy-fn',
    severity: 'medium',
    file: 'src/true-positives/buffer-overflow.c',
    lineNumber: 8,
    message: 'strcpy can lead to buffer overflows. Use strcpy_s instead.',
    cwe: 'CWE-676: Use of Potentially Dangerous Function',
    verdict: 'TP',
    confidence: 100,
    model: 'sast-qwen25-coder-sva:latest',
    assignee: null,
    status: 'open',
    repo: 'acme-corp/backend-api',
    codeSnippet: `void vulnerable_strcpy(char *input) {
    char buf[16];
    strcpy(buf, input);  // ← vulnerability
    printf("Copied: %s\\n", buf);
}`,
    sourceCode: `// CWE-120: Buffer Overflow - TRUE POSITIVE
#include <stdio.h>
#include <string.h>

void vulnerable_strcpy(char *input) {
    char buf[16];
    strcpy(buf, input);  // TP: no bounds check, input may exceed 16 bytes
    printf("Copied: %s\\n", buf);
}

void vulnerable_gets() {
    char buf[64];
    printf("Enter input: ");
    gets(buf);  // TP: gets() has no length limit, deprecated
}

int main(int argc, char *argv[]) {
    if (argc > 1) vulnerable_strcpy(argv[1]);
    vulnerable_gets();
    return 0;
}`,
    cweIds: ['CWE-120', 'CWE-676'],
  },
  {
    id: 'f_004',
    scanner: 'semgrep',
    rule: 'c.lang.security.double-free.double-free',
    severity: 'critical',
    file: 'src/true-positives/double-free.c',
    lineNumber: 10,
    message: "Variable 'ptr' was freed twice. This can lead to undefined behavior.",
    cwe: 'CWE-415: Double Free',
    verdict: 'TP',
    confidence: 100,
    model: 'sast-qwen25-coder-sva:latest',
    assignee: null,
    status: 'open',
    repo: 'acme-corp/backend-api',
    codeSnippet: `void process_data() {
    char *ptr = malloc(128);
    if (!ptr) return;

    free(ptr);
    // ... some logic ...
    free(ptr);  // ← vulnerability
}`,
    sourceCode: `#include <stdio.h>
#include <stdlib.h>

void process_data() {
    char *ptr = malloc(128);
    if (!ptr) return;

    free(ptr);
    // ... some logic ...
    free(ptr);  // TP: double free
}

int main() {
    process_data();
    return 0;
}`,
    cweIds: ['CWE-415'],
  },
  {
    id: 'f_005',
    scanner: 'gitleaks',
    rule: 'generic-api-key',
    severity: 'high',
    file: '.env',
    lineNumber: 5,
    message: 'Potential API key detected in environment file.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    verdict: 'Pending',
    confidence: null,
    model: 'Not verified',
    assignee: null,
    status: 'needs_review',
    repo: 'acme-corp/backend-api',
    codeSnippet: `DATABASE_URL=postgresql://user:pass@localhost:5432/db
API_KEY=sk-1234567890abcdef1234567890abcdef  // ← vulnerability
SECRET_KEY=my-secret-key-here`,
    cweIds: ['CWE-798'],
  },
  {
    id: 'f_006',
    scanner: 'semgrep',
    rule: 'python.lang.security.audit.subprocess-shell-true',
    severity: 'high',
    file: 'scripts/build.py',
    lineNumber: 24,
    message: 'subprocess.call with shell=True can be dangerous.',
    cwe: 'CWE-78: OS Command Injection',
    verdict: 'TP',
    confidence: 91,
    model: 'sast-qwen25-coder-sva:latest',
    assignee: null,
    status: 'open',
    repo: 'acme-corp/backend-api',
    codeSnippet: `import subprocess

def run_command(cmd):
    result = subprocess.call(cmd, shell=True)  // ← vulnerability
    return result`,
    cweIds: ['CWE-78'],
  },
];
