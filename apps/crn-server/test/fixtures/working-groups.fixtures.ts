import {
  FetchWorkingGroupsQuery as ContentfulFetchWorkingGroupsQuery,
  FetchWorkingGroupByIdQuery as ContentfulFetchWorkingGroupByIdQuery,
  ContentfulWebhookPayload,
} from '@asap-hub/contentful';
import {
  ListPublicWorkingGroupListResponse,
  PublicWorkingGroupResponse,
  WebhookDetail,
  WorkingGroupDataObject,
  WorkingGroupEvent,
  WorkingGroupLeader,
  WorkingGroupListDataObject,
  WorkingGroupResponse,
} from '@asap-hub/model';
import type { EventBridgeEvent } from 'aws-lambda';

import { createEventBridgeEventMock } from '../helpers/events';
import { FetchWorkingGroupByIdQuery } from '@asap-hub/contentful';

export const getListWorkingGroupsDataObject =
  (): WorkingGroupListDataObject => ({
    total: 2,
    items: [
      getWorkingGroupDataObject(),
      {
        ...getWorkingGroupDataObject(),
        id: '124',
        title: 'Working Group Title 2',
        description: 'Second working gorup description',
        shortText: 'Second working group short text',
        deliverables: [],
        lastModifiedDate: '2021-01-01T00:00:00.000Z',
        externalLink: 'https://www.example.com',
        complete: true,
      },
    ],
  });

export const getWorkingGroupDataObject = (
  data: Partial<WorkingGroupDataObject> = {},
): WorkingGroupDataObject => ({
  id: '123',
  title: 'Working Group Title',
  description: '<p>Working Group Description</p>',
  shortText: 'Working Group Short Text',
  deliverables: [],
  leaders: [],
  members: [],
  complete: false,
  lastModifiedDate: '2021-01-01T00:00:00.000Z',
  externalLink: 'https://example.com',
  calendars: [
    {
      id: 'hub@asap.science',
      color: '#B1365F',
      name: 'ASAP Hub',
      interestGroups: [],
      workingGroups: [],
      crnCalendar: false,
      seminarSeries: false,
    },
  ],
  tags: [],
  researchOutputsIds: [],
  ...data,
});

export const getWorkingGroupResponse = (
  data: Partial<WorkingGroupDataObject> = {},
): WorkingGroupResponse =>
  getWorkingGroupDataObject(data) as WorkingGroupResponse;

export const getWorkingGroupContentfulWebhookDetail = (
  id: string,
): WebhookDetail<ContentfulWebhookPayload<'workingGroups'>> => ({
  resourceId: id,
  metadata: {
    tags: [],
  },
  sys: {
    type: 'Entry',
    id: 'fc496d00-053f-44fd-9bac-68dd9d959848',
    space: {
      sys: {
        type: 'Link',
        linkType: 'Space',
        id: '5v6w5j61tndm',
      },
    },
    environment: {
      sys: {
        id: 'crn-3046',
        type: 'Link',
        linkType: 'Environment',
      },
    },
    contentType: {
      sys: {
        type: 'Link',
        linkType: 'ContentType',
        id: 'workingGroups',
      },
    },
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    revision: 14,
    createdAt: '2023-05-17T13:39:03.250Z',
    updatedAt: '2023-05-18T16:17:36.425Z',
  },
  fields: {
    title: {
      'en-US': 'WG-1',
    },
    complete: {
      'en-US': false,
    },
    description: {
      'en-US': {
        data: {},
        content: [
          {
            data: {},
            content: [
              {
                data: {},
                marks: [],
                value: 'A nice working group!',
                nodeType: 'text',
              },
            ],
            nodeType: 'paragraph',
          },
        ],
        nodeType: 'document',
      },
    },
    shortText: {
      'en-US': 'WG',
    },
    calendars: {
      'en-US': {
        sys: {
          type: 'Link',
          linkType: 'Entry',
          id: '605f89c4-a2f7-4e78-9e12-0f83ff32c4b3',
        },
      },
    },
    deliverables: {
      'en-US': [
        {
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: '4mrJ1Cxkr3utqIE7OUx3pU',
          },
        },
        {
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: '6o83rchawGuC54cCsoZODf',
          },
        },
      ],
    },
    members: {
      'en-US': [
        {
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: '3Rsu13aXSheyBphmOnwEBq',
          },
        },
      ],
    },
  },
});

