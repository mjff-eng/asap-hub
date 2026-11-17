import {
  createCalendarResponse,
  createInterestGroupResponse,
  createWorkingGroupResponse,
} from '@asap-hub/fixtures';
import { render, screen } from '@testing-library/react';

import EventOwner, { getCalendarOwner } from '../EventOwner';

it('renders the interest group name linking to the group and icon', () => {
  render(
    <EventOwner
      interestGroup={{
        ...createInterestGroupResponse(),
        id: 'grp',
        name: 'My Group',
      }}
    />,
  );
  expect(screen.getByText('My Group')).toHaveAttribute(
    'href',
    expect.stringMatching(/grp$/),
  );
  expect(screen.getByTitle('Interest Group')).toBeInTheDocument();
});

it('renders the working group name linking to the group and icon', () => {
  render(
    <EventOwner
      workingGroup={{
        ...createWorkingGroupResponse(),
        id: 'grp',
        title: 'My Working Group',
      }}
    />,
  );
  expect(screen.getByText('My Working Group')).toHaveAttribute(
    'href',
    expect.stringMatching(/grp$/),
  );
  expect(screen.getByTitle('Working Groups')).toBeInTheDocument();
});

it('shows that the event is run by ASAP when there is no group', () => {
  render(<EventOwner />);
  expect(screen.getByText('ASAP Event')).not.toHaveAttribute('href');
  expect(screen.getByTitle('ASAP Event Icon')).toBeInTheDocument();
});

it('displays inactive badge when a group is inactive', () => {
  render(
    <EventOwner
      interestGroup={{ ...createInterestGroupResponse(), active: false }}
    />,
  );

  expect(screen.getByTitle('Inactive Interest Group')).toBeInTheDocument();
});

describe('getCalendarOwner', () => {
  const calendar = { ...createCalendarResponse(), name: 'Event Calendar' };

  it('returns the interest group with a link and icon', () => {
    const owner = getCalendarOwner({
      calendar,
      interestGroup: {
        ...createInterestGroupResponse(),
        id: 'ig-1',
        name: 'IG',
      },
      workingGroup: {
        ...createWorkingGroupResponse(),
        id: 'wg-1',
        title: 'WG',
      },
    });
    expect(owner.name).toBe('IG');
    expect(owner.href).toMatch(/ig-1$/);
    render(<>{owner.icon}</>);
    expect(screen.getByTitle('Interest Group')).toBeInTheDocument();
  });

  it('returns the working group with a link and icon', () => {
    const owner = getCalendarOwner({
      calendar,
      workingGroup: {
        ...createWorkingGroupResponse(),
        id: 'wg-1',
        title: 'WG',
      },
    });
    expect(owner.name).toBe('WG');
    expect(owner.href).toMatch(/wg-1$/);
    render(<>{owner.icon}</>);
    expect(screen.getByTitle('Working Groups')).toBeInTheDocument();
  });

  it('falls back to the calendar name without a link', () => {
    const owner = getCalendarOwner({ calendar });
    expect(owner.name).toBe('Event Calendar');
    expect(owner.href).toBeUndefined();
    render(<>{owner.icon}</>);
    expect(screen.getByTitle('ASAP Event Icon')).toBeInTheDocument();
  });
});
