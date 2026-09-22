/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const FETCH_ANALYTICS_TEAM_LEADERSHIP = gql`
  query FetchAnalyticsTeamLeadership($limit: Int, $skip: Int) {
    teamsCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        linkedFrom {
          interestGroupsTeamsCollection(limit: 50) {
            items {
              linkedFrom {
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
          }
          teamMembershipCollection(limit: 100) {
            items {
              inactiveSinceDate
              linkedFrom {
                usersCollection(limit: 1) {
                  items {
                    alumniSinceDate
                    linkedFrom {
                      interestGroupLeadersCollection(limit: 10) {
                        items {
                          inactiveSinceDate
                          role
                          linkedFrom {
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
                      }
                      workingGroupMembersCollection(limit: 10) {
                        items {
                          inactiveSinceDate
                          linkedFrom {
                            workingGroupsCollection(limit: 1) {
                              items {
                                sys {
                                  id
                                }
                                complete
                              }
                            }
                          }
                        }
                      }
                      workingGroupLeadersCollection(limit: 10) {
                        items {
                          inactiveSinceDate
                          role
                          linkedFrom {
                            workingGroupsCollection(limit: 1) {
                              items {
                                sys {
                                  id
                                }
                                complete
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
  }
`;

export const FETCH_USER_PRODUCTIVITY = gql`
  query FetchUserProductivity($limit: Int, $skip: Int) {
    usersCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        firstName
        lastName
        nickname
        onboarded
        role
        alumniSinceDate
        teamsCollection(limit: 20) {
          items {
            team {
              sys {
                id
              }
              displayName
              inactiveSince
            }
            role
            inactiveSinceDate
          }
        }
        linkedFrom {
          researchOutputsCollection(limit: 100) {
            items {
              addedDate
              asapFunded
              createdDate
              sharingStatus
              documentType
              authorsCollection(limit: 20) {
                items {
                  __typename
                  ... on Users {
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
  }
`;

export const FETCH_TEAM_PRODUCTIVITY = gql`
  query FetchTeamProductivity($limit: Int, $skip: Int) {
    teamsCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        linkedFrom {
          researchOutputsCollection(limit: 2000) {
            items {
              addedDate
              asapFunded
              createdDate
              documentType
              sharingStatus
            }
          }
        }
      }
    }
  }
`;

export const FETCH_USER_TOTAL_RESEARCH_OUTPUTS = gql`
  query FetchUserTotalResearchOutputs($skip: Int) {
    usersCollection(order: sys_id_ASC, limit: 1000, skip: $skip) {
      total
      items {
        sys {
          id
        }
        firstName
        lastName
        nickname
        alumniSinceDate
        labsCollection(limit: 5) {
          items {
            sys {
              id
            }
          }
        }
        teamsCollection(limit: 5) {
          items {
            team {
              sys {
                id
              }
              displayName
              inactiveSince
            }
            role
            inactiveSinceDate
          }
        }
        linkedFrom {
          researchOutputsCollection(limit: 1) {
            total
          }
        }
      }
    }
  }
`;

export const FETCH_USER_RESEARCH_OUTPUTS = gql`
  query FetchUserResearchOutputs($limit: Int, $skip: Int) {
    usersCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        linkedFrom {
          researchOutputsCollection(limit: 250) {
            items {
              sys {
                id
              }
              addedDate
              asapFunded
              documentType
              authorsCollection(limit: 120) {
                items {
                  __typename
                  ... on Users {
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
  }
`;

export const FETCH_TEAM_COLLABORATION = gql`
  query FetchTeamCollaboration($limit: Int, $skip: Int) {
    teamsCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        linkedFrom {
          researchOutputsCollection(limit: 850) {
            items {
              addedDate
              asapFunded
              createdDate
              documentType
              sharingStatus
              labsCollection(limit: 2) {
                total
              }
              teamsCollection(limit: 20) {
                items {
                  sys {
                    id
                  }
                  displayName
                  inactiveSince
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const FETCH_ENGAGEMENT = gql`
  query FetchEngagement($limit: Int, $skip: Int) {
    teamsCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        linkedFrom {
          teamMembershipCollection(limit: 100) {
            items {
              role
              linkedFrom {
                usersCollection(limit: 1) {
                  items {
                    onboarded
                  }
                }
              }
            }
          }
          eventSpeakersCollection(limit: 1000) {
            items {
              linkedFrom {
                eventsCollection(limit: 1) {
                  items {
                    sys {
                      id
                    }
                    endDate
                    status
                  }
                }
              }
              user {
                __typename
                ... on Users {
                  sys {
                    id
                  }
                  onboarded
                  teamsCollection(limit: 3) {
                    items {
                      team {
                        sys {
                          id
                        }
                      }
                      role
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

// The awardType name below must match the Contentful awardType.name exactly;
// renaming it there silently drops the Open Science Champion metric to zero.
export const FETCH_OS_CHAMPION = gql`
  query FetchOsChampion($limit: Int, $skip: Int, $dateFilter: DateTime) {
    teamsCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        linkedFrom {
          teamMembershipCollection(limit: 100) {
            items {
              linkedFrom {
                usersCollection(limit: 1) {
                  items {
                    sys {
                      id
                    }
                    firstName
                    middleName
                    nickname
                    lastName
                  }
                }
              }
              awardsCollection(
                limit: 10
                where: {
                  date_exists: true
                  awardType: { name: "Open Science Champion" }
                  date_gte: $dateFilter
                }
              ) {
                total
              }
            }
          }
        }
      }
    }
  }
`;

export const preliminaryDataSharingSpeakerFragment = gql`
  fragment PreliminaryDataSharingSpeaker on EventSpeakers {
    preliminaryDataShared
    linkedFrom {
      eventsCollection(limit: 1) {
        items {
          sys {
            id
          }
          startDate
        }
      }
    }
  }
`;

export const FETCH_PRELIMINARY_DATA_SHARING = gql`
  query FetchPreliminaryDataSharing($limit: Int, $skip: Int) {
    teamsCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        linkedFrom {
          eventSpeakersCollection(limit: 100) {
            total
            items {
              ...PreliminaryDataSharingSpeaker
            }
          }
        }
      }
    }
  }
  ${preliminaryDataSharingSpeakerFragment}
`;

export const FETCH_PRELIMINARY_DATA_SHARING_BY_TEAM = gql`
  query FetchPreliminaryDataSharingByTeam(
    $teamId: String!
    $limit: Int
    $skip: Int
  ) {
    eventSpeakersCollection(
      where: { team: { sys: { id: $teamId } } }
      order: sys_id_ASC
      limit: $limit
      skip: $skip
    ) {
      total
      items {
        ...PreliminaryDataSharingSpeaker
      }
    }
  }
  ${preliminaryDataSharingSpeakerFragment}
`;

export const FETCH_ATTENDANCE = gql`
  query FetchAttendance($limit: Int, $skip: Int) {
    teamsCollection(order: sys_id_ASC, limit: $limit, skip: $skip) {
      total
      items {
        sys {
          id
        }
        displayName
        inactiveSince
        linkedFrom {
          attendanceCollection(limit: 100) {
            total
            items {
              attended
              linkedFrom {
                eventsCollection(limit: 1) {
                  items {
                    startDate
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
