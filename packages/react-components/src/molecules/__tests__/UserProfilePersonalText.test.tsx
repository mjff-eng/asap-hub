import { ComponentProps } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { UserProfileContext } from '@asap-hub/react-context';
import UserProfilePersonalText from '../UserProfilePersonalText';

const props: ComponentProps<typeof UserProfilePersonalText> = {
  labs: [],
  teams: [],
};

it.each`
  jobTitle     | institution  | text
  ${undefined} | ${'Inst'}    | ${/Inst/}
  ${'Job'}     | ${undefined} | ${/Job/}
  ${'Job'}     | ${'Inst'}    | ${/Job at Inst/}
`('generates the position description "$text"', ({ text, ...position }) => {
  const { container } = render(
    <UserProfilePersonalText {...props} {...position} />,
  );
  expect(container).toHaveTextContent(text);
});

it('shows user location', () => {
  const { container, getByTitle } = render(
    <UserProfilePersonalText
      {...props}
      city="Toronto"
      stateOrProvince="Ontario"
      country="Canada"
    />,
  );
  expect(container).toHaveTextContent('Toronto, Ontario, Canada');
  expect(getByTitle(/location/i)).toBeInTheDocument();
});

it('renders a custom location icon when one is provided', () => {
  const { getByTitle, queryByTitle } = render(
    <UserProfilePersonalText
      {...props}
      city="Toronto"
      locationIcon={
        <svg>
          <title>Custom Pin</title>
        </svg>
      }
    />,
  );
  expect(getByTitle('Custom Pin')).toBeInTheDocument();
  expect(queryByTitle(/location/i)).toBe(null);
});

it('does not show the location icon if no location is available', () => {
  const { queryByTitle } = render(<UserProfilePersonalText {...props} />);
  expect(queryByTitle(/location/i)).toBe(null);
});

it('shows "No team affiliation" in italic with info tooltip when the user has no teams', () => {
  const { container, getByRole, getByText } = render(
    <UserProfilePersonalText {...props} teams={[]} />,
  );
  const noTeamText = getByText('No team affiliation');
  expect(noTeamText).toBeInTheDocument();
  expect(noTeamText.tagName).toBe('EM');
  expect(container).toHaveTextContent(
    'Some members are not linked to a team because they work directly under a project.',
  );
  expect(getByRole('button', { name: /info/i })).toBeInTheDocument();
});

it('only show lab information if the user is on a lab', async () => {
  const { container, rerender } = render(
    <UserProfilePersonalText {...props} />,
  );
  expect(container).not.toHaveTextContent('Lab');

  rerender(
    <UserProfilePersonalText
      {...props}
      labs={[{ id: 'cd7be4905', name: 'Glasgow' }]}
    />,
  );
  expect(container).toHaveTextContent('Glasgow Lab');
});
it('shows placeholder text on your own profile', () => {
  const { queryByTitle, queryByText, rerender } = render(
    <UserProfileContext.Provider value={{ isOwnProfile: false }}>
      <UserProfilePersonalText
        {...props}
        city={undefined}
        country={undefined}
      />
    </UserProfileContext.Provider>,
  );
  expect(queryByTitle(/location/i)).not.toBeInTheDocument();
  expect(queryByText(/your position/i)).not.toBeInTheDocument();

  rerender(
    <UserProfileContext.Provider value={{ isOwnProfile: true }}>
      <UserProfilePersonalText {...props} labs={[]} />
    </UserProfileContext.Provider>,
  );
  expect(queryByTitle(/location/i)).toBeInTheDocument();
  expect(queryByText(/your position/i)).toBeInTheDocument();
});

