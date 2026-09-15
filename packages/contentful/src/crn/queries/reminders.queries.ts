/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const FETCH_REMINDERS = gql`
  query FetchReminders(
    $researchOutputFilter: ResearchOutputsFilter
    $eventFilter: EventsFilter
    $userId: String!
    $researchOutputVersionsFilter: ResearchOutputVersionsFilter
    $manuscriptFilter: ManuscriptsFilter
    $milestoneFilter: MilestonesFilter
  ) {
    milestonesCollection(
      where: $milestoneFilter
      limit: 100
      order: [sys_publishedAt_DESC]
    ) {
      items {
        sys {
          id
          firstPublishedAt
          publishedAt
        }
        description
        status
        bulkImported
        statusUpdatedAt
        statusUpdatedBy {
          sys {
            id
          }
          firstName
          lastName
        }
        outputsLinkedAt
        outputsLinkedBy {
          sys {
            id
          }
          firstName
          lastName
        }
        relatedArticlesCollection(limit: 1) {
          total
        }
        linkedFrom {
          aimsCollection(limit: 10) {
            items {
              sys {
                id
              }
              linkedFrom {
                supplementGrantCollection(limit: 1) {
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
      }
    }
    manuscriptsCollection(where: $manuscriptFilter) {
      items {
        sys {
          id
          publishedAt
          firstPublishedAt
        }
        title
        status
        previousStatus
        statusUpdatedAt
        statusUpdatedBy {
          sys {
            id
          }
          firstName
          lastName
        }
        teamsCollection(limit: 10) {
          items {
            sys {
              id
            }
            displayName
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
                      }
                    }
                  }
                }
              }
            }
          }
        }
        project {
          sys {
            id
          }
          title
        }
        assignedUsersCollection(limit: 30) {
          items {
            sys {
              id
            }
          }
        }
        versionsCollection(limit: 10, order: count_ASC) {
          total
          items {
            count
            sys {
              firstPublishedAt
            }
            createdBy {
              sys {
                id
              }
              firstName
              lastName
            }
            firstAuthorsCollection(limit: 10) {
              items {
                __typename
                ... on Users {
                  sys {
                    id
                  }
                }
              }
            }
            additionalAuthorsCollection(limit: 10) {
              items {
                __typename
                ... on Users {
                  sys {
                    id
                  }
                }
              }
            }
            correspondingAuthorCollection(limit: 10) {
              items {
                __typename
                ... on Users {
                  sys {
                    id
                  }
                }
              }
            }
            labsCollection(limit: 10) {
              items {
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
    researchOutputsCollection(where: $researchOutputFilter, preview: true) {
      items {
        sys {
          id
          publishedAt
        }
        addedDate
        createdDate
        documentType
        title
        project {
          sys {
            id
          }
          title
        }
        teamsCollection(limit: 10) {
          items {
            sys {
              id
            }
            displayName
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
                      }
                    }
                  }
                }
              }
            }
          }
        }
        workingGroup {
          sys {
            id
          }
          title
        }
        createdBy {
          sys {
            id
          }
          firstName
          lastName
        }
        statusChangedAt
        statusChangedBy {
          sys {
            id
          }
          firstName
          lastName
        }
        isInReview
      }
    }
    eventsCollection(where: $eventFilter) {
      items {
        sys {
          id
        }
        startDate
        endDate
        title
        videoRecordingUpdatedAt
        presentationUpdatedAt
        notesUpdatedAt
        speakersCollection(limit: 30) {
          items {
            team {
              sys {
                id
              }
            }
          }
        }
      }
    }
    users(id: $userId) {
      role
      openScienceTeamMember
      teamsCollection {
        items {
          team {
            sys {
              id
            }
            displayName
          }
          role
        }
      }
      linkedFrom {
        workingGroupMembersCollection(limit: 10) {
          items {
            linkedFrom {
              workingGroupsCollection(limit: 1) {
                items {
                  sys {
                    id
                  }
                  title
                }
              }
            }
          }
        }
        workingGroupLeadersCollection(limit: 10) {
          items {
            role
            linkedFrom {
              workingGroupsCollection(limit: 1) {
                items {
                  sys {
                    id
                  }
                  title
                }
              }
            }
          }
        }
        eventSpeakersCollection(limit: 100) {
          items {
            team {
              sys {
                id
              }
            }
            linkedFrom {
              eventsCollection(limit: 1) {
                items {
                  sys {
                    id
                  }
                  title
                  endDate
                }
              }
            }
          }
        }
      }
    }
    researchOutputVersionsCollection(where: $researchOutputVersionsFilter) {
      items {
        sys {
          id
          publishedAt
        }
        linkedFrom {
          researchOutputsCollection(limit: 1) {
            items {
              sys {
                id
              }
              title
              documentType
              project {
                sys {
                  id
                }
                title
              }
              teamsCollection(limit: 10) {
                items {
                  sys {
                    id
                  }
                  displayName
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
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              workingGroup {
                sys {
                  id
                }
                title
              }
            }
          }
        }
      }
    }
  }
`;

