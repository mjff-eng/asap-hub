import { fireEvent, render, screen } from '@testing-library/react';

import type { Chapter } from '../../api/types';
import ChapterProgress, { toSegments } from '../ChapterProgress';

const chapters: Chapter[] = [
  { startMs: 0, title: 'Intro' },
  { startMs: 40000, title: 'Middle' },
  { startMs: 80000, title: 'End' },
];

const BAR_LEFT = 50;
const BAR_WIDTH = 200;

const renderProgress = (
  props: Partial<Parameters<typeof ChapterProgress>[0]> = {},
  width = BAR_WIDTH,
) => {
  const onSeek = jest.fn();
  const onPreview = jest.fn();
  const { container } = render(
    <ChapterProgress
      chapters={chapters}
      durationSeconds={100}
      currentSeconds={0}
      onSeek={onSeek}
      onPreview={onPreview}
      {...props}
    />,
  );
  const bar = screen.getByRole('presentation');
  bar.getBoundingClientRect = () =>
    ({ left: BAR_LEFT, width, top: 0, height: 8 }) as DOMRect;
  return { bar, container, onSeek, onPreview };
};

describe('toSegments', () => {
  it('splits the duration at every in-range chapter start', () => {
    expect(toSegments(chapters, 100)).toEqual([
      { start: 0, end: 40 },
      { start: 40, end: 80 },
      { start: 80, end: 100 },
    ]);
  });

  it('drops chapter starts at or past the duration', () => {
    expect(toSegments(chapters, 50)).toEqual([
      { start: 0, end: 40 },
      { start: 40, end: 50 },
    ]);
  });

  it('falls back to a single placeholder segment without a duration', () => {
    expect(toSegments(chapters, 0)).toEqual([{ start: 0, end: 1 }]);
  });

  it('is a single segment when there are no chapters', () => {
    expect(toSegments([], 100)).toEqual([{ start: 0, end: 100 }]);
  });
});

it('renders one segment per chapter', () => {
  const { bar } = renderProgress();

  expect(bar.children).toHaveLength(3);
});

it('seeks to the clicked fraction of the duration', () => {
  const { bar, onSeek } = renderProgress();

  fireEvent.click(bar, { clientX: BAR_LEFT + BAR_WIDTH / 2 });

  expect(onSeek).toHaveBeenCalledWith(50);
});

it('clamps a click past either end', () => {
  const { bar, onSeek } = renderProgress();

  fireEvent.click(bar, { clientX: BAR_LEFT - 100 });
  expect(onSeek).toHaveBeenLastCalledWith(0);

  fireEvent.click(bar, { clientX: BAR_LEFT + BAR_WIDTH + 100 });
  expect(onSeek).toHaveBeenLastCalledWith(100);
});

it('previews the hovered position and clears it on leave', () => {
  const { bar, onPreview } = renderProgress();

  fireEvent.mouseMove(bar, { clientX: BAR_LEFT + BAR_WIDTH / 4 });
  expect(onPreview).toHaveBeenLastCalledWith({
    seconds: 25,
    left: BAR_WIDTH / 4,
  });

  fireEvent.mouseLeave(bar);
  expect(onPreview).toHaveBeenLastCalledWith(null);
});

it('does not seek when the bar has no width', () => {
  const { bar, onSeek } = renderProgress({}, 0);

  fireEvent.click(bar, { clientX: 100 });

  expect(onSeek).not.toHaveBeenCalled();
});

it('does not seek when the duration is unknown', () => {
  const { bar, onSeek } = renderProgress({ durationSeconds: 0 });

  fireEvent.click(bar, { clientX: 100 });

  expect(onSeek).not.toHaveBeenCalled();
});
