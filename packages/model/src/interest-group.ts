import { FetchOptions, ListResponse } from './common';
import { TeamListItemResponse } from './team';
import { UserAward, UserResponse } from './user';
import { CalendarResponse } from './calendar';
import { ResearchTagDataObject } from './research-tag';

export type InterestGroupTools = {
  readonly slack?: string;
  readonly googleDrive?: string;
  readonly googleCalendar?: string;
};

export type InterestGroupTeam = Omit<
  TeamListItemResponse,
  'memberCount' | 'labCount' | 'teamType' | 'teamStatus'
> & {
  endDate?: string;
};

export const interestGroupRole = ['Chair', 'Project Manager'] as const;

export type InterestGroupRole = (typeof interestGroupRole)[number];

export type InterestGroupLeader = {
  readonly user: Pick<
    UserResponse,
    | 'id'
    | 'firstName'
    | 'lastName'
    | 'displayName'
    | 'email'
    | 'alumniSinceDate'
    | 'avatarUrl'
    | 'teams'
  > & {
    readonly latestAward?: UserAward;
  };
  readonly role: InterestGroupRole;
  readonly inactiveSinceDate?: string;
};

export const isInterestGroupRole = (
  data: string | null,
): data is InterestGroupRole =>
  interestGroupRole.includes(data as InterestGroupRole);

export type InterestGroupDataObject = {
  readonly id: string;
  readonly active: boolean;
  readonly createdDate: string;
  readonly contactEmails: string[];
  readonly name: string;
  readonly tags: Pick<ResearchTagDataObject, 'id' | 'name'>[];
  readonly description: string;
  readonly tools: InterestGroupTools;
  readonly teams: ReadonlyArray<InterestGroupTeam>;
  readonly leaders: ReadonlyArray<InterestGroupLeader>;
  readonly calendars: ReadonlyArray<CalendarResponse>;
  readonly lastModifiedDate: string;
  readonly thumbnail?: string;
};

export type ListInterestGroupDataObject = ListResponse<InterestGroupDataObject>;

export type InterestGroupResponse = InterestGroupDataObject;

export type ListInterestGroupResponse = ListResponse<InterestGroupResponse>;

type InterestGroupFilter = {
  teamId?: string;
  userId?: string;
  active?: boolean;
};

export type FetchInterestGroupOptions = FetchOptions<InterestGroupFilter>;

export type InterestGroupMembership = {
  id: string;
  name: string;
  active: boolean;
  role?: string;
};

export type InterestGroupTeamMembership = {
  teamId: string;
  startDate: string;
  endDate?: string | null;
};

/**
 * Returns the ids of teams that are members of the interest group
 * at the point of the event ending: their membership started any time
 * before the end of the event and does not end before the event is over.
 */
export const getInterestGroupTeamIdsForEvent = (
  memberships: InterestGroupTeamMembership[],
  eventEndDate: string,
): string[] => {
  const eventEnd = new Date(eventEndDate);

  const teamIds = memberships
    .filter(
      ({ startDate, endDate }) =>
        new Date(startDate) < eventEnd &&
        (!endDate || new Date(endDate) >= eventEnd),
    )
    .map(({ teamId }) => teamId);

  return [...new Set(teamIds)];
};
