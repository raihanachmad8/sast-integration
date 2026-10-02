export interface KnowledgeBaseEntry {
  id: string;
  source_id: string;
  cwe_id: string | null;
  title: string;
  content: string | null;
  severity: string | null;
  remediation: string | null;
  tags: string[] | null;
  muted: boolean;
  used_by_ai_count: number;
  created_at: string;
  updated_at: string;
}

export const MOCK_KNOWLEDGE_BASE: KnowledgeBaseEntry[] = [
  {
    id: 'kb-1',
    source_id: 'cwe',
    cwe_id: 'CWE-89',
    title: 'SQL Injection',
    content: 'SQL injection attacks occur when untrusted data is sent to an interpreter as part of a command or query.',
    severity: 'Critical',
    remediation: 'Use parameterized queries or prepared statements. Never concatenate user input into SQL.',
    tags: ['injection', 'database', 'critical'],
    muted: false,
    used_by_ai_count: 45,
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-05-28T10:00:00.000Z',
  },
  {
    id: 'kb-2',
    source_id: 'cwe',
    cwe_id: 'CWE-79',
    title: 'Cross-site Scripting (XSS)',
    content: 'XSS vulnerabilities allow attackers to inject client-side scripts into web pages viewed by other users.',
    severity: 'High',
    remediation: 'Encode output, validate input, use Content Security Policy headers.',
    tags: ['xss', 'web', 'injection'],
    muted: false,
    used_by_ai_count: 32,
    created_at: '2026-01-20T00:00:00.000Z',
    updated_at: '2026-05-25T14:30:00.000Z',
  },
  {
    id: 'kb-3',
    source_id: 'cwe',
    cwe_id: 'CWE-22',
    title: 'Path Traversal',
    content: 'Path traversal vulnerabilities allow attackers to access files and directories outside the intended directory.',
    severity: 'High',
    remediation: 'Validate and sanitize file paths. Use allowlists for permitted directories.',
    tags: ['path', 'file-system'],
    muted: false,
    used_by_ai_count: 18,
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-05-20T09:00:00.000Z',
  },
  {
    id: 'kb-4',
    source_id: 'nvd',
    cwe_id: null,
    title: 'CVE-2024-12345 - OpenSSL Vulnerability',
    content: 'Critical vulnerability in OpenSSL affecting TLS 1.3 handshake process.',
    severity: 'Critical',
    remediation: 'Update OpenSSL to version 3.2.1 or later.',
    tags: ['cve', 'openssl', 'tls'],
    muted: false,
    used_by_ai_count: 8,
    created_at: '2026-03-15T00:00:00.000Z',
    updated_at: '2026-05-18T16:45:00.000Z',
  },
  {
    id: 'kb-5',
    source_id: 'custom',
    cwe_id: null,
    title: 'Internal API Authentication Rule',
    content: 'All internal API endpoints must use JWT tokens with RS256 signing. Tokens must expire within 15 minutes.',
    severity: 'High',
    remediation: 'Implement JWT validation middleware on all API routes.',
    tags: ['api', 'auth', 'jwt', 'internal'],
    muted: false,
    used_by_ai_count: 24,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-05-30T11:20:00.000Z',
  },
  {
    id: 'kb-6',
    source_id: 'cwe',
    cwe_id: 'CWE-502',
    title: 'Deserialization of Untrusted Data',
    content: 'Deserialization vulnerabilities allow attackers to execute arbitrary code by manipulating serialized objects.',
    severity: 'Critical',
    remediation: 'Avoid deserializing untrusted data. Use safe serialization formats like JSON.',
    tags: ['deserialization', 'code-execution'],
    muted: false,
    used_by_ai_count: 12,
    created_at: '2026-04-10T00:00:00.000Z',
    updated_at: '2026-05-22T08:30:00.000Z',
  },
  {
    id: 'kb-7',
    source_id: 'mitre',
    cwe_id: null,
    title: 'MITRE ATT&CK T1059 - Command and Scripting Interpreter',
    content: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.',
    severity: 'Medium',
    remediation: 'Implement application allowlisting and execution monitoring.',
    tags: ['mitre', 'execution', 'technique'],
    muted: true,
    used_by_ai_count: 5,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-15T14:00:00.000Z',
  },
  {
    id: 'kb-8',
    source_id: 'cwe',
    cwe_id: 'CWE-200',
    title: 'Exposure of Sensitive Information',
    content: 'Sensitive information exposure can lead to data breaches and unauthorized access.',
    severity: 'Medium',
    remediation: 'Implement proper access controls and data classification.',
    tags: ['information-disclosure', 'data'],
    muted: false,
    used_by_ai_count: 15,
    created_at: '2026-05-10T00:00:00.000Z',
    updated_at: '2026-05-29T09:45:00.000Z',
  },
];
