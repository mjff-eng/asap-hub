import {
  EventConstraint,
  EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT,
} from '@asap-hub/model';
import { subHours } from 'date-fns';
import { GetListOptions } from '../api-util';

type Constraint = { [key: string]: string };
export type GetEventListOptions<C extends Constraint = EventConstraint> =
  GetListOptions &
    (
      | {
          before: string;
          after?: undefined;
        }
      | {
          after: string;
          before?: undefined;
        }
    ) & {
      constraint?: C;
    };

type EventListParams<C extends Constraint = EventConstraint> = {
  past: boolean;
  searchQuery?: string;
  currentPage?: number;
  pageSize?: number;
  constraint?: C;
  filters?: Set<string>;
};

export const getEventListOptions = <C extends Constraint = EventConstraint>(
  currentTime: Date,
  {
    past,
    searchQuery = '',
    currentPage = 0,
    pageSize = 10,
    constraint,
    filters = new Set(),
  }: EventListParams<C>,
): GetEventListOptions<C> => {
  const time = subHours(
    currentTime,
    EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT,
  ).toISOString();

  return {
    searchQuery,
    currentPage,
    constraint,
    pageSize,
    filters,
    ...(past ? { before: time } : { after: time }),
  };
};
