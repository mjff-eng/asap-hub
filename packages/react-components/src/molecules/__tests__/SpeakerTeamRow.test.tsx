import { fireEvent, render, screen } from '@testing-library/react';

import SpeakerTeamRow, { SpeakerTeamRowUser } from '../SpeakerTeamRow';

const getUser = (
  overrides: Partial<SpeakerTeamRowUser> = {},
): SpeakerTeamRowUser => ({
  id: 'u1',
  displayName: 'Jane Doe',
  roles: ['Lead PI'],
  preliminaryFindingsShared: false,
  ...overrides,
});

const users = [
  getUser(),
  getUser({
    id: 'u2',
    displayName: 'John Smith',
    roles: ['Project Manager', 'Data Manager'],
  }),
];

const defaultProps = {
  label: 'Team Alpha',
  users,
  expanded: false,
  onToggleExpanded: jest.fn(),
  onToggleUserShared: jest.fn(),
  onRemoveUser: jest.fn(),
};

it('renders the team name and member count', () => {
  render(<SpeakerTeamRow {...defaultProps} />);
  expect(screen.getByText('Team Alpha')).toBeVisible();
  expect(screen.getByText('(2)')).toBeVisible();
});

it('renders a green pill counting the speakers who shared findings', () => {
  render(
    <SpeakerTeamRow
      {...defaultProps}
      users={[
        getUser({ id: 'u1', preliminaryFindingsShared: true }),
        getUser({ id: 'u2', preliminaryFindingsShared: false }),
        getUser({ id: 'u3', preliminaryFindingsShared: false }),
        getUser({ id: 'u4', preliminaryFindingsShared: false }),
      ]}
    />,
  );
  expect(screen.getByText('1 of 4 shared')).toBeVisible();
  expect(screen.getByTitle('Tick')).toBeInTheDocument();
  expect(screen.queryByTitle('Cross')).not.toBeInTheDocument();
});

it('renders a grey pill with a cross when nobody has shared findings', () => {
  render(<SpeakerTeamRow {...defaultProps} />);
  expect(screen.getByText('0 of 2 shared')).toBeVisible();
  expect(screen.getByTitle('Cross')).toBeInTheDocument();
  expect(screen.queryByTitle('Tick')).not.toBeInTheDocument();
});

it('renders the findings icon inside the pill, not beside it', () => {
  render(<SpeakerTeamRow {...defaultProps} />);
  expect(screen.getByText(/0 of 2 shared/)).toContainElement(
    screen.getByTitle('Cross').closest('span'),
  );
});

it('hides the findings pill when showShared is false', () => {
  render(<SpeakerTeamRow {...defaultProps} showShared={false} />);
  expect(screen.queryByText('0 of 2 shared')).not.toBeInTheDocument();
});

it('does not render a group level preliminary findings switch', () => {
  render(<SpeakerTeamRow {...defaultProps} />);
  expect(
    screen.queryByRole('checkbox', {
      name: 'Team Alpha preliminary findings shared',
    }),
  ).not.toBeInTheDocument();
});

it('renders a per speaker toggle and calls onToggleUserShared with the speaker id and new value', () => {
  const onToggleUserShared = jest.fn();
  render(
    <SpeakerTeamRow
      {...defaultProps}
      expanded
      onToggleUserShared={onToggleUserShared}
    />,
  );
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'Jane Doe preliminary findings shared',
    }),
  );
  expect(onToggleUserShared).toHaveBeenCalledWith('u1', true);
});

it('puts the group pill and the speaker toggles in the same findings column', () => {
  // Alignment is invisible to a text assertion: the column is what keeps the
  // pill, the toggles and the table header on one left edge.
  render(<SpeakerTeamRow {...defaultProps} expanded />);
  const column = (element: HTMLElement | null) =>
    element?.parentElement?.className;
  expect(column(screen.getByText('0 of 2 shared'))).toBe(
    column(
      screen.getByRole('checkbox', {
        name: 'Jane Doe preliminary findings shared',
      }),
    ),
  );
});

it('hides the per speaker toggles when showShared is false', () => {
  render(<SpeakerTeamRow {...defaultProps} expanded showShared={false} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

it('renders the project icon rather than the team icon for the project variant', () => {
  render(
    <SpeakerTeamRow
      {...defaultProps}
      variant="project"
      projectType="Discovery Project"
      label="Project Beta"
    />,
  );
  expect(screen.getByTitle('Discovery Project')).toBeInTheDocument();
  expect(screen.queryByTitle('Team')).not.toBeInTheDocument();
});

it('links the project name to the project route when an id and type are given', () => {
  render(
    <SpeakerTeamRow
      {...defaultProps}
      variant="project"
      projectType="Discovery Project"
      projectId="p1"
      label="Project Beta"
    />,
  );
  const projectLink = screen.getByRole('link', { name: 'Project Beta' });
  expect(projectLink).toHaveAttribute('href', expect.stringContaining('p1'));
  expect(projectLink).toHaveAttribute('target', '_blank');
});

it('renders the project name unlinked when the project type is unknown', () => {
  render(
    <SpeakerTeamRow
      {...defaultProps}
      variant="project"
      projectId="p1"
      label="Project Beta"
    />,
  );
  expect(
    screen.queryByRole('link', { name: 'Project Beta' }),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Project Beta')).toBeVisible();
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
      users={[getUser({ id: 'u1', isAlumni: true })]}
    />,
  );
  const userLink = screen.getByRole('link', { name: 'Jane Doe' });
  expect(userLink).toHaveAttribute('href', expect.stringContaining('u1'));
  expect(userLink).toHaveAttribute('target', '_blank');
  expect(screen.getByTitle('Alumni Member')).toBeInTheDocument();
});

it('renders project members with their profile link, role badge and alumni badge', () => {
  render(
    <SpeakerTeamRow
      {...defaultProps}
      variant="project"
      projectType="Discovery Project"
      projectId="p1"
      label="Project Beta"
      expanded
      users={[getUser({ id: 'u1', isAlumni: true })]}
    />,
  );
  const userLink = screen.getByRole('link', { name: 'Jane Doe' });
  expect(userLink).toHaveAttribute('href', expect.stringContaining('u1'));
  expect(screen.getByText('Lead PI')).toBeVisible();
  expect(screen.getByTitle('Alumni Member')).toBeInTheDocument();
});

it('opens the team profile in a new tab', () => {
  render(<SpeakerTeamRow {...defaultProps} teamId="team-1" />);
  const teamLink = screen.getByRole('link', { name: 'Team Alpha' });
  expect(teamLink).toHaveAttribute('href', expect.stringContaining('team-1'));
  expect(teamLink).toHaveAttribute('target', '_blank');
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

it('caps the speaker list and reveals the rest on demand', () => {
  render(
    <SpeakerTeamRow
      {...defaultProps}
      expanded
      users={Array.from({ length: 6 }, (_row, index) =>
        getUser({ id: `u${index}`, displayName: `Speaker ${index}` }),
      )}
    />,
  );
  expect(screen.queryByText('Speaker 5')).not.toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', {
      name: 'Show 1 more speaker in Team Alpha',
    }),
  );

  expect(screen.getByText('Speaker 5')).toBeVisible();
});
