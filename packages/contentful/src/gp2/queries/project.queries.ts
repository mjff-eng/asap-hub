/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const projectMemberQueryFragment = gql`
  fragment ProjectMemberData on ProjectMembership {
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

export const projectsContentQueryFragment = gql`
  fragment ProjectsContentFields on Projects {
    sys {
      id
      firstPublishedAt
      publishedAt
      publishedVersion
    }
    title
    startDate
    endDate
    status
    projectProposal
    description
    pmEmail
    leadEmail
    tagsCollection(limit: 6) {
      total
      items {
        sys {
          id
        }
        name
      }
    }
    traineeProject
    opportunitiesAvailable
    opportunitiesShortText
    opportunitiesLinkName
    opportunitiesLink
    membersCollection(limit: 100) {
      total
      items {
        ...ProjectMemberData
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
  }
  ${projectMemberQueryFragment}
`;

export const FETCH_PROJECT_BY_ID = gql`
  query FetchProjectById($id: String!) {
    projects(id: $id) {
      ...ProjectsContentFields
    }
  }
  ${projectsContentQueryFragment}
`;

export const FETCH_PROJECTS = gql`
  query FetchProjects($limit: Int, $skip: Int, $where: ProjectsFilter) {
    projectsCollection(limit: $limit, skip: $skip, where: $where) {
      total
      items {
        ...ProjectsContentFields
      }
    }
  }
  ${projectsContentQueryFragment}
`;

export const FETCH_PROJECTS_BY_USER = gql`
  query FetchProjectsByUser($limit: Int, $skip: Int, $userId: String!) {
    projectMembershipCollection(
      limit: $limit
      skip: $skip
      where: { user: { sys: { id: $userId } } }
    ) {
      total
      items {
        linkedFrom {
          projectsCollection(limit: 1) {
            total
            items {
              ...ProjectsContentFields
            }
          }
        }
      }
    }
  }
  ${projectsContentQueryFragment}
`;

export const FETCH_PROJECT_MEMBERS = gql`
  query FetchProjectMembers($id: String!, $limit: Int!, $skip: Int!) {
    projects(id: $id) {
      membersCollection(limit: $limit, skip: $skip) {
        total
        items {
          ...ProjectMemberData
        }
      }
    }
  }
  ${projectMemberQueryFragment}
`;
