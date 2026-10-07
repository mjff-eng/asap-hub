import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from '../../api/client';
import type { Me, Video, VideoAccess } from '../../api/types';
import { renderApp } from '../../test-utils';
import StudioVideo from '../StudioVideo';

const creatorMe: Me = {
  sub: 'auth0|2',
  name: 'Sam Creator',
  email: 'sam@example.com',
  role: 'creator',
};

const video: Video = {
  id: 'video-1',
  title: 'Sprint 42 demo',
  status: 'draft',
  folderId: 'ROOT',
  recordedAt: '2026-08-14T09:00:00.000Z',
  durationMs: 600000,
  chapters: [],
  processingState: 'ready',
  createdBy: { sub: 'auth0|2', name: 'Sam Creator' },
  kind: 'upload',
  version: 3,
};

const access: VideoAccess = {
  streamUrl: '/media/video-1/stream.mp4',
  spriteUrl: '/media/video-1/sprite.jpg',
  thumbnailsVttUrl: '/media/video-1/thumbnails.vtt',
};

const baseApi = {
  getVideo: () => Promise.resolve(video),
  requestAccess: () => Promise.resolve(access),
  listFolders: () => Promise.resolve([]),
  acquireLease: () =>
    Promise.resolve({
      lockedBy: 'auth0|2',
      lockedByName: 'Sam Creator',
      lockExpiresAt: '2026-08-18T10:00:00.000Z',
    }),
  releaseLease: () => Promise.resolve(),
  releaseLeaseOnUnload: () => {},
  updateVideo: jest.fn(() => Promise.resolve({ ...video, version: 4 })),
};

const renderEditor = (api: Partial<typeof baseApi> = {}) =>
  renderApp(<StudioVideo />, {
    api: { ...baseApi, ...api },
    me: creatorMe,
    route: '/studio/videos/video-1',
    routePath: '/studio/videos/:id',
  });

const setPlayhead = (seconds: number) => {
  const player = screen.getByTestId('studio-video') as HTMLVideoElement;
  Object.defineProperty(player, 'currentTime', {
    get: () => seconds,
    set: () => {},
    configurable: true,
  });
};

const stubPlayer = () => {
  const player = screen.getByTestId('studio-video') as HTMLVideoElement;
  const state = { currentTime: 0, paused: true };
  Object.defineProperty(player, 'currentTime', {
    configurable: true,
    get: () => state.currentTime,
    set: (value: number) => {
      state.currentTime = value;
    },
  });
  Object.defineProperty(player, 'paused', {
    configurable: true,
    get: () => state.paused,
  });
  player.play = jest.fn(() => {
    state.paused = false;
    return Promise.resolve();
  });
  player.pause = jest.fn(() => {
    state.paused = true;
  });
  return { player, state };
};

const threeChapters = [
  { startMs: 0, title: 'Intro' },
  { startMs: 60000, title: 'Second' },
  { startMs: 120000, title: 'Third' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('marks a chapter at the playhead and snaps the first one to zero', async () => {
  renderEditor();

  await screen.findByTestId('studio-video');
  setPlayhead(120);

  await userEvent.keyboard('m');

  const first = await screen.findByLabelText('Start time of chapter 1');
  expect(first).toHaveValue('0:00');
});

it('keeps marked chapters sorted by start time', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 300000, title: 'Later' },
        ],
      }),
  });

  await screen.findByTestId('studio-video');
  setPlayhead(120);

  await userEvent.keyboard('m');

  await waitFor(() =>
    expect(screen.getByLabelText('Start time of chapter 2')).toHaveValue(
      '2:00',
    ),
  );
  expect(screen.getByLabelText('Start time of chapter 3')).toHaveValue('5:00');
});

it('does not reorder rows while a timecode field is focused', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 60000, title: 'Second' },
          { startMs: 120000, title: 'Third' },
        ],
      }),
  });

  const third = await screen.findByLabelText('Start time of chapter 3');
  await userEvent.clear(third);
  await userEvent.type(third, '0:30');

  expect(screen.getByLabelText('Title of chapter 3')).toHaveValue('Third');
  expect(screen.getByLabelText('Title of chapter 2')).toHaveValue('Second');

  await userEvent.tab();

  await waitFor(() =>
    expect(screen.getByLabelText('Title of chapter 2')).toHaveValue('Third'),
  );
  expect(screen.getByLabelText('Title of chapter 3')).toHaveValue('Second');
});

