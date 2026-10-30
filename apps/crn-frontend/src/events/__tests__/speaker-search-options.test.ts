import { EntityResponses } from '@asap-hub/algolia';
import {
  createTeamListItemResponse,
  createUserListItemResponse,
} from '@asap-hub/fixtures';
import { BaseProject } from '@asap-hub/model';

import {
  toSpeakerAffiliationOptions,
  toSpeakerSearchOptions,
} from '../speaker-search-options';

type UserHit = EntityResponses['crn']['user'];
type ExternalAuthorHit = EntityResponses['crn']['external-author'];
type TeamHit = EntityResponses['crn']['team'];
type ProjectHit = EntityResponses['crn']['project'];

const userHit = (overrides: Partial<UserHit> = {}): UserHit => ({
  ...createUserListItemResponse(),
  id: 'user-1',
  displayName: 'Jane Doe',
  avatarUrl: 'https://example.com/jane.png',
  teams: [],
  individualProjects: [],
  __meta: { type: 'user' },
  ...overrides,
});

const externalAuthorHit: ExternalAuthorHit = {
  id: 'external-author-1',
  displayName: 'Riley Stone',
  __meta: { type: 'external-author' },
};

const teamHit = (overrides: Partial<TeamHit> = {}): TeamHit => ({
  ...createTeamListItemResponse(),
  id: 'team-1',
  displayName: 'Team Alpha',
  teamType: 'Discovery Team',
  __meta: { type: 'team' },
  ...overrides,
});

const baseProject: BaseProject & { __meta: ProjectHit['__meta'] } = {
  id: 'project-1',
  title: 'Project',
  status: 'Active',
  statusRank: 1,
  startDate: '2024-01-01',
  endDate: '2025-01-01',
  tags: [],
  __meta: { type: 'project' },
};

const traineeProjectHit: ProjectHit = {
  ...baseProject,
  id: 'trainee-1',
  title: 'Trainee One',
  projectType: 'Trainee Project',
  members: [],
};

const resourceProjectHit = (isTeamBased: boolean): ProjectHit => ({
  ...baseProject,
  id: isTeamBased ? 'resource-team-1' : 'resource-individual-1',
  title: isTeamBased ? 'Resource Team Project' : 'Resource Individual Project',
  projectType: 'Resource Project',
  resourceType: 'Database',
  isTeamBased,
});

const discoveryProjectHit: ProjectHit = {
  ...baseProject,
  id: 'discovery-1',
  title: 'Discovery One',
  projectType: 'Discovery Project',
  researchTheme: 'Theme',
  teamName: 'Team Alpha',
};

describe('toSpeakerSearchOptions', () => {
  it('lists the teams and then the individual projects of a CRN user as affiliations', () => {
    const [option] = toSpeakerSearchOptions([
      userHit({
        teams: [
          {
            id: 'team-1',
            displayName: 'Team Alpha',
            role: 'Project Manager',
            teamType: 'Resource Team',
            teamInactiveSince: '2024-01-01',
          },
        ],
        individualProjects: [
          {
            id: 'trainee-1',
            title: 'Trainee One',
            projectType: 'Trainee Project',
            status: 'Completed',
            role: 'Trainee',
          },
        ],
      }),
    ]);

    expect(option).toEqual({
      value: 'user-1',
      label: 'Jane Doe',
      user: {
        userId: 'user-1',
        displayName: 'Jane Doe',
        avatarUrl: 'https://example.com/jane.png',
        isAlumni: false,
        affiliationOptions: [
          {
            variant: 'team',
            id: 'team-1',
            name: 'Team Alpha',
            teamType: 'Resource Team',
            isTeamInactive: true,
            role: 'Project Manager',
          },
          {
            variant: 'project',
            id: 'trainee-1',
            name: 'Trainee One',
            projectType: 'Trainee Project',
            role: 'Trainee',
          },
        ],
      },
    });
  });

  it('flags alumni users', () => {
    const [option] = toSpeakerSearchOptions([
      userHit({ alumniSinceDate: '2024-01-01' }),
    ]);

    expect(option?.user?.isAlumni).toBe(true);
  });

  it('lists only the teams of a user record indexed before individual projects existed', () => {
    const { individualProjects: _, ...recordWithoutProjects } = userHit({
      teams: [{ id: 'team-1', displayName: 'Team Alpha', role: 'Trainee' }],
    });

    const [option] = toSpeakerSearchOptions([recordWithoutProjects as UserHit]);

    expect(option?.user?.affiliationOptions).toEqual([
      expect.objectContaining({ variant: 'team', id: 'team-1' }),
    ]);
  });

  it('lists external authors after CRN users', () => {
    expect(
      toSpeakerSearchOptions([externalAuthorHit, userHit()]).map(
        ({ value }) => value,
      ),
    ).toEqual(['user-1', 'external-author-1']);
  });

  it('maps an external author to an option that carries its id', () => {
    expect(toSpeakerSearchOptions([externalAuthorHit])).toEqual([
      {
        value: 'external-author-1',
        label: 'Riley Stone',
        externalAuthor: {
          id: 'external-author-1',
          displayName: 'Riley Stone',
        },
      },
    ]);
  });
});

describe('toSpeakerAffiliationOptions', () => {
  it('maps teams with their type and inactivity', () => {
    expect(
      toSpeakerAffiliationOptions([
        teamHit({ inactiveSince: '2024-01-01', teamType: 'Resource Team' }),
      ]),
    ).toEqual([
      {
        variant: 'team',
        id: 'team-1',
        name: 'Team Alpha',
        teamType: 'Resource Team',
        isTeamInactive: true,
      },
    ]);
  });

  it('keeps only individual projects and lists them after the teams', () => {
    expect(
      toSpeakerAffiliationOptions([
        traineeProjectHit,
        discoveryProjectHit,
        resourceProjectHit(true),
        resourceProjectHit(false),
        teamHit(),
      ]).map(({ variant, id }) => `${variant}:${id}`),
    ).toEqual([
      'team:team-1',
      'project:trainee-1',
      'project:resource-individual-1',
    ]);
  });

  it('maps an individual project with its title and type', () => {
    expect(toSpeakerAffiliationOptions([traineeProjectHit])).toEqual([
      {
        variant: 'project',
        id: 'trainee-1',
        name: 'Trainee One',
        projectType: 'Trainee Project',
      },
    ]);
  });
});
