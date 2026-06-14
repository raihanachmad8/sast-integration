import type { Finding, FindingComment, AiAnalysis, ScannerEvidence } from '@/commons/types';

/**
 * Mock findings data for development and testing.
 *
 * @remarks
 * - Uses unified `Finding` type from `@/commons/types`.
 * - `confidence` is `number | null` (0–100 or null for unverified).
 * - `status` uses consistent lowercase: `'open' | 'accepted' | 'needs_review' | 'fixed'`.
 * - Comments use ISO 8601 timestamps.
 * - Business logic functions (`getMockScannerOutput`, etc.) are separated from data.
 */
export const MOCK_COMMENTS: FindingComment[] = [
  { id: 'c1', author: 'Maya Putri', avatar: 'MP', time: '2026-06-01T09:48:00.000Z', text: 'Confirmed — this endpoint is reachable from the public API. Needs immediate fix.' },
  { id: 'c2', author: 'Dimas Pratama', avatar: 'DP', time: '2026-06-01T10:18:00.000Z', text: 'Assigned to backend team. PR fix in progress.' },
];

/**
 * Generate mock scanner output for a finding.
 * In production, this will be replaced by API call.
 */
export function getMockScannerOutput(finding: Finding): ScannerEvidence[] {
  return [
    { label: 'Rule', value: finding.cwe ? `${finding.cwe} — ${finding.rule}` : finding.rule, tone: 'pill-slate' },
    { label: 'Match', value: `Detection in ${finding.file}`, tone: 'pill-slate' },
    { label: 'Data flow', value: finding.verdict === 'TP' ? 'req.query.id → query string → db.execute()' : 'N/A — false positive', tone: 'pill-slate' },
    { label: 'Taint source', value: finding.verdict === 'TP' ? 'HTTP request parameter (untrusted)' : 'No taint path', tone: 'pill-slate' },
  ];
}

/**
 * Generate mock AI analysis for a finding.
 * In production, this will be replaced by API call.
 */
export function getMockAiAnalysis(finding: Finding): AiAnalysis {
  return {
    reasoning: finding.verdict === 'TP'
      ? 'The user-supplied parameter is concatenated directly into a query string without sanitization or parameterization. The data flow from HTTP input to execution is unguarded. This is a confirmed True Positive.'
      : finding.verdict === 'FP'
        ? 'The pattern match is superficial. The variable in question is a compile-time constant and never reaches a dangerous sink. This is a False Positive.'
        : 'Awaiting AI verification. The finding has been queued for analysis.',
    cweMapping: `${finding.cwe} — Matched from workspace knowledge base.`,
    remediation: finding.verdict === 'TP'
      ? 'Replace string concatenation with parameterized queries. Validate and sanitize all user inputs before use in queries.'
      : finding.verdict === 'FP'
        ? 'No action needed. Mark as Accepted FP to dismiss.'
        : 'Run AI verification to determine severity and remediation.',
    knowledgeRef: finding.verdict !== 'Pending' ? `${finding.cwe} (${finding.confidence ?? '—'} prior uses)` : null,
  };
}

/**
 * Generate mock source code snippet for a finding.
 * In production, this will be replaced by API call.
 */
export function getMockSourceCode(finding: Finding): string {
  if (finding.scanner === 'Flawfinder') {
    return `41    char buffer[256];
44    printf("Enter input: ");
45    gets(buffer);    ← vulnerability
46    if (strcmp(buffer, password) == 0) {
47      grant_access();
48    }`;
  }
  return `87    const query = "SELECT * FROM orders WHERE id = " + req.query.id;
88    db.execute(query);    ← vulnerability
89    res.json(orders);`;
}

/**
 * Generate mock AI fix suggestion for a finding.
 * In production, this will be replaced by API call.
 */
export function getMockAiSuggestion(finding: Finding): string {
  if (finding.scanner === 'Flawfinder') {
    return 'fgets(buffer, sizeof(buffer), stdin);';
  }
  return `db.execute('SELECT * FROM orders WHERE id = ?', [req.query.id]);`;
}

