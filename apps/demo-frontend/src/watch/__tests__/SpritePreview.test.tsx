import { render, screen } from '@testing-library/react';

import type { ThumbnailCue } from '../../utils/vtt';
import SpritePreview from '../SpritePreview';

const cues: ThumbnailCue[] = [
  { startSeconds: 0, endSeconds: 60, x: 0, y: 0, width: 160, height: 90 },
  { startSeconds: 60, endSeconds: 120, x: 160, y: 90, width: 160, height: 90 },
];

const renderPreview = (
  props: Partial<Parameters<typeof SpritePreview>[0]> = {},
) =>
  render(
    <SpritePreview
      spriteUrl="/media/video-1/sprite.jpg"
      cues={cues}
      seconds={75}
      left={120}
      {...props}
    />,
  );

const frame = () =>
  screen
    .getByTestId('sprite-preview')
    .querySelector('[style*="background-image"]') as HTMLElement | null;

it('shows the sprite frame for the previewed time under its timestamp', () => {
  renderPreview();

  expect(screen.getByText('1:15')).toBeVisible();
  expect(frame()).toHaveStyle({
    backgroundImage: 'url(/media/video-1/sprite.jpg)',
    backgroundPosition: '-160px -90px',
    width: '160px',
    height: '90px',
  });
});

it('falls back to the nearest frame past the last thumbnail', () => {
  renderPreview({ seconds: 300 });

  expect(screen.getByText('5:00')).toBeVisible();
  expect(frame()).toHaveStyle({ backgroundPosition: '-160px -90px' });
});

it('shows only the timestamp before the thumbnails have loaded', () => {
  renderPreview({ cues: [] });

  expect(screen.getByText('1:15')).toBeVisible();
  expect(frame()).toBeNull();
});

it('sits at the offset it is given', () => {
  renderPreview({ left: 42, anchor: 'top-left' });

  expect(screen.getByTestId('sprite-preview')).toHaveStyle({ left: '42px' });
});