export const FETCH_MILESTONE_REMINDER_PROJECTS = gql`
  query FetchMilestoneReminderProjects($projectFilter: ProjectsFilter) {
    projectsCollection(where: $projectFilter, limit: 100) {
      items {
        sys {
          id
        }
        title
        projectType
        originalGrantAimsCollection(limit: 50) {
          items {
            sys {
              id
            }
          }
        }
        supplementGrant {
          sys {
            id
          }
          aimsCollection(limit: 50) {
            items {
              sys {
                id
              }
            }
          }
        }
        membersCollection(limit: 50) {
          items {
            role
            projectMember {
              __typename
              ... on Users {
                sys {
                  id
                }
              }
              ... on Teams {
                sys {
                  id
                }
              }
            }
          }
        }
        scientificFacilitatorCollection(limit: 10) {
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

export const FETCH_TEAM_PROJECT_MANAGER = gql`
  query FetchTeamProjectManager($id: String!) {
    teamMembershipCollection(
      where: {
        AND: [{ team: { sys: { id: $id } } }, { role: "Project Manager" }]
      }
    ) {
      items {
        linkedFrom {
          usersCollection(limit: 1) {
            total
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

export const manuscriptsCollectionQueryFragment = gql`
  fragment ManuscriptsCollectionContent on ManuscriptsCollection {
    items {
      sys {
        id
      }
      title
      project {
        sys {
          id
        }
        title
      }
      assignedUsersCollection(limit: 30) {
        items {
          sys {
            id
          }
        }
      }
      versionsCollection(limit: 1, order: sys_firstPublishedAt_DESC) {
        items {
          teamsCollection(limit: 10) {
            items {
              sys {
                id
              }
              displayName
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
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          firstAuthorsCollection(limit: 10) {
            items {
              __typename
              ... on Users {
                sys {
                  id
                }
              }
            }
          }
          additionalAuthorsCollection(limit: 10) {
            items {
              __typename
              ... on Users {
                sys {
                  id
                }
              }
            }
          }
          correspondingAuthorCollection(limit: 10) {
            items {
              __typename
              ... on Users {
                sys {
                  id
                }
              }
            }
          }
          labsCollection(limit: 10) {
            items {
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
`;

export const FETCH_DISCUSSION_REMINDERS = gql`
  query FetchDiscussionReminders($discussionFilter: DiscussionsFilter) {
    discussionsCollection(where: $discussionFilter) {
      items {
        sys {
          id
          firstPublishedAt
        }
        message {
          createdBy {
            sys {
              id
            }
            firstName
            lastName
            role
            openScienceTeamMember
            teamsCollection(
              limit: 10
              where: { inactiveSinceDate_exists: false }
            ) {
              items {
                team {
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
        linkedFrom {
          manuscriptsCollection(limit: 1) {
            ...ManuscriptsCollectionContent
          }
        }
      }
    }
  }
  ${manuscriptsCollectionQueryFragment}
`;

export const FETCH_MESSAGE_REMINDERS = gql`
  query FetchMessageReminders($messageFilter: MessagesFilter) {
    messagesCollection(where: $messageFilter) {
      items {
        sys {
          id
          firstPublishedAt
        }
        createdBy {
          sys {
            id
          }
          firstName
          lastName
          role
          openScienceTeamMember
          teamsCollection(
            limit: 10
            where: { inactiveSinceDate_exists: false }
          ) {
            items {
              team {
                sys {
                  id
                }
                displayName
                inactiveSince
              }
            }
          }
        }
        linkedFrom {
          discussionsCollection(limit: 1) {
            items {
              message {
                sys {
                  id
                }
              }
              linkedFrom {
                manuscriptsCollection(limit: 1) {
                  ...ManuscriptsCollectionContent
                }
              }
            }
          }
        }
      }
    }
  }
  ${manuscriptsCollectionQueryFragment}
`;
