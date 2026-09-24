import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EventTime from '../EventTime';
import { getLocalTimezone } from '../../localization';

jest.mock('../../localization');

const mockGetLocalTimezone = getLocalTimezone as jest.MockedFunction<
  typeof getLocalTimezone
>;
beforeEach(() => {
  mockGetLocalTimezone.mockReturnValue('UTC');
});

it("the time is shown in the user's local timezone", () => {
  mockGetLocalTimezone.mockReturnValue('America/New_York');
  const { container } = render(
    <EventTime
      startDate={new Date('2021-01-25T15:00:00Z').toISOString()}
      startDateTimeZone="UTC"
      endDate={new Date('2021-01-25T16:00:00Z').toISOString()}
      endDateTimeZone="UTC"
    />,
  );
  expect(container).toHaveTextContent(/\D10:00\D.*\D11:00\D.*EST/);
});

describe('the date', () => {
  it('is shown only once if start and end date are the same', () => {
    const { container } = render(
      <EventTime
        startDate={new Date('2021-01-25T00:00:00Z').toISOString()}
        startDateTimeZone="UTC"
        endDate={new Date('2021-01-25T10:00:00Z').toISOString()}
        endDateTimeZone="UTC"
      />,
    );
    expect(container).toHaveTextContent(/\D25\D/);
    expect(container).not.toHaveTextContent(/\D25\D.*\D25\D/);
  });

  it('is shown for start and end day for a multi-day event', () => {
    mockGetLocalTimezone.mockReturnValue('America/New_York');
    const { container } = render(
      <EventTime
        startDate={new Date('2021-01-26T00:00:00Z').toISOString()}
        startDateTimeZone="UTC"
        endDate={new Date('2021-01-26T10:00:00Z').toISOString()}
        endDateTimeZone="UTC"
      />,
    );
    expect(container).toHaveTextContent(/\D25\D.*\D26\D/);
  });

  it('includes both months for a multi-day event spanning two months', () => {
    const { container } = render(
      <EventTime
        startDate={new Date('2021-01-31T09:00:00Z').toISOString()}
        startDateTimeZone="UTC"
        endDate={new Date('2021-02-01T10:00:00Z').toISOString()}
        endDateTimeZone="UTC"
      />,
    );
    expect(container).toHaveTextContent(/January.*February 2021/);
  });

  it('includes both years for a multi-day event spanning two years', () => {
    const { container } = render(
      <EventTime
        startDate={new Date('2021-12-31T09:00:00Z').toISOString()}
        startDateTimeZone="UTC"
        endDate={new Date('2022-01-01T10:00:00Z').toISOString()}
        endDateTimeZone="UTC"
      />,
    );
    expect(container).toHaveTextContent(/December 2021.*January 2022/);
  });
});

describe('a tooltip', () => {
  it('is shown mentioning the original timezone once if the same for start and end date', async () => {
    const { getByTitle, getByRole } = render(
      <EventTime
        startDate={new Date('2021-01-26T09:00:00Z').toISOString()}
        startDateTimeZone="Europe/Berlin"
        endDate={new Date('2021-01-26T10:00:00Z').toISOString()}
        endDateTimeZone="Europe/Berlin"
      />,
    );
    await userEvent.click(getByTitle(/info/i));
    expect(getByRole('tooltip')).toHaveTextContent(
      /\D10:00\D.*\D11:00\D.*GMT\+1\D/,
    );
    expect(getByRole('tooltip')).not.toHaveTextContent(/GMT\+1\D.*GMT\+1\D/);
  });

  it('is shown mentioning the original start and end timezones', async () => {
    const { getByTitle, getByRole } = render(
      <EventTime
        startDate={new Date('2021-01-26T09:00:00Z').toISOString()}
        startDateTimeZone="Europe/Berlin"
        endDate={new Date('2021-01-26T10:00:00Z').toISOString()}
        endDateTimeZone="Europe/Tallinn"
      />,
    );
    await userEvent.click(getByTitle(/info/i));
    expect(getByRole('tooltip')).toHaveTextContent(
      /\D10:00\D.*GMT\+1\D.*\D12:00\D.*GMT\+2\D/,
    );
  });
});

describe('the recurring badge', () => {
  const props = {
    startDate: new Date('2021-01-25T09:00:00Z').toISOString(),
    startDateTimeZone: 'UTC',
    endDate: new Date('2021-01-25T10:00:00Z').toISOString(),
    endDateTimeZone: 'UTC',
  };

  it('is shown for recurring events', () => {
    const { getByText } = render(<EventTime {...props} recurring />);
    expect(getByText('Recurring')).toBeVisible();
  });

  it('is not shown for non-recurring events', () => {
    const { queryByText } = render(<EventTime {...props} recurring={false} />);
    expect(queryByText('Recurring')).not.toBeInTheDocument();
  });

  it('is shown alongside the day count for a recurring multi-day event', () => {
    const { getByText } = render(
      <EventTime
        startDate={new Date('2021-01-25T09:00:00Z').toISOString()}
        startDateTimeZone="UTC"
        endDate={new Date('2021-01-26T10:00:00Z').toISOString()}
        endDateTimeZone="UTC"
        recurring
      />,
    );
    expect(getByText('Recurring')).toBeVisible();
    expect(getByText('2 days')).toBeVisible();
  });
});