it('renders tags when present', async () => {
  const { queryByText, rerender } = render(
    <UserProfileContext.Provider value={{ isOwnProfile: false }}>
      <UserProfilePersonalText
        {...props}
        tags={[
          { id: '1', name: 'Tag 1' },
          { id: '2', name: 'Tag 2' },
        ]}
      />
    </UserProfileContext.Provider>,
  );

  expect(queryByText('Tag 1')).toBeInTheDocument();
  expect(queryByText('Tag 2')).toBeInTheDocument();

  rerender(
    <UserProfileContext.Provider value={{ isOwnProfile: true }}>
      <UserProfilePersonalText {...props} tags={[]} />
    </UserProfileContext.Provider>,
  );

  expect(queryByText('Tag 1')).not.toBeInTheDocument();
  expect(queryByText('Tag 2')).not.toBeInTheDocument();
});

it('renders active teams with roles', () => {
  const { container } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        {
          id: '42',
          displayName: 'Alpha',
          role: 'Lead PI (Core Leadership)',
        },
        {
          id: '1337',
          displayName: 'Beta',
          role: 'Collaborating PI',
        },
      ]}
    />,
  );

  expect(container).toHaveTextContent(
    'Lead PI (Core Leadership) on Team Alpha',
  );
  expect(container).toHaveTextContent('Collaborating PI on Team Beta');
});

it('shows "View all roles" link when there are more than 2 active teams', () => {
  const { getByText } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        { id: '1', displayName: 'Team A', role: 'Lead PI (Core Leadership)' },
        { id: '2', displayName: 'Team B', role: 'Collaborating PI' },
        { id: '3', displayName: 'Team C', role: 'Project Manager' },
      ]}
    />,
  );

  expect(getByText('View all roles')).toBeInTheDocument();
});

it('does not show "View all roles" link when there are 2 or fewer active teams', () => {
  const { queryByText } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        { id: '1', displayName: 'Team A', role: 'Lead PI (Core Leadership)' },
        { id: '2', displayName: 'Team B', role: 'Collaborating PI' },
      ]}
    />,
  );

  expect(queryByText('View all roles')).not.toBeInTheDocument();
});

it('renders inactive teams as "Former Roles" when user is alumni', () => {
  const { container, getByText } = render(
    <UserProfilePersonalText
      {...props}
      isAlumni={true}
      teams={[
        {
          id: '42',
          displayName: 'Former',
          role: 'Lead PI (Core Leadership)',
        },
      ]}
    />,
  );

  expect(getByText('Former Roles')).toBeInTheDocument();
  expect(container).toHaveTextContent(
    'Lead PI (Core Leadership) on Team Former',
  );
});

it('renders inactive teams as "Former Roles" when teams have inactive dates', () => {
  const { container, getByText } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        {
          id: '42',
          displayName: 'Inactive',
          role: 'Collaborating PI',
          teamInactiveSince: '2023-01-01',
        },
      ]}
    />,
  );

  expect(getByText('Former Roles')).toBeInTheDocument();
  expect(container).toHaveTextContent('Collaborating PI on Team Inactive');
});

it('shows "View all former roles" link when there are more than 2 inactive teams', () => {
  const { getByText } = render(
    <UserProfilePersonalText
      {...props}
      isAlumni={true}
      teams={[
        { id: '1', displayName: 'Former A', role: 'Lead PI (Core Leadership)' },
        { id: '2', displayName: 'Former B', role: 'Collaborating PI' },
        { id: '3', displayName: 'Former C', role: 'Project Manager' },
      ]}
    />,
  );

  expect(getByText('View all former roles')).toBeInTheDocument();
});

it('does not show "View all former roles" link when there are 2 or fewer inactive teams', () => {
  const { queryByText } = render(
    <UserProfilePersonalText
      {...props}
      isAlumni={true}
      teams={[
        { id: '1', displayName: 'Former A', role: 'Lead PI (Core Leadership)' },
        { id: '2', displayName: 'Former B', role: 'Collaborating PI' },
      ]}
    />,
  );

  expect(queryByText('View all former roles')).not.toBeInTheDocument();
});

