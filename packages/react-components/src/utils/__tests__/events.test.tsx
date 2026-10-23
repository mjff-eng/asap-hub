import { act, renderHook } from '@testing-library/react';
import { addDays, addHours, addMinutes, parseISO, subDays } from 'date-fns';
import {
  considerEndedAfter,
  MEETING_LINK_REFRESH_INTERVAL_SECONDS,
  useEventLiveStatus,
  useMeetingLinkRefresh,
} from '../index';

const mockIntervalCallbacks = new Map<number | null, () => void>();

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useInterval: (callback: () => void, delay: number | null) => {
    mockIntervalCallbacks.set(delay, callback);
  },
}));

beforeEach(() => {
  mockIntervalCallbacks.clear();
});

describe('considerEndedAfter', () => {
  const dateNow = new Date();

  it('Adds one hour to the current time', () => {
    expect(considerEndedAfter(dateNow.toISOString())).toEqual(
      addHours(parseISO(dateNow.toISOString()), 1),
    );
  });

  it('Does not add any other ammount', () => {
    expect(considerEndedAfter(dateNow.toISOString())).not.toEqual(
      addHours(parseISO(dateNow.toISOString()), 2),
    );
  });
});

describe('useEventLiveStatus', () => {
  const renderStatus = (startDate: Date) =>
    renderHook(() =>
      useEventLiveStatus(
        startDate.toISOString(),
        addHours(startDate, 1).toISOString(),
      ),
    ).result.current;

  it('is starting soon less than 24 hours before the start', () => {
    expect(renderStatus(addHours(new Date(), 3))).toEqual({
      hasStarted: false,
      hasFinished: false,
      isStartingSoon: true,
    });
  });

  it('is not starting soon more than 24 hours before the start', () => {
    expect(renderStatus(addHours(new Date(), 25)).isStartingSoon).toBe(false);
  });

  it('is not starting soon once the event has started', () => {
    expect(renderStatus(addMinutes(new Date(), 1))).toEqual({
      hasStarted: true,
      hasFinished: false,
      isStartingSoon: false,
    });
  });
});

describe('useMeetingLinkRefresh', () => {
  const triggerRefresh = () =>
    act(() => {
      mockIntervalCallbacks.get(
        MEETING_LINK_REFRESH_INTERVAL_SECONDS * 1000,
      )?.();
    });

  const upcomingEvent = {
    startDate: addMinutes(new Date(), 10).toISOString(),
    endDate: addMinutes(new Date(), 70).toISOString(),
  };

  it('refreshes while the meeting link is expected but missing', () => {
    const onRefresh = jest.fn();
    renderHook(() => useMeetingLinkRefresh({ ...upcomingEvent, onRefresh }));
    triggerRefresh();
    expect(onRefresh).toHaveBeenCalled();
  });

  it.each`
    description                                | options
    ${'the meeting link is already there'}     | ${{ ...upcomingEvent, meetingLink: 'https://example.com' }}
    ${'the meeting link is hidden'}            | ${{ ...upcomingEvent, hideMeetingLink: true }}
    ${'the meeting link is not available yet'} | ${{ startDate: addDays(new Date(), 2).toISOString(), endDate: addDays(new Date(), 3).toISOString() }}
    ${'the event has ended'}                   | ${{ startDate: subDays(new Date(), 2).toISOString(), endDate: subDays(new Date(), 1).toISOString() }}
  `('does not refresh when $description', ({ options }) => {
    const onRefresh = jest.fn();
    renderHook(() => useMeetingLinkRefresh({ ...options, onRefresh }));
    triggerRefresh();
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
