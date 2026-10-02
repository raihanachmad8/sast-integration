import { describe, it, expect } from 'vitest';
import { parseSemgrep } from '@/server/modules/scan/parsers/semgrep.parser';
import { parseCppcheck } from '@/server/modules/scan/parsers/cppcheck.parser';
import { parseTrivy } from '@/server/modules/scan/parsers/trivy.parser';
import { parseGitleaks } from '@/server/modules/scan/parsers/gitleaks.parser';
import { parseFlawfinder } from '@/server/modules/scan/parsers/flawfinder.parser';
import { parseScanResult } from '@/server/modules/scan/parsers';
import { SCANNER_COMMANDS } from '@/server/modules/scan/scanners';

describe('Semgrep Parser', () => {
  it('parses basic semgrep json', () => {
    const sample = {
      results: [
        {
          check_id: 'python.lang.security.audit.insecure-deserialization',
          path: 'app.py',
          start: { line: 42 },
          extra: {
            message: 'Insecure deserialization',
            severity: 'HIGH',
            metadata: { cwe: 'CWE-502' },
          },
        },
      ],
    };

    const { findings } = parseSemgrep(JSON.stringify(sample), 'scan-123');
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].cwe_id).toBe('CWE-502');
  });
});

describe('Cppcheck Parser', () => {
  it('parses cppcheck xml', () => {
    const xml = `
      <results>
        <error id="nullPointer" severity="error" msg="Null pointer dereference" cwe="476">
          <location file="main.c" line="123"/>
        </error>
      </results>
    `;

    const { findings } = parseCppcheck(xml, 'scan-456');
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].cwe_id).toBe('476');
  });
});

describe('Trivy Parser', () => {
  it('parses trivy vulnerability report', () => {
    const sample = {
      Results: [
        {
          Target: 'app/package.json',
          Vulnerabilities: [
            {
              VulnerabilityID: 'CVE-2023-1234',
              PkgName: 'lodash',
              Severity: 'HIGH',
              Title: 'Prototype Pollution',
            },
          ],
        },
      ],
    };

    const { findings } = parseTrivy(JSON.stringify(sample), 'scan-789');
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].rule).toBe('CVE-2023-1234');
  });

  it('parses trivy misconfigurations', () => {
    const sample = {
      Results: [
        {
          Target: 'Dockerfile',
          Misconfigurations: [
            {
              ID: 'DS002',
              Title: 'Root user',
              Severity: 'MEDIUM',
              Message: 'Running as root',
            },
          ],
        },
      ],
    };
    const { findings, summary } = parseTrivy(JSON.stringify(sample), 'scan-mc');
    expect(findings.length).toBe(1);
    expect(findings[0].rule).toBe('DS002');
    expect(findings[0].severity).toBe('medium');
    expect(summary.medium).toBe(1);
  });

  it('parses trivy secrets', () => {
    const sample = {
      Results: [
        {
          Target: '.env',
          Secrets: [
            {
              RuleID: 'generic-api-key',
              Severity: 'HIGH',
              Title: 'API Key found',
              Match: 'AKIA...',
            },
          ],
        },
      ],
    };
    const { findings, summary } = parseTrivy(JSON.stringify(sample), 'scan-sec');
    expect(findings.length).toBe(1);
    expect(findings[0].rule).toBe('generic-api-key');
    expect(findings[0].severity).toBe('high');
    expect(summary.high).toBe(1);
  });

  it('parses buffer input', () => {
    const sample = Buffer.from(JSON.stringify({ Results: [] }));
    const { findings } = parseTrivy(sample, 'scan-buf');
    expect(findings).toHaveLength(0);
  });

  it('returns empty for invalid JSON', () => {
    const { findings, summary } = parseTrivy('not json', 'scan-inv');
    expect(findings).toHaveLength(0);
    expect(summary).toEqual({});
  });

  it('handles missing Results array', () => {
    const { findings } = parseTrivy(JSON.stringify({}), 'scan-nr');
    expect(findings).toHaveLength(0);
  });

  it('maps all severity levels correctly', () => {
    const sample = {
      Results: [
        {
          Target: 'test',
          Vulnerabilities: [
            { VulnerabilityID: 'v1', Severity: 'CRITICAL' },
            { VulnerabilityID: 'v2', Severity: 'HIGH' },
            { VulnerabilityID: 'v3', Severity: 'MEDIUM' },
            { VulnerabilityID: 'v4', Severity: 'LOW' },
            { VulnerabilityID: 'v5', Severity: 'UNKNOWN' },
            { VulnerabilityID: 'v6', Severity: '' },
          ],
        },
      ],
    };
    const { summary } = parseTrivy(JSON.stringify(sample), 'scan-sev');
    expect(summary.critical).toBe(1);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(1);
    expect(summary.low).toBe(1);
    expect(summary.info).toBe(2);
  });

  it('handles vulnerability with optional fields missing', () => {
    const sample = {
      Results: [
        {
          Target: 'test',
          Vulnerabilities: [
            { VulnerabilityID: 'CVE-1', Severity: 'HIGH' },
          ],
        },
      ],
    };
    const { findings } = parseTrivy(JSON.stringify(sample), 'scan-opt');
    expect(findings[0].message).toContain('@:');
  });
});

