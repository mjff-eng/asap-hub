/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const interestGroupContentQueryFragment = gql`
  fragment InterestGroupsContent on InterestGroups {
    sys {
      id
      firstPublishedAt
      publishedAt
      publishedVersion
    }
    name
    active
    researchTagsCollection(limit: 5) {
      items {
        sys {
          id
        }
        name
      }
    }
    description
    slack
    googleDrive
    thumbnail {
      url
    }
    teamsCollection(limit: 20) {
      items {
        team {
          sys {
            id
          }
          displayName
          inactiveSince
          linkedFrom {
            projectMembershipCollection(limit: 1) {
              items {
                linkedFrom {
                  projectsCollection(limit: 1) {
                    items {
                      researchTagsCollection(limit: 10) {
                        items {
                          sys {
                            id
                          }
                          name
                        }
                      }
                      title
                    }
                  }
                }
              }
            }
          }
        }
        endDate
      }
    }
    leadersCollection(limit: 20) {
      items {
        sys {
          id
          publishedAt
        }
        user {
          sys {
            id
            publishedAt
            firstPublishedAt
          }
          firstName
          nickname
          lastName
          email
          alumniSinceDate
          avatar {
            url
          }
          teamsCollection(limit: 5) {
            items {
              role
              inactiveSinceDate
              team {
                sys {
                  id
                }
                inactiveSince
                displayName
              }
              awardsCollection(limit: 1, order: [date_DESC]) {
                items {
                  date
                  awardType {
                    name
                    smallIcon {
                      url
                    }
                  }
                }
              }
            }
          }
        }
        role
        inactiveSinceDate
      }
    }
    calendar {
      sys {
        id
      }
      color
      googleCalendarId
      name
    }
    lastUpdated
  }
`;

export const FETCH_INTEREST_GROUP_BY_ID = gql`
  query FetchInterestGroupById($id: String!) {
    interestGroups(id: $id) {
      ...InterestGroupsContent
    }
  }
  ${interestGroupContentQueryFragment}
`;

export const FETCH_INTEREST_GROUPS = gql`
  query FetchInterestGroups(
    $limit: Int
    $skip: Int
    $order: [InterestGroupsOrder]
    $where: InterestGroupsFilter
  ) {
    interestGroupsCollection(
      limit: $limit
      skip: $skip
      order: $order
      where: $where
    ) {
      total
      items {
        ...InterestGroupsContent
      }
    }
  }
  ${interestGroupContentQueryFragment}
`;

export const FETCH_INTEREST_GROUPS_BY_USER_ID = gql`
  query FetchInterestGroupsByUserId($id: String!, $limit: Int, $skip: Int) {
    interestGroupLeadersCollection(
      limit: $limit
      skip: $skip
      where: { user: { sys: { id: $id } } }
    ) {
      total
      items {
        linkedFrom {
          interestGroupsCollection(limit: 1) {
            items {
              ...InterestGroupsContent
            }
          }
        }
      }
    }
  }
  ${interestGroupContentQueryFragment}
`;

export const FETCH_INTEREST_GROUP_ID_BY_INTEREST_GROUP_TEAM_ID = gql`
  query FetchInterestGroupIdByInterestGroupTeamId($id: String!) {
    interestGroupsTeams(id: $id) {
      linkedFrom {
        interestGroupsCollection(limit: 1) {
          items {
            sys {
              id
            }
          }
        }
      }
    }
  }
`;

export const FETCH_INTEREST_GROUP_IDS_BY_TEAM_ID = gql`
  query FetchInterestGroupIdsByTeamId($id: String!) {
    interestGroupsTeamsCollection(
      where: { team: { sys: { id: $id } } }
      limit: 50
    ) {
      items {
        linkedFrom {
          interestGroupsCollection(limit: 1) {
            items {
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

export const FETCH_INTEREST_GROUPS_BY_TEAM_ID = gql`
  query FetchInterestGroupsByTeamId($id: String!) {
    interestGroupsTeamsCollection(where: { team: { sys: { id: $id } } }) {
      total
      items {
        linkedFrom {
          interestGroupsCollection(limit: 1) {
            total
            items {
              ...InterestGroupsContent
            }
          }
        }
      }
    }
  }
  ${interestGroupContentQueryFragment}
`;
