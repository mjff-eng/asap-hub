import { createCsvFileStream } from '@asap-hub/frontend-utils';
import {
  createEventResponse,
  createInterestGroupResponse,
} from '@asap-hub/fixtures';
import { EventResponse } from '@asap-hub/model';
import {
  EventAttendanceTeam,
  SpeakerGroup,
  SpeakerGroupUser,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';

import {
  downloadEventAttendance,
  downloadEventSpeakers,
  eventAttendanceFields,
  eventAttendanceToCSV,
  eventSpeakersFields,
  eventSpeakersToCSV,
} from '../export';
import { mapSpeakersToGroups } from '../map-speakers-to-groups';

jest.mock('@asap-hub/frontend-utils', () => {
  const original = jest.requireActual('@asap-hub/frontend-utils');
  return {
    ...original,
    createCsvFileStream: jest
      .fn()
      .mockImplementation(() => ({ write: jest.fn(), end: jest.fn() })),
  };
});

const mockCreateCsvFileStream = createCsvFileStream as jest.MockedFunction<
  typeof createCsvFileStream
>;

const getEvent = (overrides: Partial<EventResponse> = {}): EventResponse =>
  ({
    ...createEventResponse(),
    title: 'Kick-off',
    description: 'Intro session',
    startDate: '2026-08-19T10:00:00.000Z',
    endDate: '2026-08-19T11:00:00.000Z',
    ...overrides,
  }) as EventResponse;

const speaker = (
  overrides: Partial<SpeakerGroupUser> = {},
): SpeakerGroupUser => ({
  id: 'u1',
  displayName: 'Padmini',
  roles: [],
  preliminaryFindingsShared: false,
  ...overrides,
});

const teamGroup = (
  overrides: Partial<SpeakerTeamGroup> = {},
): SpeakerGroup => ({
  id: 'team-1',
  variant: 'team',
  teamName: 'Alessi',
  users: [
    speaker({ preliminaryFindingsShared: true }),
    speaker({
      id: 'u2',
      displayName: 'Marco',
      preliminaryFindingsShared: true,
    }),
  ],
  ...overrides,
});

const projectGroup = (
  overrides: Partial<SpeakerProjectGroup> = {},
): SpeakerGroup => ({
  id: 'project-1',
  variant: 'project',
  projectName: 'Alpha Project',
  users: [speaker({ id: 'u9', displayName: 'Nadia' })],
  ...overrides,
});

const externalGroup = (
  displayNames: string[] = ['Jane Doe'],
): SpeakerGroup => ({
  id: 'external',
  variant: 'external',
  users: displayNames.map((displayName, index) => ({
    id: `external-${index}`,
    displayName,
    preliminaryFindingsShared: false,
  })),
});

const mixedGroups = (): SpeakerGroup[] => [
  teamGroup({
    users: [
      speaker({ preliminaryFindingsShared: true }),
      speaker({ id: 'u2', displayName: 'Marco' }),
      speaker({ id: 'u3', displayName: 'Jane Doe', isExternal: true }),
    ],
  }),
  projectGroup({
    users: [
      speaker({
        id: 'u9',
        displayName: 'Nadia',
        preliminaryFindingsShared: true,
      }),
    ],
  }),
  externalGroup(['John Roe']),
];

describe('eventSpeakersToCSV', () => {
  test('Should render every column for a finished event', () => {
    const row = eventSpeakersToCSV(
      getEvent({
        interestGroup: {
          ...createInterestGroupResponse(),
          name: 'Parkinson IG',
        },
      }),
      mixedGroups(),
      true,
    );

    expect(row).toEqual({
      eventTitle: 'Kick-off',
      description: 'Intro session',
      startDate: '2026-08-19T10:00:00.000Z',
      endDate: '2026-08-19T11:00:00.000Z',
      interestGroupName: 'Parkinson IG',
      totalSpeakers: '5',
      teamSpeakerCount: '3',
      projectSpeakerCount: '1',
      externalSpeakerCount: '1',
      findingsPercentage: '40%',
      teamSpeakers:
        'Alessi - Padmini [Y]; Alessi - Marco [N]; Alessi - Jane Doe (Non CRN) [N]',
      projectSpeakers: 'Alpha Project - Nadia [Y]',
      externalSpeakers: 'John Roe [N]',
    });
  });

  test('Should leave findings out for an event that has not finished', () => {
    const row = eventSpeakersToCSV(getEvent(), mixedGroups(), false);

    expect(row).toMatchObject({
      totalSpeakers: '5',
      teamSpeakerCount: '3',
      projectSpeakerCount: '1',
      externalSpeakerCount: '1',
      findingsPercentage: 'NA',
      teamSpeakers:
        'Alessi - Padmini; Alessi - Marco; Alessi - Jane Doe (Non CRN)',
      projectSpeakers: 'Alpha Project - Nadia',
      externalSpeakers: 'John Roe',
    });
  });

  test('Should flag the external speakers who shared preliminary findings', () => {
    const row = eventSpeakersToCSV(
      getEvent(),
      [
        {
          id: 'external',
          variant: 'external',
          users: [
            {
              id: 'external-0',
              displayName: 'Jane Doe',
              preliminaryFindingsShared: true,
            },
            {
              id: 'external-1',
              displayName: 'John Roe',
              preliminaryFindingsShared: false,
            },
          ],
        },
      ],
      true,
    );

    expect(row).toMatchObject({
      externalSpeakers: 'Jane Doe [Y]; John Roe [N]',
      findingsPercentage: '50%',
    });
  });

  test('Should render 0% rather than NA when no speaker shared', () => {
    const row = eventSpeakersToCSV(
      getEvent(),
      [teamGroup({ users: [speaker()] })],
      true,
    );

    expect(row.findingsPercentage).toEqual('0%');
  });

  test('Should list speakers from several teams in group order', () => {
    const row = eventSpeakersToCSV(
      getEvent(),
      [
        teamGroup(),
        teamGroup({
          id: 'team-2',
          teamName: 'Barabasi',
          users: [speaker({ id: 'u3', displayName: 'Ana' })],
        }),
      ],
      true,
    );

    expect(row).toMatchObject({
      teamSpeakerCount: '3',
      teamSpeakers:
        'Alessi - Padmini [Y]; Alessi - Marco [Y]; Barabasi - Ana [N]',
    });
  });

  test('Should render zero counts and NA cells when the event has no speakers', () => {
    const row = eventSpeakersToCSV(getEvent(), [], true);

    expect(row).toMatchObject({
      totalSpeakers: '0',
      teamSpeakerCount: '0',
      projectSpeakerCount: '0',
      externalSpeakerCount: '0',
      findingsPercentage: 'NA',
      teamSpeakers: 'NA',
      projectSpeakers: 'NA',
      externalSpeakers: 'NA',
    });
  });

  test('Should render NA for the team and project cells of an external-only event', () => {
    const row = eventSpeakersToCSV(getEvent(), [externalGroup()], true);

    expect(row).toMatchObject({
      totalSpeakers: '1',
      teamSpeakerCount: '0',
      projectSpeakerCount: '0',
      externalSpeakerCount: '1',
      teamSpeakers: 'NA',
      projectSpeakers: 'NA',
      externalSpeakers: 'Jane Doe [N]',
    });
  });

  test('Should render NA for the interest group when the event has none', () => {
    const row = eventSpeakersToCSV(
      getEvent({ interestGroup: undefined }),
      [],
      true,
    );

    expect(row.interestGroupName).toEqual('NA');
  });

  test('Should strip markup from an HTML description', () => {
    const row = eventSpeakersToCSV(
      getEvent({ description: '<p>Intro <strong>session</strong></p>' }),
      [],
      true,
    );

    expect(row.description).toEqual('Intro session');
  });

  test('Should render NA for an undefined description', () => {
    const row = eventSpeakersToCSV(
      getEvent({ description: undefined }),
      [],
      true,
    );

    expect(row.description).toEqual('NA');
  });

  test('Should leave counts unchanged for a team slot with no resolvable speaker', () => {
    const speakers = [
      {
        team: { id: 'team-1', displayName: 'Alessi' },
      },
    ] as unknown as EventResponse['speakers'];
    const event = getEvent({ speakers });

    const row = eventSpeakersToCSV(event, mapSpeakersToGroups(event), true);

    expect(row).toMatchObject({
      totalSpeakers: '0',
      teamSpeakerCount: '0',
      teamSpeakers: 'NA',
    });
  });

  test('Should list every mapped speaker, marking Non CRN speakers of a team', () => {
    const event = getEvent({
      speakers: [
        {
          id: 'es-1',
          team: { id: 'team-1', displayName: 'Alessi' },
          user: { id: 'u1', displayName: 'Padmini' },
          role: 'Chair',
          preliminaryDataShared: true,
        },
        {
          id: 'es-2',
          team: { id: 'team-1', displayName: 'Alessi' },
          user: { id: 'u2', displayName: 'Marco' },
          role: 'Chair',
        },
        {
          id: 'es-3',
          team: { id: 'team-1', displayName: 'Alessi' },
          externalUser: { name: 'Jane Doe' },
        },
      ] as unknown as EventResponse['speakers'],
    });

    const row = eventSpeakersToCSV(event, mapSpeakersToGroups(event), true);

    expect(row).toMatchObject({
      totalSpeakers: '3',
      teamSpeakerCount: '3',
      externalSpeakerCount: '0',
      teamSpeakers:
        'Alessi - Padmini [Y]; Alessi - Marco [N]; Alessi - Jane Doe (Non CRN) [N]',
    });
  });
});

describe('downloadEventSpeakers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should keep the declared column order, which drives the CSV header row', () => {
    expect(Object.keys(eventSpeakersFields)).toEqual([
      'eventTitle',
      'description',
      'startDate',
      'endDate',
      'interestGroupName',
      'totalSpeakers',
      'teamSpeakerCount',
      'projectSpeakerCount',
      'externalSpeakerCount',
      'findingsPercentage',
      'teamSpeakers',
      'projectSpeakers',
      'externalSpeakers',
    ]);
  });

  test.each`
    hasFinished | teamSpeakers
    ${true}     | ${'Alessi - Padmini [Y]; Alessi - Marco [Y]'}
    ${false}    | ${'Alessi - Padmini; Alessi - Marco'}
  `(
    'Should open a dated stream with headers and write one row when hasFinished is $hasFinished',
    ({ hasFinished, teamSpeakers }) => {
      const write = jest.fn();
      const end = jest.fn();
      mockCreateCsvFileStream.mockReturnValueOnce({
        write,
        end,
      } as unknown as ReturnType<typeof createCsvFileStream>);

      downloadEventSpeakers(getEvent(), [teamGroup()], hasFinished);

      expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
        expect.stringMatching(/^EventSpeakers_Kick_off_\d{6}\.csv$/),
        { columns: eventSpeakersFields, header: true },
      );
      expect(write).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalledWith(
        expect.objectContaining({ eventTitle: 'Kick-off', teamSpeakers }),
      );
      expect(end).toHaveBeenCalledTimes(1);
    },
  );

  test('Should fall back to a generic filename when the title has no usable characters', () => {
    downloadEventSpeakers(getEvent({ title: '!!!' }), [teamGroup()], true);

    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/^EventSpeakers_event_\d{6}\.csv$/),
      expect.anything(),
    );
  });
});

