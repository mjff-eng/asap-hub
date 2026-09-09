import { fireEvent, render, screen } from '@testing-library/react';

import SpeakerTeamRow from '../SpeakerTeamRow';

const users = [
  { id: 'u1', displayName: 'Jane Doe', roles: ['Lead PI'] },
  {
    id: 'u2',
    displayName: 'John Smith',
    roles: ['Project Manager', 'Data Manager'],
  },
];

const defaultProps = {
  label: 'Team Alpha',
  users,
  preliminaryFindingsShared: false,
  expanded: false,
  onToggleExpanded: jest.fn(),
  onToggleShared: jest.fn(),
  onRemoveUser: jest.fn(),
};

it('renders the team name, member count, and current switch state', () => {
  render(<SpeakerTeamRow {...defaultProps} />);
  expect(screen.getByText('Team Alpha')).toBeVisible();
  expect(screen.getByText('(2)')).toBeVisible();
  expect(
    screen.getByRole('checkbox', {
      name: 'Team Alpha preliminary findings shared',
    }),
  ).not.toBeChecked();
});

it('hides the preliminary findings switch when showShared is false', () => {
  render(<SpeakerTeamRow {...defaultProps} showShared={false} />);
  expect(
    screen.queryByRole('checkbox', {
      name: 'Team Alpha preliminary findings shared',
    }),
  ).not.toBeInTheDocument();
});

it('does not render the nested user list at all when collapsed', () => {
  render(<SpeakerTeamRow {...defaultProps} expanded={false} />);
  expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
});

it('renders the nested user list, including role badges, when expanded', () => {
  render(<SpeakerTeamRow {...defaultProps} expanded />);
  expect(screen.getByText('Jane Doe')).toBeVisible();
  expect(screen.getByText('Lead PI')).toBeVisible();
  expect(screen.getByText('Multiple roles')).toBeVisible();
});

it('calls onToggleExpanded when the chevron is clicked', () => {
  const onToggleExpanded = jest.fn();
  render(
    <SpeakerTeamRow {...defaultProps} onToggleExpanded={onToggleExpanded} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Expand Team Alpha' }));
  expect(onToggleExpanded).toHaveBeenCalled();
});

it('reflects the expanded state on the chevron via aria-expanded', () => {
  const { rerender } = render(
    <SpeakerTeamRow {...defaultProps} expanded={false} />,
  );
  expect(
    screen.getByRole('button', { name: 'Expand Team Alpha' }),
  ).toHaveAttribute('aria-expanded', 'false');
  rerender(<SpeakerTeamRow {...defaultProps} expanded />);
  expect(
    screen.getByRole('button', { name: 'Collapse Team Alpha' }),
  ).toHaveAttribute('aria-expanded', 'true');
});

it('calls onRemoveUser with the user id, not the group id, when a nested delete button is clicked', () => {
  const onRemoveUser = jest.fn();
  render(
    <SpeakerTeamRow {...defaultProps} expanded onRemoveUser={onRemoveUser} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Remove Jane Doe' }));
  expect(onRemoveUser).toHaveBeenCalledWith('u1');
});

it('renders an inactive badge next to the team name when isTeamInactive is true', () => {
  render(<SpeakerTeamRow {...defaultProps} isTeamInactive />);
  expect(screen.getByTitle('Inactive Team')).toBeInTheDocument();
});

it('does not render an inactive badge when isTeamInactive is false or omitted', () => {
  render(<SpeakerTeamRow {...defaultProps} />);
  expect(screen.queryByTitle('Inactive Team')).not.toBeInTheDocument();
});

it('renders each team member as a link to their profile and shows an alumni badge when applicable', () => {
  render(
    <SpeakerTeamRow
      {...defaultProps}
      expanded
      users={[
        {
          id: 'u1',
          displayName: 'Jane Doe',
          roles: ['Lead PI'],
          isAlumni: true,
        },
      ]}
    />,
  );
  expect(screen.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute(
    'href',
    expect.stringContaining('u1'),
  );
  expect(screen.getByTitle('Alumni Member')).toBeInTheDocument();
});

it('renders the external variant without a team icon and without role badges on nested rows', () => {
  render(
    <SpeakerTeamRow
      {...defaultProps}
      variant="external"
      label="External Users"
      expanded
    />,
  );
  expect(screen.getByText('External Users')).toBeVisible();
  expect(screen.getByText('Jane Doe')).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Jane Doe' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Lead PI')).not.toBeInTheDocument();
  expect(screen.queryByText('Multiple roles')).not.toBeInTheDocument();
  expect(screen.getAllByText('Non CRN')).toHaveLength(2);
  expect(screen.getAllByTitle('User Placeholder')).toHaveLength(2);
});