it('separates active and inactive teams correctly', () => {
  const { container, getByText } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        {
          id: '1',
          displayName: 'Active',
          role: 'Lead PI (Core Leadership)',
        },
        {
          id: '2',
          displayName: 'Inactive',
          role: 'Collaborating PI',
          teamInactiveSince: '2023-01-01',
        },
      ]}
    />,
  );

  expect(container).toHaveTextContent(
    'Lead PI (Core Leadership) on Team Active',
  );
  expect(getByText('Former Roles')).toBeInTheDocument();
  expect(container).toHaveTextContent('Collaborating PI on Team Inactive');
});

it('handles teams with inactiveSinceDate property', () => {
  const { container, getByText } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        {
          id: '1',
          displayName: 'Inactive',
          role: 'Project Manager',
          inactiveSinceDate: '2023-06-01',
        },
      ]}
    />,
  );

  expect(getByText('Former Roles')).toBeInTheDocument();
  expect(container).toHaveTextContent('Project Manager on Team Inactive');
});

it('does not show "Former Roles" section when there are no inactive teams', () => {
  const { queryByText } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        {
          id: '1',
          displayName: 'Active',
          role: 'Lead PI (Core Leadership)',
        },
      ]}
    />,
  );

  expect(queryByText('Former Roles')).not.toBeInTheDocument();
});

it('scrolls to teams card when "View all roles" is clicked and card exists', () => {
  const mockScrollIntoView = jest.fn();
  const teamsCard = document.createElement('div');
  teamsCard.id = 'user-teams-tabbed-card';
  teamsCard.scrollIntoView = mockScrollIntoView;
  document.body.appendChild(teamsCard);

  const { getByText, queryByText } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        { id: '1', displayName: 'Team A', role: 'Lead PI (Core Leadership)' },
        { id: '2', displayName: 'Team B', role: 'Collaborating PI' },
        { id: '3', displayName: 'Team C', role: 'Project Manager' },
      ]}
    />,
  );

  fireEvent.click(getByText('View all roles'));

  expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  expect(queryByText('View all roles')).toBeInTheDocument();

  document.body.removeChild(teamsCard);
});

it('scrolls to teams card when "View all former roles" is clicked and card exists', () => {
  const mockScrollIntoView = jest.fn();
  const teamsCard = document.createElement('div');
  teamsCard.id = 'user-teams-tabbed-card';
  teamsCard.scrollIntoView = mockScrollIntoView;
  document.body.appendChild(teamsCard);

  const { getByText, queryByText } = render(
    <UserProfilePersonalText
      {...props}
      isAlumni={true}
      teams={[
        { id: '1', displayName: 'Former A', role: 'Lead PI (Core Leadership)' },
        { id: '2', displayName: 'Former B', role: 'Collaborating PI' },
        { id: '3', displayName: 'Former C', role: 'Project Manager' },
      ]}
    />,
  );

  fireEvent.click(getByText('View all former roles'));

  expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  expect(queryByText('View all former roles')).toBeInTheDocument();

  document.body.removeChild(teamsCard);
});

it('toggles active teams between expanded and collapsed', () => {
  const { getByText, container } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        { id: '1', displayName: 'Team A', role: 'Lead PI (Core Leadership)' },
        { id: '2', displayName: 'Team B', role: 'Collaborating PI' },
        { id: '3', displayName: 'Team C', role: 'Project Manager' },
        { id: '4', displayName: 'Team D', role: 'Key Personnel' },
        { id: '5', displayName: 'Team E', role: 'Trainee' },
      ]}
    />,
  );

  expect(container).toHaveTextContent('Lead PI (Core Leadership) on');
  expect(container).toHaveTextContent('Collaborating PI on');
  expect(container).not.toHaveTextContent('Project Manager on');
  expect(container).not.toHaveTextContent('Key Personnel on');
  expect(container).not.toHaveTextContent('Trainee on');

  fireEvent.click(getByText('View all roles'));

  expect(container).toHaveTextContent('Project Manager on');
  expect(container).toHaveTextContent('Key Personnel on');
  expect(container).toHaveTextContent('Trainee on');
  expect(getByText('View less roles')).toBeInTheDocument();

  fireEvent.click(getByText('View less roles'));

  expect(container).not.toHaveTextContent('Project Manager on');
  expect(container).not.toHaveTextContent('Key Personnel on');
  expect(container).not.toHaveTextContent('Trainee on');
  expect(getByText('View all roles')).toBeInTheDocument();
});

