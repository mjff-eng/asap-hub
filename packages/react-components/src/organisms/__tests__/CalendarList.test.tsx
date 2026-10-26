import { ComponentProps } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { createListCalendarResponse } from '@asap-hub/fixtures';

import { colour } from '../../colors';
import CalendarList from '../CalendarList';

const props: ComponentProps<typeof CalendarList> = {
  calendars: [],
  title: '',
};

it('Renders calender list', () => {
  const { getByRole } = render(
    <CalendarList
      {...props}
      title="Subscribe to this Interest Groups Calendar"
    />,
  );
  expect(getByRole('heading').textContent).toMatch(/subscribe/i);
});

it('Renders calender list item with colour', () => {
  const { getByText } = render(
    <CalendarList
      {...props}
      calendars={[
        {
          color: '#0D7813',
          name: 'Test Calendar',
          id: '1',
        },
      ]}
    />,
  );
  expect(getComputedStyle(getByText('●')).color).toMatch('rgb(13, 120, 19)');
  expect(getByText('Test Calendar')).toBeVisible();
});

it('links the calendar name in a new tab when the calendar has an href', () => {
  const { getByRole } = render(
    <CalendarList
      {...props}
      calendars={[
        { color: '#113F47', name: 'Test Calendar', id: '1', href: '/group' },
      ]}
    />,
  );
  const link = getByRole('link', { name: 'Test Calendar' });
  expect(link).toHaveAttribute('href', '/group');
  expect(link).toHaveAttribute('target', '_blank');
});

it('renders the empty message when there are no calendars', () => {
  const { getByText } = render(
    <CalendarList {...props} emptyMessage="No calendars yet." />,
  );
  expect(getByText('No calendars yet.')).toBeVisible();
});

it('does not render the empty message when there are calendars', () => {
  const { queryByText } = render(
    <CalendarList
      {...props}
      calendars={[{ color: '#113F47', name: 'Test Calendar', id: '1' }]}
      emptyMessage="No calendars yet."
    />,
  );
  expect(queryByText('No calendars yet.')).not.toBeInTheDocument();
});

it('Correctly generates the subscribe link', () => {
  const { getAllByRole } = render(
    <CalendarList
      {...props}
      calendars={[
        {
          color: '#113F47',
          name: 'Test Calendar',
          id: '1',
        },
      ]}
    />,
  );

  const links = getAllByRole('link').map((e) => e.getAttribute('href'));
  expect(links).toMatchInlineSnapshot(`
    [
      "https://support.apple.com/en-us/guide/calendar/icl1022/mac",
      "https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-cff1429c-5af6-41ec-a5b4-74f2c278e98c",
    ]
  `);
});

it('displays the show more button', () => {
  const { getByText, queryByText, getByRole } = render(
    <CalendarList
      {...props}
      calendars={[
        ...createListCalendarResponse(6).items,
        {
          color: '#113F47' as const,
          name: 'last Calendar',
          id: '1',
        },
      ]}
    />,
  );
  const button = getByRole('button', { name: 'View More' });

  expect(button).toBeVisible();
  expect(queryByText('last Calendar')).not.toBeInTheDocument();
  fireEvent.click(button);
  expect(getByRole('button', { name: 'View Less' })).toBeVisible();
  expect(getByText('last Calendar')).toBeInTheDocument();
});

it('displays the description', () => {
  const { getByText } = render(
    <CalendarList {...props} description={'Test Description'} />,
  );
  expect(getByText('Test Description')).toBeVisible();
});

it('renders an icon before each calendar name when provided', () => {
  const { getAllByTitle } = render(
    <CalendarList
      {...props}
      calendars={createListCalendarResponse(2).items}
      icon={
        <svg>
          <title>Calendar Icon</title>
        </svg>
      }
    />,
  );
  expect(getAllByTitle('Calendar Icon')).toHaveLength(2);
});

it('hides the calendar colour when hideCalendarColour is set', () => {
  const { getByText, queryByText } = render(
    <CalendarList
      {...props}
      calendars={[{ color: '#0D7813', name: 'Test Calendar', id: '1' }]}
      hideCalendarColour
    />,
  );
  expect(queryByText('●')).not.toBeInTheDocument();
  expect(getComputedStyle(getByText('Test Calendar')).fontWeight).not.toBe(
    'bold',
  );
});

it('shows calendar names without a link in the primary colour', () => {
  const { getByText } = render(
    <CalendarList
      {...props}
      calendars={[{ color: '#0D7813', name: 'Test Calendar', id: '1' }]}
      hideCalendarColour
    />,
  );
  expect(getByText('Test Calendar').closest('p')).toHaveStyleRule(
    'color',
    colour.foreground.primary,
  );
});
