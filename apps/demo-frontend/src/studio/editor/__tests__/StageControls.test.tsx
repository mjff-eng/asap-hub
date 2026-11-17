import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC, useState } from 'react';
import StageControls from '../StageControls';
import { Playback, PlaybackProvider, usePlayback } from '../usePlayback';

// jsdom implements neither PointerEvent nor pointer capture, so without these
// the seek bar never sees a coordinate
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
}

beforeAll(() => {
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn(() => true);
});

let playback: Playback;

type HarnessProps = {
  durationMs?: number;
  initialVolume?: number;
  fullscreen?: { active: boolean; toggle: () => void };
};

// the editor's own wiring: the real clock, and the volume held in state
const Harness: FC<HarnessProps> = ({
  durationMs = 8000,
  initialVolume = 1,
  fullscreen,
}) => {
  const clock = usePlayback({ durationMs });
  const [volume, setVolume] = useState(initialVolume);
  playback = clock;
  return (
    <PlaybackProvider value={clock}>
      <StageControls
        playing={clock.playing}
        canPlay={durationMs > 0}
        durationMs={durationMs}
        volume={volume}
        fullscreen={fullscreen}
        onToggle={clock.toggle}
        onSeek={clock.seek}
        onSkipStart={() => clock.seek(0)}
        onSkipEnd={() => clock.seek(durationMs)}
        onVolume={setVolume}
      />
    </PlaybackProvider>
  );
};

const seekBar = () => screen.getByRole('slider', { name: 'Seek' });

// the bar is laid out by the browser; jsdom reports zeroes unless told
const layOut = (element: HTMLElement, left: number, width: number) => {
  jest
    .spyOn(element, 'getBoundingClientRect')
    .mockReturnValue({ left, width, top: 0, height: 18 } as DOMRect);
};

describe('the time readout', () => {
  it('follows the playhead as it moves', () => {
    render(<Harness />);
    expect(screen.getByText('0:00.00 / 0:08.00')).toBeInTheDocument();

    act(() => playback.seek(2500));

    expect(screen.getByText('0:02.50 / 0:08.00')).toBeInTheDocument();
    expect(seekBar()).toHaveAttribute('aria-valuenow', '2500');
  });
});

describe('scrubbing the seek bar', () => {
  it('jumps to the point the bar is pressed', () => {
    render(<Harness />);
    layOut(seekBar(), 100, 400);

    fireEvent.pointerDown(seekBar(), { clientX: 300 });

    expect(playback.getPlayheadMs()).toBe(4000);
    expect(seekBar()).toHaveAttribute('aria-valuenow', '4000');
  });

  it('follows a drag that holds the pointer', () => {
    render(<Harness />);
    layOut(seekBar(), 100, 400);

    fireEvent.pointerDown(seekBar(), { clientX: 100 });
    fireEvent.pointerMove(seekBar(), { clientX: 400 });

    expect(playback.getPlayheadMs()).toBe(6000);
  });

  it('stops at either end when the drag leaves the bar', () => {
    render(<Harness />);
    layOut(seekBar(), 100, 400);

    fireEvent.pointerDown(seekBar(), { clientX: 2000 });
    expect(playback.getPlayheadMs()).toBe(8000);

    fireEvent.pointerMove(seekBar(), { clientX: -300 });
    expect(playback.getPlayheadMs()).toBe(0);
  });

  it('ignores a pointer passing over without a press', () => {
    render(<Harness />);
    const bar = seekBar();
    layOut(bar, 100, 400);
    bar.hasPointerCapture = () => false;

    fireEvent.pointerMove(bar, { clientX: 300 });

    expect(playback.getPlayheadMs()).toBe(0);
  });

  it('ignores a press before the bar has been laid out', () => {
    render(<Harness />);
    layOut(seekBar(), 0, 0);

    fireEvent.pointerDown(seekBar(), { clientX: 300 });

    expect(playback.getPlayheadMs()).toBe(0);
  });
});

describe('seeking from the keyboard', () => {
  it('steps a second at a time with the arrows', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    seekBar().focus();

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}');

    expect(playback.getPlayheadMs()).toBe(1000);
  });

  it('jumps to either end with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    seekBar().focus();

    await user.keyboard('{End}');
    expect(playback.getPlayheadMs()).toBe(8000);

    await user.keyboard('{Home}');
    expect(playback.getPlayheadMs()).toBe(0);
  });

  it('stops at the start and the end', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    seekBar().focus();

    await user.keyboard('{ArrowLeft}');
    expect(playback.getPlayheadMs()).toBe(0);

    act(() => playback.seek(7500));
    await user.keyboard('{ArrowRight}');
    expect(playback.getPlayheadMs()).toBe(8000);
  });

  // a plain div keeps the arrow's default, which scrolled the page sideways as
  // well as moving the playhead
  it('keeps the page still on a seek key and leaves other keys alone', () => {
    render(<Harness />);

    expect(fireEvent.keyDown(seekBar(), { key: 'ArrowRight' })).toBe(false);
    expect(fireEvent.keyDown(seekBar(), { key: 'a' })).toBe(true);
    expect(playback.getPlayheadMs()).toBe(1000);
  });
});

describe('the preview sound', () => {
  it('mutes and comes back at the level it left', async () => {
    const user = userEvent.setup();
    render(<Harness initialVolume={0.6} />);

    await user.click(screen.getByRole('button', { name: 'Mute the preview' }));
    expect(screen.getByRole('slider', { name: 'Preview volume' })).toHaveValue(
      '0',
    );

    await user.click(
      screen.getByRole('button', { name: 'Unmute the preview' }),
    );
    expect(screen.getByRole('slider', { name: 'Preview volume' })).toHaveValue(
      '0.6',
    );
  });

  it('unmutes to full when the preview started silent', async () => {
    const user = userEvent.setup();
    render(<Harness initialVolume={0} />);

    await user.click(
      screen.getByRole('button', { name: 'Unmute the preview' }),
    );

    expect(screen.getByRole('slider', { name: 'Preview volume' })).toHaveValue(
      '1',
    );
  });

  it('follows the volume slider', () => {
    render(<Harness />);

    fireEvent.change(screen.getByRole('slider', { name: 'Preview volume' }), {
      target: { value: '0.35' },
    });

    expect(screen.getByRole('slider', { name: 'Preview volume' })).toHaveValue(
      '0.35',
    );
    expect(
      screen.getByRole('button', { name: 'Mute the preview' }),
    ).toBeInTheDocument();
  });
});

describe('fullscreen', () => {
  it('offers no button where the browser cannot go fullscreen', () => {
    render(<Harness />);

    expect(
      screen.queryByRole('button', { name: /fullscreen/i }),
    ).not.toBeInTheDocument();
  });

  it('asks to go fullscreen', async () => {
    const user = userEvent.setup();
    const toggle = jest.fn();
    render(<Harness fullscreen={{ active: false, toggle }} />);

    await user.click(screen.getByRole('button', { name: 'Fullscreen' }));

    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('offers the way back out once fullscreen', async () => {
    const user = userEvent.setup();
    const toggle = jest.fn();
    render(<Harness fullscreen={{ active: true, toggle }} />);

    await user.click(screen.getByRole('button', { name: 'Leave fullscreen' }));

    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
