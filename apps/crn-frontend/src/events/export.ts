import {
  createCsvFileStream,
  CSVValue,
  emptyToNA,
  htmlToCsvText,
  sanitizeFileNamePart,
} from '@asap-hub/frontend-utils';
import { EventResponse } from '@asap-hub/model';
import {
  groupLabel,
  SpeakerGroup,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
  summarizeSpeakerGroups,
} from '@asap-hub/react-components';
import { format } from 'date-fns';

// Declaration order is the CSV column order, and the values are the header row.
export const eventSpeakersFields = {
  eventTitle: 'Event Title',
  description: 'Description',
  startDate: 'Event Start Date',
  endDate: 'Event End Date',
  interestGroupName: 'Interest Group Name',
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
    eventTitle: event.title,
    description: htmlToCsvText(event.description),
    startDate: event.startDate,
    endDate: event.endDate,
    interestGroupName: event.interestGroup?.name,
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
): void => {
  const csvStream = createCsvFileStream(
    `EventSpeakers_${sanitizeFileNamePart(event.title, 'event')}_${format(
      new Date(),
      'MMddyy',
    )}.csv`,
    { columns: eventSpeakersFields, header: true },
  );
  csvStream.write(eventSpeakersToCSV(event, groups, hasFinished));
  csvStream.end();
};
