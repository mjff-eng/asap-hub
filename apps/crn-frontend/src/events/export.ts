import {
  createCsvFileStream,
  CSVValue,
  emptyToNA,
  htmlToCsvText,
  sanitizeFileNamePart,
} from '@asap-hub/frontend-utils';
import { EventResponse } from '@asap-hub/model';
import {
  EventAttendanceTeam,
  groupLabel,
  SpeakerGroup,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
  summarizeAttendance,
  summarizeSpeakerGroups,
} from '@asap-hub/react-components';
import { format } from 'date-fns';

// Declaration order is the CSV column order, and the values are the header row.
const eventFields = {
  eventTitle: 'Event Title',
  description: 'Description',
  startDate: 'Event Start Date',
  endDate: 'Event End Date',
  interestGroupName: 'Interest Group Name',
};

export const eventSpeakersFields = {
  ...eventFields,
  totalSpeakers: 'Total # of Speakers',
  teamSpeakerCount: '# of Speakers from Teams',
  projectSpeakerCount: '# of Speakers from Individual Projects',
  externalSpeakerCount: '# of External Speakers',
  findingsPercentage: '% of Speakers Shared Preliminary Findings',
  teamSpeakers: 'Team Speakers',
  projectSpeakers: 'Individual Project Speakers',
  externalSpeakers: 'External Speakers',
};

export type EventSpeakersCSV = Record<
  keyof typeof eventSpeakersFields,
  CSVValue
>;

export const eventAttendanceFields = {
  ...eventFields,
  attendancePercentage: 'Percentage of IG Teams Attended',
  interestGroupTeams: 'IG Team Attendance',
  additionalTeams: 'Additional Team Attendance',
};

export type EventAttendanceCSV = Record<
  keyof typeof eventAttendanceFields,
  CSVValue
>;

const eventRow = (event: EventResponse) => ({
  eventTitle: event.title,
  description: htmlToCsvText(event.description),
  startDate: event.startDate,
  endDate: event.endDate,
  interestGroupName: event.interestGroup?.name,
});

const downloadEventCsv = <K extends string>(
  fileNamePrefix: string,
  event: EventResponse,
  columns: Record<K, string>,
  row: Record<K, CSVValue>,
) => {
  const csvStream = createCsvFileStream(
    `${fileNamePrefix}_${sanitizeFileNamePart(event.title, 'event')}_${format(
      new Date(),
      'MMddyy',
    )}.csv`,
    { columns, header: true },
  );
  csvStream.write(row);
  csvStream.end();
};

// Findings are only recorded once the event is over, as on the Speakers card.
const speakerEntry = (
  {
    displayName,
    isExternal,
    preliminaryFindingsShared,
  }: {
    readonly displayName: string;
    readonly isExternal?: boolean;
    readonly preliminaryFindingsShared: boolean;
  },
  hasFinished: boolean,
) =>
  `${displayName}${isExternal ? ' (Non CRN)' : ''}${
    hasFinished ? ` [${preliminaryFindingsShared ? 'Y' : 'N'}]` : ''
  }`;

const groupEntries = (
  groups: ReadonlyArray<SpeakerTeamGroup | SpeakerProjectGroup>,
  hasFinished: boolean,
) =>
  groups
    .flatMap((group) =>
      group.users.map(
        (user) => `${groupLabel(group)} - ${speakerEntry(user, hasFinished)}`,
      ),
    )
    .join('; ');

export const eventSpeakersToCSV = (
  event: EventResponse,
  groups: SpeakerGroup[],
  hasFinished: boolean,
): EventSpeakersCSV => {
  const {
    teamGroups,
    projectGroups,
    externalUsers,
    teamSpeakers,
    projectSpeakers,
    totalSpeakers,
    findingsPercentage,
  } = summarizeSpeakerGroups(groups);

  // Counts are stringified because emptyToNA is constrained to CSVValue
  // (string | undefined | boolean). A falsy fallback would turn 0 into NA.
  return emptyToNA<EventSpeakersCSV>({
    ...eventRow(event),
    totalSpeakers: String(totalSpeakers),
    teamSpeakerCount: String(teamSpeakers),
    projectSpeakerCount: String(projectSpeakers),
    externalSpeakerCount: String(externalUsers.length),
    findingsPercentage:
      hasFinished && totalSpeakers > 0 ? `${findingsPercentage}%` : undefined,
    teamSpeakers: groupEntries(teamGroups, hasFinished),
    projectSpeakers: groupEntries(projectGroups, hasFinished),
    externalSpeakers: externalUsers
      .map((user) => speakerEntry(user, hasFinished))
      .join('; '),
  });
};

export const downloadEventSpeakers = (
  event: EventResponse,
  groups: SpeakerGroup[],
  hasFinished: boolean,
): void =>
  downloadEventCsv(
    'EventSpeakers',
    event,
    eventSpeakersFields,
    eventSpeakersToCSV(event, groups, hasFinished),
  );

const teamEntries = (teams: ReadonlyArray<EventAttendanceTeam>) =>
  teams
    .map(({ teamName, attended }) => `${teamName} (${attended ? 'Y' : 'N'})`)
    .join('; ');

export const eventAttendanceToCSV = (
  event: EventResponse,
  teams: EventAttendanceTeam[],
): EventAttendanceCSV => {
  const { interestGroupTeams, additionalTeams, attendancePercentage } =
    summarizeAttendance(teams);

  // The card only shows the percentage when the interest group has teams.
  return emptyToNA<EventAttendanceCSV>({
    ...eventRow(event),
    attendancePercentage: interestGroupTeams.length
      ? `${attendancePercentage}%`
      : undefined,
    interestGroupTeams: teamEntries(interestGroupTeams),
    additionalTeams: teamEntries(additionalTeams),
  });
};

export const downloadEventAttendance = (
  event: EventResponse,
  teams: EventAttendanceTeam[],
): void =>
  downloadEventCsv(
    'EventAttendance',
    event,
    eventAttendanceFields,
    eventAttendanceToCSV(event, teams),
  );