it('shows an inline error for an unparseable timecode and does not save it', async () => {
  const updateVideo = jest.fn(() => Promise.resolve({ ...video, version: 4 }));
  renderEditor({
    updateVideo,
    getVideo: () =>
      Promise.resolve({ ...video, chapters: [{ startMs: 0, title: 'Intro' }] }),
  });

  const start = await screen.findByLabelText('Start time of chapter 1');
  await userEvent.clear(start);
  await userEvent.type(start, 'not a time');

  expect(await screen.findByText('Use mm:ss or hh:mm:ss')).toBeVisible();
  expect(updateVideo).not.toHaveBeenCalled();
});

describe('with a debounced autosave', () => {
  // real timers on purpose: jest's fake timers interact with React's
  // scheduling differently across environments and flaked on CI runners
  it('saves chapters with the current version and adopts the version from the response', async () => {
    const updateVideo = jest
      .fn()
      .mockResolvedValueOnce({ ...video, version: 4 })
      .mockResolvedValueOnce({ ...video, version: 5 });

    renderEditor({ updateVideo });

    await screen.findByTestId('studio-video');
    setPlayhead(90);
    await userEvent.keyboard('m');

    await userEvent.type(
      await screen.findByLabelText('Title of chapter 1'),
      'Intro',
    );

    await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    expect(updateVideo.mock.calls[0]?.[1]).toMatchObject({
      version: 3,
      chapters: [{ startMs: 0, title: 'Intro' }],
    });

    await userEvent.type(
      screen.getByLabelText('Title of chapter 1'),
      ' updated',
    );

    await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(2), {
      timeout: 5000,
    });
    expect(updateVideo.mock.calls[1]?.[1]).toMatchObject({ version: 4 });
  }, 15000);

  it('coalesces rapid edits into a single save', async () => {
    const updateVideo = jest.fn(() =>
      Promise.resolve({ ...video, version: 4 }),
    );

    renderEditor({ updateVideo });

    await screen.findByTestId('studio-video');
    setPlayhead(90);
    await userEvent.keyboard('m');

    await userEvent.type(
      await screen.findByLabelText('Title of chapter 1'),
      'Introduction',
    );

    expect(updateVideo).not.toHaveBeenCalled();

    await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 1700);
    });
    expect(updateVideo).toHaveBeenCalledTimes(1);
  }, 15000);
});

it('renders a read-only banner naming the lease holder on 409', async () => {
  renderEditor({
    acquireLease: () =>
      Promise.reject(new ApiError(409, 'locked', 'locked', 'Ada Lovelace')),
  });

  expect(await screen.findByText(/Being edited by Ada Lovelace/)).toBeVisible();
  expect(screen.getByTestId('studio-video')).toBeVisible();
  expect(screen.getByLabelText('Video title')).toBeDisabled();
});

it('switches to a lost-lease state when a save is rejected as locked', async () => {
  const updateVideo = jest
    .fn()
    .mockRejectedValue(new ApiError(409, 'locked', 'locked', 'Ada Lovelace'));

  renderEditor({ updateVideo });

  await screen.findByTestId('studio-video');
  setPlayhead(30);
  await userEvent.keyboard('m');

  const start = await screen.findByLabelText('Start time of chapter 1');
  await userEvent.click(start);
  await userEvent.tab();

  expect(
    await screen.findByText(/edit lease was taken over by Ada Lovelace/),
  ).toBeVisible();
});

it('shows a processing screen instead of the editor while encoding', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({ ...video, processingState: 'processing' as const }),
  });

  expect(
    await screen.findByText('This demo is still processing'),
  ).toBeVisible();
  expect(screen.queryByTestId('studio-video')).not.toBeInTheDocument();
});

it('surfaces the processing error when encoding failed', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({
        ...video,
        processingState: 'failed' as const,
        processingError: 'ffmpeg exited with 1',
      }),
  });

  expect(await screen.findByText('ffmpeg exited with 1')).toBeVisible();
});

