import { apiFetch } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

export interface ScannerEngine {
  name: string;
  command: string;
  format: string;
  outputStream: string;
  isAvailable: boolean;
  status: 'ready' | 'not_installed';
}

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

export interface ScannerRulesResponse {
  scanner: string;
  rulesPath: string;
  totalCount: number;
  rules: ScannerRule[];
  packs: string[];
}

/**
 * List all registered scanner engines and their availability status.
 *
 * @returns Array of scanner engines with installation/availability info.
 *
 * @throws {ApiRequestError} When the request fails (network error, 4xx, 5xx).
 *
 * @example
 * ```ts
 * const engines = await listScannerEngines();
 * engines.forEach(e => {
 *   console.log(`${e.name}: ${e.status}`);
 * });
 * // semgrep: ready
 * // bandit: not_installed
 * ```
 */
export async function listScannerEngines(): Promise<ScannerEngine[]> {
  const res = await apiFetch<{ scanners: ScannerEngine[] }>(ENDPOINTS.SCANNER_ENGINES.LIST);
  return res.scanners;
}

/**
 * Retrieve the detection rules for a specific scanner engine.
 *
 * @param scannerId - The identifier of the scanner (e.g. "semgrep", "bandit").
 * @returns Rules response containing the rule list, total count, and rule packs.
 *
 * @throws {ApiRequestError} When the scanner does not exist or the request fails.
 *
 * @example
 * ```ts
 * const rules = await getScannerRules('semgrep');
 * console.log(`Total rules: ${rules.totalCount}`);
 * rules.rules.forEach(r => {
 *   console.log(`[${r.severity}] ${r.name} - ${r.description}`);
 * });
 * ```
 */
export async function getScannerRules(scannerId: string): Promise<ScannerRulesResponse> {
  return apiFetch<ScannerRulesResponse>(ENDPOINTS.SCANNER_ENGINES.RULES(scannerId));
}
