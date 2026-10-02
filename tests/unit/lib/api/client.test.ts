/**
 * Purpose: Test API client functions for correct HTTP method usage,
 * request/response handling, and error interceptor behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios module
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockAxios };
});

const mockedAxios = vi.mocked(axios);

/**
 * Helper to create a fresh mock instance with interceptor capture.
 */
function createMockInstance() {
  const mock = {
    create: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  mockedAxios.create.mockReturnValue(mock as any);
  return mock;
}

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Purpose: Verify axios is configured with correct defaults on import.
   */
  it('should create axios instance with JSON content type', async () => {
    createMockInstance();
    await import('@/lib/api/client');

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: '',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  /**
   * Purpose: Verify request and response interceptors are registered.
   */
  it('should register request and response interceptors', async () => {
    const mock = createMockInstance();
    await import('@/lib/api/client');

    expect(mock.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mock.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  /**
   * Purpose: Verify the response interceptor throws with correct error shape for response errors.
   */
  it('response interceptor should throw ApiRequestError for response errors', async () => {
    const mock = createMockInstance();
    await import('@/lib/api/client');

    const errorHandler = mock.interceptors.response.use.mock.calls[0][1];

    const axiosError = {
      response: {
        data: {
          message: 'Validation failed',
          error: {
            details: {
              fields: [
                { field: 'email', message: 'Already taken' },
              ],
            },
          },
        },
        status: 422,
      },
    };

    try {
      errorHandler(axiosError);
      expect.fail('Should have thrown');
    } catch (e: any) {
      // Use name check instead of instanceof to avoid cross-module class identity issues
      expect(e.name).toBe('ApiRequestError');
      expect(e.message).toBe('Validation failed');
      expect(e.fields).toEqual([
        { field: 'email', message: 'Already taken', code: undefined },
      ]);
    }
  });

  /**
   * Purpose: Verify the response interceptor falls back to status code message when no message.
   */
  it('response interceptor should fall back to status code message when no message', async () => {
    const mock = createMockInstance();
    await import('@/lib/api/client');

    const errorHandler = mock.interceptors.response.use.mock.calls[0][1];

    const axiosError = {
      response: {
        data: {},
        status: 404,
      },
    };

    try {
      errorHandler(axiosError);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ApiRequestError');
      expect(e.message).toBe('Error 404');
      expect(e.fields).toEqual([]);
    }
  });

  /**
   * Purpose: Verify the response interceptor handles network errors (no response).
   */
  it('response interceptor should handle network errors', async () => {
    const mock = createMockInstance();
    await import('@/lib/api/client');

    const errorHandler = mock.interceptors.response.use.mock.calls[0][1];

    const axiosError = {
      message: 'Network Error',
    };

    try {
      errorHandler(axiosError);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ApiRequestError');
      expect(e.message).toBe('Network Error');
      expect(e.fields).toEqual([]);
    }
  });

  /**
   * Purpose: Verify the response interceptor uses generic fallback when error has no message.
   */
  it('response interceptor should use fallback when error has no message', async () => {
    const mock = createMockInstance();
    await import('@/lib/api/client');

    const errorHandler = mock.interceptors.response.use.mock.calls[0][1];

    const axiosError = {};

    try {
      errorHandler(axiosError);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ApiRequestError');
      expect(e.message).toBe('Network error');
    }
  });

  /**
   * Purpose: Verify the response interceptor builds "Please fix the highlighted fields" when fields exist but no message.
   */
  it('response interceptor should use highlighted fields fallback when fields present but no message', async () => {
    const mock = createMockInstance();
    await import('@/lib/api/client');

    const errorHandler = mock.interceptors.response.use.mock.calls[0][1];

    const axiosError = {
      response: {
        data: {
          error: {
            details: {
              fields: [{ field: 'name', message: 'Required' }],
            },
          },
        },
        status: 422,
      },
    };

    try {
      errorHandler(axiosError);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ApiRequestError');
      expect(e.message).toBe('Please fix the highlighted fields.');
      expect(e.fields).toEqual([
        { field: 'name', message: 'Required', code: undefined },
      ]);
    }
  });
});
