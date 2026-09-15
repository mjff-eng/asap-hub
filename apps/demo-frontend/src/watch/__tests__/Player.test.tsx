import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';

import type { Chapter, VideoAccess } from '../../api/types';
import Player from '../Player';

const chapters: Chapter[] = [
  { startMs: 0, title: 'Intro' },
  { startMs: 60000, title: 'Event attendance' },
];

const access: VideoAccess = {
  streamUrl: '/media/video-1/stream.mp4',
  spriteUrl: '/media/video-1/sprite.jpg',
  thumbnailsVttUrl: '/media/video-1/thumbnails.vtt',
};

const renderPlayer = (props: Partial<Parameters<typeof Player>[0]> = {}) => {
  const onTimeChange = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Player
        access={access}
        chapters={chapters}
        durationMs={300000}
        currentSeconds={90}
        onTimeChange={onTimeChange}
        {...props}
      />
    </QueryClientProvider>,
  );
  const video = screen.getByTestId('demo-video') as HTMLVideoElement;
  const setCurrentTime = jest.fn();
  Object.defineProperty(video, 'currentTime', {
    get: () => 90,
    set: setCurrentTime,
    configurable: true,
  });
  video.play = jest.fn(() => Promise.resolve());
  video.pause = jest.fn();
  return { onTimeChange, video, setCurrentTime };
};

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.requestFullscreen = jest.fn(() => Promise.resolve());
  Object.defineProperty(document, 'exitFullscreen', {
    value: jest.fn(() => Promise.resolve()),
    configurable: true,
  });
});

beforeEach(() => {
  window.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, text: () => Promise.resolve('WEBVTT\n') }),
  ) as unknown as typeof fetch;
});

it('shows the elapsed time, the duration and the current chapter', () => {
  renderPlayer();

  expect(screen.getByText('1:30 / 5:00')).toBeVisible();
  expect(screen.getByText('Event attendance')).toBeVisible();
});

it('names no chapter before the first one starts', async () => {
  renderPlayer({
    chapters: [{ startMs: 5000, title: 'Late start' }],
    currentSeconds: 0,
  });

  expect(screen.queryByText('Late start')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Chapters' }));
  const [row] = await screen.findAllByRole('button', { name: /Late start/ });
  expect(row).toHaveAttribute('aria-current', 'false');
});

describe('playback failure', () => {
  const deferredAccess = () => {
    let settle: (ok: boolean) => void = () => undefined;
    const onRequestAccess = jest.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          settle = (ok) => (ok ? resolve() : reject(new Error('403')));
        }),
    );
    return {
      onRequestAccess,
      grant: () => settle(true),
      deny: () => settle(false),
    };
  };

  it('explains a stream that stops', async () => {
    const { video } = renderPlayer();

    fireEvent.error(video);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Playback stopped/,
    );
  });

  it('reloads the stream only once the access refresh has landed', async () => {
    const { onRequestAccess, grant } = deferredAccess();
    const { video } = renderPlayer({ onRequestAccess });
    video.load = jest.fn();

    fireEvent.error(video);
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    // the fresh cookies ride on the access response, so a reload before it
    // lands would go out with the expired ones
    expect(onRequestAccess).toHaveBeenCalledTimes(1);
    expect(video.load).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('button', { name: 'Retrying' }),
    ).toBeDisabled();
    expect(screen.getByRole('alert')).toBeVisible();

    grant();

    await waitFor(() => expect(video.load).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('keeps the panel and offers another go when the refresh fails', async () => {
    const { onRequestAccess, deny } = deferredAccess();
    const { video } = renderPlayer({ onRequestAccess });
    video.load = jest.fn();

    fireEvent.error(video);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    deny();

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(video.load).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/^Playback stopped/);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRequestAccess).toHaveBeenCalledTimes(2);
  });

  it('ignores a second press while a retry is in flight', async () => {
    const { onRequestAccess, grant } = deferredAccess();
    const { video } = renderPlayer({ onRequestAccess });
    video.load = jest.fn();

    fireEvent.error(video);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Retrying' }));

    expect(onRequestAccess).toHaveBeenCalledTimes(1);

    grant();

    await waitFor(() => expect(video.load).toHaveBeenCalledTimes(1));
  });

  // the app mounts in StrictMode, which unmounts and remounts once in dev
  it('still reloads after a double mount', async () => {
    const { onRequestAccess, grant } = deferredAccess();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <Player
            access={access}
            chapters={chapters}
            durationMs={300000}
            currentSeconds={90}
            onTimeChange={jest.fn()}
            onRequestAccess={onRequestAccess}
          />
        </QueryClientProvider>
      </StrictMode>,
    );
    const video = screen.getByTestId('demo-video') as HTMLVideoElement;
    video.load = jest.fn();

    fireEvent.error(video);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    grant();

    await waitFor(() => expect(video.load).toHaveBeenCalledTimes(1));
  });

  it('reloads straight away when nothing owns the access', async () => {
    const { video } = renderPlayer();
    video.load = jest.fn();

    fireEvent.error(video);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(video.load).toHaveBeenCalledTimes(1));
  });

  it('clears the panel once the stream loads again', async () => {
    const { video } = renderPlayer();

    fireEvent.error(video);
    expect(await screen.findByRole('alert')).toBeVisible();

    fireEvent.loadedData(video);

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});

