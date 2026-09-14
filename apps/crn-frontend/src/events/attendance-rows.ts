// Everything here stands in for data the API does not send yet: an attendance
// entry says nothing about the hosting interest group, and teams the group
// contributes have no entry until someone saves. Once Contentful carries that
// with the attendance, the join and the seeded rows go and `Event` can render
// `event.attendance` as it arrives.
import { EventResponse, InterestGroupTeam } from '@asap-hub/model';
import {
  compareAttendanceTeams,
  EventAttendanceTeam,
} from '@asap-hub/react-components';

const toRecordedRows = (
  attendance: NonNullable<EventResponse['attendance']>,
  interestGroupTeamIds: ReadonlySet<string>,
): EventAttendanceTeam[] =>
  attendance.map(({ id, team, attended }) => ({
    attendanceId: id,
    teamId: team.id,
    teamName: team.displayName,
    attended,
    teamType: team.teamType,
    isTeamInactive: !!team.inactiveSince,
    isFromInterestGroup: interestGroupTeamIds.has(team.id),
  }));

const seedMissingRows = (
  interestGroupTeams: ReadonlyArray<InterestGroupTeam>,
  recordedTeamIds: ReadonlySet<string>,
): EventAttendanceTeam[] =>
  interestGroupTeams
    .filter((team) => !recordedTeamIds.has(team.id))
    .map((team) => ({
      teamId: team.id,
      teamName: team.displayName,
      attended: false,
      isTeamInactive: !!team.inactiveSince,
      isFromInterestGroup: true,
    }));

export const composeAttendanceRows = (
  attendance: EventResponse['attendance'],
  interestGroupTeams: ReadonlyArray<InterestGroupTeam>,
): EventAttendanceTeam[] => {
  const hostingTeams = interestGroupTeams.filter((team) => !team.endDate);
  const hostingTeamIds = new Set(hostingTeams.map((team) => team.id));

  const recorded = toRecordedRows(attendance ?? [], hostingTeamIds);
  const recordedTeamIds = new Set(recorded.map(({ teamId }) => teamId));
  const rows = [...recorded, ...seedMissingRows(hostingTeams, recordedTeamIds)];

  return [
    ...rows
      .filter(({ isFromInterestGroup }) => isFromInterestGroup)
      .sort(compareAttendanceTeams),
    ...rows
      .filter(({ isFromInterestGroup }) => !isFromInterestGroup)
      .sort(compareAttendanceTeams),
  ];
};
