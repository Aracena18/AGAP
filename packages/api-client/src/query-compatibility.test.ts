import { describe, expect, it, vi } from 'vitest';
import { AgapClient } from './index.js';

describe('additive reporting query compatibility', () => {
  it('retains existing queue and financial-list RequestOptions calls', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) => new Response(JSON.stringify({
      items: [], nextCursor: null, ...(String(url).includes('/review-queue') ? { asOf: '2026-11-05T00:00:00Z' } : {}),
    }), { status: 200 }));
    const client = new AgapClient('/api/v1', fetcher), controller = new AbortController();
    await client.getPriorityReviewQueue({ route: 'all', limit: 20, signal: controller.signal });
    await client.getPilotMoneyApplications({ limit: 10, signal: controller.signal });
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      '/api/v1/review-queue?route=all&limit=20', '/api/v1/pilot/financial-applications?limit=10',
    ]);
  });

  it('validates required summary dates while preserving cancellation options', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      fromDate: '2026-11-01', throughDate: '2026-11-05', cutoffAt: '2026-11-05T00:00:00Z',
      scope: 'currently-assigned-submissions', state: 'unavailable', message: 'Fictional unavailable summary.',
      submissionCount: null, answers: null,
    }), { status: 200 }));
    const client = new AgapClient('/api/v1', fetcher), controller = new AbortController();
    const value = await client.getCheckInSummary({ fromDate: '2026-11-01', throughDate: '2026-11-05' }, { signal: controller.signal });
    expect(value.state).toBe('unavailable');
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/check-in-summary?fromDate=2026-11-01&throughDate=2026-11-05');
    expect(fetcher.mock.calls[0][1]?.signal).toBe(controller.signal);
    expect(() => client.getCheckInSummary({ fromDate: '2026-11-05', throughDate: '2026-11-01' })).toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
