import { NextResponse } from 'next/server';
import { buildMeta } from '@/server/http/response';
import { REGISTRATION_MODE, WORKSPACE_MODE } from '@/server/modules/auth/constants';

function resolveMode(value: string | undefined, allowed: string[], fallback: string) {
  return value && allowed.includes(value) ? value : fallback;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      workspaceMode: resolveMode(process.env.WORKSPACE_MODE, Object.values(WORKSPACE_MODE), WORKSPACE_MODE.MULTIPLE),
      registrationMode: resolveMode(process.env.REGISTRATION_MODE, Object.values(REGISTRATION_MODE), REGISTRATION_MODE.OPEN),
    },
    meta: buildMeta(),
  });
}