it('plays and pauses from the control bar', async () => {
  const { video } = renderPlayer();

  Object.defineProperty(video, 'paused', { value: true, configurable: true });
  const [centrePlay] = screen.getAllByRole('button', { name: 'Play' });
  await userEvent.click(centrePlay as HTMLElement);
  expect(video.play).toHaveBeenCalled();

  fireEvent.play(video);
  Object.defineProperty(video, 'paused', { value: false, configurable: true });
  await userEvent.click(await screen.findByRole('button', { name: 'Pause' }));
  expect(video.pause).toHaveBeenCalled();
});

it('hides the big centre play button once playback has started', async () => {
  const { video } = renderPlayer();

  expect(screen.getAllByRole('button', { name: 'Play' })).toHaveLength(2);

  fireEvent.play(video);

  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull(),
  );
});

describe('volume', () => {
  it('mutes and unmutes from the speaker button', async () => {
    const { video } = renderPlayer();

    await userEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(video.muted).toBe(true);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Unmute' }),
    );
    expect(video.muted).toBe(false);
  });

  it('applies the slider value and mutes at zero', () => {
    const { video } = renderPlayer();

    const slider = screen.getByLabelText('Volume');
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(video.volume).toBe(0.5);
    expect(video.muted).toBe(false);

    fireEvent.change(slider, { target: { value: '0' } });
    expect(video.muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeVisible();
  });

  it('mirrors a volume change that came from the element', async () => {
    const { video } = renderPlayer();

    Object.defineProperty(video, 'muted', { value: true, configurable: true });
    fireEvent.volumeChange(video);

    expect(await screen.findByRole('button', { name: 'Unmute' })).toBeVisible();
  });
});

describe('keyboard shortcuts', () => {
  const engage = () => {
    const wrapper = screen.getByTestId('demo-video')
      .parentElement as HTMLElement;
    wrapper.matches = ((selector: string) =>
      selector === ':hover') as HTMLElement['matches'];
    return wrapper;
  };

  it('toggles play with the space bar', async () => {
    const { video } = renderPlayer();
    engage();
    Object.defineProperty(video, 'paused', { value: true, configurable: true });

    fireEvent.keyDown(window, { key: ' ' });

    expect(video.play).toHaveBeenCalled();
  });

  it('steps back and forward with the arrow keys', () => {
    const { setCurrentTime, onTimeChange } = renderPlayer();
    engage();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(setCurrentTime).toHaveBeenLastCalledWith(85);
    expect(onTimeChange).toHaveBeenLastCalledWith(85);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(setCurrentTime).toHaveBeenLastCalledWith(95);
  });

  it('clamps an arrow step to the ends of the video', () => {
    const { setCurrentTime } = renderPlayer({ currentSeconds: 2 });
    engage();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(setCurrentTime).toHaveBeenLastCalledWith(0);
  });

  it('mutes with m', () => {
    const { video } = renderPlayer();
    engage();

    fireEvent.keyDown(window, { key: 'm' });

    expect(video.muted).toBe(true);
  });

  it('asks for full screen with f', () => {
    renderPlayer();
    const wrapper = engage();

    fireEvent.keyDown(window, { key: 'f' });

    expect(wrapper.requestFullscreen).toHaveBeenCalled();
  });

  it('ignores shortcuts while typing in a field', () => {
    const { video } = renderPlayer();
    engage();
    const input = document.createElement('input');
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: ' ' });

    expect(video.play).not.toHaveBeenCalled();
    input.remove();
  });

  it('ignores shortcuts when the player is not engaged', () => {
    const { video } = renderPlayer();

    fireEvent.keyDown(window, { key: ' ' });

    expect(video.play).not.toHaveBeenCalled();
  });
});

