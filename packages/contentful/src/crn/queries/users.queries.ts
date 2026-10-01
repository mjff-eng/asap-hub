/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const usersContentQueryFragment = gql`
  fragment UsersContent on Users {
    sys {
      id
      firstPublishedAt
      publishedAt
      publishedVersion
    }
    activeCampaignId
    lastUpdated
    alumniSinceDate
    alumniLocation
    alumniLastUpdated
    biography
    connections
    createdDate
    degree
    email
    contactEmail
    personalEmail
    dismissedGettingStarted
    firstName
    middleName
    lastName
    nickname
    institution
    jobTitle
    country
    stateOrProvince
    city
    onboarded
    orcid
    orcidLastModifiedDate
    orcidLastSyncDate
    orcidWorks
    questions
    expertiseAndResourceDescription
    userSocials {
      github
      googleScholar
      linkedIn
      researcherId
      researchGate
      twitter
      blueSky
      website1
      website2
    }
    role
    openScienceTeamMember
    techSupport
    responsibilities
    researchInterests
    reachOut
    avatar {
      url
    }
    researchTagsCollection(limit: 20) {
      items {
        sys {
          id
        }
        name
      }
    }
    teamsCollection(limit: 10) {
      items {
        team {
          sys {
            id
          }
          displayName
          inactiveSince
          researchTheme {
            name
          }
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
                      projectType
                      status
                      proposal {
                        sys {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
            interestGroupsTeamsCollection(limit: 10) {
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
          }
        }
        role
        inactiveSinceDate
        awardsCollection(limit: 20, order: [date_DESC]) {
          items {
            date
            awardType {
              name
              icon {
                url
              }
            }
          }
        }
      }
    }
    labsCollection(limit: 10) {
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
    linkedFrom {
      workingGroupMembersCollection(limit: 10) {
        items {
          inactiveSinceDate
          linkedFrom {
            workingGroupsCollection(limit: 1) {
              items {
                sys {
                  id
                }
                title
                complete
              }
            }
          }
          user {
            lastName
          }
        }
      }
      workingGroupLeadersCollection(limit: 10) {
        items {
          role
          inactiveSinceDate
          linkedFrom {
            workingGroupsCollection(limit: 1) {
              items {
                sys {
                  id
                }
                title
                complete
              }
            }
          }
          user {
            lastName
          }
        }
      }
      interestGroupLeadersCollection(limit: 10) {
        items {
          role
          inactiveSinceDate
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
      researchOutputsCollection @include(if: $publicUser) {
        items {
          sys {
            id
          }
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
      projectMembershipCollection(limit: 20) {
        items {
          linkedFrom {
            projectsCollection(limit: 1) {
              items {
                sys {
                  id
                }
                title
                projectType
                status
              }
            }
          }
        }
      }
    }
  }
`;

export const FETCH_PUBLIC_USERS = gql`
  query FetchPublicUsers(
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
          publishedAt
          firstPublishedAt
        }
        avatar {
          url
        }
        alumniSinceDate
        biography
        city
        country
        createdDate
        lastUpdated
        degree
        firstName
        lastName
        institution
        orcid
        personalEmail
        userSocials {
          website1
          website2
          linkedIn
          researcherId
          twitter
          blueSky
          github
          googleScholar
          researchGate
        }
        researchTagsCollection(limit: 20) {
          items {
            name
          }
        }
        teamsCollection(limit: 10) {
          items {
            team {
              displayName
              researchTheme {
                name
              }
              linkedFrom {
                interestGroupsTeamsCollection(limit: 10) {
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
              }
            }
            role
            inactiveSinceDate
          }
        }
        labsCollection(limit: 10) {
          items {
            sys {
              id
            }
            name
          }
        }
        linkedFrom {
          workingGroupMembersCollection(limit: 10) {
            items {
              inactiveSinceDate
              linkedFrom {
                workingGroupsCollection(limit: 1) {
                  items {
                    title
                    complete
                  }
                }
              }
            }
          }
          workingGroupLeadersCollection(limit: 10) {
            items {
              role
              inactiveSinceDate
              linkedFrom {
                workingGroupsCollection(limit: 1) {
                  items {
                    title
                    complete
                  }
                }
              }
            }
          }
          interestGroupLeadersCollection(limit: 10) {
            items {
              role
              inactiveSinceDate
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
          researchOutputsCollection(limit: 20) {
            items {
              sys {
                id
              }
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

export const FETCH_USER_BY_ID = gql`
  query FetchUserById($id: String!, $publicUser: Boolean = false) {
    users(id: $id) {
      ...UsersContent
    }
  }
  ${usersContentQueryFragment}
