/* istanbul ignore file */

import { gql } from 'graphql-tag';

const usersContentQueryFragment = gql`
  fragment PartialUsersContent on Users {
    sys {
      id
      firstPublishedAt
      publishedAt
      publishedVersion
    }
    lastUpdated
    email
    firstName
    nickname
    institution
    jobTitle
    lastName
    avatar {
      url
    }
  }
`;

export const FETCH_DISCOVER = gql`
  query FetchDiscover {
    discoverCollection(limit: 1, order: sys_publishedAt_DESC) {
      items {
        aboutUs {
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
        membersCollection {
          items {
            ...PartialUsersContent
          }
        }
        membersTeam {
          sys {
            id
          }
        }
        scientificAdvisoryBoardCollection {
          items {
            ...PartialUsersContent
          }
        }
        asapAreasCollection(limit: 20) {
          items {
            sys {
              id
            }
            name
            objective
            primaryEmail
            secondaryEmail
            membersCollection(limit: 100) {
              items {
                sys {
                  id
                }
              }
            }
            linkedFrom {
              teamMembershipCollection(limit: 100) {
                items {
                  role
                  inactiveSinceDate
                  linkedFrom {
                    usersCollection(limit: 1) {
                      items {
                        sys {
                          id
                        }
                        onboarded
                        alumniSinceDate
                        firstName
                        nickname
                        lastName
                        avatar {
                          url
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  ${usersContentQueryFragment}
`;
