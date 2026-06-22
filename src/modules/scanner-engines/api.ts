import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { PaginatedResponse } from '@/commons/types/pagination';

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

export const scannerEnginesApi = {
  async list(): Promise<{ data: ScannerEngine[]; total: number }> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<ScannerEngine>>>(ENDPOINTS.SCANNER_ENGINES.LIST);
    const result = extractPaginated(response);
    return { data: result.data, total: result.meta.total };
  },

  async getRules(scannerId: string, params?: { page?: number; perPage?: number; search?: string }): Promise<ScannerRulesResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.perPage = String(params.perPage);
    if (params?.search) queryParams.search = params.search;

    const qs = new URLSearchParams(queryParams).toString();
    const url = ENDPOINTS.SCANNER_ENGINES.RULES(scannerId) + (qs ? `?${qs}` : '');
    const response = await _api.Get<ApiResponse<{ scanner: string; rulesPath: string; rules: ScannerRule[]; packs: string[] }>>(url);
    const pagination = response.meta?.pagination;
    const data = response.data;

    return {
      scanner: data?.scanner ?? '',
      rulesPath: data?.rulesPath ?? '',
      rules: data?.rules ?? [],
      packs: data?.packs ?? [],
      page: pagination?.page ?? 1,
      perPage: pagination?.perPage ?? 50,
      total: pagination?.total ?? 0,
      totalPages: pagination?.totalPages ?? 0,
    };
  },
};
