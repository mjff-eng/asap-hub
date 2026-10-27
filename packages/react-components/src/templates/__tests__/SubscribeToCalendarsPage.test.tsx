import { ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';

import SubscribeToCalendarsPage from '../SubscribeToCalendarsPage';

const props: ComponentProps<typeof SubscribeToCalendarsPage> = {
  hubCalendar: { id: 'hub@asap.science', name: 'ASAP Hub', color: '#B1365F' },
  interestGroupCalendars: [
    {
      id: 'ig@asap.science',
      name: 'IG Calendar',
      color: '#5C1158',
      href: '/network/interest-groups/ig-1/upcoming',
    },
  ],
  workingGroupCalendars: [
    {
      id: 'wg@asap.science',
      name: 'WG Calendar',
      color: '#711616',
      href: '/network/working-groups/wg-1/upcoming',
    },
  ],
  seminarSeriesCalendars: [
    { id: 'seminar@asap.science', name: 'Seminar Calendar', color: '#691426' },
  ],
};

const getSection = (title: string) =>
  screen.getByRole('heading', { name: title }).parentElement!.parentElement!;

it('renders the CRN Hub Updates section', () => {
  render(<SubscribeToCalendarsPage {...props} />);
  expect(
    screen.getByRole('heading', { name: 'CRN Hub Updates' }),
  ).toBeVisible();
});

it.each`
  title                | calendarName
  ${'Interest Groups'} | ${'IG Calendar'}
  ${'Working Groups'}  | ${'WG Calendar'}
  ${'Seminar Series'}  | ${'Seminar Calendar'}
`('renders $calendarName in the $title section', ({ title, calendarName }) => {
  render(<SubscribeToCalendarsPage {...props} />);
  expect(within(getSection(title)).getByText(calendarName)).toBeVisible();
});

it.each`
  title                | calendarName     | href
  ${'Interest Groups'} | ${'IG Calendar'} | ${'/network/interest-groups/ig-1/upcoming'}
  ${'Working Groups'}  | ${'WG Calendar'} | ${'/network/working-groups/wg-1/upcoming'}
`(
  'links $calendarName to the group upcoming events in the $title section',
  ({ title, calendarName, href }) => {
    render(<SubscribeToCalendarsPage {...props} />);
    expect(
      within(getSection(title)).getByRole('link', { name: calendarName }),
    ).toHaveAttribute('href', href);
  },
);

it('does not link seminar series calendars', () => {
  render(<SubscribeToCalendarsPage {...props} />);
  expect(
    within(getSection('Seminar Series')).queryByRole('link', {
      name: 'Seminar Calendar',
    }),
  ).not.toBeInTheDocument();
});

it.each`
  title                | message
  ${'Interest Groups'} | ${'No Interest Groups are scheduled to present yet. Once one is, you can subscribe to it here.'}
  ${'Working Groups'}  | ${'No Working Groups are scheduled to present yet. Once one is, you can subscribe to it here.'}
  ${'Seminar Series'}  | ${'No Seminar Series are scheduled yet. Once one is, you can subscribe to it here.'}
`('renders the empty message in the $title section', ({ title, message }) => {
  render(
    <SubscribeToCalendarsPage
      interestGroupCalendars={[]}
      workingGroupCalendars={[]}
      seminarSeriesCalendars={[]}
    />,
  );
  expect(within(getSection(title)).getByText(message)).toBeVisible();
});

it('does not render the CRN Hub Updates section without a hub calendar', () => {
  render(<SubscribeToCalendarsPage {...props} hubCalendar={undefined} />);
  expect(
    screen.queryByRole('heading', { name: 'CRN Hub Updates' }),
  ).not.toBeInTheDocument();
});

it('renders the group icons in the interest group and working group sections', () => {
  render(<SubscribeToCalendarsPage {...props} />);
  expect(
    within(getSection('Interest Groups')).getByTitle('Interest Group'),
  ).toBeInTheDocument();
  expect(
    within(getSection('Working Groups')).getByTitle('Working Groups'),
  ).toBeInTheDocument();
});

it('renders the manual setup instructions and the tech support call to action', () => {
  render(<SubscribeToCalendarsPage {...props} />);
  expect(screen.getByRole('link', { name: 'Apple Calendar' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Outlook' })).toBeVisible();
  expect(
    screen.getByText('Having trouble accessing this event?'),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Contact tech support' }),
  ).toHaveAttribute(
    'href',
    expect.stringMatching(/^mailto:techsupport@asap\.science/),
  );
});
