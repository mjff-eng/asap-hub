import { events, searchQueryParam } from '@asap-hub/routing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaticRouter } from 'react-router';
import EventsPageHeader from '../EventsPageHeader';

it('renders the heading', () => {
  const { getByRole } = render(<EventsPageHeader />);
  expect(getByRole('heading', { level: 1 })).toHaveTextContent(
    'Calendar & Events',
  );
});

it('renders the navigation', () => {
  const { getAllByRole } = render(<EventsPageHeader />);
  expect(
    getAllByRole('listitem').map(({ textContent }) => textContent),
  ).toEqual(['Upcoming Events', 'Past Events', 'Subscribe to Calendars']);
});

it('preserves search query when navigating', () => {
  const { getByText } = render(
    <StaticRouter location={events({}).upcoming({}).$}>
      <EventsPageHeader searchQuery="searchterm" />
    </StaticRouter>,
  );
  expect(
    new URL(getByText(/past/i).closest('a')!.href).searchParams.get(
      searchQueryParam,
    ),
  ).toBe('searchterm');
});

describe('month filter', () => {
  const year = new Date().getFullYear();

  it('is not shown without onChangeMonthFilter', () => {
    render(<EventsPageHeader searchQuery="" />);
    expect(
      screen.queryByRole('button', { name: /filter/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the event counts of the current year', async () => {
    render(
      <EventsPageHeader
        searchQuery=""
        monthCounts={{
          [`${year}-01`]: 7,
          [`${year}-04`]: 3,
          [`${year - 1}-02`]: 2,
        }}
        onChangeMonthFilter={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /filter/i }));

    expect(screen.getByRole('button', { name: /jan/i })).toHaveTextContent(
      '7 events',
    );
    expect(screen.getByRole('button', { name: /apr/i })).toHaveTextContent(
      '3 events',
    );
    expect(screen.getByText(`All of ${year}`).parentElement).toHaveTextContent(
      '10 events',
    );
  });

  it('calls onChangeMonthFilter with the selected month', async () => {
    const onChangeMonthFilter = jest.fn();
    render(
      <EventsPageHeader
        searchQuery=""
        monthCounts={{ [`${year}-01`]: 7 }}
        onChangeMonthFilter={onChangeMonthFilter}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /filter/i }));
    await userEvent.click(screen.getByRole('button', { name: /jan/i }));

    expect(onChangeMonthFilter).toHaveBeenCalledWith(new Set([`${year}-01`]));
  });
});
