import { API_BASE_URL } from '../../config';
import { CaptureStreamError } from '../captureStream';
import {
  ApiError,
  createApi,
  isLockedOut,
  isNotInvited,
  isRevoked,
  uploadPart,
} from '../client';
import { topLevelParentId } from '../types';

const fetchMock = jest.fn();
beforeAll(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
beforeEach(() => {
  fetchMock.mockReset();
});

const respond = (payload: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      payload === undefined
        ? Promise.reject(new Error('not json'))
        : Promise.resolve(payload),
  });

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: url as string, init: init as RequestInit };
};

const getToken = jest.fn(() => Promise.resolve('a-token'));
const api = createApi(getToken);

const captureApiError = (promise: Promise<unknown>): Promise<ApiError> =>
  promise.then(
    () => {
      throw new Error('expected the request to reject');
    },
    (error: unknown) => error as ApiError,
  );

describe('ApiError guards', () => {
  it('recognises a not_invited error', () => {
    expect(isNotInvited(new ApiError(403, 'nope', 'not_invited'))).toBe(true);
    expect(isNotInvited(new ApiError(403, 'nope', 'revoked'))).toBe(false);
    expect(isNotInvited(new Error('nope'))).toBe(false);
  });

  it('recognises a revoked error', () => {
    expect(isRevoked(new ApiError(403, 'nope', 'revoked'))).toBe(true);
    expect(isRevoked(new ApiError(401, 'nope', 'revoked'))).toBe(false);
  });

  it('recognises a locked error', () => {
    expect(isLockedOut(new ApiError(409, 'nope', 'locked'))).toBe(true);
    expect(isLockedOut(new ApiError(409, 'nope', 'other'))).toBe(false);
  });
});

