import {
  Entry,
  Environment,
  FETCH_RESEARCH_OUTPUT_BY_ID,
  FetchResearchOutputByIdQuery,
  getContentfulGraphqlClientMockServer,
  patch,
} from '@asap-hub/contentful';
import { ResearchOutputDataObject } from '@asap-hub/model';
import {
  mapOutputVersions,
  ResearchOutputContentfulDataProvider,
} from '../../../src/data-providers/contentful/research-output.data-provider';
import { getEntry } from '../../fixtures/contentful.fixtures';
import {
  getContentfulResearchOutputGrantDocumentGraphqlResponse,
  getContentfulResearchOutputGraphqlResponse,
  getResearchOutputCreateDataObject,
  getResearchOutputDataObject,
  getResearchOutputGrantDocument,
  getResearchOutputUpdateDataObject,
} from '../../fixtures/research-output.fixtures';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../../mocks/contentful-rest-client.mock';

jest.mock('@asap-hub/contentful', () => ({
  ...jest.requireActual('@asap-hub/contentful'),
  patch: jest.fn().mockResolvedValue(undefined),
}));

describe('Research Outputs Data Provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const contentfulGraphqlPreviewClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const researchOutputDataProvider = new ResearchOutputContentfulDataProvider(
    contentfulGraphqlClientMock,
    contentfulGraphqlPreviewClientMock,
    contentfulRestClientMock,
  );

  const researchOutputGraphqlResponse =
    getContentfulResearchOutputGraphqlResponse();
  const contentfulGraphqlClientMockServer =
    getContentfulGraphqlClientMockServer({
      ResearchOutputs: () => ({
        ...researchOutputGraphqlResponse,
        relatedResearchCollection: () =>
          researchOutputGraphqlResponse.relatedResearchCollection,
        linkedFrom: () => researchOutputGraphqlResponse.linkedFrom,
      }),
      ResearchOutputsCollection: () => {
        return {
          total: 1,
          items: [{}],
        };
      },
    });

  const researchOutputDataProviderMockGraphql =
    new ResearchOutputContentfulDataProvider(
      contentfulGraphqlClientMockServer,
      contentfulGraphqlClientMockServer,
      contentfulRestClientMock,
    );

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('fetch', () => {
    test('can call from mock server', async () => {
      await researchOutputDataProviderMockGraphql.fetch({});
    });

    test('Should return an empty result when the client returns an empty array of data', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputsCollection: {
          total: 0,
          items: [],
        },
      });

      const result = await researchOutputDataProvider.fetch({
        take: 10,
        skip: 5,
      });

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return an empty result when the client returns a response with query property set to null', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputsCollection: null,
      });

      const result = await researchOutputDataProvider.fetch({
        take: 10,
        skip: 5,
      });

      expect(result).toEqual({ total: 0, items: [] });
    });

    describe('Parameters', () => {
      describe('without search param', () => {
        beforeEach(() => {
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            researchOutputsCollection: null,
          });
          contentfulGraphqlPreviewClientMock.request.mockResolvedValueOnce({
            researchOutputsCollection: null,
          });
        });

        test('Should pass default pagination parameters if not defined', async () => {
          await researchOutputDataProvider.fetch({});

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              limit: 8,
              skip: 0,
            }),
          );
        });

        test('Should pass the pagination parameters as expected', async () => {
          await researchOutputDataProvider.fetch({ take: 13, skip: 7 });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              limit: 13,
              skip: 7,
            }),
          );
        });

        test('Should pass the parameters to fetch drafts as expected', async () => {
          await researchOutputDataProvider.fetch({
            filter: {
              status: 'draft',
            },
            includeDrafts: true,
          });

          expect(
            contentfulGraphqlPreviewClientMock.request,
          ).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                sys: {
                  publishedVersion_exists: false,
                },
              },
              preview: true,
            }),
          );
        });

        test('Should pass the parameters to filter by team as expected', async () => {
          await researchOutputDataProvider.fetch({
            filter: {
              teamId: 'team-0',
            },
            includeDrafts: true,
          });

          expect(
            contentfulGraphqlPreviewClientMock.request,
          ).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                teams: {
                  sys: {
                    id: 'team-0',
                  },
                },
              },
            }),
          );
        });

        test('Should pass the parameters to filter by working group as expected', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              workingGroupId: 'wg-0',
            },
            includeDrafts: true,
          });

          expect(
            contentfulGraphqlPreviewClientMock.request,
          ).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                workingGroup: {
                  sys: {
                    id: 'wg-0',
                  },
                },
              },
            }),
          );
        });

        test('Should pass the parameters to filter by project as expected', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              projectId: 'project-0',
            },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                project: {
                  sys: {
                    id: 'project-0',
                  },
                },
              },
            }),
          );
        });

        test('Should pass the parameters to filter by document type as expected', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              documentType: 'Preprint',
            },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                documentType: 'Preprint',
              },
            }),
          );
        });

        test('Should pass the parameters to filter by source as expected', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              source: 'Working Group',
            },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                OR: [
                  {
                    workingGroup_exists: true,
                  },
                ],
              },
            }),
          );
        });

        test('Should pass the parameters to filter by asapFunded and sharing status as expected', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              sharingStatus: 'Public',
              asapFunded: 'Yes',
            },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                sharingStatus: 'Public',
                asapFunded: 'Yes',
              },
            }),
          );
        });

        test('Should pass the parameters to filter by relatedManuscriptVersion as expected', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              relatedManuscriptVersion: 'manuscript-version-1',
            },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                relatedManuscriptVersion: {
                  sys: { id: 'manuscript-version-1' },
                },
              },
            }),
          );
        });

        test('Should pass the parameters to filter by source as expected when source is an array', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              source: ['Team', 'Working Group'],
            },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                OR: [
                  {
                    workingGroup_exists: true,
                  },
                  {
                    AND: [
                      { workingGroup_exists: false },
                      { project_exists: false },
                    ],
                  },
                ],
              },
            }),
          );
        });

        test('Should pass the parameters to filter by document type as expected when document type is an array', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              documentType: ['Preprint', 'Report'],
            },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                documentType_in: ['Preprint', 'Report'],
              },
            }),
          );
        });

        test('Should pass the parameters to filter related research by asapFunded and sharing status', async () => {
          await researchOutputDataProvider.fetch({
            take: 13,
            skip: 7,
            filter: {
              sharingStatus: 'Public',
              asapFunded: 'Yes',
            },
            relatedResearchFilter: {
              sharingStatus: 'Public',
              asapFunded: 'Yes',
            },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                sharingStatus: 'Public',
                asapFunded: 'Yes',
              },
              relatedResearchWhere: {
                sharingStatus: 'Public',
                asapFunded: 'Yes',
              },
            }),
          );
        });
      });

      describe('with a search term', () => {
        beforeEach(() => {
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            researchOutputsCollection: null,
          });
        });
        test('adds keyword and title search parameters for each word in the query', async () => {
          await researchOutputDataProvider.fetch({
            search: 'test search',
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              where: {
                OR: [
                  { title_contains: 'test' },
                  { title_contains: 'search' },
                  { keywords: { name: 'test' } },
                  { keywords: { name: 'search' } },
                ],
              },
            }),
          );
        });
      });
    });
  });

  describe('fetchById', () => {
    test('can call from mock server', async () => {
      await researchOutputDataProviderMockGraphql.fetchById('1');
    });

    test('returns null if query does not return a result', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValue({
        researchOutputs: null,
      });
      contentfulGraphqlPreviewClientMock.request.mockResolvedValue({
        researchOutputs: null,
      });
      const result = await researchOutputDataProvider.fetchById('1');
      expect(result).toBeNull();
    });

    test('looks for published version first, and then draft if there is no published version', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs: null,
      });
      contentfulGraphqlPreviewClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });
      await researchOutputDataProvider.fetchById('1');

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(1);
      expect(contentfulGraphqlPreviewClientMock.request).toHaveBeenCalledTimes(
        1,
      );
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: '1', preview: false }),
      );
      expect(contentfulGraphqlPreviewClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: '1', preview: true }),
      );
    });

    test('Should default missing team reference to an empty array of teams', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.teamsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.teams).toEqual([]);
    });

    test('Should default team displayName to an empty string when not present', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.teamsCollection!.items[0]!.displayName = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.teams[0]?.displayName).toEqual('');
    });

    test('Should parse team project from linked project membership', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.teamsCollection!.items[0]!.linkedFrom = {
        projectMembershipCollection: {
          items: [
            {
              linkedFrom: {
                projectsCollection: {
                  items: [
                    {
                      sys: { id: 'team-project-id' },
                      title: 'Team Discovery Project',
                      projectId: 'discovery-project',
                    },
                  ],
                },
              },
            },
          ],
        },
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.teams[0]).toEqual({
        id: 'team-id-0',
        displayName: 'Team A',
        teamType: 'Discovery Team',
        project: {
          id: 'team-project-id',
          title: 'Team Discovery Project',
          projectId: 'discovery-project',
        },
      });
    });

    test('Should omit team project when team has no linked project membership', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.teamsCollection!.items[0]!.linkedFrom = {
        projectMembershipCollection: { items: [] },
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.teams[0]?.project).toBeUndefined();
    });

    test('Should default type to Grant Document and title to an empty string when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.documentType = null;
      researchOutputs.title = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.title).toEqual('');
      expect(result!.documentType).toEqual('Grant Document');
    });

    test('Should default missing working group reference to an empty array of teams', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.teamsCollection = {
        items: [],
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.teams).toEqual([]);
    });

    test('Should default missing working group reference to an empty array', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.workingGroup = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.workingGroups).toEqual([]);
    });

    test('Should default missing research theme to an empty array', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.teamsCollection!.items[0]!.researchTheme = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.researchTheme).toEqual([]);
    });

    test('Should default missing categories to an empty array', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.categoriesCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.categories).toEqual([]);
    });

    test('Should parse working group reference to array', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.workingGroup = {
        sys: { id: 'wg-1' },
        title: 'Working Group 1',
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.workingGroups).toEqual([
        { id: 'wg-1', title: 'Working Group 1' },
      ]);
    });

    test('Should parse project reference', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.project = {
        sys: { id: 'project-id-1' },
        title: 'Discovery Project Alpha',
        projectType: 'Discovery Project',
        projectId: 'discovery-project',
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.project).toEqual({
        id: 'project-id-1',
        title: 'Discovery Project Alpha',
        projectType: 'Discovery Project',
        projectId: 'discovery-project',
      });
    });

    test('Should default project title to an empty string when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.project = {
        sys: { id: 'project-id-1' },
        title: null,
        projectType: 'Resource Project',
        projectId: 'resource-project',
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.project).toEqual({
        id: 'project-id-1',
        title: '',
        projectType: 'Resource Project',
        projectId: 'resource-project',
      });
    });

    test('Should default sharingStatus to Network Only when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.sharingStatus = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.sharingStatus).toEqual('Network Only');
    });

    test('Should default asapFunded to undefined when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.asapFunded = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.asapFunded).not.toBeDefined();
    });

    test('Should default asapFunded "Not Sure" option to undefined', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.asapFunded = 'Not Sure';
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.asapFunded).not.toBeDefined();
    });

    test('Should default usedInPublication to undefined when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.usedInAPublication = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.usedInPublication).not.toBeDefined();
    });

    test('Should default usedInPublication "Not Sure" option to undefined', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.usedInAPublication = 'Not Sure';
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.usedInPublication).not.toBeDefined();
    });

    test('Should default authors to an empty array when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.authorsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.authors).toEqual([]);
    });

    test('Should default related research to an empty array when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.relatedResearchCollection = null;
      researchOutputs.linkedFrom!.researchOutputsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.relatedResearch).toEqual([]);
    });

    test('Should combine inbound and outbound related research links', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs: {
          ...getContentfulResearchOutputGraphqlResponse(),
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
                },
              ],
            },
          },
        },
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.relatedResearch).toMatchObject([
        { id: 'related-research-id-0' },
        { id: 'related-referencing-research-id' },
      ]);
    });

    test('Should set related research document types to "Grant Document" if not defined', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs!.relatedResearchCollection!.items[0]!.documentType = null;
      researchOutputs!.linkedFrom!.researchOutputsCollection!.items[0]!.documentType =
        null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.relatedResearch).toMatchObject([
        { id: 'related-research-id-0', documentType: 'Grant Document' },
        {
          id: 'related-referencing-research-id',
          documentType: 'Grant Document',
        },
      ]);
    });

    test('Should default related events to an empty array when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.relatedEventsCollection = null;
      researchOutputs.linkedFrom!.researchOutputsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.relatedEvents).toEqual([]);
    });

    test('Should default keywords to an empty array when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.keywordsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.keywords).toEqual([]);
    });

    test('Should default methods to an empty array when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.methodsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.methods).toEqual([]);
    });

    test('Should default organisms to an empty array when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.organismsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.organisms).toEqual([]);
    });

    test('Should default environments to an empty array when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.environmentsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.environments).toEqual([]);
    });

    test('Should default labs to an empty array when missing', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.labsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.labs).toEqual([]);
    });

    test('Should skip the lab when the name is empty', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.labsCollection!.items = [
        {
          sys: {
            id: 'lab-id-1',
          },
          name: null,
        },
        {
          sys: {
            id: 'lab-id-2',
          },
          name: 'lab name',
        },
      ];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      expect(result!.labs).toEqual([
        {
          id: 'lab-id-2',
          name: 'lab name',
        },
      ]);
    });

    test('Should return a mix of internal and external authors', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      const user1 = {
        sys: { id: 'user-id-0' },
        firstName: 'Test',
        lastName: 'User',
        email: 'user0@example.com',
        onboarded: true,
        orcid: '1111-2222-3333-4444',
        avatar: {
          url: 'https://example.com/user-id-0',
        },
        alumniSinceDate: null,
        __typename: 'Users',
      } as InternalUser;
      const user2 = {
        sys: { id: 'user-id-1' },
        firstName: 'Test',
        lastName: 'User',
        email: 'user1@example.com',
        onboarded: true,
        orcid: '1111-2222-3333-4444',
        avatar: {
          url: 'https://example.com/user-id-1',
        },
        alumniSinceDate: '2023-01-01T12:00:00.000Z',
        __typename: 'Users',
      } as InternalUser;
      const externalAuthor = {
        sys: {
          id: '3099015c-c9ed-40fd-830a-8fe1b6ec0482',
        },
        name: 'test external author',
        orcid: '23423423',
        __typename: 'ExternalAuthors',
      } as ExternalUser;
      researchOutputs.authorsCollection!.items = [user1, externalAuthor, user2];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      const expectedAuthorsResponse: ResearchOutputDataObject['authors'] = [
        {
          id: 'user-id-0',
          displayName: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          email: 'user0@example.com',
          avatarUrl: 'https://example.com/user-id-0',
          alumniSinceDate: undefined,
        },
        {
          id: '3099015c-c9ed-40fd-830a-8fe1b6ec0482',
          displayName: 'test external author',
          orcid: '23423423',
        },
        {
          id: 'user-id-1',
          displayName: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          email: 'user1@example.com',
          avatarUrl: 'https://example.com/user-id-1',
          alumniSinceDate: '2023-01-01T12:00:00.000Z',
        },
      ];

      expect(result!.authors).toEqual(expectedAuthorsResponse);
    });

    test('Should not return the non-onboarded authors', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      const user1 = {
        sys: { id: 'user-id-0' },
        firstName: 'Test',
        lastName: 'User',
        onboarded: false,
        orcid: '1111-2222-3333-4444',
        email: 'user0@example.com',
        avatar: {
          url: 'https://example.com/user-id-0',
        },
        __typename: 'Users',
      } as InternalUser;
      const user2 = {
        sys: { id: 'user-id-1' },
        firstName: 'Test',
        lastName: 'User',
        onboarded: true,
        orcid: '1111-2222-3333-4444',
        email: 'user1@example.com',
        avatar: {
          url: 'https://example.com/user-id-1',
        },
        __typename: 'Users',
      } as InternalUser;
      const externalAuthor = {
        sys: {
          id: '3099015c-c9ed-40fd-830a-8fe1b6ec0482',
        },
        name: 'test external author',
        orcid: '23423423',
        __typename: 'ExternalAuthors',
      } as ExternalUser;
      researchOutputs.authorsCollection!.items = [user1, externalAuthor, user2];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      const result = await researchOutputDataProvider.fetchById('1');

      const expectedAuthorsResponse: ResearchOutputDataObject['authors'] = [
        {
          id: '3099015c-c9ed-40fd-830a-8fe1b6ec0482',
          displayName: 'test external author',
          orcid: '23423423',
        },
        {
          id: 'user-id-1',
          displayName: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          email: 'user1@example.com',
          avatarUrl: 'https://example.com/user-id-1',
        },
      ];

      expect(result!.authors).toEqual(expectedAuthorsResponse);
    });

    test('Should include the emails of unique active team PMs', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();
      researchOutputs.teamsCollection = {
        items: [
          {
            sys: {
              id: 'team-0',
            },
            linkedFrom: {
              teamMembershipCollection: {
                items: [
                  {
                    role: 'Key Contributor',
                    inactiveSinceDate: null,
                    linkedFrom: {
                      usersCollection: {
                        items: [{ email: 'kc@example.com' }],
                      },
                    },
                  },
                  {
                    role: 'Project Manager',
                    inactiveSinceDate: null,
                    linkedFrom: {
                      usersCollection: {
                        items: [{ email: 'pm1@example.com' }],
                      },
                    },
                  },
                  {
                    role: 'Project Manager',
                    inactiveSinceDate: null,
                    linkedFrom: {
                      usersCollection: {
                        items: [{ email: 'pm2@example.com' }],
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            sys: {
              id: 'team-1',
            },
            linkedFrom: {
              teamMembershipCollection: {
                items: [
                  {
                    role: 'Project Manager',
                    inactiveSinceDate: null,
                    linkedFrom: {
                      usersCollection: {
                        items: [{ email: 'pm2@example.com' }],
                      },
                    },
                  },
                  {
                    role: 'Project Manager',
                    inactiveSinceDate: '2022-01-01T12:00:00.000Z',
                    linkedFrom: {
                      usersCollection: {
                        items: [{ email: 'pm3@example.com' }],
                      },
                    },
                  },
                  {
                    role: 'Project Manager',
                    inactiveSinceDate: null,
                    linkedFrom: {
                      usersCollection: {
                        items: [{ email: 'pm4@example.com' }],
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });
      const result = await researchOutputDataProvider.fetchById('output-id');

      expect(result!.contactEmails).toEqual([
        'pm1@example.com',
        'pm2@example.com',
        'pm4@example.com',
      ]);
    });

    test('Should include the list of versions', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });
      const expectedVersionsResponse = getResearchOutputDataObject().versions;

      const result = await researchOutputDataProvider.fetchById('1');
      expect(result?.versions).toEqual(expectedVersionsResponse);
    });

    test('Should pass the parameters to filter related research by asapFunded and sharing status', async () => {
      const researchOutputs = getContentfulResearchOutputGraphqlResponse();

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        researchOutputs,
      });

      await researchOutputDataProvider.fetchById('1', {
        relatedResearchFilter: {
          sharingStatus: 'Public',
          asapFunded: 'Yes',
        },
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: '1',
          relatedResearchWhere: {
            sharingStatus: 'Public',
            asapFunded: 'Yes',
          },
        }),
      );
    });

    describe('grant document', () => {
      const getGrantDocumentOutput = (
        grantData = getContentfulResearchOutputGrantDocumentGraphqlResponse(),
      ) => {
        const output = getContentfulResearchOutputGraphqlResponse();
        return {
          ...output,
          ...grantData,
          documentType: 'Grant Document',
          linkedFrom: { ...output.linkedFrom, ...grantData.linkedFrom },
        };
      };

      test('can call the query with grant data from mock server', async () => {
        const grantDocumentOutput = getGrantDocumentOutput();
        const grantDocumentMockServer = getContentfulGraphqlClientMockServer({
          ResearchOutputs: () => ({
            ...grantDocumentOutput,
            relatedResearchCollection: () =>
              researchOutputGraphqlResponse.relatedResearchCollection,
            linkedFrom: () => grantDocumentOutput.linkedFrom,
          }),
        });
        const dataProvider = new ResearchOutputContentfulDataProvider(
          grantDocumentMockServer,
          grantDocumentMockServer,
          contentfulRestClientMock,
        );

        const result = await dataProvider.fetchById('1', {
          includeGrantDocument: true,
        });

        expect(result?.documentType).toEqual('Grant Document');
      });

      test('Should not ask for grant data unless requested', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputs: getContentfulResearchOutputGraphqlResponse(),
        });

        const result = await researchOutputDataProvider.fetchById('1');

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_RESEARCH_OUTPUT_BY_ID,
          expect.objectContaining({ includeGrantDocument: false }),
        );
        expect(result?.grantDocument).toBeUndefined();
      });

      test('Should ignore grant data for other document types', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputs: {
            ...getGrantDocumentOutput(),
            documentType: 'Article',
          },
        });

        const result = await researchOutputDataProvider.fetchById('1', {
          includeGrantDocument: true,
        });

        expect(result?.grantDocument).toBeUndefined();
      });

      test('Should map an original grant document with its supplement grant and the project team', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputs: getGrantDocumentOutput(),
        });

        const result = await researchOutputDataProvider.fetchById('1', {
          includeGrantDocument: true,
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(1);
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_RESEARCH_OUTPUT_BY_ID,
          expect.objectContaining({
            id: '1',
            preview: false,
            includeGrantDocument: true,
          }),
        );
        expect(result?.grantDocument).toEqual(getResearchOutputGrantDocument());
      });

      test('Should map a supplement grant document', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputs: getGrantDocumentOutput(
            getContentfulResearchOutputGrantDocumentGraphqlResponse({
              grantType: 'supplement',
            }),
          ),
        });

        const result = await researchOutputDataProvider.fetchById('1', {
          includeGrantDocument: true,
        });

        expect(result?.grantDocument).toEqual({
          ...getResearchOutputGrantDocument(),
          grantType: 'supplement',
        });
      });

      test('Should leave out the supplement grant and the PDF when the project has neither', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputs: getGrantDocumentOutput(
            getContentfulResearchOutputGrantDocumentGraphqlResponse({
              withSupplementGrant: false,
              withGrantPdf: false,
            }),
          ),
        });

        const result = await researchOutputDataProvider.fetchById('1', {
          includeGrantDocument: true,
        });

        expect(result?.grantDocument).toEqual({
          ...getResearchOutputGrantDocument(),
          supplement: undefined,
          pdfUrl: undefined,
        });
      });

      test('Should not return grant data when no project links to the output', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputs: getGrantDocumentOutput({
            grantPdf: null,
            linkedFrom: {
              projectsCollection: { items: [] },
              supplementGrantCollection: { items: [] },
            },
          }),
        });

        const result = await researchOutputDataProvider.fetchById('1', {
          includeGrantDocument: true,
        });

        expect(result?.grantDocument).toBeUndefined();
      });

      test('Should not return grant data when the project type is unknown', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputs: getGrantDocumentOutput(
            getContentfulResearchOutputGrantDocumentGraphqlResponse({
              projectType: null,
            }),
          ),
        });

        const result = await researchOutputDataProvider.fetchById('1', {
          includeGrantDocument: true,
        });

        expect(result?.grantDocument).toBeUndefined();
      });

      test('Should ask the preview client for grant data on a draft', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputs: null,
        });
        contentfulGraphqlPreviewClientMock.request.mockResolvedValueOnce({
          researchOutputs: getGrantDocumentOutput(),
        });

        const result = await researchOutputDataProvider.fetchById('1', {
          includeGrantDocument: true,
        });

        expect(contentfulGraphqlPreviewClientMock.request).toHaveBeenCalledWith(
          FETCH_RESEARCH_OUTPUT_BY_ID,
          { id: '1', preview: true, includeGrantDocument: true },
        );
        expect(result?.grantDocument).toEqual(getResearchOutputGrantDocument());
      });
    });
  });
  describe('create', () => {
    beforeEach(() => {
      environmentMock.createEntry.mockResolvedValue({
        sys: { id: '1' },
        publish: jest.fn(),
      } as unknown as Entry);
    });

    test('can create a draft output', async () => {
      const publish = jest.fn();
      environmentMock.createEntry.mockResolvedValue({
        sys: { id: '1' },
        publish,
      } as unknown as Entry);
      await researchOutputDataProvider.create(
        getResearchOutputCreateDataObject(),
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalled();
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.anything(),
      );
      expect(publish).not.toHaveBeenCalled();
    });

    test('can create a published output', async () => {
      const publish = jest.fn();
      environmentMock.createEntry.mockResolvedValue({
        sys: { id: '1' },
        publish,
      } as unknown as Entry);
      await researchOutputDataProvider.create(
        getResearchOutputCreateDataObject(),
        { publish: true },
      );
      expect(environmentMock.createEntry).toHaveBeenCalled();
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.anything(),
      );
      expect(publish).toHaveBeenCalled();
    });

    test('returns the id of the created output', async () => {
      environmentMock.createEntry.mockResolvedValue({
        sys: { id: 'output-1' },
      } as unknown as Entry);
      const result = await researchOutputDataProvider.create(
        getResearchOutputCreateDataObject(),
        { publish: false },
      );
      expect(result).toEqual('output-1');
    });

    test('sets external authors ids to contentful references', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          authors: [{ userId: 'user-1' }, { externalAuthorId: 'ea-1' }],
        },
        { publish: false },
      );
      const args = environmentMock.createEntry.mock.lastCall?.[1];
      expect(args!.fields).toMatchObject({
        authors: {
          'en-US': [
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'user-1',
              },
            },
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'ea-1',
              },
            },
          ],
        },
      });
    });

    test('sets lab ids to contentful references', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          labIds: ['lab-1', 'lab-2'],
        },
        { publish: false },
      );

      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            labs: {
              'en-US': [
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: 'lab-1',
                  },
                },
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: 'lab-2',
                  },
                },
              ],
            },
          }),
        }),
      );
    });

    test('sets team ids to contentful references', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          teamIds: ['team-1', 'team-2'],
        },
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            teams: {
              'en-US': [
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: 'team-1',
                  },
                },
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: 'team-2',
                  },
                },
              ],
            },
          }),
        }),
      );
    });

    test('sets related research ids to contentful references', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          relatedResearchIds: ['output-1', 'output-2'],
        },
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            relatedResearch: {
              'en-US': [
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: 'output-1',
                  },
                },
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: 'output-2',
                  },
                },
              ],
            },
          }),
        }),
      );
    });

    test('sets related event ids to contentful references', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          relatedEventIds: ['event-1', 'event-2'],
        },
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            relatedEvents: {
              'en-US': [
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: 'event-1',
                  },
                },
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: 'event-2',
                  },
                },
              ],
            },
          }),
        }),
      );
    });

    test('sets research tag fields to contentful references', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          methodIds: ['method-1', 'method-2'],
          keywordIds: ['keyword-1', 'keyword-2'],
          environmentIds: ['environment-1', 'environment-2'],
          organismIds: ['organism-1', 'organism-2'],
          subtypeId: 'subtype-1',
        },
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            methods: {
              'en-US': [
                { sys: { type: 'Link', linkType: 'Entry', id: 'method-1' } },
                { sys: { type: 'Link', linkType: 'Entry', id: 'method-2' } },
              ],
            },
            keywords: {
              'en-US': [
                { sys: { type: 'Link', linkType: 'Entry', id: 'keyword-1' } },
                { sys: { type: 'Link', linkType: 'Entry', id: 'keyword-2' } },
              ],
            },
            environments: {
              'en-US': [
                {
                  sys: { type: 'Link', linkType: 'Entry', id: 'environment-1' },
                },
                {
                  sys: { type: 'Link', linkType: 'Entry', id: 'environment-2' },
                },
              ],
            },
            organisms: {
              'en-US': [
                { sys: { type: 'Link', linkType: 'Entry', id: 'organism-1' } },
                { sys: { type: 'Link', linkType: 'Entry', id: 'organism-2' } },
              ],
            },
            subtype: {
              'en-US': {
                sys: { type: 'Link', linkType: 'Entry', id: 'subtype-1' },
              },
            },
          }),
        }),
      );
    });

    test('sets working group to contentful reference', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          workingGroups: ['wg-0'],
        },
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            workingGroup: {
              'en-US': {
                sys: {
                  type: 'Link',
                  linkType: 'Entry',
                  id: 'wg-0',
                },
              },
            },
          }),
        }),
      );
    });

    test('links research output to manuscript & manuscript version when provided', async () => {
      const publish: jest.MockedFunction<() => Promise<Entry>> = jest.fn();
      const patch: jest.MockedFunction<() => Promise<Entry>> = jest.fn();
      patch.mockResolvedValue({ publish } as unknown as Entry);
      const manuscriptEntry = {
        sys: {
          publishedVersion: 1,
        },
        fields: {},
        patch,
      } as unknown as Entry;
      environmentMock.getEntry.mockResolvedValue(manuscriptEntry);

      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          relatedManuscriptVersion: 'manuscript-version-1',
          relatedManuscript: 'manuscript-1',
        },
        { publish: false },
      );

      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            relatedManuscriptVersion: {
              'en-US': {
                sys: {
                  type: 'Link',
                  linkType: 'Entry',
                  id: 'manuscript-version-1',
                },
              },
            },
          }),
        }),
      );
      expect(patch).toHaveBeenCalledWith([
        {
          op: 'add',
          path: '/fields/relatedResearchOutput',
          value: {
            'en-US': {
              sys: { id: '1', linkType: 'Entry', type: 'Link' },
            },
          },
        },
      ]);
    });

    test('sets working group to null if undefined', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          workingGroups: [],
        },
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            workingGroup: {
              'en-US': null,
            },
          }),
        }),
      );
    });

    test('sets createdBy and updatedBy to contentful reference', async () => {
      await researchOutputDataProvider.create(
        {
          ...getResearchOutputCreateDataObject(),
          createdBy: 'user-0',
        },
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            createdBy: {
              'en-US': {
                sys: {
                  type: 'Link',
                  linkType: 'Entry',
                  id: 'user-0',
                },
              },
            },
            updatedBy: {
              'en-US': {
                sys: {
                  type: 'Link',
                  linkType: 'Entry',
                  id: 'user-0',
                },
              },
            },
          }),
        }),
      );
    });

    test('sets createdDate and lastUpdatedPartial to the current timestamp', async () => {
      await researchOutputDataProvider.create(
        getResearchOutputCreateDataObject(),
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            createdDate: {
              'en-US': new Date().toISOString(),
            },
            lastUpdatedPartial: {
              'en-US': new Date().toISOString(),
            },
          }),
        }),
      );
    });

    test('sets addedDate to the current timestamp if publishing the output', async () => {
      await researchOutputDataProvider.create(
        getResearchOutputCreateDataObject(),
        { publish: true },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            addedDate: {
              'en-US': new Date().toISOString(),
            },
          }),
        }),
      );
    });

    test('sets addedDate to null if not publishing the output', async () => {
      await researchOutputDataProvider.create(
        getResearchOutputCreateDataObject(),
        { publish: false },
      );
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputs',
        expect.objectContaining({
          fields: expect.objectContaining({
            addedDate: { 'en-US': null },
          }),
        }),
      );
    });
  });
  describe('update', () => {
    let publish: jest.MockedFunction<() => Promise<Entry>> = jest.fn();
    let entry: Entry;

    beforeEach(() => {
      entry = {
        sys: {
          publishedVersion: 1,
        },
        fields: {},
        publish,
      } as unknown as Entry;

      contentfulGraphqlClientMock.request.mockResolvedValue({
        researchOutputs: {
          sys: {
            publishedVersion: 1,
          },
        },
      });

      environmentMock.getEntry.mockResolvedValue(entry);
      publish.mockResolvedValue(entry);

      const mockPatch = patch as jest.MockedFunction<typeof patch>;
      mockPatch.mockResolvedValue(entry);
    });

    test('can update an output', async () => {
      await researchOutputDataProvider.update(
        'a',
        getResearchOutputUpdateDataObject(),
        { publish: false },
      );
      expect(environmentMock.getEntry).toHaveBeenCalledWith('a');
      expect(patch).toHaveBeenCalled();
    });

    test('does not publish changes if `publish` argument is false', async () => {
      await researchOutputDataProvider.update(
        'a',
        getResearchOutputUpdateDataObject(),
        { publish: false },
      );

      expect(patch).toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    });

    test('publishes changes if `publish` argument is true', async () => {
      await researchOutputDataProvider.update(
        'a',
        getResearchOutputUpdateDataObject(),
        { publish: true },
      );

      expect(patch).toHaveBeenCalled();
      expect(publish).toHaveBeenCalled();
    });

    test('sets external authors ids to contentful references', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
          authors: [{ userId: 'user-1' }, { externalAuthorId: 'ea-1' }],
        },
        { publish: false },
      );

      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          authors: [
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'user-1',
              },
            },
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'ea-1',
              },
            },
          ],
        }),
      );
    });

    test('sets lab ids to contentful references', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
          labIds: ['lab-1', 'lab-2'],
        },
        { publish: false },
      );

      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          labs: [
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'lab-1',
              },
            },
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'lab-2',
              },
            },
          ],
        }),
      );
    });

    test('sets team ids to contentful references', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
          teamIds: ['team-1', 'team-2'],
        },
        { publish: false },
      );
      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          teams: [
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'team-1',
              },
            },
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'team-2',
              },
            },
          ],
        }),
      );
    });

    test('sets related research ids to contentful references', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
          relatedResearchIds: ['output-1', 'output-2'],
        },
        { publish: false },
      );
      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          relatedResearch: [
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'output-1',
              },
            },
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'output-2',
              },
            },
          ],
        }),
      );
    });

    test('sets related event ids to contentful references', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
          relatedEventIds: ['event-1', 'event-2'],
        },
        { publish: false },
      );
      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          relatedEvents: [
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'event-1',
              },
            },
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: 'event-2',
              },
            },
          ],
        }),
      );
    });

    test('sets research tag fields to contentful references', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
          methodIds: ['method-1', 'method-2'],
          keywordIds: ['keyword-1', 'keyword-2'],
          environmentIds: ['environment-1', 'environment-2'],
          organismIds: ['organism-1', 'organism-2'],
          subtypeId: 'subtype-1',
        },
        { publish: false },
      );
      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          methods: [
            { sys: { type: 'Link', linkType: 'Entry', id: 'method-1' } },
            { sys: { type: 'Link', linkType: 'Entry', id: 'method-2' } },
          ],
          keywords: [
            { sys: { type: 'Link', linkType: 'Entry', id: 'keyword-1' } },
            { sys: { type: 'Link', linkType: 'Entry', id: 'keyword-2' } },
          ],
          environments: [
            { sys: { type: 'Link', linkType: 'Entry', id: 'environment-1' } },
            { sys: { type: 'Link', linkType: 'Entry', id: 'environment-2' } },
          ],
          organisms: [
            { sys: { type: 'Link', linkType: 'Entry', id: 'organism-1' } },
            { sys: { type: 'Link', linkType: 'Entry', id: 'organism-2' } },
          ],
          subtype: {
            sys: { type: 'Link', linkType: 'Entry', id: 'subtype-1' },
          },
        }),
      );
    });

    test('sets working group to contentful reference', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
          workingGroups: ['wg-0'],
        },
        { publish: false },
      );
      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          workingGroup: {
            sys: {
              type: 'Link',
              linkType: 'Entry',
              id: 'wg-0',
            },
          },
        }),
      );
    });

    test('sets working group to null if undefined', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
          workingGroups: [],
        },
        { publish: false },
      );
      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          workingGroup: null,
        }),
      );
    });

    test('sets lastUpdatedPartial to the current timestamp', async () => {
      await researchOutputDataProvider.update(
        '1',
        {
          ...getResearchOutputUpdateDataObject(),
        },
        { publish: false },
      );
      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          lastUpdatedPartial: new Date().toISOString(),
        }),
      );
    });

    test('sets addedDate to the current timestamp if publishing the output', async () => {
      await researchOutputDataProvider.update(
        '1',
        getResearchOutputUpdateDataObject(),
        { publish: true },
      );
      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          addedDate: new Date().toISOString(),
        }),
      );
    });

    test('does not set addedDate to the current timestamp if editing a previously published output', async () => {
      entry.fields.addedDate = {
        'en-US': new Date().toISOString(),
      };
      await researchOutputDataProvider.update(
        '1',
        getResearchOutputUpdateDataObject(),
        { publish: true },
      );
      expect(patch).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          addedDate: expect.anything(),
        }),
      );
    });

    test('sets `updatedBy` property to a contentful reference', async () => {
      await researchOutputDataProvider.update(
        '1',
        { ...getResearchOutputUpdateDataObject(), updatedBy: 'user-0' },
        { publish: false },
      );

      expect(patch).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({
          updatedBy: { sys: { type: 'Link', linkType: 'Entry', id: 'user-0' } },
        }),
      );
    });
  });
  describe('create Version', () => {
    test('can create a first version', async () => {
      const publish = jest.fn();
      const researchOutputMock = getEntry({});
      environmentMock.getEntry.mockResolvedValue(researchOutputMock);

      environmentMock.createEntry.mockResolvedValue({
        sys: { id: '1' },
        publish,
      } as unknown as Entry);
      await researchOutputDataProvider.update(
        '1',
        getResearchOutputUpdateDataObject(),
        {
          publish: false,
          newVersion: {
            documentType: 'Article',
            title: 'Test',
            addedDate: '2022-01-01T12:00:00.000Z',
            link: 'https://example.com',
            type: '3D Printing',
          },
        },
      );

      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputVersions',
        {
          fields: {
            documentType: {
              'en-US': 'Article',
            },
            title: {
              'en-US': 'Test',
            },
            addedDate: {
              'en-US': '2022-01-01T12:00:00.000Z',
            },
            link: {
              'en-US': 'https://example.com',
            },
            type: {
              'en-US': '3D Printing',
            },
            relatedManuscriptVersion: {
              'en-US': null,
            },
          },
        },
      );
      expect(publish).toHaveBeenCalled();
    });

    test('can create a version linked to a manuscript version', async () => {
      const publish = jest.fn();
      const researchOutputMock = getEntry({});
      environmentMock.getEntry.mockResolvedValue(researchOutputMock);

      environmentMock.createEntry.mockResolvedValue({
        sys: { id: '1' },
        publish,
      } as unknown as Entry);
      await researchOutputDataProvider.update(
        '1',
        getResearchOutputUpdateDataObject(),
        {
          publish: false,
          newVersion: {
            documentType: 'Article',
            title: 'Test',
            addedDate: '2022-01-01T12:00:00.000Z',
            link: 'https://example.com',
            type: '3D Printing',
            relatedManuscriptVersion: 'manuscript-version-1',
          },
        },
      );

      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'researchOutputVersions',
        {
          fields: {
            documentType: {
              'en-US': 'Article',
            },
            title: {
              'en-US': 'Test',
            },
            addedDate: {
              'en-US': '2022-01-01T12:00:00.000Z',
            },
            link: {
              'en-US': 'https://example.com',
            },
            type: {
              'en-US': '3D Printing',
            },
            relatedManuscriptVersion: {
              'en-US': {
                sys: {
                  type: 'Link',
                  linkType: 'Entry',
                  id: 'manuscript-version-1',
                },
              },
            },
          },
        },
      );
      expect(publish).toHaveBeenCalled();
    });

    test('can create a second version', async () => {
      const researchOutputMock = getEntry({
        versions: {
          'en-US': [
            getEntry(
              {
                documentType: {
                  'en-US': 'Article',
                },
                title: {
                  'en-US': 'Test',
                },
                addedDate: {
                  'en-US': '2022-01-01T12:00:00.000Z',
                },
                link: {
                  'en-US': 'https://example.com',
                },
                type: {
                  'en-US': '3D Printing',
                },
              },
              { id: 'version-1' },
            ),
          ],
        },
      });
      environmentMock.getEntry.mockResolvedValue(researchOutputMock);

      environmentMock.createEntry.mockResolvedValue(
        getEntry({}, { id: 'version-2' }),
      );
      await researchOutputDataProvider.update(
        '1',
        getResearchOutputUpdateDataObject(),
        {
          publish: false,
          newVersion: {
            documentType: 'Article',
            title: 'Version 2',
            addedDate: '2022-01-01T12:00:00.000Z',
            link: 'https://example.com',
            type: '3D Printing',
          },
        },
      );
      const mockPatch = patch as jest.MockedFunction<typeof patch>;
      expect(mockPatch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          versions: [
            {
              sys: {
                id: 'version-1',
                linkType: 'Entry',
                type: 'Link',
              },
            },
            {
              sys: {
                id: 'version-2',
                linkType: 'Entry',
                type: 'Link',
              },
            },
          ],
        }),
      );
    });
  });
});

