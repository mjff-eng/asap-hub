/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const calendarsContentQueryFragment = gql`
  fragment CalendarsContentData on Calendars {
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
    gp2Calendar
    linkedFrom {
      projectsCollection {
        items {
          sys {
            id
          }
          title
          status
        }
      }
      workingGroupsCollection {
        items {
          sys {
            id
          }
          title
        }
      }
    }
  }
`;

export const FETCH_CALENDAR_BY_ID = gql`
  query FetchCalendarById($id: String!) {
    calendars(id: $id) {
      ...CalendarsContentData
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
        ...CalendarsContentData
      }
    }
  }
  ${calendarsContentQueryFragment}
`;
