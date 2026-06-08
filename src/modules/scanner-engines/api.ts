import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

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

export const scannerEnginesApi = {
  async list(params: ListParams): Promise<PaginatedResponse<ScannerEngine>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<ScannerEngine>>>(ENDPOINTS.SCANNER_ENGINES.LIST, params);
    return data;
  },

  async getRules(scannerId: string): Promise<ScannerRulesResponse> {
    const { data } = await _api.Get<ApiResponse<ScannerRulesResponse>>(ENDPOINTS.SCANNER_ENGINES.RULES(scannerId));
    return data;
  },
};
