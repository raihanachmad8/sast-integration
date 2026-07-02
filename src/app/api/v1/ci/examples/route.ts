import { promises as fs } from 'fs';
import path from 'path';

import { NextResponse } from 'next/server';

import { logger } from '@/server/lib/logger';

const FILE_MAP: Record<string, string> = {
  github: 'github-actions.yml',
  gitlab: 'gitlab-ci.yml',
  gitea: 'gitea-actions.yml',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');

  if (!platform || !(platform in FILE_MAP)) {
    return NextResponse.json({ error: 'Invalid platform. Use: github, gitlab, or gitea' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'examples', FILE_MAP[platform]);
    const content = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    logger.app.error('Failed to load CI/CD example', { platform, error });
    return NextResponse.json({ error: 'Failed to load example file' }, { status: 500 });
  }
}