describe('chapters panel', () => {
  it('opens from the chapters button, seeks from a row and closes itself', async () => {
    const { setCurrentTime } = renderPlayer();

    await userEvent.click(screen.getByRole('button', { name: 'Chapters' }));

    const panel = await screen.findByTestId('chapters-panel');
    expect(panel).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: /Event attendance/ }),
    );

    expect(setCurrentTime).toHaveBeenLastCalledWith(60);
    // it sits over the picture, so it has to get out of the way once used
    await waitFor(() =>
      expect(screen.queryByTestId('chapters-panel')).toBeNull(),
    );
  });

  it('highlights the chapter that covers the playhead', async () => {
    renderPlayer({ currentSeconds: 90 });

    await userEvent.click(screen.getByRole('button', { name: 'Chapters' }));

    const rows = await screen.findAllByRole('button', {
      name: /Intro|attendance/,
    });
    expect(rows[0]).toHaveAttribute('aria-current', 'false');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
  });

  it('closes on Escape', async () => {
    renderPlayer();

    await userEvent.click(screen.getByRole('button', { name: 'Chapters' }));
    await screen.findByTestId('chapters-panel');

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByTestId('chapters-panel')).toBeNull(),
    );
  });

  it('closes on a pointer press outside the panel', async () => {
    renderPlayer();

    await userEvent.click(screen.getByRole('button', { name: 'Chapters' }));
    await screen.findByTestId('chapters-panel');

    fireEvent.pointerDown(document.body);

    await waitFor(() =>
      expect(screen.queryByTestId('chapters-panel')).toBeNull(),
    );
  });

  it('offers no chapters button when the video has none', () => {
    renderPlayer({ chapters: [] });

    expect(screen.queryByRole('button', { name: 'Chapters' })).toBeNull();
  });
});

it('requests full screen from the control bar and exits when already in it', async () => {
  renderPlayer();
  const wrapper = screen.getByTestId('demo-video').parentElement as HTMLElement;

  await userEvent.click(screen.getByRole('button', { name: 'Full screen' }));
  expect(wrapper.requestFullscreen).toHaveBeenCalled();

  Object.defineProperty(document, 'fullscreenElement', {
    value: wrapper,
    configurable: true,
  });
  fireEvent(document, new Event('fullscreenchange'));

  const exit = await screen.findByRole('button', { name: 'Exit full screen' });
  await userEvent.click(exit);
  expect(document.exitFullscreen).toHaveBeenCalled();

  Object.defineProperty(document, 'fullscreenElement', {
    value: null,
    configurable: true,
  });
});

it('jumps to the deep linked start time on mount', () => {
  const { onTimeChange, video } = renderPlayer({ initialSeconds: 120 });

  expect(onTimeChange).toHaveBeenCalledWith(120);
  expect(video).toBeVisible();
});

it('ignores a start time that is not a usable number', () => {
  const { onTimeChange } = renderPlayer({ initialSeconds: Number.NaN });

  expect(onTimeChange).not.toHaveBeenCalled();
});

it('reports the playhead as the element advances but not while scrubbing', () => {
  const { video, onTimeChange } = renderPlayer();

  fireEvent.timeUpdate(video);

  expect(onTimeChange).toHaveBeenCalledWith(90);
});

it('hands the seek function to its owner', () => {
  const registerSeek = jest.fn();
  const { setCurrentTime } = renderPlayer({ registerSeek });

  expect(registerSeek).toHaveBeenCalled();
  const seek = registerSeek.mock.calls[0]?.[0] as (seconds: number) => void;
  seek(45);

  expect(setCurrentTime).toHaveBeenLastCalledWith(45);
});
