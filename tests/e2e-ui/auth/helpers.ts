/**
 * Shared helpers for Playwright UI auth-related tests.
 *
 * Contains reusable functions for navigation, config checking,
 * and common setup patterns used across signin, signup, and protection tests.
 */
import { expect, type Page } from '@playwright/test';
import { SignJWT } from 'jose';

/** Workspace mode constants (mirrors server constants) */
export const WORKSPACE_MODE = { SINGLE: 'single', MULTIPLE: 'multiple' } as const;

/** JWT secret matching the running server's .env JWT_SECRET */
const JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-jwt-signing-key-automated-testing-32ch';

export async function createMockRefreshToken(overrides?: {
  userId?: string;
  workspaceId?: string | null;
  email?: string;
}): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({
    sub: overrides?.userId ?? 'user-1',
    email: overrides?.email ?? 'user@example.com',
    workspaceId: overrides?.workspaceId ?? 'workspace-1',
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function addMockRefreshCookie(
  page: Page,
  overrides?: { userId?: string; workspaceId?: string | null; email?: string },
) {
  const token = await createMockRefreshToken(overrides);
  await page.context().addCookies([{
    name: 'refresh_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }]);
}

export const AUTH_PATHS = {
  signin: '/auth/signin',
  signup: '/auth/signup',
  invite: '/auth/invite',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  verifyEmail: '/auth/verify-email',
} as const;

export function getWorkspaceMode(): string {
  return process.env.NEXT_PUBLIC_WORKSPACE_MODE || 'multiple';
}

export async function gotoAuthPage(page: Page, path: string, submitButtonName: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await waitForAuthFormReady(page, submitButtonName);
}

/**
 * Signs in and opens the first available workspace.
 * In MULTIPLE mode, creates a fresh user + workspace via API, then signs in via browser.
 * In SINGLE mode, uses the seeded owner credentials.
 * Returns the workspace slug.
 */
export async function signInAndOpenWorkspace(page: Page): Promise<string> {
  const workspaceMode = getWorkspaceMode();
  const API = 'http://localhost:3000/api/v1';

  const credentials =
    workspaceMode === WORKSPACE_MODE.MULTIPLE
      ? {
          email: `testuser-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          name: 'Test User',
        }
      : {
          email: 'owner@sast.local',
          password: 'ChangeMe123!',
        };

  await page.context().clearCookies();

  let workspaceSlug = '';

  if (workspaceMode === WORKSPACE_MODE.MULTIPLE) {
    const signupRes = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!signupRes.ok) throw new Error(`Signup failed (${signupRes.status})`);

    const signinRes = await fetch(`${API}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
    if (!signinRes.ok) throw new Error(`Signin failed (${signinRes.status})`);
    const { data: { accessToken } } = await signinRes.json();

    const createWsRes = await fetch(`${API}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
    });
    if (!createWsRes.ok) throw new Error(`Create workspace failed (${createWsRes.status})`);
    const { data: ws } = await createWsRes.json();
    workspaceSlug = ws?.slug ?? '';
  }

  await gotoAuthPage(page, '/auth/signin?redirect=/workspaces', 'Sign in');
  await page.getByPlaceholder('you@company.com').fill(credentials.email);
  await page.getByPlaceholder('Enter your password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/workspaces');
  await expect(page.getByRole('heading', { name: /Choose workspace|Workspace access required/ })).toBeVisible({ timeout: 10_000 });

  if (workspaceSlug) {
    await page.goto(`/${workspaceSlug}`);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toMatch(new RegExp(`^/${workspaceSlug}`));
  } else {
    await page.locator('.ant-card').getByRole('button', { name: 'Open workspace' }).first().click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).not.toBe('/workspaces');
    workspaceSlug = new URL(page.url()).pathname.split('/')[1];
  }

  return workspaceSlug;
}

async function waitForAuthFormReady(page: Page, submitButtonName: string) {
  const button = page.getByRole('button', { name: submitButtonName });
  const firstTextbox = page.getByRole('textbox').first();

  await expect(firstTextbox).toBeVisible();
  await firstTextbox.focus();
  await expect(firstTextbox).toBeFocused();
  await expect(button).toBeVisible();
  await expect
    .poll(async () => {
      const box = await button.boundingBox();
      return box?.width ?? 0;
    }, { timeout: 5000 })
    .toBeGreaterThan(200);
}
