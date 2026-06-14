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
    id: 'bandit',
    name: 'Bandit',
    command: 'bandit -r . -f json',
    format: 'bandit-json',
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
    id: 'gosec',
    name: 'Gosec',
    command: 'gosec -fmt json ./...',
    format: 'gosec-json',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready',
  },
  {
    id: 'eslint-security',
    name: 'ESLint Security',
    command: 'eslint --plugin security --rule "security/*: error" --format json .',
    format: 'eslint-json',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready',
  },
];

export const scannerEnginesRepository = {
  async list(): Promise<ScannerEngineRecord[]> {
    return SCANNER_ENGINES;
  },

  async getById(id: string): Promise<ScannerEngineRecord | null> {
    return SCANNER_ENGINES.find((e) => e.id === id) ?? null;
  },
};
