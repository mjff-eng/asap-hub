import { EntityResponses } from '@asap-hub/algolia';
import { createUserListItemResponse } from '@asap-hub/fixtures';

import { toSpeakerSearchOptions } from '../speaker-search-options';

type UserHit = EntityResponses['crn']['user'];
type ExternalAuthorHit = EntityResponses['crn']['external-author'];

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
