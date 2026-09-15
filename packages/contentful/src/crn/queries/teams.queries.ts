/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const FETCH_TEAM_BY_ID = gql`
  query FetchTeamById($id: String!) {
    teams(id: $id) {
      sys {
        id
        publishedAt
      }
      displayName
      teamType
      teamDescription
      inactiveSince
      researchTheme {
        name
      }
      resourceTitle
      resourceDescription
      resourceButtonCopy
      resourceContactEmail
      resourceLink
      toolsCollection {
        items {
          sys {
            id
          }
          name
          description
          url
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
                  firstName
                  nickname
                  lastName
                  email
                  alumniSinceDate
                  avatar {
                    url
                  }
                  labsCollection(limit: 5) {
                    items {
                      sys {
                        id
                      }
                      name
                      labPi {
                        sys {
                          id
                        }
                      }
                    }
                  }
                  teamsCollection(limit: 10) {
                    items {
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
              }
            }
          }
        }
      }
    }
  }
`;

export const FETCH_TEAMS = gql`
  query FetchTeams(
    $limit: Int
    $skip: Int
    $order: [TeamsOrder]
    $where: TeamsFilter
  ) {
    teamsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        teamType
        researchTheme {
          name
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
                    labsCollection(limit: 5) {
                      items {
                        sys {
                          id
                        }
                        labPi {
                          sys {
                            id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          projectMembershipCollection(limit: 1) {
            items {
              linkedFrom {
                projectsCollection(limit: 1) {
                  items {
                    sys {
                      id
                    }
                    title
                    projectType
                    resourceType {
                      name
                    }
                    researchTagsCollection(limit: 20) {
                      items {
                        sys {
                          id
                        }
                        name
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
`;

export const FETCH_PUBLIC_TEAMS = gql`
  query FetchPublicTeams(
    $limit: Int
    $skip: Int
    $order: [TeamsOrder]
    $where: TeamsFilter
  ) {
    teamsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        researchTheme {
          name
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
                    firstName
                    nickname
                    lastName
                    alumniSinceDate
                    avatar {
                      url
                    }
                    onboarded
                  }
                }
              }
            }
          }
          interestGroupsTeamsCollection(limit: 100) {
            items {
              linkedFrom {
                interestGroupsCollection(limit: 1) {
                  items {
                    sys {
                      id
                    }
                    active
                    name
                  }
                }
              }
            }
          }
          projectMembershipCollection(limit: 1) {
            items {
              linkedFrom {
                projectsCollection(limit: 1) {
                  items {
                    title
                    originalGrant
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const FETCH_PUBLIC_TEAM_BY_ID = gql`
  query FetchPublicTeamById($id: String!) {
    teams(id: $id) {
      sys {
        id
        publishedAt
      }
      displayName
      inactiveSince
      researchTheme {
        name
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
                  firstName
                  nickname
                  lastName
                  alumniSinceDate
                  avatar {
                    url
                  }
                  onboarded
                }
              }
            }
          }
        }
        projectMembershipCollection(limit: 1) {
          items {
            linkedFrom {
              projectsCollection(limit: 1) {
                items {
                  title
                  originalGrant
                  researchTagsCollection(limit: 20) {
                    items {
                      sys {
                        id
                      }
                      name
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
`;

export const FETCH_PROJECT_BY_TEAM_ID = gql`
  query FetchTeamProjectById($id: String!) {
    teams(id: $id) {
      linkedFrom {
        projectMembershipCollection(limit: 1) {
          items {
            linkedFrom {
              projectsCollection(limit: 1) {
                items {
                  sys {
                    id
                  }
                  title
                  projectId
                  grantId
                  originalGrant
                  status
                  projectType
                  contactEmail
                  proposal {
                    sys {
                      id
                    }
                  }
                  supplementGrant {
                    title
                    description
                    startDate
                    endDate
                    proposal {
                      sys {
                        id
                      }
                    }
                  }
                  resourceType {
                    name
                  }
                  researchTagsCollection(limit: 20) {
                    items {
                      sys {
                        id
                      }
                      name
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
`;

export const FETCH_TEAM_ID_BY_PROJECT_ID = gql`
  query FetchTeamIdByProjectId($projectId: String!) {
    projects(id: $projectId) {
      membersCollection(limit: 1) {
        items {
          projectMember {
            ... on Teams {
              __typename
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

export const FETCH_TEAM_AWARD_METRICS = gql`
  query FetchTeamAwardMetrics($teamId: String!) {
    awardTypeCollection(limit: 50, order: [name_ASC]) {
      items {
        sys {
          id
        }
        name
        asapPhilosophy
        metricDefinition
      }
    }
    teamMembershipCollection(
      limit: 200
      where: { team: { sys: { id: $teamId } } }
    ) {
      items {
        awardsCollection(limit: 20) {
          items {
            awardType {
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
