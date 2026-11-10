import {
  isProjectStatus,
  isProjectType,
  projectStatuses,
  projectTypes,
  isProjectLead,
  isProjectMember,
  projectHasLead,
  canPublishProjectOutput,
  groupTraineeProjectMembers,
  Project,
} from '../src/project';

const baseProject = {
  id: 'proj-1',
  title: 'Test Project',
  status: 'Active' as const,
  statusRank: 1,
  startDate: '2025-01-01',
  endDate: '2026-01-01',
  tags: [],
};

describe('Project Model', () => {
  describe('isProjectLead', () => {
    it('returns true for a Discovery Project PM', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      const userTeams = [{ id: 'team-1', role: 'Project Manager' }];
      expect(isProjectLead('user-1', userTeams, project)).toBe(true);
    });

    it('returns true for a Discovery Project Lead PI', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      const userTeams = [{ id: 'team-1', role: 'Lead PI (Core Leadership)' }];
      expect(isProjectLead('user-1', userTeams, project)).toBe(true);
    });

    it('returns true for a Discovery Project Co-PI', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      const userTeams = [{ id: 'team-1', role: 'Co-PI (Core Leadership)' }];
      expect(isProjectLead('user-1', userTeams, project)).toBe(true);
    });

    it('returns true for a Discovery Project Data Manager', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      const userTeams = [{ id: 'team-1', role: 'Data Manager' }];
      expect(isProjectLead('user-1', userTeams, project)).toBe(true);
    });

    it('returns false for a non-lead team role on a Discovery Project', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      const userTeams = [{ id: 'team-1', role: 'Key Personnel' }];
      expect(isProjectLead('user-1', userTeams, project)).toBe(false);
    });

    it('returns false when user is not on the project team', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      const userTeams = [{ id: 'team-other', role: 'Project Manager' }];
      expect(isProjectLead('user-1', userTeams, project)).toBe(false);
    });

    it('returns true for Trainee Project Lead', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Independent Project - Lead',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(true);
    });

    it('returns false for Trainee Project Mentor', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Independent Project - Mentor',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(false);
    });

    it('returns false for Trainee Project member still holding the retired role', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Trainee Project - Lead',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(false);
    });

    it('returns false for Trainee Project when user is not a member', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'other-user',
            displayName: 'Other User',
            role: 'Independent Project - Lead',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(false);
    });

    it('returns true for user-based Resource Project PM in members', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Project Manager',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(true);
    });

    it('returns true for user-based Resource Project Lead PI in members', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Lead PI',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(true);
    });

    it('returns true for user-based Resource Project Co-PI in members', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Co-PI',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(true);
    });

    it('returns true for user-based Resource Project Data Manager in members', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Data Manager',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(true);
    });

    it('returns false for user-based Resource Project with team-style Lead PI role', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Lead PI (Core Leadership)',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(false);
    });

    it('returns false for user-based Resource Project with non-lead role', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Key Personnel',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(false);
    });

    it('returns false for user-based Resource Project when user has no role', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
          },
        ],
      };
      expect(isProjectLead('user-1', [], project)).toBe(false);
    });

    it('returns true for team-based Resource Project with lead team role', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: true,
        teamId: 'team-1',
        teamName: 'Team A',
      };
      const userTeams = [{ id: 'team-1', role: 'Project Manager' }];
      expect(isProjectLead('user-1', userTeams, project)).toBe(true);
    });

    it('returns false for a Discovery Project without a teamId', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
      };
      expect(isProjectLead('user-1', [], project)).toBe(false);
    });
  });

  describe('isProjectMember', () => {
    it('returns true when user is in the funded team of a Discovery Project', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      expect(isProjectMember('user-1', [{ id: 'team-1' }], project)).toBe(true);
    });

    it('returns false when user is not in the funded team of a Discovery Project', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      expect(isProjectMember('user-1', [{ id: 'team-other' }], project)).toBe(
        false,
      );
    });

    it('returns true when user is in the funded team of a team-based Resource Project', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: true,
        teamName: 'Team A',
        teamId: 'team-1',
      };
      expect(isProjectMember('user-1', [{ id: 'team-1' }], project)).toBe(true);
    });

    it('returns true when user is listed as a member of a Trainee Project', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Independent Project - Mentor',
          },
        ],
      };
      expect(isProjectMember('user-1', [], project)).toBe(true);
    });

    it('returns false for a Trainee Project member with no role', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [{ id: 'user-1', displayName: 'Test User' }],
      };
      expect(isProjectMember('user-1', [], project)).toBe(false);
    });

    it('returns false for a Trainee Project member holding a retired role', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Trainee Project - Key Personnel',
          },
        ],
      };
      expect(isProjectMember('user-1', [], project)).toBe(false);
    });

    it('returns false when user is not listed as a member of a Trainee Project', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'other',
            displayName: 'Other User',
          },
        ],
      };
      expect(isProjectMember('user-1', [], project)).toBe(false);
    });

    it('returns true when the project only carries fundedTeam (no teamId)', () => {
      const project: Project & { fundedTeam: { id: string } } = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        fundedTeam: { id: 'team-1' },
      };
      expect(isProjectMember('user-1', [{ id: 'team-1' }], project)).toBe(true);
    });

    it('returns false when the user is not in the project fundedTeam', () => {
      const project: Project & { fundedTeam: { id: string } } = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        fundedTeam: { id: 'team-1' },
      };
      expect(isProjectMember('user-1', [{ id: 'team-other' }], project)).toBe(
        false,
      );
    });

    it('returns false when the project has neither a teamId nor a members list', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
      };
      expect(isProjectMember('user-1', [], project)).toBe(false);
    });

    it('returns true when user is listed as a member of a user-based Resource Project', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            role: 'Key Personnel',
          },
        ],
      };
      expect(isProjectMember('user-1', [], project)).toBe(true);
    });
  });

  describe('projectHasLead', () => {
    it('returns true when a Trainee Project has an Independent Project - Lead', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'user-1',
            displayName: 'Lead',
            role: 'Independent Project - Lead',
          },
          {
            id: 'user-2',
            displayName: 'Mentor',
            role: 'Independent Project - Mentor',
          },
        ],
      };
      expect(projectHasLead(project)).toBe(true);
    });

    it('returns false when a Trainee Project has no lead', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Trainee Project',
        members: [
          {
            id: 'user-2',
            displayName: 'Mentor',
            role: 'Independent Project - Mentor',
          },
        ],
      };
      expect(projectHasLead(project)).toBe(false);
    });

    it.each(['Project Manager', 'Lead PI', 'Co-PI', 'Data Manager'])(
      'returns true when a user-based Resource Project has a %s',
      (role) => {
        const project: Project = {
          ...baseProject,
          projectType: 'Resource Project',
          resourceType: 'Resource',
          isTeamBased: false,
          members: [{ id: 'user-1', displayName: 'Lead', role }],
        };
        expect(projectHasLead(project)).toBe(true);
      },
    );

    it('returns false when a user-based Resource Project has only non-lead members', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Resource Project',
        resourceType: 'Resource',
        isTeamBased: false,
        members: [
          { id: 'user-1', displayName: 'Member', role: 'Key Personnel' },
        ],
      };
      expect(projectHasLead(project)).toBe(false);
    });

    it('returns false for team-based projects (leads resolved from team roles)', () => {
      const project: Project = {
        ...baseProject,
        projectType: 'Discovery Project',
        researchTheme: 'theme',
        teamName: 'Team A',
        teamId: 'team-1',
      };
      expect(projectHasLead(project)).toBe(false);
    });
  });

  describe('canPublishProjectOutput', () => {
    const traineeProject = (
      members: { id: string; displayName: string; role?: string }[],
    ): Project => ({
      ...baseProject,
      projectType: 'Trainee Project',
      members,
    });

    const discoveryProject = (): Project => ({
      ...baseProject,
      projectType: 'Discovery Project',
      researchTheme: 'theme',
      teamName: 'Team A',
      teamId: 'team-1',
    });

    it('lets a project lead publish even when a lead exists', () => {
      const project = traineeProject([
        {
          id: 'user-1',
          displayName: 'Lead',
          role: 'Independent Project - Lead',
        },
      ]);
      expect(canPublishProjectOutput('user-1', [], project)).toBe(true);
    });

    it('blocks a non-lead member when the project has a lead', () => {
      const project = traineeProject([
        { id: 'lead', displayName: 'Lead', role: 'Independent Project - Lead' },
        {
          id: 'user-1',
          displayName: 'Member',
          role: 'Independent Project - Mentor',
        },
      ]);
      expect(canPublishProjectOutput('user-1', [], project)).toBe(false);
    });

    it('lets any member publish when the project has no lead', () => {
      const project = traineeProject([
        {
          id: 'user-1',
          displayName: 'Member',
          role: 'Independent Project - Mentor',
        },
      ]);
      expect(canPublishProjectOutput('user-1', [], project)).toBe(true);
    });

    it('lets a Discovery Project team lead publish', () => {
      expect(
        canPublishProjectOutput(
          'user-1',
          [{ id: 'team-1', role: 'Project Manager' }],
          discoveryProject(),
        ),
      ).toBe(true);
    });

    it('blocks a non-lead member of a Discovery Project', () => {
      expect(
        canPublishProjectOutput(
          'user-1',
          [{ id: 'team-1', role: 'Key Personnel' }],
          discoveryProject(),
        ),
      ).toBe(false);
    });
  });

  describe('isProjectStatus', () => {
    it.each(projectStatuses)(
      'should return true for valid project status "%s"',
      (status) => {
        expect(isProjectStatus(status)).toBe(true);
      },
    );

    it.each([
      ['invalid string', 'Archived'],
      ['empty string', ''],
      ['undefined', undefined],
      ['null', null],
      ['number', 123],
    ])('should return false for %s', (_label, value) => {
      expect(isProjectStatus(value)).toBe(false);
    });
  });

  describe('isProjectType', () => {
    it.each(projectTypes)(
      'should return true for valid project type "%s"',
      (projectType) => {
        expect(isProjectType(projectType)).toBe(true);
      },
    );

    it('should return false for invalid string', () => {
      expect(isProjectType('Invalid Project')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isProjectType(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isProjectType(null)).toBe(false);
    });

    it('should return false for number', () => {
      expect(isProjectType(123)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isProjectType('')).toBe(false);
    });
  });

  describe('groupTraineeProjectMembers', () => {
    const lead = { id: 'lead-1', role: 'Independent Project - Lead' };
    const mentor = { id: 'mentor-1', role: 'Independent Project - Mentor' };

    it('should split members into trainees and mentors', () => {
      expect(groupTraineeProjectMembers([mentor, lead])).toEqual({
        trainees: [lead],
        mentors: [mentor],
        unassigned: [],
      });
    });

    it('should put a member without a role in unassigned', () => {
      const noRole = { id: 'no-role' };

      expect(groupTraineeProjectMembers([lead, noRole])).toEqual({
        trainees: [lead],
        mentors: [],
        unassigned: [noRole],
      });
    });

    it.each`
      role
      ${'Trainee Project - Key Personnel'}
      ${'Trainee Project - Lead'}
      ${'Trainee'}
      ${'Contributor'}
    `(
      'should leave a member holding $role out of every group',
      ({ role }: { role: string }) => {
        const other = { id: 'other-1', role };

        expect(groupTraineeProjectMembers([lead, other])).toEqual({
          trainees: [lead],
          mentors: [],
          unassigned: [],
        });
      },
    );
  });
});
