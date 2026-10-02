import type { ScanDetail, Finding, ScanRow, ScanRepository, AiRichAnalysis } from './types';

/**
 * Mock scan rows for the table.
 * Structured to match the future API response shape.
 */
export const MOCK_SCAN_ROWS: ScanRow[] = [
  {
    id: 'scan-100',
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
    id: 'scan-200',
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
    id: 'scan-300',
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
    id: 'scan-400',
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
export const MOCK_REPOSITORIES: ScanRepository[] = [
  {
    id: 'repo-1',
    name: 'acme-corp/backend-api',
    branch: 'main',
    provider: 'github',
    connectionType: 'scm',
  },
  {
    id: 'repo-2',
    name: 'acme-corp/frontend-app',
    branch: 'develop',
    provider: 'gitlab',
    connectionType: 'scm',
  },
  {
    id: 'repo-3',
    name: 'acme-corp/mobile-sdk',
    branch: 'main',
    provider: null,
    connectionType: 'external',
  },
  {
    id: 'repo-4',
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
  'scan-100': {
    id: 'scan-100',
    repository: 'acme-corp/backend-api',
    branch: 'main',
    commitSha: 'a1b2c3d',
    origin: 'external_upload',
    status: 'completed',
    startedAt: '2026-05-31 14:23:10',
    completedAt: '2026-05-31 14:25:45',
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
      { id: 't1', type: 'triggered', description: 'Scan triggered via CI upload', timestamp: '14:23:10' },
      { id: 't2', type: 'scanning', description: 'Semgrep scan started', timestamp: '14:23:12', metadata: { scanner: 'semgrep', config: 'auto' } },
      { id: 't3', type: 'scanning', description: 'Gitleaks scan started', timestamp: '14:24:41', metadata: { scanner: 'gitleaks' } },
      { id: 't4', type: 'parsing', description: 'Parsing semgrep results', timestamp: '14:25:01', durationSeconds: 12 },
      { id: 't5', type: 'parsing', description: 'Parsing gitleaks results', timestamp: '14:25:15', durationSeconds: 8 },
      { id: 't6', type: 'ai_verifying', description: 'AI verification started', timestamp: '14:25:25', metadata: { model: 'qwen2.5-sva', findings: 15 } },
      { id: 't7', type: 'completed', description: 'Scan completed successfully', timestamp: '14:25:45', durationSeconds: 155 },
    ],
  },
  'scan-200': {
    id: 'scan-200',
    repository: 'acme-corp/frontend-app',
    branch: 'develop',
    commitSha: 'e4f5g6h',
    origin: 'managed',
    status: 'processing',
    startedAt: '2026-05-31 14:30:00',
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
      { id: 't1', type: 'triggered', description: 'Manual scan triggered by user', timestamp: '14:30:00' },
      { id: 't2', type: 'queued', description: 'Scan queued for execution', timestamp: '14:30:01' },
      { id: 't3', type: 'cloning', description: 'Cloning repository', timestamp: '14:30:05', durationSeconds: 18, metadata: { branch: 'develop', depth: 1 } },
      { id: 't4', type: 'scanning', description: 'Running scanners', timestamp: '14:30:23', metadata: { scanners: 'semgrep, gitleaks, flawfinder' } },
      { id: 't5', type: 'skipped', description: 'Flawfinder skipped (not installed)', timestamp: '14:31:45' },
    ],
  },
  'scan-300': {
    id: 'scan-300',
    repository: 'acme-corp/mobile-sdk',
    branch: 'main',
    commitSha: 'i7j8k9l',
    origin: 'external_upload',
    status: 'failed',
    startedAt: '2026-05-31 13:15:00',
    completedAt: '2026-05-31 13:16:30',
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
      { id: 't1', type: 'triggered', description: 'Scan triggered via CI upload', timestamp: '13:15:00' },
      { id: 't2', type: 'scanning', description: 'Semgrep scan started', timestamp: '13:15:02' },
      { id: 't3', type: 'failed', description: 'Scan failed: timeout', timestamp: '13:16:30', metadata: { error: 'Timeout: scan exceeded 300s limit' } },
    ],
  },
};

/**
 * Mock findings data with rich AI analysis.
 * Matches the structure from viewer/index.html and db.json.
 */
