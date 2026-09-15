import {
  DiscussionCreatedReminder,
  DiscussionRepliedToReminder,
  EventHappeningNowReminder,
  EventHappeningTodayReminder,
  EventNotesReminder,
  ListReminderDataObject,
  ListReminderResponse,
  ManuscriptCreatedReminder,
  ManuscriptResubmittedReminder,
  ManuscriptStatusUpdatedReminder,
  PresentationUpdatedReminder,
  PublishMaterialReminder,
  ReminderEventResponse,
  ReminderResponse,
  ResearchOutputDraftReminder,
  ResearchOutputInReviewReminder,
  ResearchOutputPublishedReminder,
  ResearchOutputSwitchToDraftReminder,
  ResearchOutputVersionPublishedReminder,
  SharePresentationReminder,
  UploadPresentationReminder,
  VideoEventReminder,
} from '@asap-hub/model';
import {
  FetchDiscussionRemindersQuery,
  FetchMessageRemindersQuery,
  FetchRemindersQuery,
  FetchTeamProjectManagerQuery,
} from '@asap-hub/contentful';
import { getContentfulGraphqlEvent, getEventResponse } from './events.fixtures';
import {
  getContentfulResearchOutputGraphqlResponse,
  getResearchOutputDataObject,
} from './research-output.fixtures';
import { MessageItem } from '../../src/data-providers/contentful/reminder.data-provider';

export const getResearchOutputVersionPublishedReminder =
  (): ResearchOutputVersionPublishedReminder => {
    return {
      id: 'research-output-version-published-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      entity: 'Research Output Version',
      type: 'Published',
      data: {
        researchOutputId: 'research-output-1',
        documentType: 'Bioinformatics',
        title: 'test-research-output-version',
        publishedAt: '2023-01-01T08:00:00Z',
        associationType: 'team',
        associationName: 'Team A',
      },
    };
  };

export const getResearchOutputPublishedReminder =
  (): ResearchOutputPublishedReminder => {
    const researchOutputDataObject = getResearchOutputDataObject();
    return {
      id: 'research-output-published-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      entity: 'Research Output',
      type: 'Published',
      data: {
        researchOutputId: researchOutputDataObject.id,
        documentType: researchOutputDataObject.documentType,
        title: researchOutputDataObject.title,
        addedDate: researchOutputDataObject.addedDate,
        statusChangedBy: 'Tom Hardy',
        associationType: 'team',
        associationName: 'Team A',
      },
    };
  };

export const getResearchOutputDraftTeamReminder =
  (): ResearchOutputDraftReminder => {
    const researchOutputDataObject = getResearchOutputDataObject();
    return {
      id: 'research-output-draft-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      entity: 'Research Output',
      type: 'Draft',
      data: {
        researchOutputId: researchOutputDataObject.id,
        title: researchOutputDataObject.title,
        createdDate: researchOutputDataObject.created,
        associationName: researchOutputDataObject.teams[0]?.displayName || '',
        associationType: 'team',
        createdBy: 'Tom Hardy',
      },
    };
  };

export const getResearchOutputDraftWorkingGroupReminder =
  (): ResearchOutputDraftReminder => {
    const researchOutputDataObject = getResearchOutputDataObject();
    return {
      id: 'research-output-draft-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      entity: 'Research Output',
      type: 'Draft',
      data: {
        researchOutputId: researchOutputDataObject.id,
        title: researchOutputDataObject.title,
        createdDate: researchOutputDataObject.created,
        associationName: 'Working Group 1',
        associationType: 'working group',
        createdBy: 'Tom Hardy',
      },
    };
  };

export const getResearchOutputInReviewTeamReminder =
  (): ResearchOutputInReviewReminder => {
    const researchOutputDataObject = getResearchOutputDataObject();
    return {
      id: 'research-output-in-review-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      entity: 'Research Output',
      type: 'In Review',
      data: {
        researchOutputId: researchOutputDataObject.id,
        title: researchOutputDataObject.title,
        createdDate: researchOutputDataObject.created,
        associationName: researchOutputDataObject.teams[0]?.displayName || '',
        associationType: 'team',
        documentType: researchOutputDataObject.documentType,
        statusChangedBy: 'Tom Hardy',
      },
    };
  };

