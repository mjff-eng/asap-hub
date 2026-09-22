import {
  groupFindings,
  groupLabel,
  SpeakerGroup,
  SpeakerGroupUser,
  SpeakerTeamGroup,
} from '../speaker-group';

const getUser = (
  overrides: Partial<SpeakerGroupUser> = {},
): SpeakerGroupUser => ({
  id: 'user-1',
  displayName: 'Adam Brown',
  roles: ['Key Personnel'],
  preliminaryFindingsShared: false,
  ...overrides,
});

const getTeamGroup = (users: SpeakerGroupUser[]): SpeakerTeamGroup => ({
  id: 'team-1',
  variant: 'team',
  teamName: 'Team One',
  users,
});

describe('groupFindings', () => {
  test('Should count the speakers who shared preliminary findings', () => {
    expect(
      groupFindings(
        getTeamGroup([
          getUser({ id: 'user-1', preliminaryFindingsShared: true }),
          getUser({ id: 'user-2' }),
          getUser({ id: 'user-3' }),
          getUser({ id: 'user-4' }),
        ]),
      ),
    ).toEqual({ shared: 1, total: 4, hasAnyShared: true });
  });

  test('Should report no shared findings when no speaker shared', () => {
    expect(
      groupFindings(
        getTeamGroup([getUser({ id: 'user-1' }), getUser({ id: 'user-2' })]),
      ),
    ).toEqual({ shared: 0, total: 2, hasAnyShared: false });
  });

  test('Should handle an empty group', () => {
    expect(groupFindings(getTeamGroup([]))).toEqual({
      shared: 0,
      total: 0,
      hasAnyShared: false,
    });
  });
});

describe('groupLabel', () => {
  test('Should return the team name for a team group', () => {
    expect(groupLabel(getTeamGroup([]))).toBe('Team One');
  });

  test('Should return the project name for a project group', () => {
    expect(
      groupLabel({
        id: 'project-1',
        variant: 'project',
        projectName: 'Project One',
        users: [],
      }),
    ).toBe('Project One');
  });
});

describe('SpeakerGroup', () => {
  test('Should narrow a project group through the variant discriminant', () => {
    const group: SpeakerGroup = {
      id: 'project-1',
      variant: 'project',
      projectName: 'Project One',
      projectType: 'Discovery Project',
      users: [getUser({ preliminaryFindingsShared: true })],
    };

    expect(group.variant === 'project' && group.projectName).toBe(
      'Project One',
    );
    expect(groupFindings(group).hasAnyShared).toBe(true);
  });
});
