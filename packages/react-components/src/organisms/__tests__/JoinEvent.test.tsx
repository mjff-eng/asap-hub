import { render, act } from '@testing-library/react';
import { subMinutes, addMinutes, addDays, subHours } from 'date-fns';

import JoinEvent from '../JoinEvent';
import { colour } from '../../colors';

jest.useFakeTimers();

// Store interval callback for manual triggering in tests
let intervalCallback: (() => void) | null = null;

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useInterval: (callback: () => void) => {
    intervalCallback = callback;
  },
}));

beforeEach(() => {
  intervalCallback = null;
});

// Helper to trigger the interval callback
const triggerIntervalCallback = () => {
  if (intervalCallback) {
    intervalCallback();
  }
};

it('renders a link to the meeting', () => {
  const { getByText } = render(
    <JoinEvent
      startDate={subMinutes(new Date(), 1).toISOString()}
      endDate={addMinutes(new Date(), 1).toISOString()}
      meetingLink="https://example.com/meeting"
    />,
  );
  expect(getByText(/join.+meeting/i).closest('a')).toHaveAttribute(
    'href',
    'https://example.com/meeting',
  );
});
it('renders a disabled link if the meeting link is missing', () => {
  const startDate = subMinutes(new Date(), 1).toISOString();
  const endDate = addMinutes(new Date(), 1).toISOString();

  const { getByText, rerender } = render(
    <JoinEvent
      startDate={startDate}
      endDate={endDate}
      meetingLink="https://example.com/meeting"
    />,
  );
  expect(getByText(/join.+meeting/i).closest('a')).not.toHaveStyleRule(
    'background-color',
    colour.background.tertiary,
  );

  rerender(
    <JoinEvent
      startDate={startDate}
      endDate={endDate}
      meetingLink={undefined}
    />,
  );
  expect(getByText(/join.+meeting/i).closest('a')).toHaveStyleRule(
    'background-color',
    colour.background.tertiary,
  );
});
it('renders a disabled link if the meeting starts more than 24h from current time', () => {
  const startDate = addDays(new Date(), 2).toISOString();
  const endDate = addDays(new Date(), 2).toISOString();

  const { getByText } = render(
    <JoinEvent
      startDate={startDate}
      endDate={endDate}
      meetingLink="https://example.com/meeting"
    />,
  );

  expect(getByText(/join.+meeting/i).closest('a')).toHaveStyleRule(
    'background-color',
    colour.background.tertiary,
  );
});

it('informs you when to expect a link way before the event', () => {
  const { getByText } = render(
    <JoinEvent
      startDate={addDays(new Date(), 1000).toISOString()}
      endDate={addDays(new Date(), 1001).toISOString()}
    />,
  );
  expect(getByText(/link will be available/i)).toBeVisible();
});

it('refreshes when the link should become available', () => {
  const handleRefresh = jest.fn();

  // Start time within 24 hours of event (link should be available)
  // This means startRefreshing will be true
  render(
    <JoinEvent
      startDate={addMinutes(new Date(), 10).toISOString()}
      endDate={addMinutes(new Date(), 11).toISOString()}
      onRefresh={handleRefresh}
    />,
  );

  act(() => {
    // Manually trigger the interval callback
    // The callback checks: !meetingLink && startRefreshing && !hasEnded
    // Since there's no meeting link, start is within 24h, and event hasn't ended,
    // onRefresh should be called
    triggerIntervalCallback();
  });

  expect(handleRefresh).toHaveBeenCalled();
});
it("warns when the event should be available but isn't", () => {
  const { getByText } = render(
    <JoinEvent
      startDate={addMinutes(new Date(), 10).toISOString()}
      endDate={addMinutes(new Date(), 11).toISOString()}
    />,
  );

  act(() => {
    jest.advanceTimersByTime(5 * 60 * 1000);
  });
  expect(getByText(/couldn’t find.+link/i)).toBeVisible();
});
it('does not refresh if there is already a link', () => {
  const handleRefresh = jest.fn();
  render(
    <JoinEvent
      startDate={addMinutes(new Date(), 10).toISOString()}
      endDate={addMinutes(new Date(), 11).toISOString()}
      onRefresh={handleRefresh}
      meetingLink="https://example.com/meeting"
    />,
  );

  // Trigger the interval - but since meetingLink is provided,
  // the condition (!meetingLink && ...) is false, so onRefresh should NOT be called
  act(() => {
    triggerIntervalCallback();
  });
  expect(handleRefresh).not.toHaveBeenCalled();
});
it('does not refresh way before the event', () => {
  const handleRefresh = jest.fn();
  render(
    <JoinEvent
      startDate={addMinutes(new Date(), 10_000).toISOString()}
      endDate={addMinutes(new Date(), 11_000).toISOString()}
      onRefresh={handleRefresh}
    />,
  );

  // Trigger the interval - but startRefreshing is false (event is 10,000 minutes away,
  // which is way more than 24 hours), so onRefresh should NOT be called
  act(() => {
    triggerIntervalCallback();
  });
  expect(handleRefresh).not.toHaveBeenCalled();
});
it('does not refresh after the event', () => {
  const handleRefresh = jest.fn();
  render(
    <JoinEvent
      startDate={subMinutes(new Date(), 11_000).toISOString()}
      endDate={subMinutes(new Date(), 10_000).toISOString()}
      onRefresh={handleRefresh}
    />,
  );

  // Trigger the interval - but hasEnded is true (event ended 10,000 minutes ago),
  // so onRefresh should NOT be called
  act(() => {
    triggerIntervalCallback();
  });
  expect(handleRefresh).not.toHaveBeenCalled();
});

it('informs you when the event has started', () => {
  const { getByText } = render(
    <JoinEvent
      startDate={addMinutes(new Date(), 1).toISOString()}
      endDate={addMinutes(new Date(), 10).toISOString()}
      meetingLink="https://example.com/meeting"
    />,
  );

  act(() => {
    jest.advanceTimersByTime(2 * 60 * 1000);
  });
  expect(getByText(/currently happening/i)).toBeVisible();
});

it('renders nothing after the event has ended', () => {
  const { container } = render(
    <JoinEvent
      startDate={subHours(new Date(), 5).toISOString()}
      endDate={subHours(new Date(), 4).toISOString()}
      meetingLink="https://example.com/meeting"
    />,
  );

  act(() => {
    jest.advanceTimersByTime(5 * 60 * 1000);
  });
  expect(container).toBeEmptyDOMElement();
});
