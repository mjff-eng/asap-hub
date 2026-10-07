import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

import { TestApiProvider } from '../../api/ApiProvider';
import { ApiError } from '../../api/client';
import type { Api } from '../../api/client';
import { AuthContext, AuthState } from '../../auth/AuthProvider';
import { authenticatedState } from '../../test-utils';
import useEditLease from '../useEditLease';

// jsdom exposes pre-bound timer globals that jest's fake timers cannot patch,
// so the heartbeat is injected short and driven on the real clock instead
const HEARTBEAT_MS = 150;

const afterHeartbeats = async (count = 1) => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, HEARTBEAT_MS * count + HEARTBEAT_MS / 2);
    });
  });
};

const renderLease = (
  api: Partial<Api>,
  { enabled = true, id = 'video-1', auth = authenticatedState } = {},
) => {
  // unmount always releases, so the harness stubs the release calls unless the
  // test supplies its own spy
  const fullApi = {
    releaseLease: jest.fn().mockResolvedValue(undefined),
    releaseLeaseOnUnload: jest.fn(),
    ...api,
  } as Partial<Api>;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={auth as AuthState}>
      <TestApiProvider api={fullApi}>{children}</TestApiProvider>
    </AuthContext.Provider>
  );
  return renderHook(
    ({ videoId, on }: { videoId: string; on: boolean }) =>
      useEditLease(videoId, on, HEARTBEAT_MS),
    { wrapper, initialProps: { videoId: id, on: enabled } },
  );
};

describe('acquiring the lease', () => {
  it('reports held once the api grants the lease', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    expect(result.current.lease.status).toBe('pending');

    await waitFor(() => expect(result.current.lease.status).toBe('held'));
    expect(acquireLease).toHaveBeenCalledWith('video-1');
  });

  it('reports denied with the holder name when the api refuses', async () => {
    const acquireLease = jest
      .fn()
      .mockRejectedValue(new ApiError(409, 'locked', 'locked', 'Sam Creator'));
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('denied'));
    expect(result.current.lease).toEqual({
      status: 'denied',
      holderName: 'Sam Creator',
    });
  });

  it('reports denied without a holder name for a non-api failure', async () => {
    const acquireLease = jest.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('denied'));
    expect(result.current.lease).toEqual({
      status: 'denied',
      holderName: undefined,
    });
  });

  it('does not ask for a lease while disabled', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const { result } = renderLease({ acquireLease } as Partial<Api>, {
      enabled: false,
    });

    await afterHeartbeats(2);
    expect(acquireLease).not.toHaveBeenCalled();
    expect(result.current.lease.status).toBe('pending');
  });

  it('does not ask for a lease without an id', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    renderLease({ acquireLease } as Partial<Api>, { id: '' });

    await afterHeartbeats(2);
    expect(acquireLease).not.toHaveBeenCalled();
  });
});

describe('retry', () => {
  it('re-acquires after a denial and can succeed the second time', async () => {
    const acquireLease = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(409, 'locked', 'locked', 'Sam'))
      .mockResolvedValue(undefined);
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('denied'));

    const callsBeforeRetry = acquireLease.mock.calls.length;
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.lease.status).toBe('held'));
    expect(acquireLease.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });
});

describe('heartbeat renewal', () => {
  it('renews the lease on the heartbeat while held', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));
    const afterAcquire = acquireLease.mock.calls.length;

    await afterHeartbeats();

    expect(acquireLease.mock.calls.length).toBeGreaterThan(afterAcquire);
    expect(result.current.lease.status).toBe('held');
  });

  it('marks the lease lost when a renewal is refused with 409', async () => {
    const acquireLease = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new ApiError(409, 'locked', 'locked', 'Dana Admin'));
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    await waitFor(() => expect(result.current.lease.status).toBe('lost'));

    expect(result.current.lease).toEqual({
      status: 'lost',
      holderName: 'Dana Admin',
    });
  });

  it('keeps the lease held when a renewal fails transiently', async () => {
    const acquireLease = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new ApiError(500, 'server error'));
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    await afterHeartbeats();

    // a 500 is not a takeover, so the editor must not be kicked out
    expect(result.current.lease.status).toBe('held');
  });

  it('keeps the lease held when a renewal rejects with a plain error', async () => {
    const acquireLease = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error('network'));
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    await afterHeartbeats();

    expect(result.current.lease.status).toBe('held');
  });

  it('stops renewing once the lease is lost', async () => {
    const acquireLease = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new ApiError(409, 'locked', 'locked', 'Dana'));
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));
    await waitFor(() => expect(result.current.lease.status).toBe('lost'));

    const callsAtLoss = acquireLease.mock.calls.length;
    await afterHeartbeats(3);

    // no further renewals once the lease is gone
    expect(acquireLease).toHaveBeenCalledTimes(callsAtLoss);
  });

  it('does not renew while merely denied', async () => {
    const acquireLease = jest
      .fn()
      .mockRejectedValue(new ApiError(409, 'locked'));
    const { result } = renderLease({ acquireLease } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('denied'));

    await afterHeartbeats(2);

    expect(acquireLease).toHaveBeenCalledTimes(1);
  });
});

