/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const calendarsContentQueryFragment = gql`
  fragment CalendarsContent on Calendars {
    sys {
      id
      firstPublishedAt
      publishedAt
      publishedVersion
    }
    googleCalendarId
    name
    color
    googleApiMetadata
    crnCalendar
    seminarSeries
    linkedFrom {
      workingGroupsCollection(limit: 1) {
        items {
          sys {
            id
          }
          complete
        }
      }
      interestGroupsCollection(limit: 1) {
        items {
          sys {
            id
          }
          active
        }
      }
    }
  }
`;

export const FETCH_CALENDAR_BY_ID = gql`
  query FetchCalendarById($id: String!) {
    calendars(id: $id) {
      ...CalendarsContent
    }
  }
  ${calendarsContentQueryFragment}
`;

export const FETCH_CALENDARS = gql`
  query FetchCalendars(
    $limit: Int
    $skip: Int
    $order: [CalendarsOrder]
    $where: CalendarsFilter
  ) {
    calendarsCollection(
      limit: $limit
      skip: $skip
      order: $order
      where: $where
    ) {
      total
      items {
        ...CalendarsContent
      }
    }
  }
  ${calendarsContentQueryFragment}
`;
