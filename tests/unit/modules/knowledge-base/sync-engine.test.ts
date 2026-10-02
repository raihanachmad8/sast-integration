/**
 * Unit tests for knowledge sync providers.
 *
 * Purpose: Verify external feed adapters fetch the intended catalog sources and do not
 * silently cap synchronized knowledge data to one small page.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CweSyncProvider, NvdSyncProvider } from '@/server/modules/knowledge-base/sync-engine';

const originalFetch = global.fetch;

function cve(id: string) {
  return {
    cve: {
      id,
      descriptions: [{ lang: 'en', value: `${id} description` }],
      metrics: {
        cvssMetricV31: [{ cvssData: { baseSeverity: 'HIGH' } }],
      },
      weaknesses: [{ description: [{ value: 'CWE-79' }] }],
    },
  };
}

describe('knowledge sync providers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should request the official CWE catalog archive instead of the fallback-only API path', async () => {
    /**
     * Purpose: Prevent CWE sync from always falling back to the small built-in sample set.
     */
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    global.fetch = fetchMock;

    await new CweSyncProvider().fetchEntries();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cwe.mitre.org/data/xml/cwec_latest.xml.zip',
      expect.any(Object),
    );
  });

  it('should fetch every NVD page until totalResults is reached', async () => {
    /**
     * Purpose: Ensure NVD sync is not capped to the first 100 results when the feed has
     * additional pages in the configured lookback window.
     */
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalResults: 3,
          resultsPerPage: 2,
          vulnerabilities: [cve('CVE-2026-0001'), cve('CVE-2026-0002')],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalResults: 3,
          resultsPerPage: 2,
          vulnerabilities: [cve('CVE-2026-0003')],
        }),
      });
    global.fetch = fetchMock;

    const entries = await new NvdSyncProvider().fetchEntries();

    expect(entries.map((entry) => entry.externalId)).toEqual([
      'CVE-2026-0001',
      'CVE-2026-0002',
      'CVE-2026-0003',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('startIndex=2');
  });
});
