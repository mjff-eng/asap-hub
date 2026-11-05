import {
  GrantType,
  ListPublicOutputResponse,
  ListResearchOutputResponse,
  ListResponse,
  PublicResearchOutputResponse,
  ResearchOutputCreateDataObject,
  ResearchOutputDataObject,
  ResearchOutputDraftDataObject,
  ResearchOutputEvent,
  ResearchOutputGrantDocument,
  ResearchOutputPostRequest,
  ResearchOutputPublishedDataObject,
  ResearchOutputPutRequest,
  ResearchOutputResponse,
  ResearchOutputUpdateDataObject,
  WebhookDetail,
  TeamType,
} from '@asap-hub/model';
import {
  ContentfulWebhookPayload,
  GrantDocumentContentFragment,
  ResearchOutputsContentFragment,
} from '@asap-hub/contentful';
import {
  ResearchOutputCreateData,
  ResearchOutputUpdateData,
} from '../../src/controllers/research-output.controller';
import { fetchExpectation } from './users.fixtures';
import { EventBridgeEvent } from 'aws-lambda';
import { createEventBridgeEventMock } from '../helpers/events';

export const getResearchOutputDataObject =
  (): ResearchOutputPublishedDataObject => ({
    id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
    created: '2020-09-23T16:34:26.842Z',
    documentType: 'Lab Material',
    type: '3D Printing',
    addedDate: '2021-05-21T13:18:31Z',
    title: 'Test Proposal 1234',
    description: '<p>Text</p>',
    descriptionMD: 'Text MD',
    shortDescription: 'short description',
    authors: fetchExpectation.items,
    teams: [
      { id: 'team-id-0', displayName: 'Team A', teamType: 'Discovery Team' },
    ],
    relatedResearch: [
      {
        id: 'related-research-id-0',
        title: 'Related Research1',
        type: 'Report',
        documentType: 'Bioinformatics',
        teams: [
          {
            id: 'team-id-1',
            displayName: 'Team B',
            teamType: 'Discovery Team',
          },
        ],
        workingGroups: [
          {
            id: 'working-group-id-1',
            title: 'Working Group B',
          },
        ],
        isOwnRelatedResearchLink: true,
      },
      {
        id: 'related-referencing-research-id',
        title: 'Related Research2',
        type: 'Report',
        documentType: 'Bioinformatics',
        teams: [
          {
            displayName: 'Team B',
            id: 'team-id-1',
            teamType: 'Discovery Team',
          },
        ],
        workingGroups: [
          {
            id: 'working-group-id-1',
            title: 'Working Group B',
          },
        ],
        isOwnRelatedResearchLink: false,
      },
    ],
    relatedEvents: [
      {
        id: 'related-event-id-0',
        title: 'Related Event 1',
        endDate: '2021-05-21T13:18:31.000Z',
      },
    ],
    publishDate: '2021-05-21T13:18:31Z',
    labCatalogNumber: 'http://example.com',
    rrid: 'RRID:AB_90755',
    lastUpdatedPartial: '2020-09-23T16:34:26.842Z',
    usageNotes: 'some access instructions',
    sharingStatus: 'Network Only',
    asapFunded: true,
    usedInPublication: false,
    contactEmails: [],
    impact: { id: 'impact-id-1', name: 'Impact 1' },
    categories: [{ id: 'category-id-1', name: 'Category 1' }],
    labs: [
      { id: '99c78dd7-627e-4fbd-aaec-d1977895189e', name: 'Test' },
      { id: 'cd7be402-84d7-4d21-a360-82e2695f2dd9', name: 'mike' },
    ],
    publishingEntity: 'Team',
    workingGroups: [],
    project: undefined,
    methods: ['Activity Assay'],
    organisms: ['Rat'],
    environments: ['In Vitro'],
    subtype: 'Metabolite',
    keywords: ['Keyword1'],
    published: true,
    isInReview: false,
    versions: [
      {
        addedDate: '',
        id: '1',
        title: 'Version 1',
        documentType: 'Article',
        type: 'Preprint',
        link: 'https://version1.com',
        rrid: 'RRID',
        accession: 'Accession',
        doi: 'Version DOI',
      },
    ],
  });
export const getDraftResearchOutputDataObject =
  (): ResearchOutputDraftDataObject => ({
    ...getResearchOutputDataObject(),
    published: false,
  });
export const getListResearchOutputDataObject =
  (): ListResponse<ResearchOutputDataObject> => ({
    total: 1,
    items: [getResearchOutputDataObject()],
  });