`;

export const userListItemContentQueryFragment = gql`
  fragment UserListItemContent on Users {
    alumniSinceDate
    avatar {
      url
    }
    biography
    city
    contactEmail
    stateOrProvince
    country
    createdDate
    degree
    email
    firstName
    sys {
      id
    }
    institution
    jobTitle
    labsCollection(limit: 10) {
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
    lastName
    middleName
    nickname
    onboarded
    dismissedGettingStarted
    role
    openScienceTeamMember
    techSupport
    orcid
    userSocials {
      github
      googleScholar
      linkedIn
      researcherId
      researchGate
      twitter
      blueSky
      website1
      website2
    }
    researchTagsCollection(limit: 20) {
      items {
        sys {
          id
        }
        name
      }
    }
    teamsCollection(limit: 10) {
      items {
        team {
          sys {
            id
          }
          displayName
        }
        role
        awardsCollection(limit: 20, order: [date_DESC]) {
          items {
            date
            awardType {
              name
              icon {
                url
              }
            }
          }
        }
      }
    }
  }
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
        ...UserListItemContent
      }
    }
  }
  ${userListItemContentQueryFragment}
`;

export const FETCH_USERS_BY_TEAM_ID = gql`
  query FetchUsersByTeamId($id: String!, $limit: Int, $skip: Int) {
    teamMembershipCollection(
      limit: $limit
      skip: $skip
      where: { team: { sys: { id: $id } } }
    ) {
      total
      items {
        linkedFrom {
          usersCollection(limit: 1) {
            items {
              ...UserListItemContent
            }
          }
        }
      }
    }
  }
  ${userListItemContentQueryFragment}
`;

export const FETCH_USERS_BY_TEAM_MEMBERSHIP_ID = gql`
  query FetchUsersByTeamMembershipId($id: String!, $limit: Int, $skip: Int) {
    teamMembershipCollection(
      limit: $limit
      skip: $skip
      where: { sys: { id: $id } }
    ) {
      total
      items {
        linkedFrom {
          usersCollection(limit: 1) {
            items {
              ...UserListItemContent
            }
          }
        }
      }
    }
  }
  ${userListItemContentQueryFragment}
`;

export const FETCH_USERS_BY_LAB_ID = gql`
  query FetchUsersByLabId($id: String!, $limit: Int, $skip: Int) {
    labs(id: $id) {
      linkedFrom {
        labMembershipCollection(limit: $limit, skip: $skip) {
          total
          items {
            linkedFrom {
              usersCollection(limit: 1) {
                items {
                  ...UserListItemContent
                }
              }
            }
          }
        }
      }
    }
  }
  ${userListItemContentQueryFragment}
`;

export const FETCH_USER_BY_ID_FOR_ALGOLIA_LIST = gql`
  query FetchUserByIdForAlgoliaList($id: String!) {
    users(id: $id) {
      sys {
        id
      }
      biography
      contactEmail
      firstName
      middleName
      lastName
      nickname
      email
      alumniSinceDate
      createdDate
      openScienceTeamMember
      techSupport
      orcid
      userSocials {
        github
        googleScholar
        linkedIn
        researcherId
        researchGate
        twitter
        blueSky
        website1
        website2
      }
      avatar {
        url
      }
      country
      city
      stateOrProvince
      degree
      jobTitle
      institution
      dismissedGettingStarted
      role
      onboarded
      teamsCollection(limit: 10) {
        items {
          team {
            sys {
              id
            }
            displayName
          }
          role
          awardsCollection(limit: 20, order: [date_DESC]) {
            items {
              date
              awardType {
                name
                icon {
                  url
                }
              }
            }
          }
        }
      }
      researchTagsCollection(limit: 20) {
        items {
          sys {
            id
          }
          name
        }
      }
      labsCollection(limit: 10) {
        items {
          sys {
            id
          }
          name
        }
      }
    }
  }
`;
