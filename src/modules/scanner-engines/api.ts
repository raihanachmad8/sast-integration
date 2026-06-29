import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { PaginatedResponse } from '@/commons/types/pagination';
import type { ScannerRule } from '@/commons/types/scanner';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export type { ScannerRule };

export interface ScannerEngine {
  name: string;
  command: string;
  format: string;
  outputStream: string;
  isAvailable: boolean;
  status: 'ready' | 'not_installed';
}

export interface ScannerRulesResponse {
  scanner: string;
  rulesPath: string;
  rules: ScannerRule[];
  packs: string[];
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export const scannerEnginesApi = {
  async list(): Promise<PaginatedResponse<ScannerEngine>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<ScannerEngine>>>(ENDPOINTS.SCANNER_ENGINES.LIST);
    return extractPaginated(response);
  },

  async getRules(scannerId: string, params?: { page?: number; perPage?: number; search?: string }): Promise<ScannerRulesResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.perPage = String(params.perPage);
    if (params?.search) queryParams.search = params.search;

    const qs = new URLSearchParams(queryParams).toString();
    const url = ENDPOINTS.SCANNER_ENGINES.RULES(scannerId) + (qs ? `?${qs}` : '');
    const response = await _api.Get<ApiResponse<{ scanner: string; rulesPath: string; rules: ScannerRule[]; packs: string[] }>>(url);
    const paginated = extractPaginated(response as unknown as ApiResponse<PaginatedResponse<ScannerRule>>);
    const data = response.data;

    return {
      scanner: data?.scanner ?? '',
      rulesPath: data?.rulesPath ?? '',
      rules: data?.rules ?? [],
      packs: data?.packs ?? [],
      ...paginated.meta,
    };
  },
};