describe('markLost', () => {
  it('moves a held lease to lost with the given holder', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const releaseLease = jest.fn().mockResolvedValue(undefined);
    const { result } = renderLease({
      acquireLease,
      releaseLease,
    } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    act(() => result.current.markLost('Dana'));

    expect(result.current.lease).toEqual({
      status: 'lost',
      holderName: 'Dana',
    });
    // the lease is already gone, so it must not be released back to the server
    expect(releaseLease).not.toHaveBeenCalled();
  });
});

describe('releasing the lease', () => {
  it('releases the lease when the hook unmounts while held', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const releaseLease = jest.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderLease({
      acquireLease,
      releaseLease,
    } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    unmount();

    expect(releaseLease).toHaveBeenCalledWith('video-1');
  });

  it('does not release when the lease was never held', async () => {
    const acquireLease = jest
      .fn()
      .mockRejectedValue(new ApiError(409, 'locked'));
    const releaseLease = jest.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderLease({
      acquireLease,
      releaseLease,
    } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('denied'));

    unmount();

    expect(releaseLease).not.toHaveBeenCalled();
  });

  it('swallows a failure to release on unmount', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const releaseLease = jest.fn().mockRejectedValue(new Error('offline'));
    const { result, unmount } = renderLease({
      acquireLease,
      releaseLease,
    } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    const unhandled = jest.fn();
    window.addEventListener('unhandledrejection', unhandled);

    unmount();
    await afterHeartbeats();

    window.removeEventListener('unhandledrejection', unhandled);
    expect(releaseLease).toHaveBeenCalledWith('video-1');
    // the release failure must be caught inside the hook
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('releases on beforeunload using the cached token', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const releaseLeaseOnUnload = jest.fn();
    const { result } = renderLease({
      acquireLease,
      releaseLeaseOnUnload,
    } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(releaseLeaseOnUnload).toHaveBeenCalledWith('video-1', 'token');
  });

  it('only releases once on repeated beforeunload events', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const releaseLeaseOnUnload = jest.fn();
    const { result } = renderLease({
      acquireLease,
      releaseLeaseOnUnload,
    } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(releaseLeaseOnUnload).toHaveBeenCalledTimes(1);
  });

  it('does not release on beforeunload when no token was cached', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const releaseLeaseOnUnload = jest.fn();
    const { result } = renderLease(
      { acquireLease, releaseLeaseOnUnload } as Partial<Api>,
      {
        auth: {
          ...authenticatedState,
          getToken: () => Promise.reject(new Error('no session')),
        } as AuthState,
      },
    );

    await waitFor(() => expect(result.current.lease.status).toBe('held'));

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(releaseLeaseOnUnload).not.toHaveBeenCalled();
  });

  it('stops listening for beforeunload after unmount', async () => {
    const acquireLease = jest.fn().mockResolvedValue(undefined);
    const releaseLeaseOnUnload = jest.fn();
    const releaseLease = jest.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderLease({
      acquireLease,
      releaseLease,
      releaseLeaseOnUnload,
    } as Partial<Api>);

    await waitFor(() => expect(result.current.lease.status).toBe('held'));
    unmount();

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(releaseLeaseOnUnload).not.toHaveBeenCalled();
  });
});