export const getResearchOutputInReviewWorkingGroupReminder =
  (): ResearchOutputInReviewReminder => {
    const researchOutputDataObject = getResearchOutputDataObject();
    return {
      id: 'research-output-in-review-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      entity: 'Research Output',
      type: 'In Review',
      data: {
        researchOutputId: researchOutputDataObject.id,
        title: researchOutputDataObject.title,
        createdDate: researchOutputDataObject.created,
        associationName: 'Working Group 1',
        associationType: 'working group',
        documentType: researchOutputDataObject.documentType,
        statusChangedBy: 'Tom Hardy',
      },
    };
  };

export const getEventHappeningTodayReminder =
  (): EventHappeningTodayReminder => {
    const eventResponse = getEventResponse();
    return {
      id: `event-happening-today-${eventResponse.id}`,
      entity: 'Event',
      type: 'Happening Today',
      data: {
        eventId: eventResponse.id,
        startDate: eventResponse.startDate,
        title: eventResponse.title,
      },
    };
  };

export const getEventHappeningNowReminder = (): EventHappeningNowReminder => {
  const eventResponse = getEventResponse();
  return {
    id: `event-happening-now-${eventResponse.id}`,
    entity: 'Event',
    type: 'Happening Now',
    data: {
      eventId: eventResponse.id,
      startDate: eventResponse.startDate,
      endDate: eventResponse.endDate,
      title: eventResponse.title,
    },
  };
};

export const getSharePresentationReminder = (): SharePresentationReminder => {
  const eventResponse = getEventResponse();
  return {
    id: `share-presentation-${eventResponse.id}`,
    entity: 'Event',
    type: 'Share Presentation',
    data: {
      eventId: eventResponse.id,
      title: eventResponse.title,
      endDate: eventResponse.endDate,
    },
  };
};

export const getUploadPresentationReminder = (): UploadPresentationReminder => {
  const eventResponse = getEventResponse();
  return {
    id: `upload-presentation-${eventResponse.id}`,
    entity: 'Event',
    type: 'Upload Presentation',
    data: {
      eventId: eventResponse.id,
      title: eventResponse.title,
      endDate: eventResponse.endDate,
    },
  };
};

export const getPublishMaterialReminder = (): PublishMaterialReminder => {
  const eventResponse = getEventResponse();
  return {
    id: `publish-material-${eventResponse.id}`,
    entity: 'Event',
    type: 'Publish Material',
    data: {
      eventId: eventResponse.id,
      title: eventResponse.title,
      endDate: eventResponse.endDate,
    },
  };
};

export const getVideoEventUpdatedReminder = (): VideoEventReminder => {
  const eventResponse = getEventResponse() as ReminderEventResponse;
  eventResponse.videoRecordingUpdatedAt = '2010-08-01T08:00:04.000Z';

  return {
    id: `video-event-updated-${eventResponse.id}`,
    entity: 'Event',
    type: 'Video Updated',
    data: {
      eventId: eventResponse.id,
      title: eventResponse.title,
      videoRecordingUpdatedAt: eventResponse.videoRecordingUpdatedAt,
    },
  };
};

export const getPresentationUpdatedReminder =
  (): PresentationUpdatedReminder => {
    const eventResponse = getEventResponse() as ReminderEventResponse;
    eventResponse.presentationUpdatedAt = '2010-08-01T08:00:04.000Z';

    return {
      id: `presentation-event-updated-${eventResponse.id}`,
      entity: 'Event',
      type: 'Presentation Updated',
      data: {
        eventId: eventResponse.id,
        title: eventResponse.title,
        presentationUpdatedAt: eventResponse.presentationUpdatedAt,
      },
    };
  };

