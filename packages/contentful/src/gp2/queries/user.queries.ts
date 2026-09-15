/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const usersContentQueryFragment = gql`
  fragment UsersContentData on Users {
    sys {
      id
      firstPublishedAt
      publishedAt
      publishedVersion
    }
    activeCampaignId
    activatedDate
    firstName
    middleName
    lastName
    nickname
    avatar {
      url
    }
    degrees
    country
    stateOrProvince
    city
    region
    email
    alternativeEmail
    telephoneCountryCode
    telephoneNumber
    tagsCollection(limit: 10) {
      total
      items {
        sys {
          id
        }
        name
      }
    }
    biography
    questions
    fundingStreams
    blog
    linkedIn
    blueSky
    threads
    twitter
    github
    googleScholar
    orcid
    orcidLastModifiedDate
    orcidLastSyncDate
    orcidWorks
    researchGate
    researcherId
    connections
    role
    onboarded
    alumniSinceDate
    alumniLocation
    alumniLastUpdated
    positions
    activatedDate
    contributingCohortsCollection(limit: 10) {
      items {
        contributingCohort {
          sys {
            id
          }
          name
          studyLink
        }
        role
      }
    }
    linkedFrom {
      projectMembershipCollection(limit: 30) {
        items {
          user {
            sys {
              id
            }
          }
          role
          linkedFrom {
            projectsCollection(limit: 1) {
              items {
                sys {
                  id
                }
                title
                status
                membersCollection(limit: 25) {
                  total
                  items {
                    role
                    user {
                      sys {
                        id
                      }
                      onboarded
                    }
                  }
                }
              }
            }
          }
        }
      }
      workingGroupMembershipCollection(limit: 10) {
        items {
          user {
            sys {
              id
            }
          }
          role
          linkedFrom {
            workingGroupsCollection(limit: 1) {
              items {
                sys {
                  id
                }
                title
                membersCollection(limit: 50) {
                  total
                  items {
                    role
                    user {
                      sys {
                        id
                      }
                      onboarded
                    }
                  }
                }
              }
            }
          }
        }
      }
      outputsCollection(limit: 8) {
        items {
          sys {
            id
          }
          title
          shortDescription
          sharingStatus
          gp2Supported
        }
      }
    }
  }
`;

export const FETCH_USER_BY_ID = gql`
  query FetchUserById($id: String!) {
    users(id: $id) {
      ...UsersContentData
    }
  }
  ${usersContentQueryFragment}
`;

export const FETCH_USERS = gql`
  query FetchUsers(
    $limit: Int
    $skip: Int
    $order: [UsersOrder]
    $where: UsersFilter
  ) {
    usersCollection(limit: $limit, skip: $skip, order: $order, where: $where) {
      total
      items {
        ...UsersContentData
      }
    }
  }
  ${usersContentQueryFragment}
`;

export const FETCH_USERS_BY_PROJECT_IDS = gql`
  query FetchUsersByProjectIds($ids: [String]!) {
    projectsCollection(limit: 20, where: { sys: { id_in: $ids } }) {
      total
      items {
        sys {
          id
        }
        membersCollection(limit: 25) {
          total
          items {
            user {
              sys {
                id
              }
            }
          }
        }
      }
    }
  }
`;

export const FETCH_USERS_BY_WORKING_GROUP_IDS = gql`
  query FetchUsersByWorkingGroupIds($ids: [String]!) {
    workingGroupsCollection(limit: 20, where: { sys: { id_in: $ids } }) {
      total
      items {
        sys {
          id
        }
        membersCollection(limit: 50) {
          total
          items {
            user {
              sys {
                id
              }
            }
          }
        }
      }
    }
  }
`;

export const FETCH_USERS_BY_TAG_IDS = gql`
  query FetchUsersByTagIds($ids: [String]!) {
    usersCollection(where: { tags: { sys: { id_in: $ids } } }) {
      total
      items {
        sys {
          id
        }
      }
    }
  }
`;

export const FETCH_USERS_FOR_ORCID_SYNC = gql`
  query FetchUsersForOrcidSync(
    $limit: Int
    $skip: Int
    $order: [UsersOrder]
    $where: UsersFilter
  ) {
    usersCollection(limit: $limit, skip: $skip, order: $order, where: $where) {
      total
      items {
        sys {
          id
        }
        email
        orcid
      }
    }
  }
`;
