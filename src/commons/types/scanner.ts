/**
 * Scanner types shared between client and server.
 * Canonical source — both modules/scanner-engines/api.ts and server/modules/scan/rules.ts import from here.
 */

export interface ScannerRule {
  id: string;
  name: string;
  description: string;
  severity: string;
  languages: string[];
  cwe?: string;
  path: string;
  enabled: boolean;
}
