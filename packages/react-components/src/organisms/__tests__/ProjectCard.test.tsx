import { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import { colour } from '../../colors';
import { formatProjectDate } from '../../date';

import ProjectCard, {
  getStatusPillAccent,
  getCardAccentByStatus,
} from '../ProjectCard';

const baseProjectProps = {
  id: 'project-1',
  startDate: '2023-01-15',
  endDate: '2025-12-31',
  duration: '3 yrs',
  tags: ['Tag1', 'Tag2', 'Tag3'],
};

const discoveryProjectProps: ComponentProps<typeof ProjectCard> = {
  ...baseProjectProps,
  projectType: 'Discovery Project',
  title: 'Understanding Genetic Mechanisms in PD',
  status: 'Closed',
  researchTheme: 'Genetics',
  teamName: 'Alpha Team',
  teamId: 'team-1',
};

const resourceProjectTeamBasedProps: ComponentProps<typeof ProjectCard> = {
  ...baseProjectProps,
  projectType: 'Resource Project',
  title: 'PD Biobank Resource',
  status: 'Active',
  resourceType: 'Biobank',
  isTeamBased: true,
  teamName: 'Anderson Resource Team',
  teamId: 'team-2',
  googleDriveLink: 'https://drive.google.com/example',
};

const resourceProjectMemberBasedProps: ComponentProps<typeof ProjectCard> = {
  ...baseProjectProps,
  projectType: 'Resource Project',
  title: 'Open-Source Analysis Pipeline',
  status: 'Completed',
  resourceType: 'Software Tool',
  isTeamBased: false,
  members: [
    {
      id: '1',
      displayName: 'Dr. Sarah Johnson',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.j@example.com',
      href: '/users/1',
    },
    {
      id: '2',
      displayName: 'Dr. Michael Chen',
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.c@example.com',
      href: '/users/2',
      alumniSinceDate: '2022-10-27',
    },
    {
      id: '3',
      displayName: 'Dr. Emily Rodriguez',
      firstName: 'Emily',
      lastName: 'Rodriguez',
      email: 'emily.r@example.com',
      href: '/users/3',
    },
  ],
};

const traineeProjectProps: ComponentProps<typeof ProjectCard> = {
  ...baseProjectProps,
  projectType: 'Trainee Project',
  title: 'Alpha-Synuclein Aggregation Study',
  status: 'Active',
  members: [
    {
      id: '2',
      displayName: 'Dr. David Martinez',
      firstName: 'David',
      lastName: 'Martinez',
      email: 'david.m@example.com',
      href: '/users/2',
      role: 'Independent Project - Lead',
    },
    {
      id: '3',
      displayName: 'Dr. Emily Chen',
      firstName: 'Emily',
      lastName: 'Chen',
      email: 'emily.c@example.com',
      href: '/users/3',
      role: 'Independent Project - Lead',
    },
    {
      id: '1',
      displayName: 'Dr. Amanda Foster',
      firstName: 'Amanda',
      lastName: 'Foster',
      email: 'amanda.f@example.com',
      href: '/users/1',
      role: 'Independent Project - Mentor',
    },
  ],
};

describe('Date Formatting', () => {
  describe('formatProjectDate', () => {
    it.each([
      { input: '2023-01-15', expected: 'Jan 2023' },
      { input: '2025-12-31', expected: 'Dec 2025' },
      { input: '2022-06-01', expected: 'Jun 2022' },
      { input: '2024-10-01T00:00:00.000Z', expected: 'Oct 2024' },
      { input: '2024-10-01T00:00:00.000+01:00', expected: 'Oct 2024' },
      { input: '2024-10-01T00:00:00.000-08:00', expected: 'Oct 2024' },
    ])('formats $input to $expected', ({ input, expected }) => {
      expect(formatProjectDate(input)).toBe(expected);
    });

    it('returns original string for invalid dates', () => {
      expect(formatProjectDate('invalid-date')).toBe('invalid-date');
    });
  });
});

describe('Helper Functions', () => {
  describe('getStatusPillAccent', () => {
    it.each([
      { status: 'Active' as const, expected: 'info' as const },
      { status: 'Completed' as const, expected: 'success' as const },
      { status: 'Closed' as const, expected: 'warning' as const },
    ])(
      'returns $expected accent for $status status',
      ({ status, expected }) => {
        expect(getStatusPillAccent(status)).toBe(expected);
      },
    );

    it('returns default accent for invalid status', () => {
      expect(
        getStatusPillAccent('Invalid' as 'Active' | 'Completed' | 'Closed'),
      ).toBe('info');
    });
  });

  describe('getCardAccentByStatus', () => {
    it.each([
      { status: 'Active' as const, expected: 'default' as const },
      { status: 'Completed' as const, expected: 'inactive' as const },
      { status: 'Closed' as const, expected: 'inactive' as const },
    ])(
      'returns $expected accent for $status status',
      ({ status, expected }) => {
        expect(getCardAccentByStatus(status)).toBe(expected);
      },
    );

    it('returns default accent for invalid status', () => {
      expect(
        getCardAccentByStatus('Invalid' as 'Active' | 'Completed' | 'Closed'),
      ).toBe('default');
    });
  });
});

describe('ProjectCard - Discovery Project', () => {
  it('renders the project title as a heading', () => {
    const { getByRole } = render(<ProjectCard {...discoveryProjectProps} />);
    expect(getByRole('heading').textContent).toEqual(
      'Understanding Genetic Mechanisms in PD',
    );
  });

  it.each([
    { status: 'Active' as const },
    { status: 'Completed' as const },
    { status: 'Closed' as const },
  ])('renders the $status status pill', ({ status }) => {
    const { getByText } = render(
      <ProjectCard {...discoveryProjectProps} status={status} />,
    );
    expect(getByText(status)).toBeVisible();
  });

  it('renders the Discovery Project type pill', () => {
    const { getByText } = render(<ProjectCard {...discoveryProjectProps} />);
    expect(getByText('Discovery Project')).toBeVisible();
  });

  it('renders the research theme pill', () => {
    const { getByText } = render(<ProjectCard {...discoveryProjectProps} />);
    expect(getByText('Genetics')).toBeVisible();
  });

  it('renders the team name', () => {
    const { getByText } = render(<ProjectCard {...discoveryProjectProps} />);
    expect(getByText('Alpha Team')).toBeVisible();
  });

  it('renders the team name as a link when teamId is provided', () => {
    render(<ProjectCard {...discoveryProjectProps} />);
    const links = Array.from(
      document.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    const teamLink = links.find((link) => link.href.includes('/teams/team-1'));
    expect(teamLink).toBeDefined();
  });

  it('renders the duration with MMM YYYY date format', () => {
    const { getByText } = render(<ProjectCard {...discoveryProjectProps} />);
    expect(getByText('Jan 2023 - Dec 2025 •')).toBeVisible();
    // Duration from Jan 2023 to Dec 2025 is approximately 35-36 months = 2-3 years
    expect(getByText(/\([23]\syrs?\)/)).toBeVisible();
  });

  it('renders tags', () => {
    const { getByText } = render(<ProjectCard {...discoveryProjectProps} />);
    expect(getByText('Tag1')).toBeVisible();
    expect(getByText('Tag2')).toBeVisible();
    expect(getByText('Tag3')).toBeVisible();
  });

  it('does not render tags when empty', () => {
    const { queryByText } = render(
      <ProjectCard {...discoveryProjectProps} tags={[]} />,
    );
    expect(queryByText('Tag1')).not.toBeInTheDocument();
  });
});

describe('ProjectCard - Resource Project (Team-based)', () => {
  it('renders the project title', () => {
    const { getByRole } = render(
      <ProjectCard {...resourceProjectTeamBasedProps} />,
    );
    expect(getByRole('heading').textContent).toEqual('PD Biobank Resource');
  });

  it('renders the Resource Project type pill', () => {
    const { getByText } = render(
      <ProjectCard {...resourceProjectTeamBasedProps} />,
    );
    expect(getByText('Resource Project')).toBeVisible();
  });

  it('renders the resource type pill', () => {
    const { getByText } = render(
      <ProjectCard {...resourceProjectTeamBasedProps} />,
    );
    expect(getByText('Biobank')).toBeVisible();
  });

  it('renders the team name for team-based projects', () => {
    const { getByText } = render(
      <ProjectCard {...resourceProjectTeamBasedProps} />,
    );
    expect(getByText('Anderson Resource Team')).toBeVisible();
  });

  it('renders the Google Drive access button when link is provided', () => {
    const { getByText } = render(
      <ProjectCard {...resourceProjectTeamBasedProps} />,
    );
    expect(getByText(/Access Drive/i)).toBeVisible();
  });

  it('does not render Google Drive button when link is not provided', () => {
    const { queryByText } = render(
      <ProjectCard
        {...resourceProjectTeamBasedProps}
        googleDriveLink={undefined}
      />,
    );
    expect(queryByText(/Access Drive/i)).not.toBeInTheDocument();
  });

  it('renders team name as plain text when teamId is not provided', () => {
    const { getByText } = render(
      <ProjectCard {...resourceProjectTeamBasedProps} teamId={undefined} />,
    );
    const teamName = getByText('Anderson Resource Team');
    expect(teamName).toBeVisible();
    // Verify it's not wrapped in a link
    expect(teamName.closest('a')).toBeNull();
  });
});

describe('ProjectCard - Resource Project (Member-based)', () => {
  it('renders the project title', () => {
    const { getByRole } = render(
      <ProjectCard {...resourceProjectMemberBasedProps} />,
    );
    expect(getByRole('heading').textContent).toEqual(
      'Open-Source Analysis Pipeline',
    );
  });

  it('renders the resource type pill', () => {
    const { getByText } = render(
      <ProjectCard {...resourceProjectMemberBasedProps} />,
    );
    expect(getByText('Software Tool')).toBeVisible();
  });

  it('renders project members for member-based projects', () => {
    const { getByText } = render(
      <ProjectCard {...resourceProjectMemberBasedProps} />,
    );
    expect(getByText('Dr. Sarah Johnson')).toBeVisible();
    expect(getByText('Dr. Michael Chen')).toBeVisible();
    expect(getByText('Dr. Emily Rodriguez')).toBeVisible();
  });

  it('does not render team name for member-based projects', () => {
    const { queryByText } = render(
      <ProjectCard {...resourceProjectMemberBasedProps} />,
    );
    expect(queryByText('Anderson Resource Team')).not.toBeInTheDocument();
  });

  it('does not render members when empty', () => {
    const { queryByText } = render(
      <ProjectCard {...resourceProjectMemberBasedProps} members={[]} />,
    );
    expect(queryByText('Dr. Sarah Johnson')).not.toBeInTheDocument();
  });

  it('renders alumni badge for alumni members', () => {
    const { getByTitle } = render(
      <ProjectCard {...resourceProjectMemberBasedProps} />,
    );
    // Dr. Michael Chen should have alumni badge since he has alumniSinceDate
    expect(getByTitle('Alumni Member')).toBeInTheDocument();
  });
});

describe('ProjectCard - Trainee Project', () => {
  it('renders the project title', () => {
    const { getByRole } = render(<ProjectCard {...traineeProjectProps} />);
    expect(getByRole('heading').textContent).toEqual(
      'Alpha-Synuclein Aggregation Study',
    );
  });

  it('renders the Trainee Project type pill', () => {
    const { getByText } = render(<ProjectCard {...traineeProjectProps} />);
    expect(getByText('Trainee Project')).toBeVisible();
  });

  it('renders trainees in the first row', () => {
    const { getByText } = render(<ProjectCard {...traineeProjectProps} />);
    expect(getByText('Dr. David Martinez')).toBeVisible();
    expect(getByText('Dr. Emily Chen')).toBeVisible();
  });

  it('renders trainers in the second row', () => {
    const { getByText } = render(<ProjectCard {...traineeProjectProps} />);
    expect(getByText('Dr. Amanda Foster')).toBeVisible();
  });

  it('renders trainees and trainers in separate rows', () => {
    const { getAllByText } = render(<ProjectCard {...traineeProjectProps} />);
    // Should have all members displayed (2 trainees + 1 trainer)
    expect(getAllByText(/Dr\./)).toHaveLength(3);
  });

  it('handles multiple mentors correctly', () => {
    const projectWithMultipleMentors = {
      ...traineeProjectProps,
      members: [
        ...traineeProjectProps.members,
        {
          id: '4',
          displayName: 'Dr. John Mentor',
          firstName: 'John',
          lastName: 'Mentor',
          email: 'john.m@example.com',
          href: '/users/4',
          role: 'Independent Project - Mentor',
        },
        {
          id: '5',
          displayName: 'Dr. Jane Key',
          firstName: 'Jane',
          lastName: 'Key',
          email: 'jane.k@example.com',
          href: '/users/5',
          role: 'Trainee Project - Key Personnel',
        },
        {
          id: '6',
          displayName: 'Dr. Pat Roleless',
          firstName: 'Pat',
          lastName: 'Roleless',
          email: 'pat.r@example.com',
          href: '/users/6',
        },
      ],
    };
    const { getByText, queryByText } = render(
      <ProjectCard {...projectWithMultipleMentors} />,
    );
    expect(getByText('Dr. John Mentor')).toBeVisible();
    expect(getByText('Dr. Amanda Foster')).toBeVisible();
    expect(queryByText('Dr. Jane Key')).not.toBeInTheDocument();
    expect(queryByText('Dr. Pat Roleless')).not.toBeInTheDocument();
  });
});

describe('ProjectCard - Card Background Colors', () => {
  it('renders Active projects with default (white) background', () => {
    const { container } = render(
      <ProjectCard {...discoveryProjectProps} status="Active" />,
    );
    const card = container.querySelector('section');
    expect(card).not.toHaveStyleRule(
      'background-color',
      colour.background.tertiary,
    );
  });

  it('renders Complete projects with grey background', () => {
    const { container } = render(
      <ProjectCard {...discoveryProjectProps} status="Completed" />,
    );
    const card = container.querySelector('section');
    expect(card).toHaveStyleRule(
      'background-color',
      colour.background.tertiary,
    );
  });

  it('renders Closed projects with grey background', () => {
    const { container } = render(
      <ProjectCard {...discoveryProjectProps} status="Closed" />,
    );
    const card = container.querySelector('section');
    expect(card).toHaveStyleRule(
      'background-color',
      colour.background.tertiary,
    );
  });
});

describe('ProjectCard - Common Features', () => {
  it('links to the correct project detail page for each project type', () => {
    // Discovery
    render(<ProjectCard {...discoveryProjectProps} />);
    let links = Array.from(
      document.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    expect(
      links.find((link) =>
        link.href.includes('/projects/discovery/project-1/about'),
      ),
    ).toBeDefined();

    // Resource
    render(<ProjectCard {...resourceProjectTeamBasedProps} />);
    links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(
      links.find((link) =>
        link.href.includes('/projects/resource/project-1/about'),
      ),
    ).toBeDefined();

    // Trainee
    render(<ProjectCard {...traineeProjectProps} />);
    links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(
      links.find((link) =>
        link.href.includes('/projects/trainee/project-1/about'),
      ),
    ).toBeDefined();
  });

  it('renders start and end dates and duration', () => {
    const { getByText } = render(<ProjectCard {...discoveryProjectProps} />);
    expect(getByText(/Jan 2023/)).toBeVisible();
    expect(getByText(/Dec 2025/)).toBeVisible();
    // Duration from Jan 2023 to Dec 2025 is approximately 35-36 months = 2-3 years
    expect(getByText(/[23]\syrs?/)).toBeVisible();
  });
});
