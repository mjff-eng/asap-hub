import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { createUserListItemResponse } from '@asap-hub/fixtures';

import PeopleCard from '../PeopleCard';

const props: ComponentProps<typeof PeopleCard> = createUserListItemResponse();

it('renders the display name', () => {
  const { getByRole } = render(
    <PeopleCard {...props} fullDisplayName="John Doe" />,
  );
  expect(getByRole('heading').textContent).toEqual('John Doe');
  expect(getByRole('heading').tagName).toEqual('H2');
});

it('renders the display name and degree', () => {
  const { getByRole } = render(
    <PeopleCard {...props} fullDisplayName="John Doe" degree={'BA'} />,
  );
  expect(getByRole('heading').textContent).toEqual('John Doe, BA');
  expect(getByRole('heading').tagName).toEqual('H2');
});

it('renders the date in the correct format', () => {
  const { getByText } = render(
    <PeopleCard {...props} createdDate="2021-01-01" />,
  );
  expect(getByText(/joined/i).textContent).toMatchInlineSnapshot(
    `"Joined: 1st January 2021"`,
  );
});

it('renders the date and label in the correct form for alumni users', () => {
  const { getByText } = render(
    <PeopleCard
      {...props}
      createdDate="2021-01-01"
      alumniSinceDate="2021-01-02"
    />,
  );
  expect(getByText('Alumni since: 2nd January 2021')).toBeVisible();
});

it('links to the profile', () => {
  const { getByText } = render(
    <PeopleCard {...props} fullDisplayName="John Doe" id="42" />,
  );

  expect(getByText('John Doe').closest('a')).toHaveAttribute(
    'href',
    expect.stringMatching(/42$/),
  );
});

describe('alumni badge', () => {
  it('renders the alumni badge when required', () => {
    render(<PeopleCard {...props} alumniSinceDate="2022-01-01" />);

    expect(screen.getByText('Alumni')).toBeInTheDocument();
    expect(screen.getByTitle('Alumni Member')).toBeInTheDocument();
  });
  it('does not render alumni badge for non alumni', () => {
    render(<PeopleCard {...props} alumniSinceDate={undefined} />);

    expect(screen.queryByText('Alumni')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Alumni Member')).not.toBeInTheDocument();
  });
});

describe('award badge', () => {
  const teamWithAwards = [
    {
      id: 'team-1',
      displayName: 'Team 1',
      role: 'Project Manager' as const,
      awards: [
        { name: 'Open Science Champion', date: '2023-01-01', iconUrl: 'old' },
        { name: 'Open Science Champion', date: '2024-01-01', iconUrl: 'new' },
      ],
    },
  ];

  it('overlays the most recent award badge on the avatar', () => {
    render(<PeopleCard {...props} teams={teamWithAwards} />);

    const badge = screen.getByAltText('Open Science Champion');
    expect(badge).toHaveAttribute('src', 'new');
  });

  it('does not render an award badge when the user has none', () => {
    render(
      <PeopleCard {...props} teams={[{ ...teamWithAwards[0]!, awards: [] }]} />,
    );

    expect(
      screen.queryByAltText('Open Science Champion'),
    ).not.toBeInTheDocument();
  });

  it('does not render an award badge when the latest award has no icon', () => {
    render(
      <PeopleCard
        {...props}
        teams={[
          {
            ...teamWithAwards[0]!,
            awards: [{ name: 'Open Science Champion', date: '2024-01-01' }],
          },
        ]}
      />,
    );

    expect(
      screen.queryByAltText('Open Science Champion'),
    ).not.toBeInTheDocument();
  });
});
