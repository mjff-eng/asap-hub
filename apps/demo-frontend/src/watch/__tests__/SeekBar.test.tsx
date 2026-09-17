import { createEvent, fireEvent, render, screen } from '@testing-library/react';

import type { Chapter } from '../../api/types';
import SeekBar from '../SeekBar';

// jsdom has no PointerEvent, so clientX has to be set on the event by hand
const firePointer = (
  type:
    | 'pointerDown'
    | 'pointerMove'
    | 'pointerUp'
    | 'pointerLeave'
    | 'pointerCancel',
  node: HTMLElement,
  init: { clientX?: number; pointerId?: number } = {},
) => {
  const event = createEvent[type](node, init);
  Object.defineProperty(event, 'clientX', { value: init.clientX ?? 0 });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  fireEvent(node, event);
};

const chapters: Chapter[] = [
  { startMs: 0, title: 'Intro' },
  { startMs: 50000, title: 'Middle' },
];

const BAR_LEFT = 100;
const BAR_WIDTH = 400;

const stubBounds = (node: HTMLElement, width = BAR_WIDTH) => {
  Object.defineProperty(node, 'getBoundingClientRect', {
    value: () => ({ left: BAR_LEFT, width, top: 0, height: 16 }) as DOMRect,
    configurable: true,
  });
};

const renderBar = (
  props: Partial<Parameters<typeof SeekBar>[0]> = {},
  width = BAR_WIDTH,
) => {
  const onSeek = jest.fn();
  const onScrubbingChange = jest.fn();
  const onHover = jest.fn();
  render(
    <SeekBar
      chapters={chapters}
      durationSeconds={100}
      currentSeconds={0}
      bufferedSeconds={0}
      onSeek={onSeek}
      onScrubbingChange={onScrubbingChange}
      onHover={onHover}
      {...props}
    />,
  );
  const bar = screen.getByRole('slider', { name: 'Seek' });
  stubBounds(bar, width);
  bar.setPointerCapture = jest.fn();
  bar.releasePointerCapture = jest.fn();
  bar.hasPointerCapture = jest.fn(() => true);
  return { bar, onSeek, onScrubbingChange, onHover };
};

it('exposes the playhead through the slider values', () => {
  const { bar } = renderBar({ currentSeconds: 42.4, durationSeconds: 100 });

  expect(bar).toHaveAttribute('aria-valuemin', '0');
  expect(bar).toHaveAttribute('aria-valuemax', '100');
  expect(bar).toHaveAttribute('aria-valuenow', '42');
});

// a bare "235" tells a screen reader listener nothing about where they are
it('reads the playhead out as a time, not as a count of seconds', () => {
  const { bar } = renderBar({ currentSeconds: 235, durationSeconds: 3725 });

  expect(bar).toHaveAttribute(
    'aria-valuetext',
    '3 min 55 sec of 1 hr 2 min 5 sec',
  );
});

it('seeks to the fraction of the bar that was pressed', () => {
  const { bar, onSeek, onScrubbingChange } = renderBar();

  firePointer('pointerDown', bar, {
    clientX: BAR_LEFT + BAR_WIDTH / 4,
    pointerId: 1,
  });

  expect(onScrubbingChange).toHaveBeenCalledWith(true);
  expect(onSeek).toHaveBeenCalledWith(25);
});

it('clamps a press outside the bar to its ends', () => {
  const { bar, onSeek } = renderBar();

  firePointer('pointerDown', bar, { clientX: BAR_LEFT - 500, pointerId: 1 });
  expect(onSeek).toHaveBeenLastCalledWith(0);

  firePointer('pointerDown', bar, {
    clientX: BAR_LEFT + BAR_WIDTH + 500,
    pointerId: 1,
  });
  expect(onSeek).toHaveBeenLastCalledWith(100);
});

it('reports the hover position without seeking until scrubbing starts', () => {
  const { bar, onSeek, onHover } = renderBar();

  firePointer('pointerMove', bar, {
    clientX: BAR_LEFT + BAR_WIDTH / 2,
    pointerId: 1,
  });

  expect(onHover).toHaveBeenLastCalledWith({
    seconds: 50,
    left: BAR_WIDTH / 2,
  });
  expect(onSeek).not.toHaveBeenCalled();
});