it('confirms before publishing and sends the current version', async () => {
  const publishVideo = jest.fn(() =>
    Promise.resolve({ ...video, status: 'published' as const, version: 4 }),
  );
  renderEditor({ publishVideo } as Partial<typeof baseApi>);

  await screen.findByTestId('studio-video');
  await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText(/Sprint 42 demo/)).toBeVisible();

  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Publish' }),
  );

  await waitFor(() => expect(publishVideo).toHaveBeenCalledWith('video-1', 3));
});

it('redirects a member away from the editor', async () => {
  renderApp(<StudioVideo />, {
    api: baseApi,
    me: { ...creatorMe, role: 'member' },
    route: '/studio/videos/video-1',
    routePath: '*',
  });

  await waitFor(() =>
    expect(screen.queryByTestId('studio-video')).not.toBeInTheDocument(),
  );
  expect(screen.queryByLabelText('Video title')).not.toBeInTheDocument();
});

it('rebases on a version conflict by refetching and retrying the save', async () => {
  const updateVideo = jest
    .fn()
    .mockRejectedValueOnce(new ApiError(409, 'conflict', 'conflict'))
    .mockResolvedValue({ ...video, version: 8 });
  const getVideo = jest
    .fn()
    .mockResolvedValueOnce({
      ...video,
      chapters: [{ startMs: 0, title: 'Intro' }],
    })
    .mockResolvedValue({
      ...video,
      version: 7,
      chapters: [{ startMs: 0, title: 'Intro' }],
    });

  renderEditor({ updateVideo, getVideo });

  const start = await screen.findByLabelText('Start time of chapter 1');
  await waitFor(() => expect(start).toBeEnabled());
  await userEvent.click(start);
  await userEvent.tab();

  await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(2));
  expect(updateVideo.mock.calls[0]?.[1]).toMatchObject({ version: 3 });
  expect(updateVideo.mock.calls[1]?.[1]).toMatchObject({ version: 7 });
  expect(await screen.findByText('Saved')).toBeVisible();
});

it('reports a save error when the conflict refetch fails', async () => {
  const updateVideo = jest
    .fn()
    .mockRejectedValue(new ApiError(409, 'conflict', 'conflict'));
  const getVideo = jest
    .fn()
    .mockResolvedValueOnce({
      ...video,
      chapters: [{ startMs: 0, title: 'Intro' }],
    })
    .mockRejectedValue(new Error('down'));

  renderEditor({ updateVideo, getVideo });

  const start = await screen.findByLabelText('Start time of chapter 1');
  await waitFor(() => expect(start).toBeEnabled());
  await userEvent.click(start);
  await userEvent.tab();

  expect(await screen.findByText('Could not save')).toBeVisible();
  expect(updateVideo).toHaveBeenCalledTimes(1);
});

it('reports a save error on a non-conflict failure', async () => {
  const updateVideo = jest.fn().mockRejectedValue(new Error('boom'));

  renderEditor({
    updateVideo,
    getVideo: () =>
      Promise.resolve({ ...video, chapters: [{ startMs: 0, title: 'Intro' }] }),
  });

  const start = await screen.findByLabelText('Start time of chapter 1');
  await waitFor(() => expect(start).toBeEnabled());
  await userEvent.click(start);
  await userEvent.tab();

  expect(await screen.findByText('Could not save')).toBeVisible();
});

it('queues a save made while one is in flight and flushes it after', async () => {
  let resolveFirst!: (saved: Video) => void;
  const updateVideo = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    )
    .mockResolvedValue({ ...video, version: 5 });

  renderEditor({ updateVideo });

  const titleInput = await screen.findByLabelText('Video title');
  await waitFor(() => expect(titleInput).toBeEnabled());
  await userEvent.type(titleInput, ' one');
  await userEvent.tab();
  await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(1));

  await userEvent.type(titleInput, ' two');
  await userEvent.tab();
  expect(updateVideo).toHaveBeenCalledTimes(1);

  resolveFirst({ ...video, version: 4 });

  await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(2));
  expect(updateVideo.mock.calls[1]?.[1]).toMatchObject({
    title: 'Sprint 42 demo one two',
    version: 4,
  });
});