describe('request handling', () => {
  it('sends the bearer token and no content type without a body', async () => {
    respond({ id: 'me' });
    await api.getMe();

    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/me`);
    expect(init.method).toEqual('GET');
    expect(init.headers).toEqual({ Authorization: 'Bearer a-token' });
    expect(init.body).toBeUndefined();
  });

  it('sends a json content type and serialised body on writes', async () => {
    respond({ id: 'f1' });
    await api.createFolder('Talks');

    const { init } = lastCall();
    expect(init.headers).toEqual({
      Authorization: 'Bearer a-token',
      'Content-Type': 'application/json',
    });
    expect(init.body).toEqual(JSON.stringify({ name: 'Talks' }));
  });

  it('resolves undefined for a 204', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    });
    await expect(api.deleteFolder('f1')).resolves.toBeUndefined();
  });

  it('throws when a 200 has an unparseable body', async () => {
    respond(undefined, 200);
    await expect(api.getMe()).rejects.toThrow(
      'Request to /me returned no JSON',
    );
  });

  it('extracts the error code and holder name from an error envelope', async () => {
    respond({ error: 'locked', holderName: 'Jane Doe' }, 409);
    const failure = await captureApiError(api.getVideo('v1'));

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.status).toEqual(409);
    expect(failure.code).toEqual('locked');
    expect(failure.holderName).toEqual('Jane Doe');
    expect(failure.message).toEqual(
      'Request to /videos/v1 failed with status 409',
    );
  });

  it('ignores a non-string holder name', async () => {
    respond({ error: 'locked', holderName: 42 }, 409);
    const failure = await captureApiError(api.getVideo('v1'));
    expect(failure.code).toEqual('locked');
    expect(failure.holderName).toBeUndefined();
  });

  it('throws a plain ApiError when the error body is not json', async () => {
    respond(undefined, 500);
    const failure = await captureApiError(api.getMe());

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.status).toEqual(500);
    expect(failure.code).toBeUndefined();
    expect(failure.holderName).toBeUndefined();
  });

  it('throws a plain ApiError when the error body is not an object', async () => {
    respond('oops', 500);
    const failure = await captureApiError(api.getMe());
    expect(failure.code).toBeUndefined();
  });
});

describe('uploadPart', () => {
  const blob = new Blob(['bytes']);

  it('puts the blob and returns the unquoted etag', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => '"etag-1"' },
    });
    const controller = new AbortController();

    await expect(
      uploadPart('https://s3/part-1', blob, controller.signal),
    ).resolves.toEqual('etag-1');
    expect(fetchMock).toHaveBeenCalledWith('https://s3/part-1', {
      method: 'PUT',
      body: blob,
      signal: controller.signal,
    });
  });

  it('throws on a failed upload', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(uploadPart('https://s3/part-1', blob)).rejects.toThrow(
      'Part upload failed with status 500',
    );
  });

  it('throws when the response has no etag', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
    });
    await expect(uploadPart('https://s3/part-1', blob)).rejects.toThrow(
      'Part upload returned no ETag',
    );
  });
});

describe('createApi endpoints', () => {
  it('lists folders', async () => {
    respond({ items: [{ id: 'f1' }] });
    await expect(api.listFolders()).resolves.toEqual([{ id: 'f1' }]);
    expect(lastCall().url).toEqual(`${API_BASE_URL}/api/folders`);
  });

  it('fetches folder counts', async () => {
    respond({ counts: { f1: 3 } });
    await expect(api.folderCounts()).resolves.toEqual({ f1: 3 });
    expect(lastCall().url).toEqual(`${API_BASE_URL}/api/folders/counts`);
  });

  it('creates a nested folder', async () => {
    respond({ id: 'f2' });
    await api.createFolder('Nested', 'f1');
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/folders`);
    expect(init.method).toEqual('POST');
    expect(init.body).toEqual(
      JSON.stringify({ name: 'Nested', parentId: 'f1' }),
    );
  });

  it('renames a folder', async () => {
    respond({ id: 'f 1' });
    await api.renameFolder('f 1', 'Renamed');
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/folders/f%201`);
    expect(init.method).toEqual('PATCH');
    expect(init.body).toEqual(JSON.stringify({ name: 'Renamed' }));
  });

  it('moves a folder to the top level by default', async () => {
    respond({ id: 'f1' });
    await api.moveFolder('f1');
    const { init } = lastCall();
    expect(init.method).toEqual('PATCH');
    expect(init.body).toEqual(JSON.stringify({ parentId: topLevelParentId }));
  });

  it('moves a folder into another folder', async () => {
    respond({ id: 'f1' });
    await api.moveFolder('f1', 'f2');
    expect(lastCall().init.body).toEqual(JSON.stringify({ parentId: 'f2' }));
  });

  it('deletes a folder', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    await api.deleteFolder('f1');
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/folders/f1`);
    expect(init.method).toEqual('DELETE');
  });

  it('bulk moves videos', async () => {
    respond({ moved: 2 });
    await expect(api.bulkMoveVideos(['v1', 'v2'], 'f1')).resolves.toEqual({
      moved: 2,
    });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/bulk-move`);
    expect(init.body).toEqual(
      JSON.stringify({ ids: ['v1', 'v2'], folderId: 'f1' }),
    );
  });

  it('bulk deletes videos', async () => {
    respond({ deleted: 1 });
    await expect(api.bulkDeleteVideos(['v1'])).resolves.toEqual({
      deleted: 1,
    });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/bulk-delete`);
    expect(init.body).toEqual(JSON.stringify({ ids: ['v1'] }));
  });

  it('lists videos in a folder', async () => {
    respond({ items: [{ id: 'v1' }] });
    await expect(api.listVideos('f 1')).resolves.toEqual([{ id: 'v1' }]);
    expect(lastCall().url).toEqual(`${API_BASE_URL}/api/videos?folderId=f%201`);
  });

  it('lists videos without a folder filter', async () => {
    respond({ items: [] });
    await api.listVideos();
    expect(lastCall().url).toEqual(`${API_BASE_URL}/api/videos`);
  });

  it('lists all videos', async () => {
    respond({ items: [{ id: 'v1' }] });
    await expect(api.listAllVideos()).resolves.toEqual([{ id: 'v1' }]);
    expect(lastCall().url).toEqual(`${API_BASE_URL}/api/videos/all`);
  });

  it('gets a video', async () => {
    respond({ id: 'v1' });
    await expect(api.getVideo('v1')).resolves.toEqual({ id: 'v1' });
    expect(lastCall().url).toEqual(`${API_BASE_URL}/api/videos/v1`);
  });

  it('requests playback access with credentials', async () => {
    respond({ url: 'https://cdn/v1' });
    await api.requestAccess('v1');
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/v1/access`);
    expect(init.method).toEqual('POST');
    expect(init.credentials).toEqual('include');
  });

  it('creates an upload', async () => {
    respond({ videoId: 'v1', uploadId: 'u1' });
    const input = { title: 'Demo', folderId: 'f1', recordedAt: '2026-01-01' };
    await expect(api.createUpload(input)).resolves.toEqual({
      videoId: 'v1',
      uploadId: 'u1',
    });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/uploads`);
    expect(init.body).toEqual(JSON.stringify(input));
  });

  it('creates part urls', async () => {
    respond({ urls: [{ partNumber: 1, url: 'https://s3/1' }] });
    await expect(api.createPartUrls('v1', 'u1', [1])).resolves.toEqual([
      { partNumber: 1, url: 'https://s3/1' },
    ]);
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/uploads/v1/parts`);
    expect(init.body).toEqual(
      JSON.stringify({ uploadId: 'u1', partNumbers: [1] }),
    );
  });

  it('completes an upload', async () => {
    respond({ video: { id: 'v1' } });
    const parts = [{ partNumber: 1, eTag: 'etag-1' }];
    await expect(api.completeUpload('v1', 'u1', parts)).resolves.toEqual({
      id: 'v1',
    });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/uploads/v1/complete`);
    expect(init.body).toEqual(JSON.stringify({ uploadId: 'u1', parts }));
  });

  it('aborts an upload', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    await api.abortUpload('v1', 'u 1');
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/uploads/v1?uploadId=u%201`);
    expect(init.method).toEqual('DELETE');
  });

  it('updates a video', async () => {
    respond({ video: { id: 'v1', title: 'New' } });
    await expect(
      api.updateVideo('v1', { title: 'New', version: 3 }),
    ).resolves.toEqual({
      id: 'v1',
      title: 'New',
    });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/v1`);
    expect(init.method).toEqual('PATCH');
    expect(init.body).toEqual(JSON.stringify({ title: 'New', version: 3 }));
  });

  it('publishes a video', async () => {
    respond({ video: { id: 'v1' } });
    await expect(api.publishVideo('v1', 3)).resolves.toEqual({ id: 'v1' });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/v1/publish`);
    expect(init.body).toEqual(JSON.stringify({ version: 3 }));
  });

  it('unpublishes a video', async () => {
    respond({ video: { id: 'v1' } });
    await expect(api.unpublishVideo('v1', 4)).resolves.toEqual({ id: 'v1' });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/v1/unpublish`);
    expect(init.body).toEqual(JSON.stringify({ version: 4 }));
  });

  it('acquires a lease', async () => {
    respond({ expiresAt: 'soon' });
    await expect(api.acquireLease('v1')).resolves.toEqual({
      expiresAt: 'soon',
    });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/v1/lease`);
    expect(init.method).toEqual('POST');
  });

  it('releases a lease', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    await api.releaseLease('v1');
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/v1/lease`);
    expect(init.method).toEqual('DELETE');
  });

  it('releases a lease on unload with keepalive', () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    api.releaseLeaseOnUnload('v1', 'unload-token');
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/videos/v1/lease`,
      {
        method: 'DELETE',
        keepalive: true,
        headers: { Authorization: 'Bearer unload-token' },
      },
    );
  });

  it('saves a timeline on unload with keepalive and no token await', () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    getToken.mockClear();
    const input = {
      timeline: { clips: [] } as never,
      timelineVersion: 4,
      version: 3,
    };
    api.saveTimelineOnUnload('v1', 'unload-token', input);

    // awaiting the token is an async boundary the unloading page never reaches
    expect(getToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/projects/v1/timeline`,
      {
        method: 'PUT',
        keepalive: true,
        headers: {
          Authorization: 'Bearer unload-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      },
    );
  });

  it('swallows failures when saving a timeline on unload', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    api.saveTimelineOnUnload('v1', 'unload-token', {
      timeline: { clips: [] } as never,
      timelineVersion: 4,
      version: 3,
    });
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('swallows failures when releasing a lease on unload', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    api.releaseLeaseOnUnload('v1', 'unload-token');
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deletes a video', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    await api.deleteVideo('v1');
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/videos/v1`);
    expect(init.method).toEqual('DELETE');
  });

  it('lists invites', async () => {
    respond({ items: [{ email: 'jane@example.com' }] });
    await expect(api.listInvites()).resolves.toEqual([
      { email: 'jane@example.com' },
    ]);
    expect(lastCall().url).toEqual(`${API_BASE_URL}/api/invites`);
  });

  it('creates an invite', async () => {
    respond({ ok: true });
    await api.createInvite('jane@example.com', 'viewer' as never);
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/invites`);
    expect(init.body).toEqual(
      JSON.stringify({ email: 'jane@example.com', role: 'viewer' }),
    );
  });

  it('cancels an invite', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    await api.cancelInvite('jane+demo@example.com');
    const { url, init } = lastCall();
    expect(url).toEqual(
      `${API_BASE_URL}/api/invites/jane%2Bdemo%40example.com`,
    );
    expect(init.method).toEqual('DELETE');
  });

  it('lists users', async () => {
    respond({ items: [{ sub: 'auth0|1' }] });
    await expect(api.listUsers()).resolves.toEqual([{ sub: 'auth0|1' }]);
    expect(lastCall().url).toEqual(`${API_BASE_URL}/api/users`);
  });

  it('updates a user', async () => {
    respond({ sub: 'auth0|1' });
    await api.updateUser('auth0|1', { status: 'revoked' as never });
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/users/auth0%7C1`);
    expect(init.method).toEqual('PATCH');
    expect(init.body).toEqual(JSON.stringify({ status: 'revoked' }));
  });

  it('deletes a user', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    await api.deleteUser('auth0|1');
    const { url, init } = lastCall();
    expect(url).toEqual(`${API_BASE_URL}/api/users/auth0%7C1`);
    expect(init.method).toEqual('DELETE');
  });
});

describe('the captured event stream', () => {
  const ndjson =
    '{"id":"e1","type":"click","t":1}\n{"id":"e2","type":"move","t":2}\n';

  // the client says which half failed on its way out, which is the only place a
  // developer can see the status at all
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
  });

  const respondWithStream = (url = '/projects/p1/capture/s1/events.ndjson') => {
    respond({ url, bytes: 64 });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(ndjson),
    });
  };

  const refuseStream = (status = 403) => {
    respond({ url: '/projects/p1/capture/s1/events.ndjson', bytes: 64 });
    fetchMock.mockResolvedValueOnce({ ok: false, status });
  };

  const captureStreamError = (
    promise: Promise<unknown>,
  ): Promise<CaptureStreamError> =>
    promise.then(
      () => {
        throw new Error('expected the read to reject');
      },
      (cause: unknown) => cause as CaptureStreamError,
    );

  // a long take merges to more than a lambda response may carry, so the api
  // names the object and the stream itself is read straight from storage
  it('reads the stream from the path the api names', async () => {
    respondWithStream();

    await expect(api.captureEvents('p1', 's1')).resolves.toBe(ndjson);

    const [minted, streamed] = fetchMock.mock.calls;
    expect(minted[0]).toBe(
      `${API_BASE_URL}/api/projects/p1/recordings/s1/events`,
    );
    expect((minted[1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer a-token',
    });
    expect(streamed[0]).toBe('/projects/p1/capture/s1/events.ndjson');
  });

  // storage authorises the read with the cookie the minting call set, and a
  // bearer header alongside it is what a signed request refuses
  it('sends no bearer token to storage, only the cookie', async () => {
    respondWithStream();

    await api.captureEvents('p1', 's1');

    const [, init] = fetchMock.mock.calls[1];
    expect((init as RequestInit).headers).toBeUndefined();
    expect((init as RequestInit).credentials).toBe('same-origin');
  });

  // storage answering 403 is not the end of the road: the whole feature may not
  // rest on a CDN property no test here can prove
  it('asks the api for the bytes when storage will not serve them', async () => {
    refuseStream();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(ndjson),
    });

    await expect(api.captureEvents('p1', 's1')).resolves.toBe(ndjson);

    const [, , inline] = fetchMock.mock.calls;
    expect(inline![0]).toBe(
      `${API_BASE_URL}/api/projects/p1/recordings/s1/events?inline=1`,
    );
    expect((inline![1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer a-token',
    });
  });

  it('says a stream too large for the api is too large, not to try again', async () => {
    refuseStream();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: () => Promise.resolve({ error: 'too_large', bytes: 9_000_000 }),
    });

    const failure = await captureStreamError(api.captureEvents('p1', 's1'));

    expect(failure).toBeInstanceOf(CaptureStreamError);
    expect(failure.reason).toBe('too_large');
    expect(failure.bytes).toBe(9_000_000);
  });

  it('names both statuses when neither half would give the stream up', async () => {
    refuseStream(403);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'internal' }),
    });

    const failure = await captureStreamError(api.captureEvents('p1', 's1'));

    expect(failure.reason).toBe('unreachable');
    expect(failure.cdnStatus).toBe(403);
    expect(failure.inlineStatus).toBe(500);
  });

  it('survives a fetch that never returns a response at all', async () => {
    respond({ url: '/projects/p1/capture/s1/events.ndjson', bytes: 64 });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const failure = await captureStreamError(api.captureEvents('p1', 's1'));

    expect(failure.reason).toBe('unreachable');
    expect(failure.cdnStatus).toBeUndefined();
    expect(failure.inlineStatus).toBeUndefined();
  });

  it('logs the status the api refused the read with', async () => {
    respond({ error: 'not_finalised' }, 409);

    const failure = await captureApiError(api.captureEvents('p1', 's1'));

    expect(failure.status).toBe(409);
    expect(failure.code).toBe('not_finalised');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('409'));
  });

  it('logs the status storage refused the stream with', async () => {
    refuseStream(403);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(ndjson),
    });

    await api.captureEvents('p1', 's1');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('403'));
  });
});
