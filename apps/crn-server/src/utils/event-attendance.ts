import { EventAttendanceUpdateItem } from '@asap-hub/model';

export type ExistingEventAttendance = EventAttendanceUpdateItem & {
  id: string;
};

/**
 * Returns the attendance an event should have so that it contains exactly
 * the given teams: existing entries for those teams are kept and missing
 * teams are added with attended set to false. Returns null when the
 * attendance doesn't need to change.
 */
export const getAttendanceToSync = (
  attendance: ExistingEventAttendance[],
  teamIds: string[],
): EventAttendanceUpdateItem[] | null => {
  const teamIdSet = new Set(teamIds);
  const existingTeamIds = new Set(attendance.map(({ teamId }) => teamId));

  const kept = attendance.filter(({ teamId }) => teamIdSet.has(teamId));
  const added = teamIds
    .filter((teamId) => !existingTeamIds.has(teamId))
    .map((teamId) => ({ teamId, attended: false }));

  if (added.length === 0 && kept.length === attendance.length) {
    return null;
  }

  return [...kept, ...added];
};
