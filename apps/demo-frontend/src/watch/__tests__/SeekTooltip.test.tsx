import { render, screen } from '@testing-library/react';

import type { Chapter } from '../../api/types';
import type { ThumbnailCue } from '../../utils/vtt';
import { clampTooltip } from '../playback';
import SeekTooltip from '../SeekTooltip';

const chapters: Chapter[] = [
  { startMs: 0, title: 'Intro' },
  { startMs: 60000, title: 'Event attendance' },
];

const cues: ThumbnailCue[] = [
  { startSeconds: 0, endSeconds: 60, x: 0, y: 0, width: 160, height: 90 },
  { startSeconds: 60, endSeconds: 120, x: 160, y: 0, width: 160, height: 90 },
];

const renderTooltip = (
  props: Partial<Parameters<typeof SeekTooltip>[0]> = {},
) =>
  render(
    <SeekTooltip
      spriteUrl="/media/video-1/sprite.jpg"
      cues={cues}
      chapters={chapters}
      seconds={70}
      left={400}
      playerWidth={800}
      {...props}
    />,
  );

it('shows the time and the chapter at the hovered position', () => {
  renderTooltip();

  expect(screen.getByText('1:10')).toBeVisible();
  expect(screen.getByText('Event attendance')).toBeVisible();
});

it('positions the sprite frame on the cue for that time', () => {
  const { container } = renderTooltip();

  const frame = container.querySelector(
    '[style*="background-position"]',
  ) as HTMLElement;
  expect(frame).toHaveStyle({ backgroundPosition: '-160px -0px' });
  expect(frame).toHaveStyle({ width: '160px', height: '90px' });
});

it('omits the sprite frame when no cue covers the time', () => {
  const { container } = renderTooltip({ cues: [] });

  expect(container.querySelector('[style*="background-position"]')).toBeNull();
  expect(screen.getByText('1:10')).toBeVisible();
});

it('omits the chapter title when the video has no chapters', () => {
  renderTooltip({ chapters: [] });

  expect(screen.queryByText('Event attendance')).toBeNull();
});

describe('clamping', () => {
  it('keeps the tooltip inside the player at both edges', () => {
    // the cue is 160 wide, so half of it plus the 8px gutter is the minimum
    expect(clampTooltip(0, 160, 800)).toBe(88);
    expect(clampTooltip(800, 160, 800)).toBe(712);
    expect(clampTooltip(400, 160, 800)).toBe(400);
  });

  it('falls back to the minimum when the player is narrower than the tooltip', () => {
    expect(clampTooltip(50, 160, 100)).toBe(88);
  });

  it('applies the clamp to the rendered position', () => {
    renderTooltip({ left: 0 });

    expect(screen.getByTestId('seek-tooltip')).toHaveStyle({ left: '88px' });
  });
});
