import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

import { TestApiProvider } from '../../../api/ApiProvider';
import { CaptureStreamError } from '../../../api/captureStream';
import { ApiError, createApi, type Api } from '../../../api/client';
import { API_BASE_URL } from '../../../config';
import { AuthContext, AuthState } from '../../../auth/AuthProvider';
import { authenticatedState } from '../../../test-utils';
import { useCursorCapture } from '../useCursorCapture';

const session = {
  sessionId: 'session-1',
  token: 'token-1',
  snippetUrl: 'http://localhost/capture/v1.js#project.project-1.first',
  bookmarkReady: false,
  captureUrl: 'http://localhost/capture',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

const open = { state: 'open' as const, eventCount: 42, clientCount: 1 };

const ndjson = `${JSON.stringify({
  id: 'c1',
  type: 'click',
  t: 5_000,
  x: 640,
  y: 360,
  viewportW: 1280,
  viewportH: 720,
})}\n`;

const request = {
  stoppedAtEpochMs: 10_000,
  frame: { width: 1280, height: 720 },
  targets: [{ clipId: 'clip-1', existing: [] }],
};

const apiWrapper =
  (api: Partial<Api>) =>
  ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={authenticatedState as AuthState}>
      <TestApiProvider api={api}>{children}</TestApiProvider>
    </AuthContext.Provider>
  );

const render = (api: Partial<Api>) =>
  renderHook(() => useCursorCapture('project-1'), { wrapper: apiWrapper(api) });

// every branch here is a failure the creator is being told about, and the
// client says which half gave way on its way past
let warn: jest.SpyInstance;
let logged: jest.SpyInstance;
beforeEach(() => {
  window.localStorage.clear();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  warn.mockRestore();
  logged.mockRestore();
});

const applyWith = async (captureEvents: Api['captureEvents']) => {
  const view = render({
    startCapture: jest.fn().mockResolvedValue(session),
    captureStatus: jest.fn().mockResolvedValue(open),
    finaliseCapture: jest.fn().mockResolvedValue(undefined),
    captureEvents,
  });
  await act(async () => view.result.current.start());
  await waitFor(() => expect(view.result.current.session).toBeDefined());
  const applied = await act(async () => view.result.current.apply(request));
  return { applied, view };
};

const rejectingWith = (cause: unknown) =>
  jest.fn().mockRejectedValue(cause) as unknown as Api['captureEvents'];

describe('the message each half of a failed read produces', () => {
  it('tells a creator whose capture is still merging to wait, not to retry blindly', async () => {
    const { applied, view } = await applyWith(
      rejectingWith(new ApiError(409, 'nope', 'not_finalised')),
    );

    expect(applied).toBeUndefined();
    expect(view.result.current.error).toBe(
      'That capture is still being saved. Wait a few seconds and press Add cursor effects again.',
    );
  });

  it('names the status when the api refused the read some other way', async () => {
    const { view } = await applyWith(rejectingWith(new ApiError(500, 'nope')));

    expect(view.result.current.error).toBe(
      'Could not ask for the captured events (500). Nothing is lost, try Add cursor effects again.',
    );
  });

  // the take is on the server and no press of this button will ever reach it,
  // so the one thing the message must not do is send the creator back to it
  it('says a capture too large to download is too large, and not to try again', async () => {
    const { view } = await applyWith(
      rejectingWith(
        new CaptureStreamError('too_large', 'too big', {
          cdnStatus: 403,
          inlineStatus: 413,
          bytes: 9_437_184,
        }),
      ),
    );

    expect(view.result.current.error).toBe(
      'That capture is 9.0MB of events, more than the studio can download here. It is safe on the server, but pressing again will not reach it: ask an engineer for the stream.',
    );
    expect(view.result.current.error).not.toMatch(/try Add cursor effects/);
  });

  it('names both statuses when neither half would give the stream up', async () => {
    const { view } = await applyWith(
      rejectingWith(
        new CaptureStreamError('unreachable', 'no', {
          cdnStatus: 403,
          inlineStatus: 500,
        }),
      ),
    );

    expect(view.result.current.error).toBe(
      'Could not download the captured events (storage 403, api 500). Nothing is lost, try Add cursor effects again.',
    );
  });

  it('says so plainly when neither half answered at all', async () => {
    const { view } = await applyWith(
      rejectingWith(new CaptureStreamError('unreachable', 'no')),
    );

    expect(view.result.current.error).toBe(
      'Could not download the captured events (storage unreachable, api unreachable). Nothing is lost, try Add cursor effects again.',
    );
  });

  // the guard that holds an unread session back rests on the take being safe on
  // the server, and this is the one case where the server says it is not
  it('lets the studio move on from a session that wrote no stream', async () => {
    const { view } = await applyWith(
      rejectingWith(new ApiError(404, 'nope', 'stream_missing')),
    );

    expect(view.result.current.error).toBe(
      'That capture closed without writing its events, so there is nothing to add. Record the take again.',
    );
    // the marker is what lets the next recording replace the session; without
    // it the studio refuses every take from here on
    expect(window.localStorage.getItem('demo-hub.capture.project-1.read')).toBe(
      'session-1',
    );
  });

  it('keeps a session whose stream is only unreachable, which is not the same thing', async () => {
    await applyWith(rejectingWith(new CaptureStreamError('unreachable', 'no')));

    expect(
      window.localStorage.getItem('demo-hub.capture.project-1.read'),
    ).toBeNull();
  });
});

// The api half and the download half used to end in one message, and the
// download had no second chance at all: a CDN property no test here can prove
// stood between the creator and every take they had recorded.
describe('the read that falls back to the api', () => {
  const fetchMock = jest.fn();
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const { captureEvents } = createApi(() => Promise.resolve('a-token'));

  it('lands the effects when storage refuses but the api carries the bytes', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          url: '/projects/project-1/capture/session-1/events.ndjson',
          bytes: ndjson.length,
        }),
    });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(ndjson),
    });

    const { applied, view } = await applyWith(captureEvents);

    expect(view.result.current.error).toBeUndefined();
    expect(applied?.map(({ clipId }) => clipId)).toEqual(['clip-1']);
    expect(applied?.[0]?.effects).toHaveLength(1);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `${API_BASE_URL}/api/projects/project-1/recordings/session-1/events?inline=1`,
    );
  });

  it('refuses the fallback for size and says so, without offering a retry', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          url: '/projects/project-1/capture/session-1/events.ndjson',
          bytes: 9_437_184,
        }),
    });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: () => Promise.resolve({ error: 'too_large', bytes: 9_437_184 }),
    });

    const { applied, view } = await applyWith(captureEvents);

    expect(applied).toBeUndefined();
    expect(view.result.current.error).toMatch(/9\.0MB of events/);
    expect(view.result.current.error).not.toMatch(/try Add cursor effects/);
  });
});
