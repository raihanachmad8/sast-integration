export interface ScannerEngineRecord {
  id: string;
  name: string;
  command: string;
  format: string;
  output_stream: string;
  is_available: boolean;
  status: 'ready' | 'not_installed';
}

const SCANNER_ENGINES: ScannerEngineRecord[] = [
  {
    id: 'semgrep',
    name: 'Semgrep',
    command: 'semgrep scan --config auto --json',
    format: 'semgrep-json',
    output_stream: 'stdout',
    is_available: true,
    status: 'ready',
  },
  {
    id: 'bandit',
    name: 'Bandit',
    command: 'bandit -r . -f json',
    format: 'bandit-json',
    output_stream: 'stdout',
    is_available: true,
    status: 'ready',
  },
  {
    id: 'trivy',
    name: 'Trivy',
    command: 'trivy fs --format json .',
    format: 'trivy-json',
    output_stream: 'stdout',
    is_available: true,
    status: 'ready',
  },
  {
    id: 'gosec',
    name: 'Gosec',
    command: 'gosec -fmt json ./...',
    format: 'gosec-json',
    output_stream: 'stdout',
    is_available: true,
    status: 'ready',
  },
  {
    id: 'eslint-security',
    name: 'ESLint Security',
    command: 'eslint --plugin security --rule "security/*: error" --format json .',
    format: 'eslint-json',
    output_stream: 'stdout',
    is_available: true,
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
