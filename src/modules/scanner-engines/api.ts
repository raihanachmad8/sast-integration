import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';

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
  rules: ScannerRule[];
  packs: string[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface ScannerEnginesListResponse {
  scanners: ScannerEngine[];
}

export const scannerEnginesApi = {
  async list(): Promise<{ data: ScannerEngine[]; total: number }> {
    const response = await _api.Get<ApiResponse<ScannerEnginesListResponse>>(ENDPOINTS.SCANNER_ENGINES.LIST);
    const scanners = response.data.scanners ?? [];
    return { data: scanners, total: scanners.length };
  },

  async getRules(scannerId: string, params?: { page?: number; perPage?: number; search?: string }): Promise<ScannerRulesResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);
    if (params?.search) queryParams.search = params.search;

    const qs = new URLSearchParams(queryParams).toString();
    const url = ENDPOINTS.SCANNER_ENGINES.RULES(scannerId) + (qs ? `?${qs}` : '');
    const response = await _api.Get<ApiResponse<{ scanner: string; rulesPath: string; rules: ScannerRule[]; packs: string[] }>>(url);
    const pagination = response.meta?.pagination;

    return {
      scanner: response.data.scanner,
      rulesPath: response.data.rulesPath,
      rules: response.data.rules,
      packs: response.data.packs,
      page: pagination?.page ?? 1,
      perPage: pagination?.perPage ?? 50,
      total: pagination?.total ?? 0,
      totalPages: pagination?.totalPages ?? 0,
    };
  },
};
