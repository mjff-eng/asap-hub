import { gp2 } from '@asap-hub/fixtures';
import { render, screen } from '@testing-library/react';

import { projectIcon, usersIcon, workingGroupIcon } from '../../icons';
import EventOwner, {
  getCalendarOwner,
  isCalendarOwnerActive,
} from '../EventOwner';

it('renders the interest group name linking to the group and icon', () => {
  render(
    <EventOwner
      project={{
        ...gp2.createProjectResponse(),
        id: 'grp',
        title: 'My Project',
      }}
    />,
  );
  expect(screen.getByText('My Project')).toHaveAttribute(
    'href',
    expect.stringMatching(/grp$/),
  );
  expect(screen.getByTitle('Projects')).toBeInTheDocument();
});

it('renders the working group name linking to the group and icon', () => {
  render(
    <EventOwner
      workingGroup={{
        ...gp2.createWorkingGroupResponse(),
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

it('shows that the event is run by GP2 when there is no project or working group', () => {
  render(<EventOwner />);
  expect(screen.getByText(/gp2 hub/i)).not.toHaveAttribute('href');
});
it('renders the working group name linking to the group and icon if there is a project too', () => {
  render(
    <EventOwner
      workingGroup={{
        ...gp2.createWorkingGroupResponse(),
        id: 'grp',
        title: 'My Working Group',
      }}
      project={{
        ...gp2.createProjectResponse(),
        id: 'grp',
        title: 'My Project',
      }}
    />,
  );
  expect(screen.getByText('My Working Group')).toHaveAttribute(
    'href',
    expect.stringMatching(/grp$/),
  );
  expect(screen.getByTitle('Working Groups')).toBeInTheDocument();
  expect(screen.queryByText('My Project')).not.toBeInTheDocument();
  expect(screen.queryByTitle('Projects')).not.toBeInTheDocument();
});

describe('getCalendarOwner', () => {
  const calendar = { ...gp2.createCalendarResponse(), name: 'Event Calendar' };

  it('returns the working group when there is a working group', () => {
    expect(
      getCalendarOwner({
        calendar,
        workingGroup: { id: 'wg', title: 'WG' },
        project: { id: 'p', title: 'P', status: 'Active' },
      }),
    ).toEqual({
      name: 'WG',
      href: expect.stringMatching(/wg$/),
      icon: workingGroupIcon,
    });
  });

  it('returns the project when there is only a project', () => {
    expect(
      getCalendarOwner({
        calendar,
        project: { id: 'p', title: 'P', status: 'Active' },
      }),
    ).toEqual({
      name: 'P',
      href: expect.stringMatching(/p$/),
      icon: projectIcon,
    });
  });

  it('falls back to the calendar name without a link', () => {
    expect(getCalendarOwner({ calendar })).toEqual({
      name: 'Event Calendar',
      href: undefined,
      icon: usersIcon,
    });
  });
});

describe('isCalendarOwnerActive', () => {
  it('returns true when there is a working group, even if the project is completed', () => {
    expect(
      isCalendarOwnerActive({
        workingGroup: { id: 'wg', title: 'WG' },
        project: { id: 'p', title: 'P', status: 'Completed' },
      }),
    ).toBe(true);
  });

  it('returns false when the only owner is a completed project', () => {
    expect(
      isCalendarOwnerActive({
        project: { id: 'p', title: 'P', status: 'Completed' },
      }),
    ).toBe(false);
  });

  it('returns true when the only owner is an active project', () => {
    expect(
      isCalendarOwnerActive({
        project: { id: 'p', title: 'P', status: 'Active' },
      }),
    ).toBe(true);
  });

  it('returns true when there is no project or working group', () => {
    expect(isCalendarOwnerActive({})).toBe(true);
  });
});
