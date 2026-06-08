/**
 * Mock knowledge base entry for development and testing.
 *
 * @example
 * ```ts
 * const entry: KnowledgeBaseEntry = {
 *   id: 'ke_01',
 *   sourceId: 'ks_01',
 *   cweId: 'CWE-89',
 *   title: 'SQL Injection',
 *   content: 'SQL injection attacks occur when untrusted data is sent to an interpreter.',
 *   severity: 'critical',
 *   remediation: 'Use parameterized queries or prepared statements.',
 *   tags: ['injection', 'database'],
 *   muted: false,
 *   usedByAiCount: 45,
 *   createdAt: '2026-01-15T00:00:00.000Z',
 *   updatedAt: '2026-05-28T10:00:00.000Z',
 * };
 * ```
 */
export interface KnowledgeBaseEntry {
  /** Unique entry ID. */
  id: string;
  /** Knowledge source ID. */
  sourceId: string;
  /** CWE identifier (e.g. 'CWE-89'). */
  cweId: string | null;
  /** Entry title. */
  title: string;
  /** Full description content. */
  content: string | null;
  /** Severity level. */
  severity: string | null;
  /** Remediation guidance. */
  remediation: string | null;
  /** Classification tags. */
  tags: string[] | null;
  /** Whether the entry is muted from AI verification. */
  muted: boolean;
  /** Number of times used by AI verification. */
  usedByAiCount: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

export const MOCK_KNOWLEDGE_BASE: KnowledgeBaseEntry[] = [
  {
    id: 'ke_01',
    sourceId: 'ks_01',
    cweId: 'CWE-89',
    title: 'SQL Injection',
    content: 'SQL injection attacks occur when untrusted data is sent to an interpreter as part of a command or query.',
    severity: 'critical',
    remediation: 'Use parameterized queries or prepared statements. Never concatenate user input into SQL.',
    tags: ['injection', 'database', 'critical'],
    muted: false,
    usedByAiCount: 45,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-05-28T10:00:00.000Z',
  },
  {
    id: 'ke_02',
    sourceId: 'ks_01',
    cweId: 'CWE-79',
    title: 'Cross-site Scripting (XSS)',
    content: 'XSS vulnerabilities allow attackers to inject client-side scripts into web pages viewed by other users.',
    severity: 'high',
    remediation: 'Encode output, validate input, use Content Security Policy headers.',
    tags: ['xss', 'web', 'injection'],
    muted: false,
    usedByAiCount: 32,
    createdAt: '2026-01-20T00:00:00.000Z',
    updatedAt: '2026-05-25T14:30:00.000Z',
  },
  {
    id: 'ke_03',
    sourceId: 'ks_01',
    cweId: 'CWE-22',
    title: 'Path Traversal',
    content: 'Path traversal vulnerabilities allow attackers to access files and directories outside the intended directory.',
    severity: 'high',
    remediation: 'Validate and sanitize file paths. Use allowlists for permitted directories.',
    tags: ['path', 'file-system'],
    muted: false,
    usedByAiCount: 18,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-05-20T09:00:00.000Z',
  },
  {
    id: 'ke_04',
    sourceId: 'ks_02',
    cweId: null,
    title: 'CVE-2024-12345 - OpenSSL Vulnerability',
    content: 'Critical vulnerability in OpenSSL affecting TLS 1.3 handshake process.',
    severity: 'critical',
    remediation: 'Update OpenSSL to version 3.2.1 or later.',
    tags: ['cve', 'openssl', 'tls'],
    muted: false,
    usedByAiCount: 8,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-05-18T16:45:00.000Z',
  },
  {
    id: 'ke_05',
    sourceId: 'ks_03',
    cweId: null,
    title: 'Internal API Authentication Rule',
    content: 'All internal API endpoints must use JWT tokens with RS256 signing. Tokens must expire within 15 minutes.',
    severity: 'high',
    remediation: 'Implement JWT validation middleware on all API routes.',
    tags: ['api', 'auth', 'jwt', 'internal'],
    muted: false,
    usedByAiCount: 24,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-05-30T11:20:00.000Z',
  },
  {
    id: 'ke_06',
    sourceId: 'ks_01',
    cweId: 'CWE-502',
    title: 'Deserialization of Untrusted Data',
    content: 'Deserialization vulnerabilities allow attackers to execute arbitrary code by manipulating serialized objects.',
    severity: 'critical',
    remediation: 'Avoid deserializing untrusted data. Use safe serialization formats like JSON.',
    tags: ['deserialization', 'code-execution'],
    muted: false,
    usedByAiCount: 12,
    createdAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-05-22T08:30:00.000Z',
  },
  {
    id: 'ke_07',
    sourceId: 'ks_04',
    cweId: null,
    title: 'MITRE ATT&CK T1059 - Command and Scripting Interpreter',
    content: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.',
    severity: 'medium',
    remediation: 'Implement application allowlisting and execution monitoring.',
    tags: ['mitre', 'execution', 'technique'],
    muted: true,
    usedByAiCount: 5,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-15T14:00:00.000Z',
  },
  {
    id: 'ke_08',
    sourceId: 'ks_01',
    cweId: 'CWE-200',
    title: 'Exposure of Sensitive Information',
    content: 'Sensitive information exposure can lead to data breaches and unauthorized access.',
    severity: 'medium',
    remediation: 'Implement proper access controls and data classification.',
    tags: ['information-disclosure', 'data'],
    muted: false,
    usedByAiCount: 15,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-29T09:45:00.000Z',
  },
];
