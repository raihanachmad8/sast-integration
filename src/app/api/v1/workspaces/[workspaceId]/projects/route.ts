import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody, parsePagination } from '@/server/http/validate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { projectService } from '@/server/modules/project/services/project.service';
import { PERMISSION } from '@/commons/constants/permissions';
import { projectFormSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.project.info('listProjects');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const { page, perPage } = parsePagination(request.nextUrl.searchParams);
    const search = request.nextUrl.searchParams.get('search') ?? undefined;
    const repository = request.nextUrl.searchParams.get('repository') ?? undefined;
    const team = request.nextUrl.searchParams.get('team') ?? undefined;
    const member = request.nextUrl.searchParams.get('member') ?? undefined;

    const allProjects = await projectService.list(workspace.context.workspaceId, auth.context.userId);

    // Apply filters
    let filtered = allProjects;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
    }
    if (repository) {
      filtered = filtered.filter((p) => p.repositoryIds?.includes(repository) || p.repositories?.includes(repository));
    }
    if (team) {
      filtered = filtered.filter((p) => p.teams?.includes(team));
    }
    if (member) {
      filtered = filtered.filter((p) => p.members?.includes(member));
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);
    logger.project.info('listProjects completed', { total, search, repository, team, member });
    return ApiResponse.paginated('Projects retrieved', paginated, { page, perPage, total, totalPages: Math.ceil(total / perPage) });
  } catch (e) {
    logger.project.error('listProjects failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.project.info('createProject');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, projectFormSchema);
  if (!validation.success) return validation.response;

  try {
    const project = await projectService.create(validation.data, workspace.context.workspaceId, auth.context.userId);
    logger.project.info('createProject completed');
    return ApiResponse.created('Project created', project);
  } catch (e) {
    logger.project.error('createProject failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