describe('Gitleaks Parser', () => {
  it('parses gitleaks secret report', () => {
    const sample = {
      results: [
        {
          Description: 'AWS Access Key',
          StartLine: 15,
          File: 'config/aws.env',
          RuleID: 'aws-access-key',
          Match: 'AKIA...',
        },
      ],
    };

    const { findings } = parseGitleaks(JSON.stringify(sample), 'scan-999');
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].file_path).toBe('config/aws.env');
  });
});

describe('Flawfinder Parser', () => {
  it('parses flawfinder text output and maps severity levels correctly', () => {
    const sample = `./src/main.c:42:  [2] (buffer) strcpy: Does not check for buffer overflows when copying to destination (CWE-120).
./src/main.c:55:  [4] (buffer) sprintf: Potential format string problem (CWE-134).
./src/vuln.c:99:  [5] (format) printf: Uncontrolled format string (CWE-134).`;

    const { findings, summary } = parseFlawfinder(sample, 'scan-flaw-1');

    expect(findings.length).toBe(3);
    expect(findings[0].severity).toBe('low');
    expect(findings[1].severity).toBe('high');
    expect(findings[2].severity).toBe('critical');

    expect(findings[0].rule).toBe('strcpy');
    expect(findings[2].file_path).toContain('vuln.c');

    // Summary counts
    expect(summary.low).toBe(1);
    expect(summary.high).toBe(1);
    expect(summary.critical).toBe(1);
  });

  it('handles empty or malformed flawfinder output gracefully', () => {
    const { findings } = parseFlawfinder('garbage input without matches', 'scan-flaw-2');
    expect(findings.length).toBe(0);
  });
});

// ============================================================
// parseScanResult (parsers/index.ts) — router tests
// ============================================================

/**
 * Unit tests for parseScanResult (parsers/index.ts)
 *
 * Covers:
 * - Dispatches to correct parser by scanner name
 * - Strips file extensions (.json, .xml, .sarif) before matching
 * - SARIF stub parser for unrecognized SARIF content
 * - Returns empty result for unknown scanner
 */