export const getResearchOutputResponse = (): ResearchOutputResponse => {
  const researchOutput = getResearchOutputDataObject();

  return {
    ...researchOutput,
    workingGroups: researchOutput.workingGroups[0]
      ? [researchOutput.workingGroups[0]]
      : undefined,
  };
};

export const getListResearchOutputResponse = ({
  published = true,
} = {}): ListResearchOutputResponse => ({
  total: 1,
  items: [getResearchOutputResponse()],
});

export const getPublicResearchOutputResponse =
  (): PublicResearchOutputResponse => {
    const researchOutput = getResearchOutputResponse();
    return {
      id: researchOutput.id,
      sharingStatus: 'Public',
      asapFunded: true,
      teams: researchOutput.teams.map((team) => ({
        id: team.id,
        displayName: team.displayName,
        teamType: team.teamType as TeamType,
      })),
      authors: researchOutput.authors.map((author) => ({
        id: author.email && author.id,
        name: author.displayName,
      })),
      title: researchOutput.title,
      description: researchOutput.descriptionMD,
      shortDescription: researchOutput.shortDescription,
      tags: [
        ...researchOutput.methods,
        ...researchOutput.organisms,
        ...researchOutput.environments,
        ...(researchOutput.subtype ? [researchOutput.subtype] : []),
        ...researchOutput.keywords,
      ],
      hyperlink: researchOutput.link,
      type: researchOutput.type,
      documentType: researchOutput.documentType,
      persistentIdentifier: researchOutput.doi,
      relatedResearch: researchOutput.relatedResearch,
      created: researchOutput.created,
      finalPublishDate:
        researchOutput.type === 'Published'
          ? researchOutput.publishDate
          : undefined,
      preprintPublishDate:
        researchOutput.type === 'Preprint'
          ? researchOutput.publishDate
          : undefined,
      lastModifiedDate: researchOutput.lastUpdatedPartial,
      impact: researchOutput.impact?.name,
      categories: (researchOutput.categories ?? []).map(
        (category) => category.name,
      ),
      workingGroup: researchOutput.workingGroups?.[0] && {
        id: researchOutput.workingGroups[0].id,
        title: researchOutput.workingGroups[0].title,
      },
    };
  };

export const getPublicListResearchOutputResponse = ({
  published = true,
} = {}): ListPublicOutputResponse => ({
  total: 1,
  items: [getPublicResearchOutputResponse()],
});

export const getResearchOutputPostRequest = (): ResearchOutputPostRequest => {
  const {
    id: _,
    created: _created,
    contactEmails: _contactEmails,
    lastUpdatedPartial: _lastUpdatedPartial,
    doi: _doi,
    accession: _accession,
    addedDate: _addedDate,
    labs,
    authors,
    teams,
    workingGroups,
    project: _project,
    relatedResearch,
    published: _published,
    relatedEvents,
    versions: _versions,
    publishingEntity: _publishingEntity,
    ...researchOutputResponse
  } = getResearchOutputResponse();
  return {
    ...researchOutputResponse,
    description: '<p>Text</p>',
    descriptionMD: 'Text MD',
    shortDescription: 'short description',
    link: 'http://a.link',
    type: 'Software',
    labs: labs.map(({ id }) => id),
    authors: authors.map(({ id }) => ({ userId: id })),
    teams: teams.map(({ id }) => id),
    relatedResearch: relatedResearch.map(({ id }) => id),
    relatedEvents: relatedEvents.map(({ id }) => id),
    workingGroups: workingGroups ? workingGroups.map(({ id }) => id) : [],
    published: true,
    impact: 'impact-id-1',
    categories: ['category-id-1'],
  };
};

export const getResearchOutputPutRequest = (): ResearchOutputPutRequest => ({
  ...getResearchOutputPostRequest(),
  isInReview: false,
});

export const getResearchOutputCreateData = (): ResearchOutputCreateData => ({
  ...getResearchOutputPostRequest(),
  createdBy: 'userId',
});

