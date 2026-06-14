/**
 * CI/CD authentication middleware for scan uploads.
 *
 * This module provides authentication for CI/CD pipelines using Project API Tokens.
 * The token encodes the project ID, which is then used to resolve:
 * - workspaceId (from the project)
 * - repositoryId (from the project's repositories)
 *
 * ## Token Format
 * - Prefix: `sast_p_` (Project API Token)
 * - The token is hashed with bcrypt for security
 * - Only the hash is stored in the database
 *
 * ## Authentication Flow
 * 1. CI/CD sends `Authorization: Bearer sast_p_xxxxx`
 * 2. Middleware looks up the token by hash
 * 3. Resolves project → workspace + repository
 * 4. Returns authenticated context for upload endpoints
 *
 * @module scan/ci-cd-auth
 */

import type { NextRequest } from 'next/server';
import { logger } from '@/server/lib/logger';
import { projectApiTokenRepository } from '@/server/modules/project/repositories/project-api-token.repository';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { ApiResponse } from '@/server/http/response';

export interface CiCdAuthContext {
  workspaceId: string;
  projectId: string;
  tokenId: string;
  tokenName: string;
}

export interface CiCdAuthResult {
  success: boolean;
  context?: CiCdAuthContext;
  response?: Response;
}

/**
 * Authenticate a CI/CD request using a Project API Token.
 */
export async function authenticateCiCd(request: NextRequest): Promise<CiCdAuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        response: ApiResponse.error('Missing or invalid Authorization header. Expected: Bearer <token>', 'UNAUTHORIZED', undefined, 401),
      };
    }

    const rawToken = authHeader.slice(7).trim();
    if (!rawToken.startsWith('sast_p_')) {
      return {
        success: false,
        response: ApiResponse.error('Invalid token format. Expected Project API Token (sast_p_...)', 'UNAUTHORIZED', undefined, 401),
      };
    }

    const token = await projectApiTokenRepository.findAnyValidProjectToken(rawToken);
    if (!token) {
      logger.scan.warn('CI/CD auth: invalid token');
      return {
        success: false,
        response: ApiResponse.error('Invalid or expired API token', 'UNAUTHORIZED', undefined, 401),
      };
    }

    const permissions = token.permissions as string[] | null;
    if (!permissions?.includes('scans:upload')) {
      return {
        success: false,
        response: ApiResponse.error('Token does not have scans:upload permission', 'FORBIDDEN', undefined, 403),
      };
    }

    const project = await projectRepository.findById(token.projectId);
    if (!project) {
      logger.scan.error('CI/CD auth: project not found', { projectId: token.projectId });
      return {
        success: false,
        response: ApiResponse.error('Project not found', 'NOT_FOUND', undefined, 404),
      };
    }

    if (!project.workspaceId) {
      logger.scan.error('CI/CD auth: project has no workspace', { projectId: token.projectId });
      return {
        success: false,
        response: ApiResponse.error('Project is not associated with a workspace', 'INTERNAL_ERROR', undefined, 500),
      };
    }

    projectApiTokenRepository.touchLastUsed(token.id).catch(() => {});

    logger.scan.info('CI/CD auth successful', {
      workspaceId: project.workspaceId,
      projectId: token.projectId,
      tokenName: token.name,
    });

    return {
      success: true,
      context: {
        workspaceId: project.workspaceId,
        projectId: token.projectId,
        tokenId: token.id,
        tokenName: token.name,
      },
    };
  } catch (error) {
    logger.scan.error('CI/CD auth error', { error: (error as Error).message });
    return {
      success: false,
      response: ApiResponse.error('Authentication failed', 'INTERNAL_ERROR', undefined, 500),
    };
  }
}
