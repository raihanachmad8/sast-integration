/**
 * Scanner Rules Service
 *
 * Reads and manages scanner rules from the rules/ folder.
 * Each scanner has its own subfolder with rules.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ScannerId } from './constants';

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

export interface ScannerRulesConfig {
  scanner: ScannerId;
  rulesPath: string;
  rules: ScannerRule[];
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const RULES_BASE_PATH = join(process.cwd(), 'rules');
const DEFAULT_RULES_PER_PAGE = 50;

/**
 * Parse a Semgrep YAML rule file.
 */
async function parseSemgrepRule(filePath: string, basePath: string): Promise<ScannerRule | null> {
  try {
    const content = await readFile(filePath, 'utf-8');

    const idMatch = content.match(/id:\s*(.+)/);
    const messageMatch = content.match(/message:\s*["|'](.+?)["|']/);
    const severityMatch = content.match(/severity:\s*(.+)/);
    const languagesMatch = content.match(/languages:\s*\[(.+?)\]/);
    const cweMatch = content.match(/cwe:\s*["|']?(CWE-\d+)/);

    if (!idMatch) return null;

    return {
      id: idMatch[1].trim(),
      name: idMatch[1].trim(),
      description: messageMatch?.[1] || '',
      severity: severityMatch?.[1]?.trim() || 'WARNING',
      languages: languagesMatch?.[1]?.split(',').map((l) => l.trim().replace(/['"]/g, '')) || [],
      cwe: cweMatch?.[1],
      path: relative(basePath, filePath),
      enabled: true,
    };
  } catch {
    return null;
  }
}

/**
 * Get all rules for a specific scanner with search and pagination.
 */
export async function getScannerRules(
  scanner: ScannerId,
  options?: { page?: number; perPage?: number; search?: string },
): Promise<ScannerRulesConfig> {
  const page = options?.page ?? 1;
  const perPage = options?.perPage ?? DEFAULT_RULES_PER_PAGE;
  const search = options?.search?.toLowerCase() ?? '';
  const rulesPath = join(RULES_BASE_PATH, scanner);
  const allRules: ScannerRule[] = [];

  try {
    await stat(rulesPath);

    if (scanner === 'semgrep') {
      const semgrepPath = join(rulesPath, 'semgrep-rules');
      try {
        await stat(semgrepPath);
        await scanSemgrepRules(semgrepPath, semgrepPath, allRules);
      } catch {
        // semgrep-rules not cloned yet
      }
    }

    // Filter by search term across name, description, languages, cwe
    const filtered = search
      ? allRules.filter((r) =>
          r.name.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search) ||
          r.languages.some((l) => l.toLowerCase().includes(search)) ||
          (r.cwe && r.cwe.toLowerCase().includes(search)),
        )
      : allRules;

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / perPage);
    const offset = (page - 1) * perPage;
    const rules = filtered.slice(offset, offset + perPage);

    return { scanner, rulesPath, rules, totalCount, page, perPage, totalPages };
  } catch {
    return { scanner, rulesPath, rules: [], totalCount: 0, page, perPage, totalPages: 0 };
  }
}

/**
 * Recursively scan semgrep rules directory.
 */
async function scanSemgrepRules(dir: string, basePath: string, rules: ScannerRule[]): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await scanSemgrepRules(fullPath, basePath, rules);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        const rule = await parseSemgrepRule(fullPath, basePath);
        if (rule) rules.push(rule);
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get rule count for a scanner.
 */
export async function getRuleCount(scanner: ScannerId): Promise<number> {
  const config = await getScannerRules(scanner);
  return config.totalCount;
}

/**
 * Get available rule packs/languages for semgrep.
 */
export async function getSemgrepPacks(): Promise<string[]> {
  const semgrepPath = join(RULES_BASE_PATH, 'semgrep', 'semgrep-rules');

  try {
    const entries = await readdir(semgrepPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('stats'))
      .map((e) => e.name);
  } catch {
    return [];
  }
}
