import { createCsvFileStream } from '@asap-hub/frontend-utils';
import { createEventResponse } from '@asap-hub/fixtures';
import { EventResponse } from '@asap-hub/model';
import {
  SpeakerGroup,
  SpeakerGroupUser,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';

import {
  downloadEventSpeakers,
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

describe('eventSpeakersToCSV', () => {
  test('Should render team and external speakers with counts', () => {
    const row = eventSpeakersToCSV(getEvent(), [teamGroup(), externalGroup()]);

    expect(row).toMatchObject({
      eventTitle: 'Kick-off',
      totalSpeakers: '3',
      crnSpeakerCount: '2',
      externalSpeakerCount: '1',
      teamCount: '1',
      teamsWithFindingsCount: '1',
      teamsWithFindings: 'Alessi',
      teamsWithoutFindings: 'NA',
      crnSpeakers: 'Alessi-Padmini; Alessi-Marco',
      externalSpeakers: 'Jane Doe',
    });
  });

  test('Should stay identical to the pre-redesign row for a team-only event', () => {
    const row = eventSpeakersToCSV(getEvent(), [
      teamGroup(),
      teamGroup({
        id: 'team-2',
        teamName: 'Barabasi',
        users: [speaker({ id: 'u3', displayName: 'Ana' })],
      }),
      externalGroup(),
    ]);

    expect(row).toEqual({
      eventTitle: 'Kick-off',
      description: 'Intro session',
      startDate: '2026-08-19T10:00:00.000Z',
      endDate: '2026-08-19T11:00:00.000Z',
      totalSpeakers: '4',
      crnSpeakerCount: '3',
      externalSpeakerCount: '1',
      teamCount: '2',
      teamsWithFindingsCount: '1',
      teamsWithFindings: 'Alessi',
      teamsWithoutFindings: 'Barabasi',
      crnSpeakers: 'Alessi-Padmini; Alessi-Marco; Barabasi-Ana',
      externalSpeakers: 'Jane Doe',
    });
  });

  test('Should list project group speakers alongside team speakers', () => {
    const row = eventSpeakersToCSV(getEvent(), [teamGroup(), projectGroup()]);

    expect(row).toMatchObject({
      totalSpeakers: '3',
      crnSpeakerCount: '3',
      crnSpeakers: 'Alessi-Padmini; Alessi-Marco; Alpha Project-Nadia',
    });
  });

  test('Should count only team groups in the team columns', () => {
    const row = eventSpeakersToCSV(getEvent(), [teamGroup(), projectGroup()]);

    expect(row).toMatchObject({
      teamCount: '1',
      teamsWithFindingsCount: '1',
      teamsWithFindings: 'Alessi',
      teamsWithoutFindings: 'NA',
    });
  });

  test('Should report a team that has not shared preliminary findings', () => {
    const row = eventSpeakersToCSV(getEvent(), [
      teamGroup({ users: [speaker()] }),
    ]);

    expect(row).toMatchObject({
      teamCount: '1',
      teamsWithFindingsCount: '0',
      teamsWithFindings: 'NA',
      teamsWithoutFindings: 'Alessi',
    });
  });

  test('Should treat a team as sharing when a single speaker shared', () => {
    const row = eventSpeakersToCSV(getEvent(), [
      teamGroup({
        users: [
          speaker(),
          speaker({ id: 'u2', preliminaryFindingsShared: true }),
        ],
      }),
    ]);

    expect(row).toMatchObject({
      teamsWithFindingsCount: '1',
      teamsWithFindings: 'Alessi',
      teamsWithoutFindings: 'NA',
    });
  });

  test('Should split and join teams across the two findings lists', () => {
    const row = eventSpeakersToCSV(getEvent(), [
      teamGroup(),
      teamGroup({
        id: 'team-2',
        teamName: 'Banteng',
        users: [speaker({ preliminaryFindingsShared: true })],
      }),
      teamGroup({ id: 'team-3', teamName: 'Barabasi', users: [] }),
      teamGroup({ id: 'team-4', teamName: 'Cepheus', users: [] }),
    ]);

    expect(row).toMatchObject({
      teamCount: '4',
      teamsWithFindingsCount: '2',
      teamsWithFindings: 'Alessi; Banteng',
      teamsWithoutFindings: 'Barabasi; Cepheus',
    });
  });

  test('Should list speakers from several teams in group order', () => {
    const row = eventSpeakersToCSV(getEvent(), [
      teamGroup(),
      teamGroup({
        id: 'team-2',
        teamName: 'Barabasi',
        users: [speaker({ id: 'u3', displayName: 'Ana' })],
      }),
    ]);

    expect(row.crnSpeakers).toEqual(
      'Alessi-Padmini; Alessi-Marco; Barabasi-Ana',
    );
    expect(row.crnSpeakerCount).toEqual('3');
  });

  test('Should render NA for external speakers when the event has none', () => {
    const row = eventSpeakersToCSV(getEvent(), [teamGroup()]);

    expect(row.externalSpeakerCount).toEqual('0');
    expect(row.externalSpeakers).toEqual('NA');
  });

  test('Should render zero counts and NA cells when the event has no speakers', () => {
    const row = eventSpeakersToCSV(getEvent(), []);

    expect(row).toMatchObject({
      totalSpeakers: '0',
      crnSpeakerCount: '0',
      externalSpeakerCount: '0',
      teamCount: '0',
      teamsWithFindingsCount: '0',
      teamsWithFindings: 'NA',
      teamsWithoutFindings: 'NA',
      crnSpeakers: 'NA',
      externalSpeakers: 'NA',
    });
  });

  test('Should render external-only events with NA for the CRN cell', () => {
    const row = eventSpeakersToCSV(getEvent(), [externalGroup(['Jane Doe'])]);

    expect(row).toMatchObject({
      totalSpeakers: '1',
      crnSpeakerCount: '0',
      teamCount: '0',
      teamsWithFindingsCount: '0',
      crnSpeakers: 'NA',
      externalSpeakers: 'Jane Doe',
    });
  });

  test('Should strip markup from an HTML description', () => {
    const row = eventSpeakersToCSV(
      getEvent({ description: '<p>Intro <strong>session</strong></p>' }),
      [],
    );

    expect(row.description).toEqual('Intro session');
  });

  test('Should render NA for an undefined description', () => {
    const row = eventSpeakersToCSV(getEvent({ description: undefined }), []);

    expect(row.description).toEqual('NA');
  });

  test('Should leave counts unchanged for a team slot with no resolvable speaker', () => {
    const speakers = [
      {
        team: { id: 'team-1', displayName: 'Alessi' },
      },
    ] as unknown as EventResponse['speakers'];
    const event = getEvent({ speakers, preliminaryDataShared: [] });

    const row = eventSpeakersToCSV(event, mapSpeakersToGroups(event));

    expect(row).toMatchObject({
      totalSpeakers: '0',
      crnSpeakerCount: '0',
      crnSpeakers: 'NA',
    });
  });

  test('Should keep every mapped speaker in the CSV once project groups are synthesised', () => {
    const event = getEvent({
      speakers: [
        {
          id: 'es-1',
          team: { id: 'team-1', displayName: 'Alessi' },
          user: { id: 'u1', displayName: 'Padmini' },
          role: 'Chair',
        },
        {
          id: 'es-2',
          team: { id: 'team-1', displayName: 'Alessi' },
          user: { id: 'u2', displayName: 'Marco' },
          role: 'Chair',
        },
      ] as unknown as EventResponse['speakers'],
      preliminaryDataShared: [],
    });

    const row = eventSpeakersToCSV(event, mapSpeakersToGroups(event));

    expect(row.totalSpeakers).toEqual('2');
    expect(row.crnSpeakerCount).toEqual('2');
    expect(row.crnSpeakers).toEqual(expect.stringContaining('Marco'));
    expect(row.crnSpeakers).toEqual(expect.stringContaining('Padmini'));
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
      'totalSpeakers',
      'crnSpeakerCount',
      'externalSpeakerCount',
      'teamCount',
      'teamsWithFindingsCount',
      'teamsWithFindings',
      'teamsWithoutFindings',
      'crnSpeakers',
      'externalSpeakers',
    ]);
  });

  test('Should open a dated stream with headers, write one row and end it', () => {
    const write = jest.fn();
    const end = jest.fn();
    mockCreateCsvFileStream.mockReturnValueOnce({
      write,
      end,
    } as unknown as ReturnType<typeof createCsvFileStream>);

    downloadEventSpeakers(getEvent(), [teamGroup()]);

    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/^EventSpeakers_Kick_off_\d{6}\.csv$/),
      { columns: eventSpeakersFields, header: true },
    );
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({ eventTitle: 'Kick-off' }),
    );
    expect(end).toHaveBeenCalledTimes(1);
  });

  test('Should fall back to a generic filename when the title has no usable characters', () => {
    downloadEventSpeakers(getEvent({ title: '!!!' }), [teamGroup()]);

    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/^EventSpeakers_event_\d{6}\.csv$/),
      expect.anything(),
    );
  });
});