describe('parseScanResult (parser router)', () => {
  it('should dispatch to semgrep parser', () => {
    const json = JSON.stringify({ results: [] });
    const result = parseScanResult('semgrep', json, 's1');
    expect(result.findings).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('should dispatch to cppcheck parser', () => {
    const xml = '<results></results>';
    const result = parseScanResult('cppcheck', xml, 's2');
    expect(result.findings).toBeDefined();
  });

  it('should dispatch to gitleaks parser', () => {
    const json = JSON.stringify({ results: [] });
    const result = parseScanResult('gitleaks', json, 's3');
    expect(result.findings).toBeDefined();
  });

  it('should dispatch to trivy parser', () => {
    const json = JSON.stringify({ Results: [] });
    const result = parseScanResult('trivy', json, 's4');
    expect(result.findings).toBeDefined();
  });

  it('should dispatch to flawfinder parser', () => {
    const result = parseScanResult('flawfinder', 'no matches', 's5');
    expect(result.findings).toBeDefined();
  });

  it('should strip .json extension before matching', () => {
    const json = JSON.stringify({ results: [] });
    const result = parseScanResult('semgrep.json', json, 's6');
    expect(result.findings).toBeDefined();
  });

  it('should strip .xml extension before matching', () => {
    const xml = '<results></results>';
    const result = parseScanResult('cppcheck.xml', xml, 's7');
    expect(result.findings).toBeDefined();
  });

  it('should strip .sarif extension before matching', () => {
    const json = JSON.stringify({ runs: [] });
    const result = parseScanResult('semgrep.sarif', json, 's8');
    expect(result.findings).toBeDefined();
  });

  it('should use SARIF stub parser for sarif scanner', () => {
    const sarif = JSON.stringify({
      runs: [{
        results: [{
          ruleId: 'test-rule',
          level: 'error',
          message: { text: 'test finding' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'test.js' },
              region: { startLine: 10 },
            },
          }],
        }],
      }],
    });
    const result = parseScanResult('sarif', sarif, 's9');
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].severity).toBe('high');
    expect(result.findings[0].rule).toBe('test-rule');
  });

  it('should use SARIF stub for files ending with .sarif', () => {
    const sarif = JSON.stringify({ runs: [] });
    const result = parseScanResult('report.sarif', sarif, 's10');
    expect(result.findings).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('should return empty result for unknown scanner', () => {
    const result = parseScanResult('unknown-scanner', 'data', 's11');
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toEqual({});
  });

  it('should handle SARIF with multiple severity levels', () => {
    const sarif = JSON.stringify({
      runs: [{
        results: [
          { ruleId: 'r1', level: 'error', message: { text: 'err' }, locations: [] },
          { ruleId: 'r2', level: 'warning', message: { text: 'warn' }, locations: [] },
          { ruleId: 'r3', level: 'note', message: { text: 'note' }, locations: [] },
          { ruleId: 'r4', level: 'none', message: { text: 'none' }, locations: [] },
        ],
      }],
    });
    const result = parseScanResult('sarif', sarif, 's12');
    expect(result.findings.length).toBe(4);
    expect(result.findings[0].severity).toBe('high');
    expect(result.findings[1].severity).toBe('medium');
    expect(result.findings[2].severity).toBe('low');
    expect(result.findings[3].severity).toBe('low');
  });

  it('should handle malformed SARIF gracefully', () => {
    const result = parseScanResult('sarif', 'not valid json {{{', 's13');
    expect(result.findings).toHaveLength(0);
  });
});

// ============================================================
// SCANNER_COMMANDS (scanners.ts) — configuration tests
// ============================================================

/**
 * Unit tests for SCANNER_COMMANDS
 *
 * Covers:
 * - All supported scanners have command configs
 * - Each config has required fields (command, args, format)
 * - Args function produces valid arguments
 */
describe('SCANNER_COMMANDS', () => {
  const expectedScanners = ['semgrep', 'gitleaks', 'trivy', 'cppcheck', 'flawfinder', 'sarif'] as const;

  it('should have configs for all expected scanners', () => {
    for (const name of expectedScanners) {
      expect(SCANNER_COMMANDS[name]).toBeDefined();
      expect(SCANNER_COMMANDS[name].command).toBeTruthy();
      expect(typeof SCANNER_COMMANDS[name].args).toBe('function');
      expect(SCANNER_COMMANDS[name].format).toBeTruthy();
    }
  });

  it('should produce valid args for semgrep', () => {
    const args = SCANNER_COMMANDS.semgrep.args('/tmp/repo');
    expect(args).toContain('--config');
    expect(args).toContain('auto');
    expect(args).toContain('/tmp/repo');
  });

  it('should produce valid args for gitleaks', () => {
    const args = SCANNER_COMMANDS.gitleaks.args('/tmp/repo');
    expect(args).toContain('detect');
    expect(args).toContain('/tmp/repo');
  });

  it('should produce valid args for trivy', () => {
    const args = SCANNER_COMMANDS.trivy.args('/tmp/repo');
    expect(args).toContain('fs');
    expect(args).toContain('/tmp/repo');
  });

  it('should produce valid args for cppcheck with stderr output', () => {
    const args = SCANNER_COMMANDS.cppcheck.args('/tmp/repo');
    expect(args).toContain('--xml');
    expect(SCANNER_COMMANDS.cppcheck.outputStream).toBe('stderr');
  });

  it('should produce valid args for flawfinder', () => {
    const args = SCANNER_COMMANDS.flawfinder.args('/tmp/repo');
    expect(args).toContain('--dataonly');
    expect(args).toContain('/tmp/repo');
  });

  it('should use semgrep with SARIF output for sarif scanner', () => {
    expect(SCANNER_COMMANDS.sarif.command).toBe('semgrep');
    expect(SCANNER_COMMANDS.sarif.format).toBe('sarif');
    const args = SCANNER_COMMANDS.sarif.args('/tmp/repo');
    expect(args).toContain('--sarif');
  });
});
