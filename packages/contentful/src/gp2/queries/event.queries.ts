/* istanbul ignore file */

import { gql } from 'graphql-tag';
import { relatedOutputQueryFragment } from './output.queries';

export const eventsContentQueryFragment = gql`
  fragment EventsContentData on Events {
    sys {
      id
      publishedAt
      publishedVersion
    }
    description
    endDate
    endDateTimeZone
    startDate
    startDateTimeZone
    meetingLink
    inPerson
    eventLink
    status
    hidden
    googleId
    copyMeetingLink
    tagsCollection(limit: 10) {
      total
      items {
        sys {
          id
        }
        name
      }
    }
    title
    notesPermanentlyUnavailable
    notes {
      json
      links {
        entries {
          inline {
            sys {
              id
            }
            __typename
            ... on Media {
              url
            }
          }
        }
        assets {
          block {
            sys {
              id
            }
            url
            description
            contentType
            width
            height
          }
        }
      }
    }
    notesUpdatedAt
    videoRecordingPermanentlyUnavailable
    videoRecording {
      json
      links {
        entries {
          inline {
            sys {
              id
            }
            __typename
            ... on Media {
              url
            }
          }
        }
        assets {
          block {
            sys {
              id
            }
            url
            description
            contentType
            width
            height
          }
        }
      }
    }
    videoRecordingUpdatedAt
    presentationPermanentlyUnavailable
    presentation {
      json
      links {
        entries {
          inline {
            sys {
              id
            }
            __typename
            ... on Media {
              url
            }
          }
        }
        assets {
          block {
            sys {
              id
            }
            url
            description
            contentType
            width
            height
          }
        }
      }
    }
    presentationUpdatedAt
    meetingMaterialsPermanentlyUnavailable
    meetingMaterials
    calendar {
      googleCalendarId
      color
      name
      linkedFrom {
        workingGroupsCollection {
          items {
            sys {
              id
            }
            title
          }
        }
        projectsCollection {
          items {
            sys {
              id
            }
            title
            status
          }
        }
      }
    }
    thumbnail {
      url
    }
    speakersCollection(limit: 10) {
      items {
        title
        user {
          __typename
          ... on ExternalUsers {
            sys {
              id
            }
            name
            orcid
          }
          ... on Users {
            sys {
              id
            }
            firstName
            nickname
            lastName
            onboarded
            alumniSinceDate
            avatar {
              url
            }
          }
        }
      }
    }
    linkedFrom {
      outputsCollection(limit: 50, order: [addedDate_ASC]) {
        items {
          ...RelatedOutputData
        }
      }
    }
  }
  ${relatedOutputQueryFragment}
`;

export const FETCH_EVENT_BY_ID = gql`
  query FetchEventById($id: String!) {
    events(id: $id) {
      ...EventsContentData
    }
  }
  ${eventsContentQueryFragment}
`;

export const FETCH_EVENTS = gql`
  query FetchEvents(
    $limit: Int
    $skip: Int
    $order: [EventsOrder]
    $where: EventsFilter
  ) {
    eventsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {
      total
      items {
        ...EventsContentData
      }
    }
  }
  ${eventsContentQueryFragment}
`;

export const FETCH_EVENTS_BY_USER_ID = gql`
  query FetchEventsByUserId($id: String!, $limit: Int, $skip: Int) {
    users(id: $id) {
      linkedFrom {
        eventSpeakersCollection(limit: 1) {
          items {
            linkedFrom {
              eventsCollection(limit: $limit, skip: $skip) {
                total
                items {
                  ...EventsContentData
                }
              }
            }
          }
        }
      }
    }
  }
  ${eventsContentQueryFragment}
`;

export const FETCH_EVENTS_BY_EXTERNAL_USER_ID = gql`
  query FetchEventsByExternalUserId($id: String!, $limit: Int, $skip: Int) {
    externalUsers(id: $id) {
      linkedFrom {
        eventSpeakersCollection(limit: 1) {
          items {
            linkedFrom {
              eventsCollection(limit: $limit, skip: $skip) {
                total
                items {
                  ...EventsContentData
                }
              }
            }
          }
        }
      }
    }
  }
  ${eventsContentQueryFragment}
`;

export const FETCH_PROJECT_CALENDAR = gql`
  query FetchProjectCalendar($id: String!) {
    projects(id: $id) {
      calendar {
        sys {
          id
        }
      }
    }
  }
`;

export const FETCH_WORKING_GROUP_CALENDAR = gql`
  query FetchWorkingGroupCalendar($id: String!) {
    workingGroups(id: $id) {
      calendar {
        sys {
          id
        }
      }
    }
  }
`;
