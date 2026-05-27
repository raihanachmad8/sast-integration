import { ApiResponse } from '@/server/http/response';

export async function GET() {
  return ApiResponse.success('OK', { status: 'healthy', timestamp: new Date().toISOString() });
}