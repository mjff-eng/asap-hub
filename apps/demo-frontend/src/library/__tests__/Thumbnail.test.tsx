import { fireEvent, render, screen } from '@testing-library/react';

import { Thumbnail } from '../Thumbnail';

const renderThumbnail = () =>
  render(
    <Thumbnail videoId="video 1" creatorName="Sam Creator" duration="10:00" />,
  );

it('encodes the video id into the thumbnail source and shows the duration', () => {
  renderThumbnail();

  const image = screen.getByRole('presentation', { hidden: true });
  expect(image).toHaveAttribute('src', '/media/video%201/thumb.jpg');
  expect(screen.getByText('10:00')).toBeVisible();
});

it('shows the creator name card until the image decodes', () => {
  renderThumbnail();

  expect(screen.getByText('Sam Creator')).toBeVisible();

  fireEvent.load(screen.getByRole('presentation', { hidden: true }));

  expect(screen.queryByText('Sam Creator')).toBeNull();
});

it('falls back to the creator name card when the image fails to load', () => {
  renderThumbnail();

  const image = screen.getByRole('presentation', { hidden: true });
  fireEvent.load(image);
  expect(screen.queryByText('Sam Creator')).toBeNull();

  fireEvent.error(image);
  expect(screen.getByText('Sam Creator')).toBeVisible();
});