it('does not save on title blur when the title is unchanged', async () => {
  const updateVideo = jest.fn(() => Promise.resolve({ ...video, version: 4 }));
  renderEditor({ updateVideo });

  const titleInput = await screen.findByLabelText('Video title');
  await waitFor(() => expect(titleInput).toBeEnabled());
  await userEvent.click(titleInput);
  await userEvent.tab();

  expect(updateVideo).not.toHaveBeenCalled();
});

it('toggles play and pause with the space key', async () => {
  renderEditor();

  await screen.findByTestId('studio-video');
  const { player } = stubPlayer();

  await userEvent.keyboard(' ');
  expect(player.play).toHaveBeenCalledTimes(1);

  await userEvent.keyboard(' ');
  expect(player.pause).toHaveBeenCalledTimes(1);
});

it('nudges the playhead with the arrow keys, one frame with shift', async () => {
  renderEditor();

  await screen.findByTestId('studio-video');
  const { state } = stubPlayer();

  await userEvent.keyboard('{ArrowRight}{ArrowRight}');
  expect(state.currentTime).toBeCloseTo(2, 5);
  expect(screen.getByText('0:02 of 10:00')).toBeVisible();

  await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
  expect(state.currentTime).toBeCloseTo(2 - 1 / 30, 4);

  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
  expect(state.currentTime).toBe(0);
});

it('ignores the mark shortcut while typing in a field', async () => {
  renderEditor();

  await screen.findByTestId('studio-video');
  const titleInput = screen.getByLabelText('Video title');
  await waitFor(() => expect(titleInput).toBeEnabled());
  await userEvent.click(titleInput);
  await userEvent.keyboard('m');

  expect(titleInput).toHaveValue('Sprint 42 demom');
  expect(
    screen.queryByLabelText('Start time of chapter 1'),
  ).not.toBeInTheDocument();
});

it('seeks from a row click, the progress bar, and playback time updates', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 60000, title: 'Second' },
        ],
      }),
  });

  await screen.findByTestId('studio-video');
  const { player, state } = stubPlayer();

  fireEvent.click(screen.getByText('9:00'));
  expect(state.currentTime).toBe(60);
  expect(screen.getByText('1:00 of 10:00')).toBeVisible();

  const bar = document.querySelector('[role="presentation"]') as HTMLElement;
  jest.spyOn(bar, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 100,
    top: 0,
    right: 100,
    bottom: 8,
    height: 8,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  fireEvent.mouseMove(bar, { clientX: 30 });
  fireEvent.click(bar, { clientX: 50 });
  expect(state.currentTime).toBe(300);
  expect(screen.getByText('5:00 of 10:00')).toBeVisible();

  state.currentTime = 42;
  fireEvent.timeUpdate(player);
  expect(screen.getByText('0:42 of 10:00')).toBeVisible();
});

it('moves the next chapter start when an end time is edited and saves on blur', async () => {
  const updateVideo = jest.fn().mockResolvedValue({ ...video, version: 4 });
  renderEditor({
    updateVideo,
    getVideo: () => Promise.resolve({ ...video, chapters: threeChapters }),
  });

  const end = await screen.findByLabelText('End time of chapter 1');
  await userEvent.clear(end);
  await userEvent.type(end, '1:30');

  expect(screen.getByLabelText('Start time of chapter 2')).toHaveValue('1:30');

  await userEvent.tab();

  await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(1));
  expect(updateVideo.mock.calls[0]?.[1]).toMatchObject({
    chapters: [{ startMs: 0 }, { startMs: 90000 }, { startMs: 120000 }],
  });
});

it('flags an end time at or before the start and clears it on blur without saving', async () => {
  const updateVideo = jest.fn(() => Promise.resolve({ ...video, version: 4 }));
  renderEditor({
    updateVideo,
    getVideo: () => Promise.resolve({ ...video, chapters: threeChapters }),
  });

  const end = await screen.findByLabelText('End time of chapter 1');
  await userEvent.clear(end);
  await userEvent.type(end, '0:00');

  expect(screen.getByText('Must be after the start')).toBeVisible();

  await userEvent.tab();

  expect(screen.queryByText('Must be after the start')).not.toBeInTheDocument();
  expect(updateVideo).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Start time of chapter 2')).toHaveValue('1:00');
});

