import { disable, enable } from '@asap-hub/flags';
import { render } from '@testing-library/react';

import EventMaterialsUnavailable from '../EventMaterialsUnavailable';

afterEach(() => {
  disable('NEW_EVENT_PAGE');
});

it('renders a card saying there are no materials available', () => {
  const { getByText } = render(<EventMaterialsUnavailable />);
  expect(getByText(/no .* material/i)).toBeVisible();
});

it('renders the new placeholder when the NEW_EVENT_PAGE flag is enabled', () => {
  enable('NEW_EVENT_PAGE');
  const { getByText } = render(<EventMaterialsUnavailable />);
  expect(getByText('No meeting materials available.')).toBeVisible();
  expect(getByText(/nothing was shared for this event/i)).toBeVisible();
});
