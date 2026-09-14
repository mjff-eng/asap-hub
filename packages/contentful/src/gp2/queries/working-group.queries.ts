/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const workingGroupMemberQueryFragment = gql`
  fragment WorkingGroupMemberData on WorkingGroupMembership {
    sys {
      id
    }
    role
    inactiveSinceDate
    user {
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
`;

export const workingGroupsContentQueryFragment = gql`
  fragment WorkingGroupsContentData on WorkingGroups {
    sys {
      id
      firstPublishedAt
      publishedAt
      publishedVersion
    }
    title
    shortDescription
    description {
      json
    }
    primaryEmail
    secondaryEmail
    leadingMembers
    membersCollection(limit: 100) {
      total
      items {
        ...WorkingGroupMemberData
      }
    }
    milestonesCollection(limit: 10) {
      total
      items {
        sys {
          id
        }
        description
        externalLink
        status
        title
      }
    }
    resourcesCollection(limit: 10) {
      total
      items {
        sys {
          id
        }
        type
        title
        description
        externalLink
      }
    }
    calendar {
      sys {
        id
      }
      name
    }
    tagsCollection(limit: 10) {
      total
      items {
        sys {
          id
        }
        name
      }
    }
  }
  ${workingGroupMemberQueryFragment}
`;

export const FETCH_WORKING_GROUP_BY_ID = gql`
  query FetchWorkingGroupById($id: String!) {
    workingGroups(id: $id) {
      ...WorkingGroupsContentData
    }
  }
  ${workingGroupsContentQueryFragment}
`;

export const FETCH_WORKING_GROUPS = gql`
  query FetchWorkingGroups {
    workingGroupsCollection(limit: 50) {
      total
      items {
        ...WorkingGroupsContentData
      }
    }
  }
  ${workingGroupsContentQueryFragment}
`;

export const FETCH_WORKING_GROUP_MEMBERS = gql`
  query FetchWorkingGroupMembers($id: String!, $limit: Int!, $skip: Int!) {
    workingGroups(id: $id) {
      membersCollection(limit: $limit, skip: $skip) {
        total
        items {
          ...WorkingGroupMemberData
        }
      }
    }
  }
  ${workingGroupMemberQueryFragment}
`;
