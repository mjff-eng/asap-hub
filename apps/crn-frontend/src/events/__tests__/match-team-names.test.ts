import { createTeamListItemResponse } from '@asap-hub/fixtures';
import { TeamListItemResponse } from '@asap-hub/model';

import { matchTeamNames, normalizeTeamName } from '../match-team-names';
import { ParsedTeamRow } from '../parse-team-list';

const team = (
  overrides: Partial<TeamListItemResponse> = {},
): TeamListItemResponse => ({
  ...createTeamListItemResponse(),
  id: 't-alessi',
  displayName: 'Alessi',
  teamType: 'Discovery Team',
  ...overrides,
});

const row = (name: string, attended = false): ParsedTeamRow => ({
  name,
  attended,
});

describe('normalizeTeamName', () => {
  it.each`
    input             | expected
    ${'  Alessi  '}   | ${'alessi'}
    ${'ALESSI'}       | ${'alessi'}
    ${'Team Alessi'}  | ${'alessi'}
    ${'team  alessi'} | ${'alessi'}
    ${'Alessi Team'}  | ${'alessi team'}
    ${'Teamwork'}     | ${'teamwork'}
  `('Should normalize $input to $expected', ({ input, expected }) => {
    expect(normalizeTeamName(input)).toEqual(expected);
  });
});

describe('matchTeamNames', () => {
  it.each([true, false])(
    'Should match a name and carry attended=%s from the file',
    (attended) => {
      const result = matchTeamNames([row('Alessi', attended)], [team()]);

      expect(result.matched).toEqual([
        {
          teamId: 't-alessi',
          teamName: 'Alessi',
          attended,
          teamType: 'Discovery Team',
          isTeamInactive: false,
        },
      ]);
      expect(result.unmatched).toEqual([]);
    },
  );

  it.each(['Team Alessi', 'ALESSI', '  alessi  '])(
    'Should match %s against the stored display name',
    (name) => {
      const result = matchTeamNames([row(name)], [team()]);

      expect(result.matched).toHaveLength(1);
      expect(result.unmatched).toEqual([]);
    },
  );

  it('Should list a name with no close match, without a suggestion', () => {
    const result = matchTeamNames([row('Nobody')], [team()]);

    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual([{ name: 'Nobody' }]);
    expect(result.unmatched[0]?.suggestion).toBeUndefined();
  });

  it.each([true, false])(
    'Should suggest the closest team and carry attended=%s from the file',
    (attended) => {
      const result = matchTeamNames([row(' Alessy ', attended)], [team()]);

      expect(result.matched).toEqual([]);
      expect(result.unmatched).toEqual([
        {
          name: 'Alessy',
          suggestion: {
            teamId: 't-alessi',
            teamName: 'Alessi',
            teamType: 'Discovery Team',
            attended,
            isTeamInactive: false,
          },
        },
      ]);
    },
  );

  it('Should flag an inactive team in a suggestion', () => {
    const result = matchTeamNames(
      [row('Alessy')],
      [team({ inactiveSince: '2024-01-01T00:00:00.000Z' })],
    );

    expect(result.unmatched[0]?.suggestion?.isTeamInactive).toEqual(true);
  });

  it('Should not suggest a team that is already matched', () => {
    const result = matchTeamNames([row('Alessi'), row('Alessy')], [team()]);

    expect(result.matched).toHaveLength(1);
    expect(result.unmatched).toEqual([{ name: 'Alessy' }]);
  });

  it('Should not suggest the same team twice', () => {
    const result = matchTeamNames([row('Alessy'), row('Alessii')], [team()]);

    expect(result.unmatched[0]?.suggestion?.teamId).toEqual('t-alessi');
    expect(result.unmatched[1]?.suggestion).toBeUndefined();
  });

  describe('normalized Levenshtein suggestion threshold', () => {
    const corpus = [
      team({ id: 't-alessi', displayName: 'Alessi' }),
      team({ id: 't-antelope', displayName: 'Antelope' }),
      team({ id: 't-gp2', displayName: 'GP2' }),
      team({ id: 't-bruce', displayName: 'Bruce' }),
    ];

    it.each`
      name          | expected
      ${'Alissi'}   | ${'Alessi'}
      ${'Alesi'}    | ${'Alessi'}
      ${'antilope'} | ${'Antelope'}
      ${'antelop'}  | ${'Antelope'}
      ${'gpt'}      | ${undefined}
      ${'GP5'}      | ${undefined}
      ${'Bruck'}    | ${undefined}
      ${'Nobody'}   | ${undefined}
    `('Should suggest $expected for $name', ({ name, expected }) => {
      const result = matchTeamNames([row(name)], corpus);

      expect(result.matched).toEqual([]);
      expect(result.unmatched[0]?.suggestion?.teamName).toEqual(expected);
    });

    it('Should pick the closest team when several are candidates', () => {
      const result = matchTeamNames(
        [row('Antelopa')],
        [
          team({ id: 't-antelope', displayName: 'Antelope' }),
          team({ id: 't-antelopes', displayName: 'Antelopes' }),
        ],
      );

      expect(result.unmatched[0]?.suggestion?.teamId).toEqual('t-antelope');
    });
  });

  it('Should resolve every Hub team into matched regardless of the current table', () => {
    const teams = [
      team(),
      team({ id: 't-aguzzi', displayName: 'Aguzzi' }),
      team({ id: 't-chen', displayName: 'Chen' }),
    ];

    const result = matchTeamNames(
      [row('Alessi', true), row('Aguzzi'), row('Chen', true), row('Nobody')],
      teams,
    );

    expect(result.matched.map(({ teamName }) => teamName)).toEqual([
      'Alessi',
      'Aguzzi',
      'Chen',
    ]);
    expect(result.unmatched).toEqual([{ name: 'Nobody' }]);
    expect(result.matched.length + result.unmatched.length).toEqual(4);
  });

  it('Should keep the first occurrence of a repeated name', () => {
    const result = matchTeamNames(
      [
        row('Alessi', true),
        row('Team Alessi', false),
        row('Ghost'),
        row('ghost'),
      ],
      [team()],
    );

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]?.attended).toEqual(true);
    expect(result.unmatched).toEqual([{ name: 'Ghost' }]);
  });

  it('Should skip blank names', () => {
    const result = matchTeamNames([row('   '), row('')], [team()]);

    expect(result).toEqual({ matched: [], unmatched: [] });
  });

  it('Should keep two Hub teams distinct when they differ only by a leading Team prefix', () => {
    const teams = [
      team({ id: 't-science', displayName: 'Science' }),
      team({ id: 't-team-science', displayName: 'Team Science' }),
    ];

    const result = matchTeamNames(
      [row('Science', true), row('Team Science', false)],
      teams,
    );

    expect(result.matched).toEqual([
      expect.objectContaining({ teamId: 't-science', attended: true }),
      expect.objectContaining({ teamId: 't-team-science', attended: false }),
    ]);
    expect(result.unmatched).toEqual([]);
  });

  it('Should match an inactive team and flag it', () => {
    const result = matchTeamNames(
      [row('Alessi')],
      [team({ inactiveSince: '2024-01-01T00:00:00.000Z' })],
    );

    expect(result.matched[0]?.isTeamInactive).toEqual(true);
  });
});
