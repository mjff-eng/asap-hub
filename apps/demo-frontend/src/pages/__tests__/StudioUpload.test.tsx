import { createEmptyTimeline } from '@asap-hub/demo-timeline';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Me, Video } from '../../api/types';
import { renderApp } from '../../test-utils';
import StudioUpload from '../StudioUpload';

const uploadedVideo: Video = {
  id: 'video-1',
  title: 'Sprint 42 demo',
  status: 'draft',
  folderId: 'ROOT',
  recordedAt: '2026-08-18T00:00:00.000Z',
  durationMs: 0,
  chapters: [],
  processingState: 'processing',
  createdBy: { sub: 'auth0|2', name: 'Sam Creator' },
  kind: 'upload',
  version: 1,
};

const creatorMe: Me = {
  sub: 'auth0|2',
  name: 'Sam Creator',
  email: 'sam@example.com',
  role: 'creator',
};

const partSize = 10;

const makeFile = (size: number): File => {
  const file = new File(['x'], 'Sprint 42 demo.mp4', { type: 'video/mp4' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const baseApi = {
  listFolders: () => Promise.resolve([{ id: 'folder-1', name: 'Sprints' }]),
  createUpload: jest.fn(() =>
    Promise.resolve({
      videoId: 'video-1',
      uploadId: 'upload-1',
      key: 'raw/video-1/source.mp4',
      partSize,
    }),
  ),
  createPartUrls: jest.fn(
    (videoId: string, uploadId: string, parts: number[]) =>
      Promise.resolve(
        parts.map((partNumber) => ({
          partNumber,
          url: `https://s3/${partNumber}`,
        })),
      ),
  ),
  completeUpload: jest.fn(() => Promise.resolve(uploadedVideo)),
  abortUpload: jest.fn(() => Promise.resolve()),
  createProject: jest.fn(() =>
    Promise.resolve({
      video: { ...uploadedVideo, id: 'project-9', kind: 'studio' as const },
      timeline: createEmptyTimeline(),
      timelineVersion: 1,
    }),
  ),
};

const renderUpload = (api: Partial<typeof baseApi> = {}) =>
  renderApp(<StudioUpload />, {
    api: { ...baseApi, ...api },
    me: creatorMe,
    route: '/studio/upload',
    routePath: '*',
  });

beforeEach(() => {
  jest.clearAllMocks();
  window.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => '"etag"' },
    }),
  ) as unknown as typeof fetch;
});

it('defaults the title to the filename without its extension', async () => {
  renderUpload();

  await userEvent.upload(
    screen.getByLabelText('Recording'),
    makeFile(partSize * 2),
  );

  expect(screen.getByLabelText('Title')).toHaveValue('Sprint 42 demo');
  expect(screen.getByTestId('file-summary')).toHaveTextContent(
    'Sprint 42 demo.mp4',
  );
});

it('chunks the file, uploads every part and completes the upload', async () => {
  const completeUpload = jest.fn(() => Promise.resolve(uploadedVideo));
  renderUpload({ completeUpload });

  await userEvent.upload(
    screen.getByLabelText('Recording'),
    makeFile(partSize * 3 + 4),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Start upload' }));

  await waitFor(() => expect(completeUpload).toHaveBeenCalled());

  expect(baseApi.createPartUrls).toHaveBeenCalledWith(
    'video-1',
    'upload-1',
    [1, 2, 3, 4],
  );
  expect(completeUpload).toHaveBeenCalledWith('video-1', 'upload-1', [
    { partNumber: 1, eTag: 'etag' },
    { partNumber: 2, eTag: 'etag' },
    { partNumber: 3, eTag: 'etag' },
    { partNumber: 4, eTag: 'etag' },
  ]);
});

it('offers a retry that only re-requests the parts still missing', async () => {
  let attempt = 0;
  window.fetch = jest.fn(() => {
    attempt += 1;
    // The second part fails every attempt of the first run, then succeeds.
    if (attempt >= 2 && attempt <= 4) {
      return Promise.reject(new Error('network'));
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => '"etag"' },
    });
  }) as unknown as typeof fetch;

  renderUpload();

  await userEvent.upload(
    screen.getByLabelText('Recording'),
    makeFile(partSize * 2),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Start upload' }));

  const retry = await screen.findByRole(
    'button',
    { name: 'Retry upload' },
    { timeout: 10000 },
  );
  expect(baseApi.createPartUrls).toHaveBeenCalledWith(
    'video-1',
    'upload-1',
    [1, 2],
  );

  await userEvent.click(retry);

  await waitFor(() => expect(baseApi.completeUpload).toHaveBeenCalled());
  expect(baseApi.createUpload).toHaveBeenCalledTimes(1);
  expect(baseApi.createPartUrls).toHaveBeenLastCalledWith(
    'video-1',
    'upload-1',
    [2],
  );
}, 20000);

it('aborts the multipart upload when cancelled', async () => {
  const abortUpload = jest.fn(() => Promise.resolve());
  window.fetch = jest.fn(
    () => new Promise(() => {}),
  ) as unknown as typeof fetch;
  renderUpload({ abortUpload });

  await userEvent.upload(
    screen.getByLabelText('Recording'),
    makeFile(partSize * 2),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Start upload' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

  await waitFor(() =>
    expect(abortUpload).toHaveBeenCalledWith('video-1', 'upload-1'),
  );
});

describe('starting a demo in the studio', () => {
  // the button used to post a project on the first click, so every stray one
  // left an "Untitled demo" in the library for good
  it('creates nothing until the demo has been named', async () => {
    renderUpload();

    expect(
      screen.getByRole('button', { name: 'Open the studio' }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the studio' }),
    );

    expect(baseApi.createProject).not.toHaveBeenCalled();
  });

  it('creates it under the name that was given', async () => {
    renderUpload();

    await userEvent.type(screen.getByLabelText('Name'), 'Sprint 43 demo');
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the studio' }),
    );

    await waitFor(() =>
      expect(baseApi.createProject).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Sprint 43 demo' }),
      ),
    );
  });

  it('does not take the name of the video being uploaded', async () => {
    renderUpload();

    await userEvent.upload(
      screen.getByLabelText('Recording'),
      makeFile(partSize * 2),
    );

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Open the studio' }),
    ).toBeDisabled();
  });
});

it('redirects a member away from the upload page', () => {
  renderApp(<StudioUpload />, {
    api: baseApi,
    me: { ...creatorMe, role: 'member' },
    route: '/studio/upload',
    routePath: '*',
  });

  expect(screen.queryByLabelText('Recording')).not.toBeInTheDocument();
});