export const getResearchOutputCreateDataObject =
  (): ResearchOutputCreateDataObject => {
    const {
      teams,
      labs,
      authors,
      relatedResearch,
      relatedEvents,
      methods: _methods,
      environments: _environments,
      organisms: _organisms,
      subtype: _subtype,
      keywords: _keywords,
      id: _id,
      lastUpdatedPartial: _lastUpdatedPartial,
      created: _created,
      contactEmails: _contactEmails,
      workingGroups: _workingGroups,
      published: _published,
      versions: _versions,
      publishingEntity: _publishingEntity,
      impact: _impact,
      categories: _categories,
      project: _project,
      ...researchOutputPostRequest
    } = getResearchOutputResponse();

    return {
      ...researchOutputPostRequest,
      createdBy: 'userId',
      authors: authors.map(({ id }) => ({ userId: id })),
      teamIds: teams.map(({ id }) => id),
      labIds: labs.map(({ id }) => id),
      relatedResearchIds: relatedResearch?.map(({ id }) => id) || [],
      relatedEventIds: relatedEvents?.map(({ id }) => id) || [],
      methodIds: ['ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca'],
      organismIds: ['d77a7607-7b9a-4ef1-99ee-c389b33ea95b'],
      environmentIds: ['8a936e45-6d5e-42a6-8acd-b849ab10f3f8'],
      subtypeId: 'dd0da578-5573-4758-b1db-43a078f5076e',
      keywordIds: ['0368cc55-b2cb-484f-8f25-c1e37975ff32'],
      link: 'http://a.link',
      type: 'Software',
      workingGroups: [],
      categories: ['category-id-1'],
      impact: 'impact-id-1',
    };
  };

export const getResearchOutputUpdateDataObject =
  (): ResearchOutputUpdateDataObject => {
    const {
      createdBy: _,
      workingGroups,
      ...researchOutputCreateDataObject
    } = getResearchOutputCreateDataObject();

    return {
      ...researchOutputCreateDataObject,
      versions: [],
      workingGroups: workingGroups || [],
      updatedBy: 'userId',
      isInReview: false,
    };
  };

export const getResearchOutputUpdateData = (): ResearchOutputUpdateData => ({
  ...getResearchOutputPutRequest(),
  updatedBy: 'userId',
});

export const getContentfulResearchOutputGraphqlResponse =
  (): ResearchOutputsContentFragment => ({
    sys: {
      id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      publishedVersion: 1,
    },
    title: 'Test Proposal 1234',
    documentType: 'Lab Material',
    description: {
      json: {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            data: {},
            content: [{ nodeType: 'text', value: 'Text', marks: [], data: {} }],
          },
        ],
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
    descriptionMd: 'Text MD',
    shortDescription: 'short description',
    usageNotes: 'Usage Notes',
    link: null,
    addedDate: '2021-05-21T13:18:31Z',
    publishDate: '2021-05-21T13:18:31Z',
    createdDate: '2020-09-23T16:34:26.842Z',
    labCatalogNumber: 'http://example.com',
    doi: null,
    accession: null,
    rrid: 'RRID:AB_90755',
    lastUpdatedPartial: '2020-09-23T16:34:26.842Z',
    authorsCollection: { items: [] },
    sharingStatus: 'Network Only',
    asapFunded: 'Yes',
    usedInAPublication: 'No',
    type: '3D Printing',
    statusChangedBy: null,
    relatedResearchCollection: {
      items: [
        {
          sys: {
            id: 'related-research-id-0',
          },
          title: 'Related Research1',
          type: 'Report',
          documentType: 'Bioinformatics',
          teamsCollection: {
            items: [
              {
                sys: {
                  id: 'team-id-1',
                },
                displayName: 'Team B',
              },
            ],
          },
          workingGroup: {
            sys: {
              id: 'working-group-id-1',
            },
            title: 'Working Group B',
          },
        },
      ],
    },
    linkedFrom: {
      researchOutputsCollection: {
        items: [
          {
            sys: {
              id: 'related-referencing-research-id',
            },
            title: 'Related Research2',
            type: 'Report',
            documentType: 'Bioinformatics',
            teamsCollection: {
              items: [
                {
                  sys: {
                    id: 'team-id-1',
                  },
                  displayName: 'Team B',
                },
              ],
            },
            workingGroup: {
              sys: {
                id: 'working-group-id-1',
              },
              title: 'Working Group B',
            },
          },
        ],
      },
    },
    relatedEventsCollection: {
      items: [
        {
          sys: {
            id: 'related-event-id-0',
          },
          title: 'Related Event 1',
          endDate: '2021-05-21T13:18:31.000Z',
        },
      ],
    },
    labsCollection: {
      items: [
        {
          sys: {
            id: '99c78dd7-627e-4fbd-aaec-d1977895189e',
          },
          name: 'Test',
        },
        {
          sys: {
            id: 'cd7be402-84d7-4d21-a360-82e2695f2dd9',
          },
          name: 'mike',
        },
      ],
    },
    teamsCollection: {
      items: [
        {
          sys: {
            id: 'team-id-0',
          },
          displayName: 'Team A',
          teamType: 'Discovery Team',
          researchTheme: {
            name: 'PD Functional Genomics',
          },
        },
      ],
    },
    methodsCollection: {
      items: [
        {
          name: 'Activity Assay',
        },
      ],
    },
    organismsCollection: {
      items: [
        {
          name: 'Rat',
        },
      ],
    },
    environmentsCollection: {
      items: [
        {
          name: 'In Vitro',
        },
      ],
    },
    subtype: {
      name: 'Metabolite',
    },
    keywordsCollection: {
      items: [
        {
          name: 'Keyword1',
        },
      ],
    },
    versionsCollection: {
      items: [
        {
          sys: {
            id: '1',
          },
          title: 'Version 1',
          documentType: 'Article',
          type: 'Preprint',
          link: 'https://version1.com',
          rrid: 'RRID',
          accession: 'Accession',
          doi: 'Version DOI',
        },
      ],
    },
    workingGroup: null,
  });

