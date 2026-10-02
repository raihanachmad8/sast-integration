/**
 * Scanner Rules Service
 * 
 * Reads and manages scanner rules from the rules/ folder.
 * Each scanner has its own subfolder with rules.
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, relative } from 'path';
import type { SupportedScanner } from './constants';

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
  scanner: SupportedScanner;
  rulesPath: string;
  rules: ScannerRule[];
  totalCount: number;
}

// Base path for rules
const RULES_BASE_PATH = join(process.cwd(), 'rules');

/**
 * Parse a Semgrep YAML rule file
 */
async function parseSemgrepRule(filePath: string, basePath: string): Promise<ScannerRule | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Simple YAML parsing for rule metadata
    const idMatch = content.match(/id:\s*(.+)/);
    const messageMatch = content.match(/message:\s*["|'](.+?)["|']/);
    const severityMatch = content.match(/severity:\s*(.+)/);
    const languagesMatch = content.match(/languages:\s*\[(.+?)\]/);
    const cweMatch = content.match(/cwe:\s*["|']?(CWE-\d+)/);
    
    if (!idMatch) return null;
    
    const relativePath = relative(basePath, filePath);
    
    return {
      id: idMatch[1].trim(),
      name: idMatch[1].trim(),
      description: messageMatch?.[1] || '',
      severity: severityMatch?.[1]?.trim() || 'WARNING',
      languages: languagesMatch?.[1]?.split(',').map(l => l.trim().replace(/['"]/g, '')) || [],
      cwe: cweMatch?.[1],
      path: relativePath,
      enabled: true,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a Gitleaks TOML rule file
 */
async function parseGitleaksRule(filePath: string, basePath: string): Promise<ScannerRule | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Simple TOML parsing for rule metadata
    const idMatch = content.match(/id\s*=\s*"(.+)"/);
    const descMatch = content.match(/description\s*=\s*"(.+)"/);
    
    if (!idMatch) return null;
    
    const relativePath = relative(basePath, filePath);
    
    return {
      id: idMatch[1],
      name: idMatch[1],
      description: descMatch?.[1] || '',
      severity: 'WARNING',
      languages: ['secrets'],
      path: relativePath,
      enabled: true,
    };
  } catch {
    return null;
  }
}

/**
 * Get all rules for a specific scanner
 */
export async function getScannerRules(scanner: SupportedScanner): Promise<ScannerRulesConfig> {
  const rulesPath = join(RULES_BASE_PATH, scanner);
  const rules: ScannerRule[] = [];
  
  try {
    // Check if rules directory exists
    await stat(rulesPath);
    
    // For semgrep, scan the cloned repository
    if (scanner === 'semgrep') {
      const semgrepPath = join(rulesPath, 'semgrep-rules');
      try {
        await stat(semgrepPath);
        // Scan for YAML files in semgrep-rules
        await scanSemgrepRules(semgrepPath, semgrepPath, rules);
      } catch {
        // semgrep-rules not cloned yet
      }
    }
    
    return {
      scanner,
      rulesPath,
      rules,
      totalCount: rules.length,
    };
  } catch {
    return {
      scanner,
      rulesPath,
      rules: [],
      totalCount: 0,
    };
  }
}

/**
 * Recursively scan semgrep rules directory
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
        if (rule) {
          rules.push(rule);
        }
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get rule count for a scanner
 */
export async function getRuleCount(scanner: SupportedScanner): Promise<number> {
  const config = await getScannerRules(scanner);
  return config.totalCount;
}

/**
 * Get available rule packs/languages for semgrep
 */
export async function getSemgrepPacks(): Promise<string[]> {
  const semgrepPath = join(RULES_BASE_PATH, 'semgrep', 'semgrep-rules');
  
  try {
    const entries = await readdir(semgrepPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('stats'))
      .map(e => e.name);
  } catch {
    return [];
  }
}