it('keeps seeking while the pointer is dragged after a press', () => {
  const { bar, onSeek, onScrubbingChange } = renderBar();

  firePointer('pointerDown', bar, { clientX: BAR_LEFT, pointerId: 1 });
  firePointer('pointerMove', bar, {
    clientX: BAR_LEFT + BAR_WIDTH * 0.75,
    pointerId: 1,
  });
  expect(onSeek).toHaveBeenLastCalledWith(75);

  firePointer('pointerUp', bar, { pointerId: 1 });
  expect(onScrubbingChange).toHaveBeenLastCalledWith(false);

  firePointer('pointerMove', bar, { clientX: BAR_LEFT + 10, pointerId: 1 });
  expect(onSeek).toHaveBeenLastCalledWith(75);
});

it('drops the hover preview when the pointer leaves an idle bar', () => {
  const { bar, onHover } = renderBar();

  firePointer('pointerMove', bar, { clientX: BAR_LEFT + 10, pointerId: 1 });
  fireEvent.pointerLeave(bar);

  expect(onHover).toHaveBeenLastCalledWith(null);
});

it('keeps the preview while scrubbing past the edge of the bar', () => {
  const { bar, onHover } = renderBar();

  firePointer('pointerDown', bar, { clientX: BAR_LEFT + 10, pointerId: 1 });
  onHover.mockClear();
  fireEvent.pointerLeave(bar);

  expect(onHover).not.toHaveBeenCalled();
});

it('ignores pointer input when the duration is unknown', () => {
  const { bar, onSeek, onHover } = renderBar({ durationSeconds: 0 });

  firePointer('pointerDown', bar, { clientX: BAR_LEFT + 100, pointerId: 1 });

  expect(onSeek).not.toHaveBeenCalled();
  expect(onHover).not.toHaveBeenCalled();
});

// without this the bar stays "scrubbing" for ever: the player then drops every
// time update and the controls never hide again
it('stops scrubbing when the pointer stream is cancelled', () => {
  const { bar, onScrubbingChange, onSeek } = renderBar();

  firePointer('pointerDown', bar, { clientX: BAR_LEFT + 10, pointerId: 1 });
  expect(onScrubbingChange).toHaveBeenLastCalledWith(true);

  firePointer('pointerCancel', bar, { pointerId: 1 });

  expect(onScrubbingChange).toHaveBeenLastCalledWith(false);
  onSeek.mockClear();
  firePointer('pointerMove', bar, { clientX: BAR_LEFT + 200, pointerId: 1 });
  expect(onSeek).not.toHaveBeenCalled();
});

it('stops scrubbing when the pointer capture is lost', () => {
  const { bar, onScrubbingChange } = renderBar();

  firePointer('pointerDown', bar, { clientX: BAR_LEFT + 10, pointerId: 1 });
  fireEvent.lostPointerCapture(bar);

  expect(onScrubbingChange).toHaveBeenLastCalledWith(false);
});

describe('keyboard', () => {
  it('is reachable by tab', () => {
    const { bar } = renderBar();

    expect(bar).toHaveAttribute('tabindex', '0');
  });

  it('steps with the arrow keys and jumps with home and end', () => {
    const { bar, onSeek } = renderBar({ currentSeconds: 50 });

    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenLastCalledWith(55);

    fireEvent.keyDown(bar, { key: 'ArrowLeft' });
    expect(onSeek).toHaveBeenLastCalledWith(45);

    fireEvent.keyDown(bar, { key: 'Home' });
    expect(onSeek).toHaveBeenLastCalledWith(0);

    fireEvent.keyDown(bar, { key: 'End' });
    expect(onSeek).toHaveBeenLastCalledWith(100);
  });

  it('clamps a step to the ends of the video', () => {
    const { bar, onSeek } = renderBar({ currentSeconds: 2 });

    fireEvent.keyDown(bar, { key: 'ArrowLeft' });

    expect(onSeek).toHaveBeenLastCalledWith(0);
  });

  it('ignores keys that are not seek keys', () => {
    const { bar, onSeek } = renderBar();

    fireEvent.keyDown(bar, { key: 'a' });

    expect(onSeek).not.toHaveBeenCalled();
  });
});

// a zero width bar has no meaningful ratio, so ratioAt clamps to 0 and the
// press seeks to the start rather than being dropped
it('seeks to the start on a zero width bar', () => {
  const { bar, onSeek } = renderBar({}, 0);

  firePointer('pointerDown', bar, { clientX: BAR_LEFT + 100, pointerId: 1 });

  expect(onSeek).toHaveBeenCalledTimes(1);
  expect(onSeek).toHaveBeenCalledWith(0);
});