it('clears an invalid start time on blur without saving', async () => {
  const updateVideo = jest.fn(() => Promise.resolve({ ...video, version: 4 }));
  renderEditor({
    updateVideo,
    getVideo: () =>
      Promise.resolve({ ...video, chapters: [{ startMs: 0, title: 'Intro' }] }),
  });

  const start = await screen.findByLabelText('Start time of chapter 1');
  await userEvent.clear(start);
  await userEvent.type(start, 'junk');

  expect(screen.getByText('Use mm:ss or hh:mm:ss')).toBeVisible();

  await userEvent.tab();

  expect(screen.queryByText('Use mm:ss or hh:mm:ss')).not.toBeInTheDocument();
  expect(updateVideo).not.toHaveBeenCalled();
});

// two chapters on the same millisecond leave the first with nothing to play and
// nothing to download, and deduping instead would take the other row's title
describe('a start another chapter already has', () => {
  it('is refused, and both chapters stay', async () => {
    const updateVideo = jest.fn(() =>
      Promise.resolve({ ...video, version: 4 }),
    );
    renderEditor({
      updateVideo,
      getVideo: () => Promise.resolve({ ...video, chapters: threeChapters }),
    });

    const third = await screen.findByLabelText('Start time of chapter 3');
    await userEvent.clear(third);
    await userEvent.type(third, '1:00');

    expect(screen.getByText('Another chapter starts here')).toBeVisible();
    expect(screen.getByLabelText('Title of chapter 2')).toHaveValue('Second');
    expect(screen.getByLabelText('Title of chapter 3')).toHaveValue('Third');

    await userEvent.tab();

    expect(
      screen.queryByText('Another chapter starts here'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Start time of chapter 3')).toHaveValue(
      '2:00',
    );
    expect(updateVideo).not.toHaveBeenCalled();
  }, 15000);

  // 10:00 is typed through 1:00, which is where the second chapter starts
  it('is taken once the typing moves past it', async () => {
    const updateVideo = jest.fn().mockResolvedValue({ ...video, version: 4 });
    renderEditor({
      updateVideo,
      getVideo: () =>
        Promise.resolve({
          ...video,
          durationMs: 1800000,
          chapters: threeChapters,
        }),
    });

    const third = await screen.findByLabelText('Start time of chapter 3');
    await userEvent.clear(third);
    await userEvent.type(third, '10:00');

    expect(
      screen.queryByText('Another chapter starts here'),
    ).not.toBeInTheDocument();

    await userEvent.tab();

    await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    expect(updateVideo.mock.calls[0]?.[1]).toMatchObject({
      chapters: [
        { startMs: 0, title: 'Intro' },
        { startMs: 60000, title: 'Second' },
        { startMs: 600000, title: 'Third' },
      ],
    });
  }, 15000);
});

// the end is the next chapter's start, so it cannot reach the one after it
it('flags an end time that would land on the chapter after next', async () => {
  const updateVideo = jest.fn(() => Promise.resolve({ ...video, version: 4 }));
  renderEditor({
    updateVideo,
    getVideo: () => Promise.resolve({ ...video, chapters: threeChapters }),
  });

  const end = await screen.findByLabelText('End time of chapter 1');
  await userEvent.clear(end);
  await userEvent.type(end, '2:00');

  expect(screen.getByText('Must be before the next chapter')).toBeVisible();
  expect(screen.getByLabelText('Start time of chapter 2')).toHaveValue('1:00');

  await userEvent.tab();

  expect(updateVideo).not.toHaveBeenCalled();
}, 15000);

it('inserts chapters midway before and after a row', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 60000, title: 'Second' },
        ],
      }),
  });

  await screen.findByLabelText('Start time of chapter 2');
  await userEvent.click(screen.getByLabelText('Add chapter after chapter 2'));
  await waitFor(() =>
    expect(screen.getByLabelText('Start time of chapter 3')).toHaveValue(
      '5:30',
    ),
  );

  await userEvent.click(screen.getByLabelText('Add chapter before chapter 2'));
  await waitFor(() =>
    expect(screen.getByLabelText('Start time of chapter 2')).toHaveValue(
      '0:30',
    ),
  );
  expect(screen.getByLabelText('Start time of chapter 3')).toHaveValue('1:00');
});