export const getNotesUpdatedReminder = (): EventNotesReminder => {
  const eventResponse = getEventResponse() as ReminderEventResponse;
  eventResponse.notesUpdatedAt = '2010-08-01T08:00:04.000Z';

  return {
    id: `notes-event-updated-${eventResponse.id}`,
    entity: 'Event',
    type: 'Notes Updated',
    data: {
      eventId: eventResponse.id,
      title: eventResponse.title,
      notesUpdatedAt: eventResponse.notesUpdatedAt,
    },
  };
};

export const getListReminderDataObject = (): ListReminderDataObject => ({
  total: 1,
  items: [getResearchOutputPublishedReminder()],
});

export const getReminderResponse = (): ReminderResponse => {
  return {
    id: 'research-output-published-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
    description:
      '**Tom Hardy** on team **Team A** published a team Lab Material output: Test Proposal 1234.',
    entity: 'Research Output',
    href: '/shared-research/ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
  };
};

export const getListReminderResponse = (): ListReminderResponse => ({
  total: 1,
  items: [getReminderResponse()],
});

export const getContentfulReminderEventsCollectionItem = (): NonNullable<
  FetchRemindersQuery['eventsCollection']
>['items'][number] => {
  const event = getContentfulGraphqlEvent();

  return {
    sys: {
      id: event.sys.id,
    },
    startDate: event.startDate,
    endDate: event.endDate,
    title: event.title,
    videoRecordingUpdatedAt: event.videoRecordingUpdatedAt,
    presentationUpdatedAt: event.presentationUpdatedAt,
    notesUpdatedAt: event.notesUpdatedAt,
    speakersCollection: {
      items: [
        {
          team: {
            sys: {
              id: 'team-1',
            },
          },
        },
      ],
    },
  };
};

export const getTeamLinkedProjectContent = () => ({
  projectMembershipCollection: {
    items: [
      {
        linkedFrom: {
          projectsCollection: {
            items: [
              {
                sys: {
                  id: 'project-id-1',
                },
                title: 'Genetic Determinants of Progression',
              },
            ],
          },
        },
      },
    ],
  },
});

export const getContentfulReminderResearchOutputCollectionItem =
  (): NonNullable<
    FetchRemindersQuery['researchOutputsCollection']
  >['items'][number] => {
    const researchOutput = getContentfulResearchOutputGraphqlResponse();

    return {
      sys: {
        id: researchOutput.sys.id,
        publishedAt: researchOutput.createdDate,
      },
      addedDate: researchOutput.addedDate,
      createdDate: researchOutput.createdDate,
      documentType: researchOutput.documentType,
      title: researchOutput.title,
      createdBy: {
        sys: {
          id: 'user-1',
        },
        firstName: 'Tom',
        lastName: 'Hardy',
      },
      teamsCollection: {
        items: [
          {
            sys: {
              id: 'team-1',
            },
            displayName: 'Team A',
            linkedFrom: getTeamLinkedProjectContent(),
          },
        ],
      },
      workingGroup: {
        sys: {
          id: 'wg-id-1',
        },
        title: 'Working Group 1',
      },
      statusChangedBy: {
        sys: {
          id: 'user-1',
        },
        firstName: 'Tom',
        lastName: 'Hardy',
      },
      isInReview: false,
    };
  };

export const getContentfulReminderResearchOutputVersionCollectionItem =
  (): NonNullable<
    FetchRemindersQuery['researchOutputVersionsCollection']
  >['items'][number] => {
    return {
      sys: {
        id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
        publishedAt: '2020-09-23T16:34:26.842Z',
      },
      linkedFrom: {
        researchOutputsCollection: {
          items: [
            {
              title: 'test-research-output-version',
              documentType: 'Bioinformatics',
              sys: {
                id: 'research-output-1',
              },
              teamsCollection: {
                items: [
                  {
                    sys: {
                      id: 'team-1',
                    },
                    displayName: 'Team A',
                    linkedFrom: getTeamLinkedProjectContent(),
                  },
                ],
              },
              workingGroup: {
                sys: {
                  id: 'wg-id-1',
                },
                title: 'Working Group 1',
              },
            },
          ],
        },
      },
    };
  };

