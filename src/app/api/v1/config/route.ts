import { NextResponse } from 'next/server';
import { env } from '@/server/env';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      workspaceMode: env.WORKSPACE_MODE,
      registrationMode: env.REGISTRATION_MODE,
    },
  });
}