const attendanceTeam = (
  overrides: Partial<EventAttendanceTeam> = {},
): EventAttendanceTeam => ({
  teamId: 'team-1',
  teamName: 'Alessi',
  attended: true,
  isFromInterestGroup: true,
  ...overrides,
});

describe('eventAttendanceToCSV', () => {
  test('Should render every column, listing inactive teams without a label', () => {
    const row = eventAttendanceToCSV(
      getEvent({
        interestGroup: {
          ...createInterestGroupResponse(),
          name: 'Parkinson IG',
        },
      }),
      [
        attendanceTeam(),
        attendanceTeam({
          teamId: 'team-2',
          teamName: 'Barabasi',
          attended: false,
        }),
        attendanceTeam({
          teamId: 'team-3',
          teamName: 'Old Team',
          attended: false,
          isTeamInactive: true,
        }),
        attendanceTeam({
          teamId: 'team-4',
          teamName: 'Banteng',
          isFromInterestGroup: false,
        }),
      ],
    );

    expect(row).toEqual({
      eventTitle: 'Kick-off',
      description: 'Intro session',
      startDate: '2026-08-19T10:00:00.000Z',
      endDate: '2026-08-19T11:00:00.000Z',
      interestGroupName: 'Parkinson IG',
      attendancePercentage: '33%',
      interestGroupTeams: 'Alessi (Y); Barabasi (N); Old Team (N)',
      additionalTeams: 'Banteng (Y)',
    });
  });

  test('Should list every team as additional when none came from the interest group', () => {
    const row = eventAttendanceToCSV(getEvent({ interestGroup: undefined }), [
      attendanceTeam({ isFromInterestGroup: undefined }),
      attendanceTeam({
        teamId: 'team-2',
        teamName: 'Barabasi',
        attended: false,
        isFromInterestGroup: false,
      }),
    ]);

    expect(row).toMatchObject({
      interestGroupName: 'NA',
      attendancePercentage: 'NA',
      interestGroupTeams: 'NA',
      additionalTeams: 'Alessi (Y); Barabasi (N)',
    });
  });

  test('Should report 0% when no interest group team attended', () => {
    const row = eventAttendanceToCSV(getEvent(), [
      attendanceTeam({ attended: false }),
    ]);

    expect(row).toMatchObject({
      attendancePercentage: '0%',
      interestGroupTeams: 'Alessi (N)',
      additionalTeams: 'NA',
    });
  });

  test('Should fill the attendance columns with NA when no attendance is recorded', () => {
    const row = eventAttendanceToCSV(getEvent(), []);

    expect(row).toMatchObject({
      eventTitle: 'Kick-off',
      attendancePercentage: 'NA',
      interestGroupTeams: 'NA',
      additionalTeams: 'NA',
    });
  });
});

describe('downloadEventAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should keep the declared column order, which drives the CSV header row', () => {
    expect(Object.keys(eventAttendanceFields)).toEqual([
      'eventTitle',
      'description',
      'startDate',
      'endDate',
      'interestGroupName',
      'attendancePercentage',
      'interestGroupTeams',
      'additionalTeams',
    ]);
  });

  test('Should open a dated stream with headers and write one row', () => {
    const write = jest.fn();
    const end = jest.fn();
    mockCreateCsvFileStream.mockReturnValueOnce({
      write,
      end,
    } as unknown as ReturnType<typeof createCsvFileStream>);

    downloadEventAttendance(getEvent(), [attendanceTeam()]);

    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/^EventAttendance_Kick_off_\d{6}\.csv$/),
      { columns: eventAttendanceFields, header: true },
    );
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTitle: 'Kick-off',
        attendancePercentage: '100%',
        interestGroupTeams: 'Alessi (Y)',
      }),
    );
    expect(end).toHaveBeenCalledTimes(1);
  });
});
