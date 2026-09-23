import { render } from '@testing-library/react';

import EventMaterialsEmptyView from '../EventMaterialsEmptyView';

it('renders a message saying materials are coming soon', () => {
  const { getByText } = render(
    <EventMaterialsEmptyView variant="coming-soon" />,
  );
  expect(
    getByText(/meeting materials for this event will be coming soon/i),
  ).toBeVisible();
});

it('renders a message saying nothing was shared for a stale event', () => {
  const { getByText } = render(<EventMaterialsEmptyView variant="stale" />);
  expect(getByText(/nothing was shared for this event/i)).toBeVisible();
});
