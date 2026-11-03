import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { StaffProvider, useStaff } from './StaffContext';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function SessionState() {
  const { loading, error, retrySession } = useStaff();
  return <><p role="status">{loading ? 'Checking' : error || 'Signed out'}</p><button onClick={retrySession}>Retry</button></>;
}

test('a stalled session check times out, and an explicit retry can recover to signed out', async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const fetcher = vi.fn<typeof fetch>().mockImplementationOnce((_input, init) => new Promise((_resolve, reject) => {
    signal = init?.signal ?? undefined;
    signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  })).mockResolvedValueOnce(new Response('{}', { status: 401 }));
  vi.stubGlobal('fetch', fetcher);
  render(<StaffProvider><SessionState/></StaffProvider>);
  await act(() => vi.advanceTimersByTimeAsync(10_000));
  expect(signal?.aborted).toBe(true);
  expect(screen.getByRole('status')).toHaveTextContent('Check your connection');
  await act(async () => screen.getByRole('button', { name: 'Retry' }).click());
  expect(screen.getByRole('status')).toHaveTextContent('Signed out');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('leaving the workspace cancels its session request and timeout', () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((_input, init) => {
    signal = init?.signal ?? undefined;
    return new Promise(() => {});
  }));
  const view = render(<StaffProvider><SessionState/></StaffProvider>);
  view.unmount();
  expect(signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