export const getWorkingGroupContentfulEvent = (
  id: string = 'wg-1',
  eventType: WorkingGroupEvent = 'WorkingGroupsPublished',
): EventBridgeEvent<
  WorkingGroupEvent,
  WebhookDetail<ContentfulWebhookPayload<'workingGroups'>>
> =>
  createEventBridgeEventMock(
    getWorkingGroupContentfulWebhookDetail(id),
    eventType,
    id,
  );

export const getContentfulGraphql = (props = {}) => {
  return {
    WorkingGroups: () => getContentfulGraphqlWorkingGroup(props),
  };
};

export const getContentfulGraphqlWorkingGroup = (
  props: Partial<
    NonNullable<NonNullable<FetchWorkingGroupByIdQuery>['workingGroups']>
  > = {},
): NonNullable<NonNullable<FetchWorkingGroupByIdQuery>['workingGroups']> => ({
  sys: {
    id: '123',
    publishedAt: '2021-01-01T00:00:00.000Z',
  },
  title: 'Working Group Title',
  description: {
    json: {
      data: {},
      content: [
        {
          data: {},
          content: [
            {
              data: {},
              marks: [],
              value: 'Working Group Description',
              nodeType: 'text',
            },
          ],
          nodeType: 'paragraph',
        },
      ],
      nodeType: 'document',
    },
    links: {
      entries: {
        inline: [],
      },
      assets: {
        block: [],
      },
    },
  },
  externalLink: 'https://example.com',
  shortText: 'Working Group Short Text',
  complete: false,
  deliverablesCollection: {
    items: [],
  },
  membersCollection: {
    items: [],
  },
  tagsCollection: {
    items: [],
  },
  calendars: {
    sys: {
      id: 'calendar-id-1',
    },
    name: 'ASAP Hub',
    color: '#B1365F',
    googleCalendarId: 'hub@asap.science',
  },
  lastUpdated: '2021-01-01T00:00:00.000Z',
  ...props,
});

export const getContentfulWorkingGroupsGraphqlResponse =
  (): ContentfulFetchWorkingGroupsQuery => ({
    workingGroupsCollection: {
      total: 1,
      items: [getContentfulGraphqlWorkingGroup()],
    },
  });

export const getContentfulWorkingGroupGraphqlResponse =
  (): ContentfulFetchWorkingGroupByIdQuery => ({
    workingGroups: getContentfulGraphqlWorkingGroup(),
  });

export const getPublicWorkingGroupResponse =
  (): PublicWorkingGroupResponse => ({
    id: '123',
    title: 'Working Group Title',
    description: 'Working Group Description',
    shortDescription: 'Working Group Short Text',
    isWorkingGroupComplete: false,
    deliverables: [
      {
        status: 'Pending',
        description: 'Deliverable 1',
      },
    ],
    tags: [],
    members: [
      {
        id: 'user-id-1',
        firstName: 'João',
        lastName: 'Pinheiro',
        displayName: 'João (John) Pinheiro',
        avatarUrl: 'https://image/user-1',
        role: 'Chair',
      },
      {
        id: 'user-id-2',
        firstName: 'Padmini',
        lastName: 'Kommareddy',
        displayName: 'Padmini Kommareddy',
        avatarUrl: 'https://image/user-2',
        role: 'Project Manager',
      },
    ],
    researchOutputsIds: [
      'research-output-id-1',
      'research-output-id-2',
      'research-output-id-3',
    ],
  });

export const getListPublicWorkingGroupResponse =
  (): ListPublicWorkingGroupListResponse => {
    const {
      researchOutputsIds,
      deliverables,
      tags,
      members,
      isWorkingGroupComplete,
      ...workingGroup
    } = getPublicWorkingGroupResponse();
    return {
      total: 1,
      items: [
        {
          ...workingGroup,
          members:
            members.map((member) => ({
              ...member,
              role: member.role as WorkingGroupLeader['role'],
            })) || [],
        },
      ],
    };
  };
