import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Video, VideoAccess } from '../../api/types';
import { ApiError } from '../../api/client';
import { adminMe, creatorMe, memberMe, renderApp } from '../../test-utils';
import Watch from '../Watch';

const video: Video = {
  id: 'video-1',
  title: 'Sprint 42 demo',
  status: 'published',
  folderId: 'folder-1',
  recordedAt: '2026-08-14T09:00:00.000Z',
  durationMs: 1800000,
  chapters: [
    { startMs: 0, title: 'Intro' },
    { startMs: 561000, title: 'Event attendance' },
  ],
  processingState: 'ready',
  createdBy: { sub: 'auth0|2', name: 'Sam Creator' },
  kind: 'upload',
  version: 1,
};

const access: VideoAccess = {
  streamUrl: '/media/video-1/stream.mp4',
  spriteUrl: '/media/video-1/sprite.jpg',
  thumbnailsVttUrl: '/media/video-1/thumbnails.vtt',
};

const api = {
  getVideo: () => Promise.resolve(video),
  requestAccess: () => Promise.resolve(access),
  listFolders: () => Promise.resolve([]),
};

beforeEach(() => {
  window.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, text: () => Promise.resolve('WEBVTT\n') }),
  ) as unknown as typeof fetch;
});

it('seeks the player to the chapter start when a chapter is clicked', async () => {
  renderApp(<Watch />, {
    api,
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  const player = (await screen.findByTestId('demo-video')) as HTMLVideoElement;
  const setCurrentTime = jest.fn();
  Object.defineProperty(player, 'currentTime', {
    get: () => 0,
    set: setCurrentTime,
    configurable: true,
  });

  await userEvent.click(
    screen.getByRole('button', { name: /event attendance/i }),
  );

  expect(setCurrentTime).toHaveBeenCalledWith(561);
});

it('shows a processing state instead of the player while encoding', async () => {
  renderApp(<Watch />, {
    api: {
      ...api,
      getVideo: () =>
        Promise.resolve({ ...video, processingState: 'processing' }),
    },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  expect(
    await screen.findByText('This demo is still processing'),
  ).toBeVisible();
  expect(screen.queryByTestId('demo-video')).not.toBeInTheDocument();
});

it('offers a retry when playback access fails', async () => {
  renderApp(<Watch />, {
    api: { ...api, requestAccess: () => Promise.reject(new Error('403')) },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  expect(await screen.findByText('Playback is not available')).toBeVisible();
  expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
});

describe('refreshing expired access', () => {
  const renderWithAccess = (requestAccess: () => Promise<VideoAccess>) => {
    renderApp(<Watch />, {
      api: { ...api, requestAccess },
      me: memberMe,
      route: '/videos/video-1',
      routePath: '/videos/:id',
    });
  };

  it('holds the reload until the refreshed grant has landed', async () => {
    let grant: () => void = () => undefined;
    const requestAccess = jest
      .fn()
      .mockResolvedValueOnce(access)
      .mockImplementationOnce(
        () =>
          new Promise<VideoAccess>((resolve) => {
            grant = () => resolve(access);
          }),
      );
    renderWithAccess(requestAccess as () => Promise<VideoAccess>);

    const player = (await screen.findByTestId(
      'demo-video',
    )) as HTMLVideoElement;
    player.load = jest.fn();

    fireEvent.error(player);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(requestAccess).toHaveBeenCalledTimes(2));
    expect(player.load).not.toHaveBeenCalled();

    grant();

    await waitFor(() => expect(player.load).toHaveBeenCalledTimes(1));
  });

  it('sends the viewer to the access panel when the refresh is refused', async () => {
    const requestAccess = jest
      .fn()
      .mockResolvedValueOnce(access)
      .mockRejectedValueOnce(new Error('403'));
    renderWithAccess(requestAccess as () => Promise<VideoAccess>);

    const player = (await screen.findByTestId(
      'demo-video',
    )) as HTMLVideoElement;
    player.load = jest.fn();

    fireEvent.error(player);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Playback is not available')).toBeVisible();
    expect(player.load).not.toHaveBeenCalled();
  });
});

it('offers a download of the stream with a safe file name', async () => {
  renderApp(<Watch />, {
    api: {
      ...api,
      getVideo: () => Promise.resolve({ ...video, title: 'Q3: a/b results' }),
    },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  const link = await screen.findByRole('link', { name: 'Download' });
  expect(link).toHaveAttribute('href', '/media/video-1/stream.mp4');
  expect(link).toHaveAttribute('download', 'Q3- a-b results.mp4');
});

it('opens the page on a single h1 naming the demo', async () => {
  renderApp(<Watch />, {
    api,
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  expect(
    await screen.findByRole('heading', { name: 'Sprint 42 demo', level: 1 }),
  ).toBeVisible();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
});

it('names the demo in an h1 even when it cannot be played', async () => {
  renderApp(<Watch />, {
    api: { ...api, getVideo: () => Promise.reject(new Error('gone')) },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  expect(
    await screen.findByRole(
      'heading',
      { name: 'We could not load this demo', level: 1 },
      { timeout: 4000 },
    ),
  ).toBeVisible();
});

// it used to be the browser's default blue underline beside a styled button
it('dresses the edit link as a button beside Download', async () => {
  renderApp(<Watch />, {
    api,
    me: creatorMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  const edit = await screen.findByRole('link', { name: 'Edit demo' });
  expect(edit).toHaveAttribute('href', '/studio/videos/video-1');
  // both actions sit in the same group, so neither is pushed off the column
  const group = edit.parentElement as HTMLElement;
  expect(within(group).getByRole('link', { name: 'Download' })).toBeVisible();
});

describe('per chapter downloads', () => {
  // the render publishes its section files under the access grant, and the row
  // carries the chapters they were cut from and how many of them landed
  const watching = (chapters: Video['chapters'], sectionCount?: number) =>
    renderApp(<Watch />, {
      api: {
        ...api,
        getVideo: () =>
          Promise.resolve({
            ...video,
            durationMs: 900000,
            chapters,
            ...(sectionCount === undefined ? {} : { sectionCount }),
          }),
        requestAccess: () =>
          Promise.resolve({
            ...access,
            sectionsBaseUrl: '/media/video-1/r1/sections',
          }),
      },
      me: memberMe,
      route: '/videos/video-1',
      routePath: '/videos/:id',
    });

  it('points every chapter at its own file', async () => {
    watching(
      [
        { startMs: 0, title: 'Intro' },
        { startMs: 300000, title: 'Middle' },
        { startMs: 600000, title: 'End' },
      ],
      3,
    );

    expect(
      await screen.findByRole('link', { name: 'Download Intro' }),
    ).toHaveAttribute('href', '/media/video-1/r1/sections/0.mp4');
    expect(
      screen.getByRole('link', { name: 'Download Middle' }),
    ).toHaveAttribute('href', '/media/video-1/r1/sections/1.mp4');
    expect(screen.getByRole('link', { name: 'Download End' })).toHaveAttribute(
      'href',
      '/media/video-1/r1/sections/2.mp4',
    );
  });

  // the render cut no file for the chapter with nothing between it and the next
  // start, so every chapter after it sits one file lower than its own position
  it('keeps the other chapters on their own files when one was never cut', async () => {
    watching(
      [
        { startMs: 0, title: 'Intro' },
        { startMs: 300000, title: 'Twin' },
        { startMs: 300000, title: 'Middle' },
        { startMs: 600000, title: 'End' },
      ],
      3,
    );

    expect(
      await screen.findByRole('link', { name: 'Download Intro' }),
    ).toHaveAttribute('href', '/media/video-1/r1/sections/0.mp4');
    expect(
      screen.getByRole('link', { name: 'Download Middle' }),
    ).toHaveAttribute('href', '/media/video-1/r1/sections/1.mp4');
    expect(screen.getByRole('link', { name: 'Download End' })).toHaveAttribute(
      'href',
      '/media/video-1/r1/sections/2.mp4',
    );
    expect(screen.queryByRole('link', { name: 'Download Twin' })).toBeNull();
  });

  it('offers no chapter download when a chapter starts past the end', async () => {
    watching(
      [
        { startMs: 0, title: 'Intro' },
        { startMs: 1200000, title: 'Beyond' },
      ],
      1,
    );

    expect(
      await screen.findByRole('link', { name: 'Download Intro' }),
    ).toHaveAttribute('href', '/media/video-1/r1/sections/0.mp4');
    expect(screen.queryByRole('link', { name: 'Download Beyond' })).toBeNull();
  });

  it('offers none at all when the render published no sections', async () => {
    watching(video.chapters);

    await screen.findByRole('link', { name: 'Download' });
    expect(screen.queryByRole('link', { name: /^Download .+/ })).toBeNull();
  });
});

it('offers no edit link to a member', async () => {
  renderApp(<Watch />, {
    api,
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  await screen.findByRole('link', { name: 'Download' });
  expect(screen.queryByRole('link', { name: 'Edit demo' })).toBeNull();
});

describe('re-encoding', () => {
  const renderWatch = (
    me = adminMe,
    overrides: Record<string, unknown> = {},
    watched: Video = video,
  ) =>
    renderApp(<Watch />, {
      api: { ...api, getVideo: () => Promise.resolve(watched), ...overrides },
      me,
      route: '/videos/video-1',
      routePath: '/videos/:id',
    });

  it.each([
    ['a member', memberMe],
    ['a creator', creatorMe],
  ])('is not offered to %s', async (_label, me) => {
    renderWatch(me);

    await screen.findByRole('link', { name: 'Download' });
    expect(screen.queryByRole('button', { name: 'Re-encode' })).toBeNull();
  });

  it('is not offered for a studio demo', async () => {
    renderWatch(adminMe, {}, { ...video, kind: 'studio' });

    await screen.findByRole('link', { name: 'Download' });
    expect(screen.queryByRole('button', { name: 'Re-encode' })).toBeNull();
  });

  it('asks an admin to confirm, then starts it', async () => {
    const reencodeVideo = jest.fn(() =>
      Promise.resolve({
        ...video,
        reencode: {
          reencodeId: 'r1',
          state: 'queued' as const,
          source: 'original' as const,
          requestedAt: '2026-10-12T15:00:00.000Z',
          requestedByName: 'Amin',
        },
      }),
    );
    renderWatch(adminMe, { reencodeVideo });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Re-encode' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Re-encode this demo' });
    expect(dialog).toHaveTextContent(
      'Anyone watching keeps the current version',
    );
    expect(reencodeVideo).not.toHaveBeenCalled();

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Re-encode' }),
    );

    expect(reencodeVideo).toHaveBeenCalledWith('video-1');
    expect(
      await screen.findByText(/Re-encoding, started by Amin/),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Re-encoding' })).toBeDisabled();
  });

  it('changes nothing when the admin cancels', async () => {
    const reencodeVideo = jest.fn();
    renderWatch(adminMe, { reencodeVideo });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Re-encode' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(reencodeVideo).not.toHaveBeenCalled();
  });

  it('says why it could not start', async () => {
    renderWatch(adminMe, {
      reencodeVideo: () =>
        Promise.reject(new ApiError(409, 'conflict', 'no_source')),
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Re-encode' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Re-encode',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is no copy of this video left to re-encode.',
    );
  });

  it('shows an admin why the last one failed', async () => {
    renderWatch(
      adminMe,
      {},
      {
        ...video,
        reencode: {
          reencodeId: 'r1',
          state: 'failed',
          source: 'stream',
          requestedAt: '2026-10-12T15:00:00.000Z',
          error: 'ffmpeg exited 1',
        },
      },
    );

    expect(
      await screen.findByText('The last re-encode failed: ffmpeg exited 1'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Re-encode' })).toBeEnabled();
  });

  it('lets an admin recover an upload whose first encode failed', async () => {
    renderWatch(adminMe, {}, { ...video, processingState: 'failed' });

    expect(
      await screen.findByText('This demo failed to process'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Re-encode' })).toBeVisible();
  });
});

it('reports what the browser said when a video will not play', async () => {
  const reportPlaybackError = jest.fn(() => Promise.resolve());
  renderApp(<Watch />, {
    api: { ...api, reportPlaybackError },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  const player = (await screen.findByTestId('demo-video')) as HTMLVideoElement;
  Object.defineProperty(player, 'error', {
    value: { code: 3, message: 'PIPELINE_ERROR_DECODE' },
    configurable: true,
  });
  fireEvent.error(player);

  await waitFor(() =>
    expect(reportPlaybackError).toHaveBeenCalledWith('video-1', {
      code: 3,
      message: 'PIPELINE_ERROR_DECODE',
      userAgent: navigator.userAgent,
    }),
  );
});

it('keeps the failure panel up when the playback error cannot be reported', async () => {
  const reportPlaybackError = jest.fn(() =>
    Promise.reject(new ApiError(500, 'down')),
  );
  renderApp(<Watch />, {
    api: { ...api, reportPlaybackError },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  const player = (await screen.findByTestId('demo-video')) as HTMLVideoElement;
  Object.defineProperty(player, 'error', {
    value: { code: 3, message: 'PIPELINE_ERROR_DECODE' },
    configurable: true,
  });
  fireEvent.error(player);

  await waitFor(() => expect(reportPlaybackError).toHaveBeenCalled());
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /^Playback failed/,
  );
});

it('loads the demo again from the retry after a failed load', async () => {
  const getVideo = jest
    .fn()
    .mockRejectedValueOnce(new ApiError(400, 'bad'))
    .mockResolvedValue(video);
  renderApp(<Watch />, {
    api: { ...api, getVideo },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  expect(await screen.findByText('We could not load this demo')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByTestId('demo-video')).toBeVisible();
  expect(getVideo).toHaveBeenCalledTimes(2);
});

// a freshly uploaded demo can be missing for a moment before its row lands
it('waits out a demo that is not there yet instead of giving up', async () => {
  const getVideo = jest
    .fn()
    .mockRejectedValueOnce(new ApiError(404, 'not found'))
    .mockResolvedValue(video);
  renderApp(<Watch />, {
    api: { ...api, getVideo },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  expect(
    await screen.findByTestId('demo-video', {}, { timeout: 4000 }),
  ).toBeVisible();
  expect(getVideo).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('We could not load this demo')).toBeNull();
});

it('explains that a studio draft has to be exported before anyone can watch it', async () => {
  renderApp(<Watch />, {
    api: {
      ...api,
      getVideo: () =>
        Promise.resolve({
          ...video,
          kind: 'studio' as const,
          processingState: 'empty' as const,
        }),
    },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  expect(
    await screen.findByText('This demo has not been exported yet'),
  ).toBeVisible();
  expect(screen.getByText(/A creator has to export it/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Check again' })).toBeNull();
});

it('checks again on request and plays the demo once it has finished encoding', async () => {
  const getVideo = jest
    .fn()
    .mockResolvedValueOnce({ ...video, processingState: 'processing' })
    .mockResolvedValue(video);
  renderApp(<Watch />, {
    api: { ...api, getVideo },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  await userEvent.click(
    await screen.findByRole('button', { name: 'Check again' }),
  );

  expect(await screen.findByTestId('demo-video')).toBeVisible();
  expect(getVideo).toHaveBeenCalledTimes(2);
});

it('asks for playback access again from the retry', async () => {
  const requestAccess = jest
    .fn()
    .mockRejectedValueOnce(new Error('403'))
    .mockResolvedValue(access);
  renderApp(<Watch />, {
    api: { ...api, requestAccess },
    me: memberMe,
    route: '/videos/video-1',
    routePath: '/videos/:id',
  });

  await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));

  expect(await screen.findByTestId('demo-video')).toBeVisible();
  expect(requestAccess).toHaveBeenCalledTimes(2);
});