it('toggles inactive teams between expanded and collapsed', () => {
  const { getByText, container } = render(
    <UserProfilePersonalText
      {...props}
      isAlumni={true}
      teams={[
        { id: '1', displayName: 'Former A', role: 'Lead PI (Core Leadership)' },
        { id: '2', displayName: 'Former B', role: 'Collaborating PI' },
        { id: '3', displayName: 'Former C', role: 'Project Manager' },
        { id: '4', displayName: 'Former D', role: 'Key Personnel' },
        { id: '5', displayName: 'Former E', role: 'Trainee' },
      ]}
    />,
  );

  expect(container).toHaveTextContent('Lead PI (Core Leadership) on');
  expect(container).toHaveTextContent('Collaborating PI on');
  expect(container).not.toHaveTextContent('Project Manager on');
  expect(container).not.toHaveTextContent('Key Personnel on');
  expect(container).not.toHaveTextContent('Trainee on');

  fireEvent.click(getByText('View all former roles'));

  expect(container).toHaveTextContent('Project Manager on');
  expect(container).toHaveTextContent('Key Personnel on');
  expect(container).toHaveTextContent('Trainee on');
  expect(getByText('View less former roles')).toBeInTheDocument();

  fireEvent.click(getByText('View less former roles'));

  expect(container).not.toHaveTextContent('Project Manager on');
  expect(container).not.toHaveTextContent('Key Personnel on');
  expect(container).not.toHaveTextContent('Trainee on');
  expect(getByText('View all former roles')).toBeInTheDocument();
});

it('renders two roles inline with "and" for a team with exactly 2 roles', () => {
  const { container } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        {
          id: '42',
          displayName: 'Alpha',
          role: 'Lead PI (Core Leadership)',
        },
        {
          id: '42',
          displayName: 'Alpha',
          role: 'Project Manager',
        },
      ]}
    />,
  );
  expect(container).toHaveTextContent(
    'Lead PI (Core Leadership) and Project Manager on Team Alpha',
  );
});

it('renders two labs inline with "and"', () => {
  const { container } = render(
    <UserProfilePersonalText
      {...props}
      labs={[
        { id: 'l1', name: 'Glasgow' },
        { id: 'l2', name: 'Cambridge' },
      ]}
    />,
  );
  expect(container).toHaveTextContent('Glasgow Lab and Cambridge Lab');
});

it('renders 3+ roles with overflow badge for a team with multiple roles', () => {
  const { container, getByText } = render(
    <UserProfilePersonalText
      {...props}
      teams={[
        {
          id: '42',
          displayName: 'Alpha',
          role: 'Lead PI (Core Leadership)',
        },
        {
          id: '42',
          displayName: 'Alpha',
          role: 'Project Manager',
        },
        {
          id: '42',
          displayName: 'Alpha',
          role: 'Data Manager',
        },
      ]}
    />,
  );
  expect(container).toHaveTextContent('Lead PI (Core Leadership),');
  expect(container).toHaveTextContent('Project Manager');
  expect(getByText('+1')).toBeInTheDocument();
});

it('renders 3+ labs with overflow badge', () => {
  const { container, getByText } = render(
    <UserProfilePersonalText
      {...props}
      labs={[
        { id: 'l1', name: 'Glasgow' },
        { id: 'l2', name: 'Cambridge' },
        { id: 'l3', name: 'Oxford' },
      ]}
    />,
  );
  expect(container).toHaveTextContent('Glasgow Lab,');
  expect(container).toHaveTextContent('Cambridge Lab');
  expect(getByText('+1')).toBeInTheDocument();
});
