import { createCsvFileStream } from '@asap-hub/frontend-utils';
import { createEventResponse } from '@asap-hub/fixtures';
import { EventResponse } from '@asap-hub/model';
import { SpeakerGroup } from '@asap-hub/react-components';

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

const teamGroup = (
  overrides: Partial<Extract<SpeakerGroup, { variant: 'team' }>> = {},
): SpeakerGroup => ({
  id: 'team-1',
  variant: 'team',
  teamName: 'Alessi',
  preliminaryFindingsShared: true,
  users: [
    { id: 'u1', displayName: 'Padmini', roles: [] },
    { id: 'u2', displayName: 'Marco', roles: [] },
  ],
  ...overrides,
});

const externalGroup = (
  displayNames: string[] = ['Jane Doe'],
): SpeakerGroup => ({
  id: 'external',
  variant: 'external',
  preliminaryFindingsShared: false,
  users: displayNames.map((displayName, index) => ({
    id: `external-${index}`,
    displayName,
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

  test('Should report a team that has not shared preliminary findings', () => {
    const row = eventSpeakersToCSV(getEvent(), [
      teamGroup({ preliminaryFindingsShared: false }),
    ]);

    expect(row).toMatchObject({
      teamCount: '1',
      teamsWithFindingsCount: '0',
      teamsWithFindings: 'NA',
      teamsWithoutFindings: 'Alessi',
    });
  });

  test('Should split and join teams across the two findings lists', () => {
    const row = eventSpeakersToCSV(getEvent(), [
      teamGroup(),
      teamGroup({ id: 'team-2', teamName: 'Banteng', users: [] }),
      teamGroup({
        id: 'team-3',
        teamName: 'Barabasi',
        preliminaryFindingsShared: false,
        users: [],
      }),
      teamGroup({
        id: 'team-4',
        teamName: 'Cepheus',
        preliminaryFindingsShared: false,
        users: [],
      }),
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
        preliminaryFindingsShared: false,
        users: [{ id: 'u3', displayName: 'Ana', roles: [] }],
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
    const event = getEvent({ speakers });

    const row = eventSpeakersToCSV(event, mapSpeakersToGroups(event));

    expect(row).toMatchObject({
      totalSpeakers: '0',
      crnSpeakerCount: '0',
      crnSpeakers: 'NA',
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