// the first chapter is pinned to the start of the video, so the midway point
// before it is the start it already holds
it('refuses to insert before the first chapter and keeps its title', async () => {
  const updateVideo = jest.fn(() => Promise.resolve({ ...video, version: 4 }));
  renderEditor({
    updateVideo,
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 60000, title: 'Second' },
        ],
      }),
  });

  await screen.findByLabelText('Start time of chapter 1');
  await userEvent.click(screen.getByLabelText('Add chapter before chapter 1'));

  expect(screen.getByLabelText('Title of chapter 1')).toHaveValue('Intro');
  expect(screen.getByLabelText('Title of chapter 2')).toHaveValue('Second');
  expect(screen.queryByLabelText('Title of chapter 3')).not.toBeInTheDocument();

  const notice = await screen.findByText(
    'The first chapter starts at the beginning of the video, so there is no room before it.',
  );
  expect(notice).toHaveAttribute('role', 'status');
  expect(updateVideo).not.toHaveBeenCalled();
});

// clicking a row seeks to exactly its start, so the next M lands on it
it('keeps the chapter already on the marked frame and offers its title', async () => {
  const updateVideo = jest.fn(() => Promise.resolve({ ...video, version: 4 }));
  renderEditor({
    updateVideo,
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 60000, title: 'Second' },
        ],
      }),
  });

  await screen.findByTestId('studio-video');
  const { state } = stubPlayer();

  fireEvent.click(screen.getByText('9:00'));
  expect(state.currentTime).toBe(60);

  await userEvent.keyboard('m');

  expect(screen.getByLabelText('Title of chapter 2')).toHaveValue('Second');
  expect(screen.queryByLabelText('Title of chapter 3')).not.toBeInTheDocument();

  const notice = await screen.findByText(
    'A chapter already starts at 1:00. Its title is ready to edit.',
  );
  expect(notice).toHaveAttribute('role', 'status');
  await waitFor(() =>
    expect(screen.getByLabelText('Title of chapter 2')).toHaveFocus(),
  );
  expect(updateVideo).not.toHaveBeenCalled();
});

// the midway point between two chapters a millisecond apart rounds onto one
it('refuses to insert between chapters with no room between them', async () => {
  const updateVideo = jest.fn(() => Promise.resolve({ ...video, version: 4 }));
  renderEditor({
    updateVideo,
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 1, title: 'Second' },
        ],
      }),
  });

  await screen.findByLabelText('Start time of chapter 2');
  await userEvent.click(screen.getByLabelText('Add chapter before chapter 2'));

  expect(screen.getByLabelText('Title of chapter 1')).toHaveValue('Intro');
  expect(screen.getByLabelText('Title of chapter 2')).toHaveValue('Second');
  expect(screen.queryByLabelText('Title of chapter 3')).not.toBeInTheDocument();

  const notice = await screen.findByText(
    'The chapters either side are too close together to fit one between them.',
  );
  expect(notice).toHaveAttribute('role', 'status');
  expect(updateVideo).not.toHaveBeenCalled();
});

it('deletes a chapter row', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 60000, title: 'Second' },
        ],
      }),
  });

  await screen.findByLabelText('Title of chapter 2');
  await userEvent.click(screen.getByLabelText('Delete chapter 2'));

  await waitFor(() =>
    expect(
      screen.queryByLabelText('Title of chapter 2'),
    ).not.toBeInTheDocument(),
  );
});

it('closes the publish dialog on Escape or Cancel without publishing', async () => {
  const publishVideo = jest.fn();
  renderEditor({
    publishVideo,
    getVideo: () =>
      Promise.resolve({
        ...video,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 60000, title: 'Second' },
        ],
      }),
  } as Partial<typeof baseApi>);

  const publishButton = await screen.findByRole('button', { name: 'Publish' });
  await waitFor(() => expect(publishButton).toBeEnabled());
  await userEvent.click(publishButton);

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText(/with 2 chapters/)).toBeVisible();

  await userEvent.keyboard('m');
  expect(
    screen.queryByLabelText('Start time of chapter 3'),
  ).not.toBeInTheDocument();

  await userEvent.keyboard('{Escape}');
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );

  await userEvent.click(publishButton);
  await userEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Cancel',
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(publishVideo).not.toHaveBeenCalled();
});

