import { screen } from '@testing-library/react';

import { renderApp } from '../../test-utils';
import NotFound from '../NotFound';

it('names the missing page and points back to the demos', () => {
  renderApp(<NotFound />);

  expect(
    screen.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Back to demos' })).toHaveAttribute(
    'href',
    '/',
  );
});
