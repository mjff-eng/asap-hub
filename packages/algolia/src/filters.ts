import {
  EventConstraint as CRNEventConstraint,
  gp2 as gp2Model,
} from '@asap-hub/model';

type EventConstraint = CRNEventConstraint | gp2Model.EventConstraint;

type Filters = {
  before?: string;
  after?: string;
};

const timeFilter = (time: string, symbol: string) => {
  const timestamp = Math.round(new Date(time).getTime() / 1000);
  return `endDateTimestamp ${symbol} ${timestamp}`;
};

const getFilter = (filters: string[], constraint?: EventConstraint) => {
  if (!constraint) return filters.join(' OR ');

  if (constraint.userId && 'teamId' in constraint) {
    throw new Error('userId and teamId not supported!');
  }

  const constraintFiltersList: string[] = [];

  if ('teamId' in constraint && constraint.teamId) {
    constraintFiltersList.push(`speakers.team.id: "${constraint.teamId}"`);
  }
  if ('userId' in constraint && constraint.userId) {
    constraintFiltersList.push(`speakers.user.id: "${constraint.userId}"`);
  }
  if ('interestGroupId' in constraint && constraint.interestGroupId) {
    constraintFiltersList.push(
      `interestGroup.id: "${constraint.interestGroupId}"`,
    );
  }
  if ('workingGroupId' in constraint && constraint.workingGroupId) {
    constraintFiltersList.push(
      `workingGroup.id: "${constraint.workingGroupId}"`,
    );
  }
  if ('notStatus' in constraint && constraint.notStatus) {
    constraintFiltersList.push(`NOT status:${constraint.notStatus}`);
  }

  if ('projectId' in constraint && constraint.projectId) {
    constraintFiltersList.push(`project.id: "${constraint.projectId}"`);
  }

  const constraintFilters = constraintFiltersList.join(' AND ');

  if (filters.length === 0) {
    return constraintFilters;
  }

  const filter = filters.join(' OR ');
  return constraintFilters ? `(${filter}) AND (${constraintFilters})` : filter;
};

export const getEventFilters = (
  filters: Filters,
  constraints?: EventConstraint,
): string | undefined => {
  const filterList = [
    ...(filters.before ? [timeFilter(filters.before, '<')] : []),
    ...(filters.after ? [timeFilter(filters.after, '>')] : []),
  ];

  return getFilter(filterList, constraints);
};

/**
 * Builds the Algolia filter for the events month filter.
 *
 * Events are matched on their `startMonth` facet (UTC, `YYYY-MM`).
 * A whole year is expanded into its 12 months, as Algolia cannot match a prefix such as `2026-*`.
 *
 * @param selection - Selected keys, each a month (`YYYY-MM`) or a year (`YYYY`)
 * @returns The filter, or `undefined` when nothing is selected
 *
 * @example
 * getEventStartMonthFilter(['2026-04', '2025-12']);
 * // 'startMonth:"2026-04" OR startMonth:"2025-12"'
 *
 * getEventStartMonthFilter(['2026']);
 * // 'startMonth:"2026-01" OR ... OR startMonth:"2026-12"'
 */
export const getEventStartMonthFilter = (
  selection: Iterable<string>,
): string | undefined => {
  const months = [...selection].flatMap((key) =>
    key.length === 4
      ? Array.from(
          { length: 12 },
          (_, month) => `${key}-${String(month + 1).padStart(2, '0')}`,
        )
      : [key],
  );

  return months.length
    ? months.map((month) => `startMonth:"${month}"`).join(' OR ')
    : undefined;
};
