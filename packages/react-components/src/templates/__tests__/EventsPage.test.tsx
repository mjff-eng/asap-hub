import { render } from '@testing-library/react';

import EventsPage from '../EventsPage';

it('renders the header', () => {
  const { getByRole } = render(<EventsPage />);
  expect(getByRole('heading', { level: 1 })).toHaveTextContent(
    'Calendar & Events',
  );
});

it('renders the children', () => {
  const { getByText } = render(<EventsPage>Content</EventsPage>);
  expect(getByText('Content')).toBeVisible();
});
