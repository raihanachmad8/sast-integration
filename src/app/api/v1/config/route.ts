import { NextResponse } from 'next/server';
import { ApiResponse, buildMeta } from '@/server/http/response';

export async function GET() {
  try {
    const { env } = await import('@/server/env');
    return NextResponse.json({
      success: true,
      data: {
        workspaceMode: env.WORKSPACE_MODE,
        registrationMode: env.REGISTRATION_MODE,
      },
      meta: buildMeta(),
    });
  } catch {
    return ApiResponse.error('Server configuration error', 'CONFIG_ERROR', undefined, 500);
  }
}