export const MOCK_FINDINGS: Finding[] = [
  {
    id: 'finding-001',
    scanner: 'semgrep',
    rule: 'c.lang.security.insecure-use-memset.insecure-use-memset',
    severity: 'WARNING',
    filePath: 'src/false-positives/safe-malloc.c',
    lineNumber: 15,
    message: 'When handling sensitive information in a buffer, use memset_s() instead of memset() to ensure secure erasure.',
    cwe: 'CWE-14: Compiler Removal of Code to Clear Buffers',
    groundTruth: 'false_positive',
    status: 'verified',
    aiVerdict: 'false_positive',
    confidence: 100,
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
    aiAnalysis: {
      'ai_rich_llama3_sva': {
        verdict: 'false_positive',
        confidence: 1.0,
        explanation: 'The null check after malloc is explicit bounds checking, which mitigates the CWE-14 vulnerability.',
        dataFlow: 'source to sink path',
        taintSource: 'untrusted input origin',
        matchDetail: 'memset called with untrusted data and size',
        likelyCwe: ['CWE-14'],
        fixSuggestion: 'None',
        model: 'sast-llama3-sva:latest',
        raw: '{"verdict":"fp","confidence":1.0,"explanation":"The null check after malloc is explicit bounds checking, which mitigates the CWE-14 vulnerability."}',
      },
    },
  },
  {
    id: 'finding-002',
    scanner: 'semgrep',
    rule: 'c.lang.security.insecure-use-string-copy-fn.insecure-use-string-copy-fn',
    severity: 'WARNING',
    filePath: 'src/false-positives/safe-string-ops.c',
    lineNumber: 8,
    message: 'strcpy/strncpy can lead to buffer overflows. Use strcpy_s instead.',
    cwe: 'CWE-676: Use of Potentially Dangerous Function',
    groundTruth: 'false_positive',
    status: 'verified',
    aiVerdict: 'false_positive',
    confidence: 100,
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
    aiAnalysis: {
      'ai_rich_llama3_sva': {
        verdict: 'false_positive',
        confidence: 1.0,
        explanation: 'The function is explicitly bounded and null-terminated, so it cannot be used to write outside the buffer.',
        dataFlow: 'source to sink path',
        taintSource: 'untrusted input origin',
        matchDetail: 'insecure-use-string-copy-fn',
        likelyCwe: ['CWE-20'],
        fixSuggestion: 'Use safe string functions',
        model: 'sast-llama3-sva:latest',
        raw: '{"verdict":"fp","confidence":1.0,"explanation":"The function is explicitly bounded and null-terminated."}',
      },
    },
  },
  {
    id: 'finding-003',
    scanner: 'semgrep',
    rule: 'c.lang.security.insecure-use-string-copy-fn.insecure-use-string-copy-fn',
    severity: 'WARNING',
    filePath: 'src/true-positives/buffer-overflow.c',
    lineNumber: 8,
    message: 'strcpy can lead to buffer overflows. Use strcpy_s instead.',
    cwe: 'CWE-676: Use of Potentially Dangerous Function',
    groundTruth: 'true_positive',
    status: 'open',
    aiVerdict: 'true_positive',
    confidence: 100,
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
    aiAnalysis: {
      'ai_rich_qwen25_sva': {
        verdict: 'true_positive',
        confidence: 1.0,
        explanation: 'The function uses gets(), which has no length limit and is deprecated.',
        dataFlow: 'user input -> vulnerable_gets() -> buf',
        taintSource: 'user input',
        matchDetail: 'insecure-use-gets-fn',
        likelyCwe: ['CWE-676'],
        fixSuggestion: 'Use fgets() instead of gets()',
        model: 'sast-qwen25-coder-sva:latest',
        raw: '{"verdict":"tp","confidence":1.0,"explanation":"The function uses gets(), which has no length limit and is deprecated."}',
      },
      'ai_rich_llama3_sva': {
        verdict: 'true_positive',
        confidence: 1.0,
        explanation: 'The scanner is correct, the function does not perform any bounds checking on the input string.',
        dataFlow: 'source to sink path',
        taintSource: 'untrusted input origin',
        matchDetail: 'the scanner found a vulnerable use of strcpy()',
        likelyCwe: ['CWE-190'],
        fixSuggestion: 'Use safer alternatives such as strlcpy or snprintf',
        model: 'sast-llama3-sva:latest',
        raw: '{"verdict":"tp","confidence":1.0,"explanation":"The scanner is correct, the function does not perform any bounds checking."}',
      },
    },
  },
  {
    id: 'finding-004',
    scanner: 'semgrep',
    rule: 'c.lang.security.double-free.double-free',
    severity: 'ERROR',
    filePath: 'src/true-positives/double-free.c',
    lineNumber: 10,
    message: 'Variable \'ptr\' was freed twice. This can lead to undefined behavior.',
    cwe: 'CWE-415: Double Free',
    groundTruth: 'true_positive',
    status: 'open',
    aiVerdict: 'true_positive',
    confidence: 100,
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
    aiAnalysis: {
      'ai_rich_qwen25_sva': {
        verdict: 'true_positive',
        confidence: 1.0,
        explanation: "The function 'process_data' contains a double free vulnerability where the pointer 'ptr' is freed twice.",
        dataFlow: 'process_data -> process_data -> free(ptr) -> free(ptr)',
        taintSource: 'untrusted input origin',
        matchDetail: 'c.lang.security.double-free.double-free',
        likelyCwe: ['CWE-415'],
        fixSuggestion: "Remove the second 'free(ptr)' call",
        model: 'sast-qwen25-coder-sva:latest',
        raw: '{"verdict":"tp","confidence":1.0,"explanation":"Double free vulnerability detected."}',
      },
      'ai_rich_llama3_sva': {
        verdict: 'true_positive',
        confidence: 1.0,
        explanation: 'The pointer is freed twice, which is a double free vulnerability.',
        dataFlow: 'source to sink path',
        taintSource: 'untrusted input origin',
        matchDetail: 'double free detected',
        likelyCwe: ['CWE-415'],
        fixSuggestion: 'Remove the second free() call',
        model: 'sast-llama3-sva:latest',
        raw: '{"verdict":"tp","confidence":1.0,"explanation":"Double free vulnerability detected."}',
      },
    },
  },
  {
    id: 'finding-005',
    scanner: 'gitleaks',
    rule: 'generic-api-key',
    severity: 'high',
    filePath: '.env',
    lineNumber: 5,
    message: 'Potential API key detected in environment file.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    groundTruth: 'true_positive',
    status: 'open',
    aiVerdict: 'pending',
    codeSnippet: `DATABASE_URL=postgresql://user:pass@localhost:5432/db
API_KEY=sk-1234567890abcdef1234567890abcdef  // ← vulnerability
SECRET_KEY=my-secret-key-here`,
    cweIds: ['CWE-798'],
  },
  {
    id: 'finding-006',
    scanner: 'semgrep',
    rule: 'python.lang.security.audit.subprocess-shell-true',
    severity: 'medium',
    filePath: 'scripts/build.py',
    lineNumber: 24,
    message: 'subprocess.call with shell=True can be dangerous.',
    cwe: 'CWE-78: OS Command Injection',
    groundTruth: 'true_positive',
    status: 'verified',
    aiVerdict: 'true_positive',
    confidence: 91,
    codeSnippet: `import subprocess

def run_command(cmd):
    result = subprocess.call(cmd, shell=True)  // ← vulnerability
    return result`,
    cweIds: ['CWE-78'],
    aiAnalysis: {
      'ai_rich_qwen25_sva': {
        verdict: 'true_positive',
        confidence: 0.91,
        explanation: 'subprocess.call with shell=True allows command injection if cmd contains untrusted input.',
        dataFlow: 'cmd -> subprocess.call(cmd, shell=True) -> shell execution',
        taintSource: 'function parameter cmd',
        matchDetail: 'subprocess-shell-true',
        likelyCwe: ['CWE-78'],
        fixSuggestion: 'Use subprocess.call(cmd, shell=False) with a list of arguments',
        model: 'sast-qwen25-coder-sva:latest',
        raw: '{"verdict":"tp","confidence":0.91,"explanation":"shell=True allows command injection."}',
      },
    },
  },
];
