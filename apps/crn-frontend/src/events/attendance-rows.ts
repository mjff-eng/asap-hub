import { EventResponse } from '@asap-hub/model';
import {
  compareAttendanceTeams,
  EventAttendanceTeam,
} from '@asap-hub/react-components';

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