export const getContentfulReminderUsersContent =
  (): FetchRemindersQuery['users'] => {
    const eventResponse = getEventResponse();

    return {
      role: 'Grantee',
      teamsCollection: {
        items: [
          {
            role: 'Collaborating PI',
            team: {
              sys: {
                id: 'team-1',
              },
            },
          },
        ],
      },
      linkedFrom: {
        workingGroupMembersCollection: {
          items: [
            {
              linkedFrom: {
                workingGroupsCollection: {
                  items: [
                    {
                      sys: {
                        id: 'wg-id-1',
                      },
                      title: 'Working Group 1',
                    },
                  ],
                },
              },
            },
          ],
        },
        workingGroupLeadersCollection: {
          items: [
            {
              role: 'Project Manager',
              linkedFrom: {
                workingGroupsCollection: {
                  items: [
                    {
                      sys: {
                        id: 'wg-id-2',
                      },
                      title: 'Working Group 2',
                    },
                  ],
                },
              },
            },
          ],
        },
        eventSpeakersCollection: {
          items: [
            {
              team: {
                sys: {
                  id: 'team-1',
                },
              },
              linkedFrom: {
                eventsCollection: {
                  items: [
                    {
                      sys: {
                        id: eventResponse.id,
                      },
                      title: eventResponse.title,
                      endDate: eventResponse.endDate,
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };
  };

export const getTeamProjectManagerResponse =
  (): FetchTeamProjectManagerQuery => ({
    teamMembershipCollection: {
      items: [
        {
          linkedFrom: {
            usersCollection: {
              total: 1,
              items: [
                {
                  sys: {
                    id: 'project-manager-1',
                  },
                },
              ],
            },
          },
        },
      ],
    },
  });

export const getResearchOutputSwitchToDraftTeamReminder =
  (): ResearchOutputSwitchToDraftReminder => {
    const researchOutputDataObject = getResearchOutputDataObject();
    return {
      id: 'research-output-switch-to-draft-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      entity: 'Research Output',
      type: 'Switch To Draft',
      data: {
        researchOutputId: researchOutputDataObject.id,
        title: researchOutputDataObject.title,
        statusChangedAt: '2021-05-21T13:18:31Z',
        associationName: researchOutputDataObject.teams[0]?.displayName || '',
        associationType: 'team',
        documentType: researchOutputDataObject.documentType,
        statusChangedBy: 'Tom Hardy',
      },
    };
  };
export const getResearchOutputSwitchToDraftWorkingGroupReminder =
  (): ResearchOutputSwitchToDraftReminder => {
    const researchOutputDataObject = getResearchOutputDataObject();
    return {
      id: 'research-output-switch-to-draft-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      entity: 'Research Output',
      type: 'Switch To Draft',
      data: {
        researchOutputId: researchOutputDataObject.id,
        title: researchOutputDataObject.title,
        statusChangedAt: '2021-05-21T13:18:31Z',
        associationName: 'Working Group 1',
        associationType: 'working group',
        documentType: researchOutputDataObject.documentType,
        statusChangedBy: 'Tom Hardy',
      },
    };
  };

export const getManuscriptVersion = ({
  count,
  firstAuthorIds,
  additionalAuthorIds,
  correspondingAuthorIds,
  createdById,
  createdByFirstName,
  createdByLastName,
  labPI = 'lab-pi-id',
  firstPublishedAt = '2025-01-07T16:21:33.824Z',
}: {
  count: number;
  firstAuthorIds: string[];
  additionalAuthorIds: string[];
  correspondingAuthorIds: string[];
  createdById: string;
  createdByFirstName: string;
  createdByLastName: string;
  labPI?: string;
  firstPublishedAt?: string;
}): NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<FetchRemindersQuery['manuscriptsCollection']>['items'][number]
    >['versionsCollection']
  >['items'][number]
> => ({
  count,
  sys: {
    firstPublishedAt,
  },
  additionalAuthorsCollection: {
    items: additionalAuthorIds.map((id) => ({
      __typename: 'Users',
      sys: {
        id,
      },
    })),
  },
  correspondingAuthorCollection: {
    items: correspondingAuthorIds.map((id) => ({
      __typename: 'Users',
      sys: {
        id,
      },
    })),
  },
  firstAuthorsCollection: {
    items: firstAuthorIds.map((id) => ({
      __typename: 'Users',
      sys: {
        id,
      },
    })),
  },
  createdBy: {
    sys: {
      id: createdById,
    },
    firstName: createdByFirstName,
    lastName: createdByLastName,
  },
  labsCollection: {
    items: [
      {
        labPi: {
          sys: {
            id: labPI,
          },
        },
      },
    ],
  },
});

const assignedUsersCollection = {
  items: [
    {
      sys: {
        id: 'assigned-os-member-id',
      },
    },
  ],
};

export const getContentfulReminderManuscriptCollectionItem = (): NonNullable<
  FetchRemindersQuery['manuscriptsCollection']
>['items'][number] => ({
  sys: {
    id: 'manuscript-id-1',
    publishedAt: '2025-01-07T16:21:33.824Z',
    firstPublishedAt: '2025-01-07T16:21:33.824Z',
  },
  title: 'Contextual AI models for single-cell protein biology',
  status: 'Waiting for Report',
  previousStatus: null,
  statusUpdatedAt: null,
  statusUpdatedBy: null,
  teamsCollection: {
    items: [
      {
        sys: {
          id: 'reminder-team',
        },
        displayName: 'Reminder',
      },
    ],
  },
  assignedUsersCollection,
  versionsCollection: {
    total: 1,
    items: [
      getManuscriptVersion({
        count: 1,
        firstAuthorIds: ['first-author-user'],
        additionalAuthorIds: [],
        correspondingAuthorIds: [],
        createdById: 'user-who-created-manuscript',
        createdByFirstName: 'Jane',
        createdByLastName: 'Doe',
      }),
    ],
  },
});

export const getContentfulReminderProjectManuscriptCollectionItem =
  (): NonNullable<
    FetchRemindersQuery['manuscriptsCollection']
  >['items'][number] => ({
    ...getContentfulReminderManuscriptCollectionItem()!,
    teamsCollection: {
      items: [],
    },
    project: {
      sys: {
        id: 'project-id-1',
      },
      title: 'Genetic Determinants of Progression',
    },
  });

const getDiscussionCreatedByUser = (id: string) => ({
  sys: {
    id,
  },
  firstName: 'Tom',
  lastName: 'Hardy',
  role: 'Grantee',
  openScienceTeamMember: false,
  teamsCollection: {
    items: [
      {
        team: {
          sys: {
            id: 'team-1',
          },
          displayName: 'Alessi',
          inactiveSince: null,
        },
      },
    ],
  },
});

export const getContentfulReminderDiscussionCollectionItem = (): NonNullable<
  FetchDiscussionRemindersQuery['discussionsCollection']
>['items'][number] => ({
  sys: {
    id: 'discussion-id-1',
    firstPublishedAt: '2025-01-07T16:21:33.824Z',
  },
  message: {
    createdBy: getDiscussionCreatedByUser('user-who-started-discussion'),
  },
  linkedFrom: {
    manuscriptsCollection: {
      items: [
        {
          ...getContentfulReminderManuscriptCollectionItem()!,
        },
      ],
    },
  },
});

const getReminderMessageCollectionItem = (): NonNullable<
  FetchMessageRemindersQuery['messagesCollection']
>['items'][number] => ({
  sys: {
    id: 'reply-id-1',
    firstPublishedAt: '2025-01-07T16:21:33.824Z',
  },
  createdBy: getDiscussionCreatedByUser('user-who-replied-discussion'),
  linkedFrom: {
    discussionsCollection: {
      items: [
        {
          message: {
            sys: {
              id: 'message-id',
            },
          },
          linkedFrom: {
            manuscriptsCollection: {
              items: [
                {
                  ...getContentfulReminderManuscriptCollectionItem()!,
                },
              ],
            },
          },
        },
      ],
    },
  },
});

export const getContentfulReminderMessageCollectionItem = (): NonNullable<
  FetchMessageRemindersQuery['messagesCollection']
>['items'][number] =>
  ({ ...getReminderMessageCollectionItem() }) as MessageItem;
export const getManuscriptCreatedReminder = (): ManuscriptCreatedReminder => ({
  id: 'manuscript-created-manuscript-id-1',
  entity: 'Manuscript',
  type: 'Manuscript Created',
  data: {
    createdBy: 'Jane Doe',
    manuscriptId: 'manuscript-id-1',
    publishedAt: '2025-01-07T16:21:33.824Z',
    teams: 'Team Reminder',
    title: 'Contextual AI models for single-cell protein biology',
  },
});

export const getManuscriptResubmittedReminder =
  (): ManuscriptResubmittedReminder => ({
    id: 'manuscript-resubmitted-manuscript-id-1',
    entity: 'Manuscript',
    type: 'Manuscript Resubmitted',
    data: {
      resubmittedBy: 'John Doe',
      manuscriptId: 'manuscript-id-1',
      resubmittedAt: '2025-01-07T16:21:33.824Z',
      teams: 'Team Reminder',
      title: 'Contextual AI models for single-cell protein biology',
    },
  });

export const getManuscriptStatusUpdatedReminder =
  (): ManuscriptStatusUpdatedReminder => ({
    id: 'manuscript-status-updated-manuscript-id-1',
    entity: 'Manuscript',
    type: 'Manuscript Status Updated',
    data: {
      manuscriptId: 'manuscript-id-1',
      updatedBy: 'Jannet Doe',
      updatedAt: '2025-01-08T10:00:00.000Z',
      title: 'Contextual AI models for single-cell protein biology',
      teams: 'Team ASAP',
      status: 'Review Compliance Report',
      previousStatus: 'Waiting for Report',
    },
  });

export const getDiscussionStartedByGranteeReminder =
  (): DiscussionCreatedReminder => ({
    id: 'discussion-created-discussion-id-1',
    entity: 'Discussion',
    type: 'Discussion Created by Grantee',
    data: {
      manuscriptId: 'manuscript-id-1',
      createdBy: 'Tom Hardy',
      publishedAt: '2025-01-07T16:21:33.824Z',
      manuscriptTeams: 'Team Reminder',
      title: 'Contextual AI models for single-cell protein biology',
    },
  });

export const getDiscussionStartedByOpenScienceMemberReminder =
  (): DiscussionCreatedReminder => ({
    id: 'discussion-created-discussion-id-1',
    entity: 'Discussion',
    type: 'Discussion Created by Open Science Member',
    data: {
      manuscriptId: 'manuscript-id-1',
      createdBy: 'Tom Hardy',
      publishedAt: '2025-01-07T16:21:33.824Z',
      manuscriptTeams: 'Team Reminder',
      title: 'Contextual AI models for single-cell protein biology',
    },
  });

export const getDiscussionRepliedToByGranteeReminder =
  (): DiscussionRepliedToReminder => ({
    id: 'discussion-replied-reply-id-1',
    entity: 'Discussion',
    type: 'Discussion Replied To by Grantee',
    data: {
      manuscriptId: 'manuscript-id-1',
      createdBy: 'Tom Hardy',
      publishedAt: '2025-01-07T16:21:33.824Z',
      manuscriptTeams: 'Team Reminder',
      title: 'Contextual AI models for single-cell protein biology',
    },
  });

export const getDiscussionRepliedToByOpenScienceMemberReminder =
  (): DiscussionRepliedToReminder => ({
    id: 'discussion-replied-reply-id-1',
    entity: 'Discussion',
    type: 'Discussion Replied To by Open Science Member',
    data: {
      manuscriptId: 'manuscript-id-1',
      createdBy: 'Tom Hardy',
      publishedAt: '2025-01-07T16:21:33.824Z',
      manuscriptTeams: 'Team Reminder',
      title: 'Contextual AI models for single-cell protein biology',
    },
  });
