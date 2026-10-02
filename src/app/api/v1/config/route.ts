import { NextResponse } from 'next/server';
import { buildMeta } from '@/server/http/response';
import { WORKSPACE_MODE } from '@/server/modules/auth/constants';

function resolveMode(value: string | undefined, allowed: string[], fallback: string) {
  return value && allowed.includes(value) ? value : fallback;
}

export async function GET() {
  const workspaceMode = resolveMode(process.env.WORKSPACE_MODE, Object.values(WORKSPACE_MODE), WORKSPACE_MODE.MULTIPLE);
  return NextResponse.json({
    success: true,
    data: {
      workspaceMode,
    },
    meta: buildMeta(),
  });
}
