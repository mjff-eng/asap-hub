import {
  createCsvFileStream,
  CSVValue,
  emptyToNA,
  htmlToCsvText,
  sanitizeFileNamePart,
} from '@asap-hub/frontend-utils';
import { EventResponse } from '@asap-hub/model';
import {
  groupFindings,
  groupLabel,
  SpeakerExternalGroup,
  SpeakerGroup,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';
import { format } from 'date-fns';

// Declaration order is the CSV column order, and the values are the header row.
export const eventSpeakersFields = {
  eventTitle: 'Event Title',
  description: 'Description',
  startDate: 'Event Start Date',
  endDate: 'Event End Date',
  totalSpeakers: 'Total # of Speakers',
  crnSpeakerCount: '# CRN Speakers',
  externalSpeakerCount: '# External Speakers',
  teamCount: '# Teams',
  teamsWithFindingsCount: '# Teams With Findings',
  teamsWithFindings: 'With Findings List',
  teamsWithoutFindings: 'Without Findings List',
  crnSpeakers: 'CRN Speakers',
  externalSpeakers: 'External Speakers',
};

export type EventSpeakersCSV = Record<
  keyof typeof eventSpeakersFields,
  CSVValue
>;

const isTeamGroup = (group: SpeakerGroup): group is SpeakerTeamGroup =>
  group.variant === 'team';

const isExternalGroup = (group: SpeakerGroup): group is SpeakerExternalGroup =>
  group.variant === 'external';

const isCrnGroup = (
  group: SpeakerGroup,
): group is SpeakerTeamGroup | SpeakerProjectGroup =>
  group.variant === 'team' || group.variant === 'project';

export const eventSpeakersToCSV = (
  event: EventResponse,
  groups: SpeakerGroup[],
): EventSpeakersCSV => {
  const teamGroups = groups.filter(isTeamGroup);

  const teamsWithFindings = teamGroups
    .filter((group) => groupFindings(group).hasAnyShared)
    .map(({ teamName }) => teamName);

  const teamsWithoutFindings = teamGroups
    .filter((group) => !groupFindings(group).hasAnyShared)
    .map(({ teamName }) => teamName);

  const crnSpeakers = groups
    .filter(isCrnGroup)
    .flatMap((group) =>
      group.users.map(
        ({ displayName }) => `${groupLabel(group)}-${displayName}`,
      ),
    );

  const externalSpeakers = groups
    .filter(isExternalGroup)
    .flatMap(({ users }) => users.map(({ displayName }) => displayName));

  // Counts are stringified because emptyToNA is constrained to CSVValue
  // (string | undefined | boolean). A falsy fallback would turn 0 into NA.
  return emptyToNA<EventSpeakersCSV>({
    eventTitle: event.title,
    description: htmlToCsvText(event.description),
    startDate: event.startDate,
    endDate: event.endDate,
    totalSpeakers: String(crnSpeakers.length + externalSpeakers.length),
    crnSpeakerCount: String(crnSpeakers.length),
    externalSpeakerCount: String(externalSpeakers.length),
    teamCount: String(teamGroups.length),
    teamsWithFindingsCount: String(teamsWithFindings.length),
    teamsWithFindings: teamsWithFindings.join('; '),
    teamsWithoutFindings: teamsWithoutFindings.join('; '),
    crnSpeakers: crnSpeakers.join('; '),
    externalSpeakers: externalSpeakers.join('; '),
  });
};

export const downloadEventSpeakers = (
  event: EventResponse,
  groups: SpeakerGroup[],
): void => {
  const csvStream = createCsvFileStream(
    `EventSpeakers_${sanitizeFileNamePart(event.title, 'event')}_${format(
      new Date(),
      'MMddyy',
    )}.csv`,
    { columns: eventSpeakersFields, header: true },
  );
  csvStream.write(eventSpeakersToCSV(event, groups));
  csvStream.end();
};
