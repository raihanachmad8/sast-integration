/**
 * Shared test utilities for scan simulation tests.
 *
 * Provides helper functions for creating test data,
 * signing tokens, and making API requests.
 */
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

/** Scanner fixture file names */
export const FIXTURE_FILES = {
  semgrep: 'semgrep-sample.json',
  gitleaks: 'gitleaks-sample.json',
  trivy: 'trivy-sample.json',
  cppcheck: 'cppcheck-sample.xml',
  flawfinder: 'flawfinder-sample.txt',
} as const;

/**
 * Load a fixture file as a Buffer.
 */
export function loadFixture(scanner: keyof typeof FIXTURE_FILES): Buffer {
  const filePath = path.join(FIXTURES_DIR, FIXTURE_FILES[scanner]);
  return fs.readFileSync(filePath);
}

/**
 * Load a fixture file as a string.
 */
export function loadFixtureAsString(scanner: keyof typeof FIXTURE_FILES): string {
  const filePath = path.join(FIXTURES_DIR, FIXTURE_FILES[scanner]);
  return fs.readFileSync(filePath, 'utf-8');
}

/** Base URL for API requests */
export const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000';
export const API_URL = `${BASE_URL}/api/v1`;

/**
 * Make an authenticated API request.
 */
export async function api(path: string, options: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
}
