/** Base URL for E2E tests */
export const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000';
export const API_URL = `${BASE_URL}/api/v1`;

/** Test user fixtures */
export const TEST_USER = {
  email: 'admin@sast.local',
  password: 'ChangeMe123!',
  name: 'Admin',
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