describe('mapOutputVersions ', () => {
  it('pass data through', () => {
    const data = {
      title: 'Test',
      documentType: 'Article',
      type: 'Preprint',
      link: 'https://test.com',
      addedDate: '2022-01-01T12:00:00.000Z',
      rrid: 'RRID',
      accession: 'Accession',
      doi: 'DOI',
    };

    const versions = mapOutputVersions([
      {
        ...data,
        sys: { id: '1' },
      },
    ]);
    expect(versions).toEqual([
      {
        ...data,
        id: '1',
      },
    ]);
  });

  it('handles empty data', () => {
    const versions = mapOutputVersions([
      {
        sys: { id: '1' },
      },
    ]);
    expect(versions).toEqual([
      {
        addedDate: '',
        documentType: 'Grant Document',
        id: '1',
        link: '',
        title: '',
        type: undefined,
        rrid: '',
        accession: '',
        doi: '',
      },
    ]);
  });

  it('filters null items', () => {
    const versions = mapOutputVersions([null, { sys: { id: '1' } }]);
    expect(versions.length).toBe(1);
  });

  it('handles documentType', () => {
    const versions = mapOutputVersions([
      { sys: { id: '1' }, documentType: 'Article' },
    ]);
    expect(versions[0]?.documentType).toBe('Article');
  });
});

type Author = NonNullable<
  NonNullable<
    NonNullable<
      FetchResearchOutputByIdQuery['researchOutputs']
    >['authorsCollection']
  >['items']
>[number];
type InternalUser = Extract<Author, { __typename: 'Users' }>;
type ExternalUser = Extract<Author, { __typename: 'ExternalAuthors' }>;
