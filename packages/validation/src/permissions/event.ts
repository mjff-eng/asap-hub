import { InterestGroupMembership } from '@asap-hub/model';

// A lapsed leadership arrives with no `role` (parseLeadersToInterestGroups).
export const isEventProjectManager = (
  user:
    | { interestGroups: ReadonlyArray<InterestGroupMembership> }
    | null
    | undefined,
  event: { interestGroup?: { id: string } },
): boolean =>
  !!user?.interestGroups.some(
    ({ id, role, active }) =>
      id === event.interestGroup?.id && role === 'Project Manager' && active,
  );
