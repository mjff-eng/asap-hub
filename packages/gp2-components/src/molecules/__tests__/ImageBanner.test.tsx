import { render, screen } from '@testing-library/react';

import ImageBanner from '../ImageBanner';

it('renders the image as the background', () => {
  render(<ImageBanner image="banner.png" />);
  expect(screen.getByRole('presentation')).toHaveStyle(
    'background-image: url(banner.png)',
  );
});
