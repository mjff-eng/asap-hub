import { EntityResponses } from '@asap-hub/algolia';
import {
  EventResponse,
  getInterestGroupTeamIdsForEvent,
  InterestGroupTeam,
} from '@asap-hub/model';
import {
  AttendanceSearchOption,
  compareAttendanceTeams,
  EventAttendanceTeam,
} from '@asap-hub/react-components';

type InterestGroupHit = EntityResponses['crn']['interest-group'];
type TeamHit = EntityResponses['crn']['team'];

const isInterestGroupHit = (
  hit: InterestGroupHit | TeamHit,
): hit is InterestGroupHit =>
  // eslint-disable-next-line no-underscore-dangle
  hit.__meta.type === 'interest-group';

export const toAttendanceRows = (
  attendance: EventResponse['attendance'],
): EventAttendanceTeam[] =>
  (attendance ?? [])
    .map(({ id, team, attended, isFromInterestGroup }) => ({
      attendanceId: id,
      teamId: team.id,
      teamName: team.displayName,
      attended,
      teamType: team.teamType,
      isTeamInactive: !!team.inactiveSince,
      isFromInterestGroup,
    }))
    .sort(compareAttendanceTeams);

const toAttendedTeam = (team: InterestGroupTeam): EventAttendanceTeam => ({
  teamId: team.id,
  teamName: team.displayName,
  attended: true,
  teamType: team.teamType,
  isTeamInactive: !!team.inactiveSince,
});

// The rule the server uses for the hosting group's teams: members when the
// event ended. A team listed twice (an ended and a current membership) is
// added once.
const toEligibleTeams = (
  teams: ReadonlyArray<InterestGroupTeam>,
  eventEndDate: string,
  isFromInterestGroup: boolean,
): EventAttendanceTeam[] => {
  const eligibleTeamIds = new Set(
    getInterestGroupTeamIdsForEvent(
      teams.flatMap(({ id, startDate, endDate, inactiveSince }) =>
        startDate ? [{ teamId: id, startDate, endDate, inactiveSince }] : [],
      ),
      eventEndDate,
    ),
  );
  return [
    ...new Map(
      teams
        .filter((team) => eligibleTeamIds.has(team.id))
        .map((team) => [
          team.id,
          { ...toAttendedTeam(team), isFromInterestGroup },
        ]),
    ).values(),
  ];
};

export const toAttendanceSearchOptions = (
  hits: ReadonlyArray<InterestGroupHit | TeamHit>,
  eventEndDate: string,
  hostingInterestGroupId?: string,
): AttendanceSearchOption[] => [
  ...hits.filter(isInterestGroupHit).map(
    (interestGroup): AttendanceSearchOption => ({
      optionType: 'interestGroup',
      value: interestGroup.id,
      label: interestGroup.name,
      // The server lists the hosting group's members under the group once
      // saved, so they go there as soon as they are added.
      teams: toEligibleTeams(
        interestGroup.teams,
        eventEndDate,
        interestGroup.id === hostingInterestGroupId,
      ),
    }),
  ),
  ...hits
    .filter((hit): hit is TeamHit => !isInterestGroupHit(hit))
    .map(
      (team): AttendanceSearchOption => ({
        optionType: 'team',
        value: team.id,
        label: team.displayName,
        teamType: team.teamType,
        isTeamInactive: !!team.inactiveSince,
      }),
    ),
];
