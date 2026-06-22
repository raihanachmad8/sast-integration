/** Base URL for E2E tests */
export const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000';
export const API_URL = `${BASE_URL}/api/v1`;

/** Test user fixtures */
export const TEST_USER = {
  email: 'owner@sast.local',
  password: 'ChangeMe123!',
  name: 'Owner',
} as const;

export const INVALID_USER = {
  email: 'nobody@example.com',
  password: 'wrong-password',
} as const;

/** Helper to make API requests */
export async function api(path: string, options: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
}

/**
 * Signs in and returns both the access token and the refresh token cookie.
 * Use when tests need to sign out in afterAll.
 */
export async function signin(user = TEST_USER): Promise<{ accessToken: string; cookie: string }> {
  const res = await api('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const json = await res.json();
  const setCookie = res.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0] ?? '';
  return { accessToken: json.data.accessToken, cookie };
}

/**
 * Signs out by clearing the refresh token session.
 */
export async function signout(cookie: string) {
  await api('/auth/signout', {
    method: 'POST',
    headers: { Cookie: cookie },
  });
}

/** Signs in and returns an access token (no cookie tracking). */
export async function getAccessToken(user = TEST_USER) {
  const { accessToken } = await signin(user);
  return accessToken;
}

/** Returns the first workspace ID for the authenticated user. */
export async function getFirstWorkspaceId(token: string): Promise<string | null> {
  const res = await api('/workspaces', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data?.[0]?.id ?? null;
}
