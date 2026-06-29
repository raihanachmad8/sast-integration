import { logger } from '@/server/lib/logger';

export interface ScannerEngineRecord {
  id: string;
  name: string;
  command: string;
  format: string;
  outputStream: string;
  isAvailable: boolean;
  status: 'ready' | 'not_installed';
}

const SCANNER_ENGINES: ScannerEngineRecord[] = [
  {
    id: 'semgrep',
    name: 'Semgrep',
    command: 'semgrep scan --config auto --json',
    format: 'semgrep-json',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready',
  },
  {
    id: 'gitleaks',
    name: 'Gitleaks',
    command: 'gitleaks detect --source /repo --report-format json',
    format: 'gitleaks-json',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready',
  },
  {
    id: 'cppcheck',
    name: 'Cppcheck',
    command: 'cppcheck --enable=warning,style,performance,portability,information --force --quiet --xml --xml-version=2',
    format: 'cppcheck-xml',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready',
  },
  {
    id: 'flawfinder',
    name: 'Flawfinder',
    command: 'flawfinder --columns --context --sarif .',
    format: 'flawfinder-sarif',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready',
  },
  {
    id: 'clang-tidy',
    name: 'Clang-Tidy',
    command: 'clang-tidy --dump=json .',
    format: 'clang-tidy-json',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready',
  },
  {
    id: 'gcc-fanalyzer',
    name: 'GCC Fanalyzer',
    command: 'gcc -fanalyzer -fdump-analyzer-json -o /dev/null',
    format: 'gcc-fanalyzer-json',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready',
  },
];

export const scannerEnginesRepository = {
  async list(): Promise<ScannerEngineRecord[]> {
    logger.scan.info('listScannerEngines');
    const engines = SCANNER_ENGINES;
    logger.scan.info('listScannerEngines completed', { count: engines.length });
    return engines;
  },

  async getById(id: string): Promise<ScannerEngineRecord | null> {
    logger.scan.info('getScannerEngineById', { id });
    const engine = SCANNER_ENGINES.find((e) => e.id === id) ?? null;
    if (!engine) {
      logger.scan.warn('getScannerEngineById: scanner engine not found', { id });
    }
    return engine;
  },
};
