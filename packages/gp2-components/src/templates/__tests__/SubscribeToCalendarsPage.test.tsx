import { ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';

import SubscribeToCalendarsPage from '../SubscribeToCalendarsPage';

const props: ComponentProps<typeof SubscribeToCalendarsPage> = {
  hubCalendar: { id: 'hub@gp2.org', name: 'GP2 Hub', color: '#B1365F' },
  workingGroupCalendars: [
    {
      id: 'wg@gp2.org',
      name: 'WG Calendar',
      color: '#711616',
      href: '/working-groups/wg-1/upcoming',
    },
  ],
};

const getWorkingGroupsSection = () =>
  screen.getByRole('heading', { name: 'Working Groups' }).parentElement!
    .parentElement!;

describe('SubscribeToCalendarsPage', () => {
  it('renders the GP2 Hub Updates section', () => {
    render(<SubscribeToCalendarsPage {...props} />);
    expect(
      screen.getByRole('heading', { name: 'GP2 Hub Updates' }),
    ).toBeVisible();
  });

  it('does not render the GP2 Hub Updates section without a hub calendar', () => {
    render(<SubscribeToCalendarsPage {...props} hubCalendar={undefined} />);
    expect(
      screen.queryByRole('heading', { name: 'GP2 Hub Updates' }),
    ).not.toBeInTheDocument();
  });

  it('links the working group calendar to its upcoming events', () => {
    render(<SubscribeToCalendarsPage {...props} />);
    expect(
      within(getWorkingGroupsSection()).getByRole('link', {
        name: 'WG Calendar',
      }),
    ).toHaveAttribute('href', '/working-groups/wg-1/upcoming');
  });

  it('renders the working group icon', () => {
    render(<SubscribeToCalendarsPage {...props} />);
    expect(
      within(getWorkingGroupsSection()).getByTitle('Working Groups'),
    ).toBeInTheDocument();
  });

  it('renders the empty message when there are no working group calendars', () => {
    render(<SubscribeToCalendarsPage workingGroupCalendars={[]} />);
    expect(
      screen.getByText(
        'No Working Groups are scheduled to present yet. Once one is, you can subscribe to it here.',
      ),
    ).toBeVisible();
  });

  it('renders the tech support call to action with the GP2 email', () => {
    render(<SubscribeToCalendarsPage {...props} />);
    expect(
      screen.getByRole('link', { name: 'Contact tech support' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:techsupport@gp2\.org/),
    );
  });
});
