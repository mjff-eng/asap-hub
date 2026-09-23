import { createListEventResponse } from '@asap-hub/fixtures';
import { render, screen, fireEvent } from '@testing-library/react';

import EventsSection from '../EventsSection';
import { useEvents } from '../../../events/state';

jest.mock('../../../events/state');

const mockUseEvents = useEvents as jest.MockedFunction<typeof useEvents>;

afterEach(() => {
  jest.clearAllMocks();
});

it('renders the combined events section', () => {
  mockUseEvents.mockReturnValue(
    createListEventResponse(1) as ReturnType<typeof useEvents>,
  );
  render(<EventsSection date={new Date()} />);
  expect(screen.getByText('Events')).toBeVisible();
  expect(
    screen.getByText(/explore upcoming and previous events/i),
  ).toBeVisible();
});

it('points View All at the upcoming events page when the upcoming tab is active', () => {
  mockUseEvents.mockReturnValue(
    createListEventResponse(1) as ReturnType<typeof useEvents>,
  );
  render(<EventsSection date={new Date()} />);
  expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute(
    'href',
    '/events/upcoming',
  );
});

it('points View All at the past events page when the past tab is active', () => {
  mockUseEvents.mockReturnValue(
    createListEventResponse(1) as ReturnType<typeof useEvents>,
  );
  render(<EventsSection date={new Date()} />);

  fireEvent.click(screen.getByText('Past'));

  expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute(
    'href',
    '/events/past',
  );
});