export const getContentfulResearchOutputGrantDocumentGraphqlResponse = ({
  grantType = 'original',
  withSupplementGrant = true,
  withGrantPdf = true,
  projectType = 'Discovery Project',
}: {
  grantType?: GrantType;
  withSupplementGrant?: boolean;
  withGrantPdf?: boolean;
  projectType?: string | null;
} = {}): GrantDocumentContentFragment => {
  const projectsCollection = {
    items: [
      {
        sys: { id: 'project-id' },
        title: 'Project title',
        projectType,
        originalGrant: 'Original grant overview',
        startDate: '2021-01-01T00:00:00.000Z',
        endDate: '2024-12-31T00:00:00.000Z',
        membersCollection: {
          items: [
            {
              projectMember: {
                __typename: 'Teams' as const,
                sys: { id: 'project-team-id' },
                displayName: 'Project Team',
              },
            },
            { projectMember: { __typename: 'Users' as const } },
          ],
        },
        proposal: {
          sys: { id: 'original-output-id' },
          title: 'Original grant title',
        },
        supplementGrant: withSupplementGrant
          ? {
              title: 'Supplement grant title',
              description: 'Supplement grant overview',
              startDate: '2025-01-01T00:00:00.000Z',
              endDate: '2026-12-31T00:00:00.000Z',
              proposal: { sys: { id: 'supplement-output-id' } },
            }
          : null,
      },
    ],
  };

  return {
    grantPdf: withGrantPdf
      ? { url: 'https://assets.ctfassets.net/grant.pdf' }
      : null,
    linkedFrom:
      grantType === 'original'
        ? { projectsCollection, supplementGrantCollection: { items: [] } }
        : {
            projectsCollection: { items: [] },
            supplementGrantCollection: {
              items: [{ linkedFrom: { projectsCollection } }],
            },
          },
  };
};

export const getResearchOutputGrantDocument =
  (): ResearchOutputGrantDocument => ({
    grantType: 'original',
    project: {
      id: 'project-id',
      title: 'Project title',
      projectType: 'Discovery Project',
      teams: [{ id: 'project-team-id', displayName: 'Project Team' }],
    },
    original: {
      researchOutputId: 'original-output-id',
      title: 'Original grant title',
      description: 'Original grant overview',
      startDate: '2021-01-01T00:00:00.000Z',
      endDate: '2024-12-31T00:00:00.000Z',
    },
    supplement: {
      researchOutputId: 'supplement-output-id',
      title: 'Supplement grant title',
      description: 'Supplement grant overview',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
    },
    pdfUrl: 'https://assets.ctfassets.net/grant.pdf',
  });

export const getResearchOutputContentfulWebhookDetail = (
  id: string,
): WebhookDetail<ContentfulWebhookPayload<'researchOutputs'>> => ({
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
        id: 'researchOutputs',
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
  fields: {},
});

export const getResearchOutputEvent = (
  id: string,
  eventType: ResearchOutputEvent,
): EventBridgeEvent<
  ResearchOutputEvent,
  WebhookDetail<ContentfulWebhookPayload<'researchOutputs'>>
> =>
  createEventBridgeEventMock(
    getResearchOutputContentfulWebhookDetail(id),
    eventType,
    id,
  );