/**
 * Mock findings data — unified type.
 * Confidence is `number | null`, status is lowercase.
 */
export const MOCK_FINDINGS: Finding[] = [
  { id: 'f-1', rule: 'SQL Injection', repo: 'backend-api', file: 'src/routes/orders.ts:88', severity: 'critical', scanner: 'Semgrep', verdict: 'TP', confidence: 94, model: 'Modal QLoRA', assignee: 'Alice', status: 'open', cwe: 'CWE-89' },
  { id: 'f-2', rule: 'Hardcoded secret', repo: 'backend-api', file: 'config/secrets.env:4', severity: 'high', scanner: 'Gitleaks', verdict: 'TP', confidence: 98, model: 'Modal QLoRA', assignee: 'Bob', status: 'open', cwe: 'CWE-798' },
  { id: 'f-3', rule: 'Weak random token', repo: 'customer-web', file: 'lib/token.ts:31', severity: 'medium', scanner: 'Semgrep', verdict: 'FP', confidence: 81, model: 'Ollama q4', assignee: null, status: 'accepted', cwe: 'CWE-330' },
  { id: 'f-4', rule: 'Unchecked strcpy', repo: 'backend-api', file: 'native/parser.c:42', severity: 'critical', scanner: 'Flawfinder', verdict: 'Pending', confidence: null, model: 'Not verified', assignee: null, status: 'needs_review', cwe: 'CWE-120' },
  { id: 'f-5', rule: 'Command injection', repo: 'auth-service', file: 'scripts/build.py:24', severity: 'high', scanner: 'Semgrep', verdict: 'TP', confidence: 91, model: 'Modal QLoRA', assignee: 'Alice', status: 'open', cwe: 'CWE-78' },
  { id: 'f-6', rule: 'Double free', repo: 'backend-api', file: 'native/alloc.c:10', severity: 'critical', scanner: 'Semgrep', verdict: 'TP', confidence: 100, model: 'Modal QLoRA', assignee: 'Charlie', status: 'open', cwe: 'CWE-415' },
  { id: 'f-7', rule: 'Insecure memset', repo: 'mobile-ios', file: 'src/crypto.c:15', severity: 'medium', scanner: 'Semgrep', verdict: 'FP', confidence: 100, model: 'Ollama q4', assignee: null, status: 'accepted', cwe: 'CWE-14' },
  { id: 'f-8', rule: 'Path traversal', repo: 'customer-web', file: 'api/files.ts:56', severity: 'high', scanner: 'Semgrep', verdict: 'Pending', confidence: null, model: 'Not verified', assignee: null, status: 'needs_review', cwe: 'CWE-22' },
  { id: 'f-9', rule: 'Exposed API key', repo: 'infra-terraform', file: '.env.prod:12', severity: 'high', scanner: 'Gitleaks', verdict: 'TP', confidence: 99, model: 'Modal QLoRA', assignee: 'Bob', status: 'fixed', cwe: 'CWE-798' },
  { id: 'f-10', rule: 'Buffer overflow', repo: 'backend-api', file: 'native/net.c:201', severity: 'critical', scanner: 'Flawfinder', verdict: 'TP', confidence: 87, model: 'Modal QLoRA', assignee: 'Alice', status: 'open', cwe: 'CWE-120' },
];

/** Member select list with initials and colors. */
export const MOCK_MEMBER_LIST = [
  { name: 'Maya Putri', initials: 'MP', color: '#10b981' },
  { name: 'Dimas Pratama', initials: 'DP', color: '#3b82f6' },
  { name: 'Raka Octavia', initials: 'RO', color: '#f59e0b' },
  { name: 'Sari Dewi', initials: 'SD', color: '#f59e0b' },
];

/** AI models for re-verification. */
export const MOCK_AI_MODELS = [
  { id: 'modal-qlora', name: 'Modal QLoRA' },
  { id: 'sast-qlora-8b', name: 'SAST QLoRA 8B' },
  { id: 'codellama-13b', name: 'CodeLlama 13B' },
  { id: 'ollama-q4', name: 'Ollama q4' },
];