it('shows an alert and the zero-chapters warning when publishing fails', async () => {
  const publishVideo = jest.fn(() => Promise.reject(new ApiError(500, 'nope')));
  renderEditor({ publishVideo } as Partial<typeof baseApi>);

  const publishButton = await screen.findByRole('button', { name: 'Publish' });
  await waitFor(() => expect(publishButton).toBeEnabled());
  await userEvent.click(publishButton);

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText(/has no chapters yet/)).toBeVisible();
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Publish' }),
  );

  expect(
    await screen.findByText('We could not publish this demo. Try again.'),
  ).toBeVisible();
});

it('unpublishes a published demo after confirmation', async () => {
  const published = { ...video, status: 'published' as const };
  const unpublishVideo = jest.fn(() =>
    Promise.resolve({ ...published, status: 'draft' as const, version: 4 }),
  );
  renderEditor({
    unpublishVideo,
    getVideo: () => Promise.resolve(published),
  } as Partial<typeof baseApi>);

  expect(await screen.findByText('Published')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Republish' })).toBeVisible();

  const unpublishButton = screen.getByRole('button', { name: 'Unpublish' });
  await waitFor(() => expect(unpublishButton).toBeEnabled());
  await userEvent.click(unpublishButton);
  await userEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Cancel',
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(unpublishVideo).not.toHaveBeenCalled();

  await userEvent.click(unpublishButton);
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText(/go back to draft/)).toBeVisible();
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Unpublish' }),
  );

  await waitFor(() =>
    expect(unpublishVideo).toHaveBeenCalledWith('video-1', 3),
  );
  expect(await screen.findByText('Draft')).toBeVisible();
});

it('deletes the demo after confirmation and navigates away', async () => {
  // navigating home leaves the single test route, which react-router warns about
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const deleteVideo = jest.fn(() => Promise.resolve());
  renderEditor({ deleteVideo } as Partial<typeof baseApi>);

  const deleteButton = await screen.findByRole('button', {
    name: 'Delete demo',
  });
  await waitFor(() => expect(deleteButton).toBeEnabled());
  await userEvent.click(deleteButton);
  await userEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Cancel',
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(deleteVideo).not.toHaveBeenCalled();

  await userEvent.click(deleteButton);
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText(/cannot be undone/)).toBeVisible();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

  await waitFor(() => expect(deleteVideo).toHaveBeenCalledWith('video-1'));
  await waitFor(() =>
    expect(screen.queryByTestId('studio-video')).not.toBeInTheDocument(),
  );
});

it('reloads the page from the lost-lease banner', async () => {
  const reload = jest.fn();
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload },
  });

  try {
    const updateVideo = jest
      .fn()
      .mockRejectedValue(new ApiError(409, 'locked', 'locked', 'Ada Lovelace'));
    renderEditor({ updateVideo });

    await screen.findByTestId('studio-video');
    setPlayhead(30);
    await userEvent.keyboard('m');

    const start = await screen.findByLabelText('Start time of chapter 1');
    await userEvent.click(start);
    await userEvent.tab();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reload' }),
    );
    expect(reload).toHaveBeenCalledTimes(1);
  } finally {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  }
});

it('offers a retry when the video fails to load', async () => {
  const getVideo = jest
    .fn()
    .mockRejectedValueOnce(new ApiError(400, 'bad'))
    .mockResolvedValue(video);
  renderEditor({ getVideo });

  expect(await screen.findByText('We could not load this demo')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByTestId('studio-video')).toBeVisible();
  expect(getVideo).toHaveBeenCalledTimes(2);
});

it('falls back to a generic message when processing failed without detail', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({ ...video, processingState: 'failed' as const }),
  });

  expect(
    await screen.findByText('The recording could not be encoded.'),
  ).toBeVisible();
});

it('shows an uploading screen while the recording is still uploading', async () => {
  renderEditor({
    getVideo: () =>
      Promise.resolve({ ...video, processingState: 'uploading' as const }),
  });

  expect(await screen.findByText('This demo is still uploading')).toBeVisible();
  expect(screen.queryByTestId('studio-video')).not.toBeInTheDocument();
});
