import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ProjectDetail, ProjectType } from '@asap-hub/model';
import { dashboard, projects } from '@asap-hub/routing';
import ProjectDetailHeader, { getTeamIcon } from '../ProjectDetailHeader';

const baseProject = {
  id: 'project-1',
  title: 'Test Project',
  status: 'Active' as const,
  statusRank: 1,
  startDate: '2023-01-01',
  endDate: '2025-12-31',
  duration: '3 yrs',
  tags: ['Tag1'],
  description: 'Test description',
  originalGrant: 'Grant Title',
  supplementGrant: {
    grantTitle: 'Supplement Grant Title',
    grantDescription: 'Supplement grant description',
    grantProposalId: 'proposal-1',
    grantStartDate: '2023-01-01',
    grantEndDate: '2025-12-31',
  },
};

describe('getTeamIcon', () => {
  it('returns DiscoveryTeamIcon for Discovery projects', () => {
    const discoveryProject: ProjectDetail = {
      ...baseProject,
      projectType: 'Discovery Project',
      researchTheme: 'Genetics',
      teamName: 'Test Team',
      fundedTeam: {
        id: 'team-1',
        displayName: 'Test Team',
        teamType: 'Discovery Team',
        researchTheme: 'Genetics',
      },
    };

    const { container } = render(<>{getTeamIcon(discoveryProject)}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('title')?.textContent).toBe(
      'Discovery Team Icon',
    );
  });

  it('returns ResourceTeamIcon for Resource projects that are team-based', () => {
    const resourceTeamProject: ProjectDetail = {
      ...baseProject,
      projectType: 'Resource Project',
      resourceType: 'Biobank',
      isTeamBased: true,
      fundedTeam: {
        id: 'team-1',
        displayName: 'Test Team',
        teamType: 'Resource Team',
        researchTheme: 'Genetics',
      },
    };

    const { container } = render(<>{getTeamIcon(resourceTeamProject)}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('title')?.textContent).toBe(
      'Resource Team Icon',
    );
  });

  it('returns ResourceMemberIcon for Resource projects that are not team-based', () => {
    const resourceMemberProject: ProjectDetail = {
      ...baseProject,
      projectType: 'Resource Project',
      resourceType: 'Software Tool',
      isTeamBased: false,
      members: [
        {
          id: 'user-1',
          displayName: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          href: '/users/john-doe',
        },
      ],
    };

    const { container } = render(<>{getTeamIcon(resourceMemberProject)}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('title')?.textContent).toBe(
      'Resource Member Icon',
    );
  });

  it('returns TraineeIcon for Trainee projects', () => {
    const traineeProject: ProjectDetail = {
      ...baseProject,
      projectType: 'Trainee Project',
      members: [
        {
          id: 'trainee-1',
          displayName: 'Trainee Name',
          firstName: 'Trainee',
          lastName: 'Name',
          href: '/users/trainee-1',
          role: 'Independent Project - Lead',
        },
        {
          id: 'trainer-1',
          displayName: 'Dr. Trainer',
          firstName: 'Trainer',
          lastName: 'Name',
          href: '/users/trainer-1',
          role: 'Independent Project - Mentor',
        },
      ],
    };

    const { container } = render(<>{getTeamIcon(traineeProject)}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('returns null for unknown project type', () => {
    const unknownProject = {
      ...baseProject,
      projectType: 'Unknown' as unknown as ProjectType,
    };

    const result = getTeamIcon(unknownProject as unknown as ProjectDetail);
    expect(result).toBeNull();
  });
});

describe('ProjectDetailHeader', () => {
  const mockDiscoveryProject: ProjectDetail = {
    ...baseProject,
    projectType: 'Discovery Project',
    researchTheme: 'Genetics',
    teamName: 'Alpha Team',
    teamId: 'team-1',
    fundedTeam: {
      id: 'team-1',
      displayName: 'Alpha Team',
      teamType: 'Discovery Team',
      researchTheme: 'Genetics',
    },
  };

  const mockResourceTeamProject: ProjectDetail = {
    ...baseProject,
    projectType: 'Resource Project',
    resourceType: 'Biobank',
    isTeamBased: true,
    teamName: 'Resource Team',
    teamId: 'team-2',
    googleDriveLink: 'https://drive.google.com/example',
    fundedTeam: {
      id: 'team-2',
      displayName: 'Resource Team',
      teamType: 'Resource Team',
      researchTheme: 'Genetics',
    },
  };

  const mockResourceMemberProject: ProjectDetail = {
    ...baseProject,
    projectType: 'Resource Project',
    resourceType: 'Software Tool',
    isTeamBased: false,
    members: [
      {
        id: 'user-1',
        displayName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        href: '/users/john-doe',
      },
    ],
  };

  const mockTraineeProject: ProjectDetail = {
    ...baseProject,
    projectType: 'Trainee Project',
    members: [
      {
        id: 'trainee-1',
        displayName: 'Emily Trainee',
        firstName: 'Emily',
        lastName: 'Trainee',
        href: '/users/trainee-1',
        role: 'Independent Project - Lead',
      },
      {
        id: 'trainer-1',
        displayName: 'Dr. Sarah Mentor',
        firstName: 'Sarah',
        lastName: 'Mentor',
        href: '/users/trainer-1',
        role: 'Independent Project - Mentor',
      },
    ],
  };

  describe('Common elements', () => {
    it('renders the project title', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(
        screen.getByRole('heading', { name: 'Test Project' }),
      ).toBeInTheDocument();
    });

    it('renders status pill', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders About tab', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      const aboutLink = screen.getByRole('link', { name: 'About' });
      expect(aboutLink).toBeInTheDocument();
      expect(aboutLink).toHaveAttribute('href', '/projects/discovery/1/about');
    });

    it('renders Milestones tab when milestonesHref is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      const milestonesLink = screen.getByRole('link', { name: 'Milestones' });
      expect(milestonesLink).toBeInTheDocument();
      expect(milestonesLink).toHaveAttribute(
        'href',
        '/projects/discovery/1/milestones',
      );
    });

    it('renders or hides Contact button when point of contact email is provided and project status is Active or not', () => {
      const { rerender } = render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          pointOfContactEmail="contact@example.com"
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.getByText('Contact')).toBeInTheDocument();
      rerender(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          status="Closed"
          pointOfContactEmail="contact@example.com"
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.queryByText('Contact')).not.toBeInTheDocument();
      rerender(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          status="Active"
          pointOfContactEmail={undefined}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    });

    it('does not render Contact button when no email is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    });

    it('renders copy email button when point of contact email is provided', async () => {
      // Mock clipboard API
      const writeTextMock = jest.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          pointOfContactEmail="test@example.com"
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );

      // Find copy button by its tooltip text
      const copyButton = screen.getByText('Copy Email').closest('button');
      expect(copyButton).toBeInTheDocument();

      // Click the button to trigger clipboard write
      if (copyButton) {
        fireEvent.click(copyButton);
      }

      // Wait for state updates to complete
      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('renders Closed Project banner when status is Closed', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          status="Closed"
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(
        screen.getByText(
          'This project concluded earlier than expected and some milestones are incomplete.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Breadcrumbs', () => {
    it.each`
      project                    | listLabel               | listHref
      ${mockDiscoveryProject}    | ${'Discovery Projects'} | ${projects({}).discoveryProjects({}).$}
      ${mockResourceTeamProject} | ${'Resource Projects'}  | ${projects({}).resourceProjects({}).$}
      ${mockTraineeProject}      | ${'Trainee Projects'}   | ${projects({}).traineeProjects({}).$}
    `(
      'renders breadcrumbs to the $listLabel list',
      ({ project, listLabel, listHref }) => {
        render(
          <ProjectDetailHeader
            {...project}
            aboutHref="/projects/1/about"
            milestonesHref="/projects/1/milestones"
          />,
        );

        const breadcrumbs = within(
          screen.getByRole('navigation', { name: 'breadcrumbs' }),
        );
        expect(breadcrumbs.getByRole('link', { name: 'Home' })).toHaveAttribute(
          'href',
          dashboard({}).$,
        );
        expect(
          breadcrumbs.getByRole('link', { name: listLabel }),
        ).toHaveAttribute('href', listHref);
        expect(breadcrumbs.getByText(project.title)).toBeVisible();
      },
    );
  });

  describe('Discovery projects', () => {
    it('renders Discovery Project type label', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.getByText('Discovery Project')).toBeInTheDocument();
    });

    it('renders research theme pill', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.getByText('Genetics')).toBeInTheDocument();
    });

    it('renders team name as a link when teamId is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      const teamLink = screen.getByText('Alpha Team').closest('a');
      expect(teamLink).toHaveAttribute('href', '/network/teams/team-1');
    });

    it('renders team name without link when teamId is not provided', () => {
      const projectWithoutTeamId = {
        ...mockDiscoveryProject,
        teamId: undefined,
      };
      render(
        <ProjectDetailHeader
          {...projectWithoutTeamId}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.getByText('Alpha Team')).toBeInTheDocument();
      const teamText = screen.getByText('Alpha Team').closest('a');
      expect(teamText).toBeNull();
    });

    it('renders share an output button when project is discovery project', () => {
      const { getByRole } = render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          canShareOutput
        />,
      );
      expect(
        getByRole('button', { name: /Share an output/i }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Share an output/i }));
      expect(screen.getByText(/article/i, { selector: 'span' })).toBeVisible();
    });

    it('does not render share an output button when the user cannot share an output', () => {
      const { queryByRole } = render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(
        queryByRole('button', { name: /Share an output/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Resource projects (team-based)', () => {
    it('renders Resource Project type label', () => {
      render(
        <ProjectDetailHeader
          {...mockResourceTeamProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      expect(screen.getByText('Resource Project')).toBeInTheDocument();
    });

    it('renders resource type pill', () => {
      render(
        <ProjectDetailHeader
          {...mockResourceTeamProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      expect(screen.getByText('Biobank')).toBeInTheDocument();
    });

    it('renders Access Drive button when googleDriveLink is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockResourceTeamProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      const driveLink = screen.getByText('Access Drive').closest('a');
      expect(driveLink).toHaveAttribute(
        'href',
        'https://drive.google.com/example',
      );
    });

    it('renders share an output button when the user can share an output for a resource project', () => {
      const { getByRole } = render(
        <ProjectDetailHeader
          {...mockResourceTeamProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
          canShareOutput
        />,
      );
      expect(
        getByRole('button', { name: /Share an output/i }),
      ).toBeInTheDocument();
    });

    it('does not render share an output button when the user cannot share an output', () => {
      const { queryByRole } = render(
        <ProjectDetailHeader
          {...mockResourceTeamProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      expect(
        queryByRole('button', { name: /Share an output/i }),
      ).not.toBeInTheDocument();
    });

    it('renders team name for team-based resource projects', () => {
      render(
        <ProjectDetailHeader
          {...mockResourceTeamProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      expect(screen.getByText('Resource Team')).toBeInTheDocument();
    });

    it('renders team name as link when teamId is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockResourceTeamProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      const teamLink = screen.getByText('Resource Team').closest('a');
      expect(teamLink).toHaveAttribute('href', '/network/teams/team-2');
    });

    it('renders team name without link when teamId is not provided', () => {
      const projectWithoutTeamId = {
        ...mockResourceTeamProject,
        teamId: undefined,
      };
      render(
        <ProjectDetailHeader
          {...projectWithoutTeamId}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      expect(screen.getByText('Resource Team')).toBeInTheDocument();
      const teamText = screen.getByText('Resource Team').closest('a');
      expect(teamText).toBeNull();
    });
  });

  describe('Resource projects (not team-based)', () => {
    it('renders member list instead of team name', () => {
      render(
        <ProjectDetailHeader
          {...mockResourceMemberProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('does not render Access Drive button when no googleDriveLink', () => {
      render(
        <ProjectDetailHeader
          {...mockResourceMemberProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      expect(screen.queryByText('Access Drive')).not.toBeInTheDocument();
    });

    it('renders member link with href /network/users/{id}', () => {
      render(
        <ProjectDetailHeader
          {...mockResourceMemberProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );
      const memberLink = screen.getByText('John Doe').closest('a');
      expect(memberLink).toHaveAttribute('href', '/network/users/user-1');
    });
  });

  describe('Trainee projects', () => {
    it('renders Trainee Project type label', () => {
      render(
        <ProjectDetailHeader
          {...mockTraineeProject}
          aboutHref="/projects/trainee/1/about"
          milestonesHref="/projects/trainee/1/milestones"
        />,
      );
      expect(screen.getByText('Trainee Project')).toBeInTheDocument();
    });

    it('renders trainees in the first row', () => {
      render(
        <ProjectDetailHeader
          {...mockTraineeProject}
          aboutHref="/projects/trainee/1/about"
          milestonesHref="/projects/trainee/1/milestones"
        />,
      );
      expect(screen.getByText('Emily Trainee')).toBeInTheDocument();
    });

    it('renders trainers in the second row', () => {
      render(
        <ProjectDetailHeader
          {...mockTraineeProject}
          aboutHref="/projects/trainee/1/about"
          milestonesHref="/projects/trainee/1/milestones"
        />,
      );
      expect(screen.getByText('Dr. Sarah Mentor')).toBeInTheDocument();
    });

    it('renders trainee and mentor links with href /network/users/{id}', () => {
      render(
        <ProjectDetailHeader
          {...mockTraineeProject}
          aboutHref="/projects/trainee/1/about"
          milestonesHref="/projects/trainee/1/milestones"
        />,
      );
      const traineeLink = screen.getByText('Emily Trainee').closest('a');
      const mentorLink = screen.getByText('Dr. Sarah Mentor').closest('a');
      expect(traineeLink).toHaveAttribute('href', '/network/users/trainee-1');
      expect(mentorLink).toHaveAttribute('href', '/network/users/trainer-1');
    });

    it('renders multiple mentors correctly', () => {
      const projectWithMultipleMentors = {
        ...mockTraineeProject,
        members: [
          ...mockTraineeProject.members,
          {
            id: 'mentor-2',
            displayName: 'Dr. John Mentor',
            firstName: 'John',
            lastName: 'Mentor',
            href: '/users/mentor-2',
            role: 'Independent Project - Mentor',
          },
          {
            id: 'mentor-3',
            displayName: 'Dr. Jane Key',
            firstName: 'Jane',
            lastName: 'Key',
            href: '/users/mentor-3',
            role: 'Trainee Project - Key Personnel',
          },
        ],
      };
      render(
        <ProjectDetailHeader
          {...projectWithMultipleMentors}
          aboutHref="/projects/trainee/1/about"
          milestonesHref="/projects/trainee/1/milestones"
        />,
      );
      expect(screen.getByText('Dr. Sarah Mentor')).toBeInTheDocument();
      expect(screen.getByText('Dr. John Mentor')).toBeInTheDocument();
      expect(screen.queryByText('Dr. Jane Key')).not.toBeInTheDocument();
    });

    it('renders share an output button when the user can share an output for a trainee project', () => {
      const { getByRole } = render(
        <ProjectDetailHeader
          {...mockTraineeProject}
          aboutHref="/projects/trainee/1/about"
          milestonesHref="/projects/trainee/1/milestones"
          canShareOutput
        />,
      );
      expect(
        getByRole('button', { name: /Share an output/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Duration display', () => {
    it('renders duration for Discovery projects inline with team', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      // Check that dates are rendered
      expect(screen.getByText(/Jan 2023/)).toBeInTheDocument();
      expect(screen.getByText(/Present/)).toBeInTheDocument();
    });

    it('renders duration for Trainee projects separately', () => {
      render(
        <ProjectDetailHeader
          {...mockTraineeProject}
          aboutHref="/projects/trainee/1/about"
          milestonesHref="/projects/trainee/1/milestones"
        />,
      );
      expect(screen.getByText(/Jan 2023/)).toBeInTheDocument();
      expect(screen.getByText(/Present/)).toBeInTheDocument();
    });

    it('renders duration for Resource not team-based projects', () => {
      const { getByText } = render(
        <ProjectDetailHeader
          {...mockResourceMemberProject}
          aboutHref="/projects/resource/1/about"
          milestonesHref="/projects/resource/1/milestones"
        />,
      );

      expect(getByText(/Jan 2023/)).toBeInTheDocument();
      expect(getByText(/Present/)).toBeInTheDocument();
    });
  });

  describe('Workspace tab', () => {
    it('renders Workspace tab when workspaceHref is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          workspaceHref="/projects/discovery/1/workspace"
        />,
      );
      expect(screen.getByText('Workspace')).toBeInTheDocument();
    });

    it('does not render Workspace tab when workspaceHref is not provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    });
  });

  describe('Compliance tab', () => {
    it('renders Compliance tab with its count when complianceHref is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          complianceHref="/projects/discovery/1/compliance"
          manuscriptsCount={3}
        />,
      );
      const complianceLink = screen.getByRole('link', {
        name: 'Compliance (3)',
      });
      expect(complianceLink).toHaveAttribute(
        'href',
        '/projects/discovery/1/compliance',
      );
    });

    it('renders Compliance tab without a count when manuscriptsCount is not provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          complianceHref="/projects/discovery/1/compliance"
        />,
      );
      expect(
        screen.getByRole('link', { name: 'Compliance' }),
      ).toBeInTheDocument();
    });

    it('does not render Compliance tab when complianceHref is not provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          manuscriptsCount={3}
        />,
      );
      expect(screen.queryByText(/Compliance/)).not.toBeInTheDocument();
    });

    it('renders Compliance tab between the Workspace and Outputs tabs', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          workspaceHref="/projects/discovery/1/workspace"
          complianceHref="/projects/discovery/1/compliance"
          manuscriptsCount={3}
          outputsHref="/projects/discovery/1/outputs"
          outputsCount={12}
          draftOutputsHref="/projects/discovery/1/draft-outputs"
          draftOutputsCount={5}
        />,
      );
      expect(
        within(screen.getByRole('navigation', { name: 'tabs' }))
          .getAllByRole('link')
          .map(({ textContent }) => textContent),
      ).toEqual([
        'About',
        'Milestones',
        'Workspace',
        'Compliance (3)',
        'Outputs (12)',
        'Draft Outputs (5)',
      ]);
    });
  });

  describe('Outputs tab', () => {
    it('renders Outputs tab when outputsHref is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          outputsHref="/projects/discovery/1/outputs"
        />,
      );
      expect(screen.getByText('Outputs')).toBeInTheDocument();
    });

    it('does not render Outputs tab when outputsHref is not provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.queryByText('Outputs')).not.toBeInTheDocument();
    });

    it('renders Outputs tab with count when outputsCount is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          outputsHref="/projects/discovery/1/outputs"
          outputsCount={12}
        />,
      );
      expect(screen.getByText('Outputs (12)')).toBeInTheDocument();
    });
  });

  describe('Draft Outputs tab', () => {
    it('renders Draft Outputs tab when draftOutputsHref is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          draftOutputsHref="/projects/discovery/1/draft-outputs"
        />,
      );
      expect(screen.getByText('Draft Outputs')).toBeInTheDocument();
    });

    it('does not render Draft Outputs tab when draftOutputsHref is not provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
        />,
      );
      expect(screen.queryByText('Draft Outputs')).not.toBeInTheDocument();
    });

    it('renders Draft Outputs tab with count when draftOutputsCount is provided', () => {
      render(
        <ProjectDetailHeader
          {...mockDiscoveryProject}
          aboutHref="/projects/discovery/1/about"
          milestonesHref="/projects/discovery/1/milestones"
          draftOutputsHref="/projects/discovery/1/draft-outputs"
          draftOutputsCount={5}
        />,
      );
      expect(screen.getByText('Draft Outputs (5)')).toBeInTheDocument();
    });
  });
});
