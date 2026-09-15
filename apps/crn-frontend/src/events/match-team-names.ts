import { TeamListItemResponse } from '@asap-hub/model';
import {
  EventAttendanceTeam,
  UploadListResult,
  UploadListSuggestion,
  UploadListUnmatchedTeam,
} from '@asap-hub/react-components';

import { ParsedTeamRow } from './parse-team-list';

const normalizeFull = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();

const stripTeamPrefix = (normalized: string): string =>
  normalized.replace(/^team /, '');

export const normalizeTeamName = (name: string): string =>
  stripTeamPrefix(normalizeFull(name));

const suggestionThreshold = 0.8;

const editDistance = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current.push(
        Math.min(
          (current[j - 1] ?? 0) + 1,
          (previous[j] ?? 0) + 1,
          (previous[j - 1] ?? 0) + cost,
        ),
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
};

const similarity = (a: string, b: string): number => {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest;
};

const toAttendanceTeam = (
  team: TeamListItemResponse,
  attended: boolean,
): EventAttendanceTeam => ({
  teamId: team.id,
  teamName: team.displayName,
  attended,
  teamType: team.teamType,
  isTeamInactive: !!team.inactiveSince,
});

const toSuggestion = (
  team: TeamListItemResponse,
  attended: boolean,
): UploadListSuggestion => ({
  teamId: team.id,
  teamName: team.displayName,
  teamType: team.teamType,
  attended,
  isTeamInactive: !!team.inactiveSince,
});

const findClosestTeam = (
  strippedName: string,
  candidates: { team: TeamListItemResponse; stripped: string }[],
  used: ReadonlySet<string>,
): TeamListItemResponse | undefined => {
  let best: TeamListItemResponse | undefined;
  let bestScore = suggestionThreshold;
  candidates.forEach(({ team, stripped }) => {
    if (used.has(team.id)) {
      return;
    }
    const score = similarity(strippedName, stripped);
    if (score > bestScore) {
      bestScore = score;
      best = team;
    }
  });
  return best;
};

// Resolves uploaded names to Hub Teams; the modal decides which are already on
// the table (it owns the live rows, including unsaved additions).
export const matchTeamNames = (
  rows: ParsedTeamRow[],
  teams: TeamListItemResponse[],
): UploadListResult => {
  const byFullName = new Map<string, TeamListItemResponse>();
  const strippedCounts = new Map<string, number>();
  teams.forEach((team) => {
    const stripped = normalizeTeamName(team.displayName);
    byFullName.set(normalizeFull(team.displayName), team);
    strippedCounts.set(stripped, (strippedCounts.get(stripped) ?? 0) + 1);
  });
  // Only resolve via the stripped ('Team X' -> 'X') form when it is unambiguous;
  // otherwise a real team named 'Team X' would shadow a team named 'X'.
  const byStrippedName = new Map<string, TeamListItemResponse>();
  teams.forEach((team) => {
    const stripped = normalizeTeamName(team.displayName);
    if (strippedCounts.get(stripped) === 1) {
      byStrippedName.set(stripped, team);
    }
  });

  const candidates = teams.map((team) => ({
    team,
    stripped: normalizeTeamName(team.displayName),
  }));

  const matched: EventAttendanceTeam[] = [];
  const unmatched: UploadListUnmatchedTeam[] = [];
  const seenTeamIds = new Set<string>();
  const seenUnmatched = new Set<string>();
  const suggestedTeamIds = new Set<string>();

  rows.forEach(({ name, attended }) => {
    const full = normalizeFull(name);
    if (!full) {
      return;
    }

    const team =
      byFullName.get(full) ?? byStrippedName.get(stripTeamPrefix(full));
    if (team) {
      if (!seenTeamIds.has(team.id)) {
        seenTeamIds.add(team.id);
        matched.push(toAttendanceTeam(team, attended));
      }
      return;
    }

    if (seenUnmatched.has(full)) {
      return;
    }
    seenUnmatched.add(full);

    const closest = findClosestTeam(
      stripTeamPrefix(full),
      candidates,
      new Set([...seenTeamIds, ...suggestedTeamIds]),
    );
    if (closest) {
      suggestedTeamIds.add(closest.id);
    }
    unmatched.push({
      name: name.trim(),
      ...(closest ? { suggestion: toSuggestion(closest, attended) } : {}),
    });
  });

  return { matched, unmatched };
};
