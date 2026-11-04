import { Entry, ProjectsOrder } from '@asap-hub/contentful';
import { OpensearchRequest } from '@asap-hub/server-common';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../../mocks/contentful-rest-client.mock';
import { getEntry } from '../../fixtures/contentful.fixtures';
import {
  ProjectContentfulDataProvider,
  parseContentfulProject,
  parseContentfulProjectDetail,
  parseProjectUserMember,
  parseProjectTeamMember,
  parseContentfulAims,
  processTraineeProjectMembers,
  type ProjectMembershipItem,
  type UserProjectMembershipItem,
} from '../../../src/data-providers/contentful/project.data-provider';
import {
  FetchProjectMilestonesOptions,
  MilestoneCreateRequest,
  TraineeProject,
  TraineeProjectDetail,
} from '@asap-hub/model';
import { Environment } from '@asap-hub/contentful';
import {
  getExpectedDiscoveryProject,
  getExpectedDiscoveryProjectDetail,
  getExpectedDiscoveryProjectDetailWithAllFields,
  getExpectedDiscoveryProjectWithoutTeam,
  getExpectedProjectList,
  getExpectedResourceIndividualProject,
  getExpectedResourceTeamProject,
  getExpectedTraineeProject,
  getTraineeProjectGraphqlItem,
  getProjectByIdGraphqlResponse,
  getProjectsGraphqlEmptyResponse,
  getProjectsGraphqlResponse,
  getDiscoveryProjectByIdGraphqlItem,
  getDiscoveryProjectWithoutTeamGraphqlItem,
  getDiscoveryProjectGraphqlItem,
  getProjectsGraphqlResponseWithUnknownType,
  getResourceTeamProjectGraphqlItem,
  getResourceIndividualProjectGraphqlItem,
  getDiscoveryProjectDetailGraphqlItem,
  getResourceTeamProjectDetailGraphqlItem,
  getResourceIndividualProjectDetailGraphqlItem,
  getTraineeProjectDetailGraphqlItem,
  getSupplementGrantFields,
  getOriginalGrantFields,
} from '../../fixtures/projects.fixtures';

const milestonesSearchMock =
  (dates: Partial<Record<'original' | 'supplement', string>>) =>
  ({ index, body }: { index: string; body: OpensearchRequest }) => {
    if (index === 'project-milestones') {
      const filter = body.query?.bool?.filter;
      const filters = Array.isArray(filter) ? filter : filter ? [filter] : [];
      const grantType = filters
        .map((f) => {
          const val = f.term?.['grantType'];
          return typeof val === 'string' ? val : undefined;
        })
        .find(Boolean) as 'original' | 'supplement' | undefined;
      const date = grantType ? dates[grantType] : undefined;
      if (date) {
        return Promise.resolve({
          aggregations: { last_milestone_update: { value_as_string: date } },
        });
      }
    }
    return Promise.resolve({ hits: { hits: [] } });
  };

describe('ProjectContentfulDataProvider', () => {
  const contentfulClientMock = getContentfulGraphqlClientMock();
  const opensearchProviderMock = {
    search: jest.fn(),
  };
  const dataProvider = new ProjectContentfulDataProvider(
    contentfulClientMock,
    undefined,
    opensearchProviderMock as any,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('fetch', () => {
    it('maps filters into the Contentful query and parses all project types', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectsGraphqlResponse(),
      );

      const result = await dataProvider.fetch({
        take: 5,
        skip: 10,
        search: 'brain health',
        filter: {
          projectType: ['Discovery Project', 'Resource Project'],
          status: ['Completed', 'Active'],
        },
      });

      expect(result).toEqual({
        total: 4,
        items: getExpectedProjectList(),
      });

      expect(contentfulClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        {
          limit: 5,
          skip: 10,
          order: [ProjectsOrder.SysFirstPublishedAtDesc],
          where: {
            OR: [
              { title_contains: 'brain' },
              { title_contains: 'health' },
              { researchTags: { name_contains: 'brain' } },
              { researchTags: { name_contains: 'health' } },
              { resourceType: { name_contains: 'brain' } },
              { resourceType: { name_contains: 'health' } },
            ],
            projectType_in: ['Discovery Project', 'Resource Project'],
            status_in: ['Completed', 'Active'],
          },
        },
      );
    });

    it('normalises single-value filters', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectsGraphqlResponse(),
      );

      await dataProvider.fetch({
        filter: {
          projectType: 'Discovery Project',
          status: 'Completed',
        },
      });

      expect(contentfulClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 10,
          skip: 0,
          order: [ProjectsOrder.SysFirstPublishedAtDesc],
          where: {
            projectType_in: ['Discovery Project'],
            status_in: ['Completed'],
          },
        }),
      );
    });

    it('returns an empty list when Contentful has no projects', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectsGraphqlEmptyResponse(),
      );

      const result = await dataProvider.fetch({});

      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    it('falls back to default discovery project values when no team member exists', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        projectsCollection: {
          total: 1,
          items: [getDiscoveryProjectWithoutTeamGraphqlItem()],
        },
      } as never);

      const result = await dataProvider.fetch({});

      expect(result.items).toEqual([getExpectedDiscoveryProjectWithoutTeam()]);
    });
  });

  describe('fetchById', () => {
    const emptySearchResponse = { hits: { hits: [] } };

    beforeEach(() => {
      opensearchProviderMock.search.mockResolvedValue(emptySearchResponse);
    });

    it('returns a parsed project when the entry exists', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectByIdGraphqlResponse(),
      );

      const result = await dataProvider.fetchById('discovery-1');

      expect(result).toEqual(getExpectedDiscoveryProjectDetail());
    });

    it('fetches aims from OpenSearch and maps articleCount and status', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectByIdGraphqlResponse(),
      );
      opensearchProviderMock.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  id: 'aim-1',
                  description: 'First aim',
                  status: 'Complete',
                  articleCount: 4,
                },
              },
              {
                _source: {
                  id: 'aim-2',
                  description: 'Second aim',
                  status: 'In Progress',
                  articleCount: 2,
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce(emptySearchResponse);

      const result = await dataProvider.fetchById('project-with-aims');

      expect(contentfulClientMock.request).toHaveBeenCalledTimes(1);
      expect(opensearchProviderMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'project-aims',
          body: expect.objectContaining({
            query: {
              bool: {
                filter: [
                  { term: { projectId: 'project-with-aims' } },
                  { term: { grantType: 'original' } },
                ],
              },
            },
          }),
        }),
      );
      expect(opensearchProviderMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'project-aims',
          body: expect.objectContaining({
            query: {
              bool: {
                filter: [
                  { term: { projectId: 'project-with-aims' } },
                  { term: { grantType: 'supplement' } },
                ],
              },
            },
          }),
        }),
      );
      expect(result).not.toBeNull();
      const originalGrantAims = (result as any).originalGrantAims;
      expect(originalGrantAims).toHaveLength(2);
      expect(originalGrantAims[0]).toMatchObject({
        id: 'aim-1',
        order: 1,
        articleCount: 4,
        status: 'Complete',
      });
      expect(originalGrantAims[1]).toMatchObject({
        id: 'aim-2',
        order: 2,
        articleCount: 2,
        status: 'In Progress',
      });
    });

    it('sets originalGrantAims to undefined when OpenSearch returns no aims', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectByIdGraphqlResponse(),
      );

      const result = await dataProvider.fetchById('discovery-1');

      expect((result as any).originalGrantAims).toBeUndefined();
    });

    it('handles null hits.hits gracefully (returns empty aims)', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectByIdGraphqlResponse(),
      );
      opensearchProviderMock.search.mockResolvedValueOnce({ hits: {} });
      opensearchProviderMock.search.mockResolvedValueOnce({ hits: {} });

      const result = await dataProvider.fetchById('discovery-1');

      expect((result as any).originalGrantAims).toBeUndefined();
    });

    it('maps supplement grant aims when the project has a supplement grant', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        projects: {
          ...getDiscoveryProjectByIdGraphqlItem(),
          supplementGrant: {
            grantTitle: 'Supplement Grant',
            grantDescription: 'Supplement description',
            grantProposalId: 'proposal-2',
            grantStartDate: '2024-06-01',
            grantEndDate: '2025-06-01',
          },
        },
      });
      opensearchProviderMock.search
        .mockResolvedValueOnce(emptySearchResponse)
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  id: 'sup-aim-1',
                  description: 'Supplement aim',
                  status: 'Active',
                  articleCount: 1,
                },
              },
            ],
          },
        });

      const result = await dataProvider.fetchById('project-with-supplement');

      expect(result).not.toBeNull();
      const supplementGrant = (result as any).supplementGrant;
      expect(supplementGrant).toBeDefined();
      expect(supplementGrant.aims).toHaveLength(1);
      expect(supplementGrant.aims[0]).toMatchObject({
        id: 'sup-aim-1',
        order: 1,
        status: 'Active',
        articleCount: 1,
      });
    });

    it('returns null when Contentful does not return the project', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({ projects: null });

      const result = await dataProvider.fetchById('missing');

      expect(result).toBeNull();
    });

    it('returns null when a request fails', async () => {
      contentfulClientMock.request.mockRejectedValueOnce(
        new Error('Network error'),
      );

      const result = await dataProvider.fetchById('any-id');

      expect(result).toBeNull();
    });

    it('populates milestonesLastUpdated when both grant types have milestone dates', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectByIdGraphqlResponse(),
      );
      opensearchProviderMock.search.mockImplementation(
        milestonesSearchMock({
          original: '2025-04-01T00:00:00.000Z',
          supplement: '2025-06-01T00:00:00.000Z',
        }),
      );

      const result = await dataProvider.fetchById('project-with-milestones');

      expect((result as any).milestonesLastUpdated).toEqual({
        original: '2025-04-01T00:00:00.000Z',
        supplement: '2025-06-01T00:00:00.000Z',
      });
    });

    it('populates milestonesLastUpdated with only the grant type that has data', async () => {
      contentfulClientMock.request.mockResolvedValueOnce(
        getProjectByIdGraphqlResponse(),
      );
      opensearchProviderMock.search.mockImplementation(
        milestonesSearchMock({ original: '2025-04-01T00:00:00.000Z' }),
      );

      const result = await dataProvider.fetchById(
        'project-with-original-milestones',
      );

      expect((result as any).milestonesLastUpdated).toEqual({
        original: '2025-04-01T00:00:00.000Z',
      });
    });

    describe('funded team research outputs pagination', () => {
      const makeArticle = (i: number, coauthorTeamId: string) => ({
        sys: { id: `ro-${i}` },
        title: `Article ${i}`,
        documentType: 'Article',
        type: 'Preprint',
        teamsCollection: {
          items: [
            { sys: { id: 'team-1' }, displayName: 'Funded' },
            { sys: { id: coauthorTeamId }, displayName: coauthorTeamId },
          ],
        },
      });

      const setFundedTeamResearchOutputsWithTotal = (
        graphqlItem: ReturnType<typeof getDiscoveryProjectDetailGraphqlItem>,
        items: unknown[],
        total: number,
      ) => {
        const teamMember = (graphqlItem as Record<string, unknown>)
          .membersCollection as {
          items: Array<{ projectMember: Record<string, unknown> }>;
        };
        const team = teamMember.items.find(
          (m) =>
            (m.projectMember as { __typename?: string }).__typename === 'Teams',
        );
        const existing =
          (team!.projectMember.linkedFrom as Record<string, unknown>) || {};
        team!.projectMember.linkedFrom = {
          ...existing,
          researchOutputsCollection: { total, items },
        };
      };

      it('does not request additional pages when total fits in first page', async () => {
        const graphqlItem = getDiscoveryProjectDetailGraphqlItem();
        const firstPage = Array.from({ length: 3 }, (_, i) =>
          makeArticle(i, 'team-a'),
        );
        setFundedTeamResearchOutputsWithTotal(graphqlItem, firstPage, 3);
        contentfulClientMock.request.mockResolvedValueOnce({
          projects: graphqlItem,
        });

        await dataProvider.fetchById('discovery-1');

        expect(contentfulClientMock.request).toHaveBeenCalledTimes(1);
      });

      it('paginates remaining pages and merges all collaborating teams', async () => {
        const graphqlItem = getDiscoveryProjectDetailGraphqlItem();
        const firstPage = Array.from({ length: 50 }, (_, i) =>
          makeArticle(i, 'team-a'),
        );
        setFundedTeamResearchOutputsWithTotal(graphqlItem, firstPage, 75);

        contentfulClientMock.request.mockResolvedValueOnce({
          projects: graphqlItem,
        });
        contentfulClientMock.request.mockResolvedValueOnce({
          teams: {
            linkedFrom: {
              researchOutputsCollection: {
                total: 75,
                items: Array.from({ length: 25 }, (_, i) =>
                  makeArticle(50 + i, 'team-b'),
                ),
              },
            },
          },
        });

        const result = await dataProvider.fetchById('discovery-1');

        expect(contentfulClientMock.request).toHaveBeenCalledTimes(2);
        expect(contentfulClientMock.request).toHaveBeenLastCalledWith(
          expect.anything(),
          { teamId: 'team-1', limit: 50, skip: 50 },
        );

        const collaboratingTeams =
          (result as { collaboratingTeams?: Array<{ id: string }> })
            .collaboratingTeams ?? [];
        expect(collaboratingTeams.map((t) => t.id).sort()).toEqual([
          'team-a',
          'team-b',
        ]);
      });
    });
  });

  it('parses each concrete project type into the expected model', () => {
    contentfulClientMock.request.mockResolvedValueOnce(
      getProjectsGraphqlResponse(),
    );

    return dataProvider.fetch({}).then((result) => {
      expect(result.items).toEqual([
        getExpectedDiscoveryProject(),
        getExpectedResourceTeamProject(),
        getExpectedResourceIndividualProject(),
        getExpectedTraineeProject(),
      ]);
    });
  });

  it('throws when project type is not Discovery Project, Resource Project, or Trainee Project', () => {
    const invalidItem = {
      ...getDiscoveryProjectGraphqlItem(),
      projectType: 'Unexpected Project Type',
    };

    expect(() => parseContentfulProject(invalidItem as never)).toThrow(
      'Unknown project type: Unexpected Project Type',
    );
  });

  it('throws when fetch encounters an unknown project type', async () => {
    contentfulClientMock.request.mockResolvedValueOnce(
      getProjectsGraphqlResponseWithUnknownType(),
    );

    await expect(dataProvider.fetch({})).rejects.toThrow(
      'Unknown project type: Unknown Project',
    );
  });

  it('groups trainee project members by role correctly', () => {
    const traineeProjectWithMultipleRoles = {
      ...getTraineeProjectGraphqlItem(),
      sys: { id: 'trainee-multi-role' },
      membersCollection: {
        total: 5,
        items: [
          {
            sys: { id: 'membership-trainee-1' },
            role: 'Independent Project - Lead',
            projectMember: {
              __typename: 'Users',
              sys: { id: 'user-trainee-1' },
              firstName: 'Trainee',
              nickname: '',
              lastName: 'One',
              email: 'trainee1@example.com',
              onboarded: true,
              avatar: { url: null },
              alumniSinceDate: undefined,
            },
          },
          {
            sys: { id: 'membership-trainee-2' },
            role: 'Independent Project - Lead',
            projectMember: {
              __typename: 'Users',
              sys: { id: 'user-trainee-2' },
              firstName: 'Trainee',
              nickname: '',
              lastName: 'Two',
              email: 'trainee2@example.com',
              onboarded: true,
              avatar: { url: null },
              alumniSinceDate: undefined,
            },
          },
          {
            sys: { id: 'membership-mentor-1' },
            role: 'Independent Project - Mentor',
            projectMember: {
              __typename: 'Users',
              sys: { id: 'user-mentor-1' },
              firstName: 'Mentor',
              nickname: '',
              lastName: 'One',
              email: 'mentor1@example.com',
              onboarded: true,
              avatar: { url: null },
              alumniSinceDate: undefined,
            },
          },
          {
            sys: { id: 'membership-mentor-2' },
            role: 'Independent Project - Mentor',
            projectMember: {
              __typename: 'Users',
              sys: { id: 'user-mentor-2' },
              firstName: 'Mentor',
              nickname: '',
              lastName: 'Two',
              email: 'mentor2@example.com',
              onboarded: true,
              avatar: { url: null },
              alumniSinceDate: undefined,
            },
          },
          {
            sys: { id: 'membership-key-personnel' },
            role: 'Trainee Project - Key Personnel',
            projectMember: {
              __typename: 'Users',
              sys: { id: 'user-key-personnel' },
              firstName: 'Key',
              nickname: '',
              lastName: 'Personnel',
              email: 'key@example.com',
              onboarded: true,
              avatar: { url: null },
              alumniSinceDate: undefined,
            },
          },
        ],
      },
    } as ReturnType<typeof getTraineeProjectGraphqlItem>;

    const result = parseContentfulProject(
      traineeProjectWithMultipleRoles,
    ) as TraineeProject;

    expect(result.members).toHaveLength(4);

    expect(result.members[0]).toMatchObject({
      id: 'user-trainee-1',
      role: 'Independent Project - Lead',
    });
    expect(result.members[1]).toMatchObject({
      id: 'user-trainee-2',
      role: 'Independent Project - Lead',
    });

    expect(result.members[2]).toMatchObject({
      id: 'user-mentor-1',
      role: 'Independent Project - Mentor',
    });
    expect(result.members[3]).toMatchObject({
      id: 'user-mentor-2',
      role: 'Independent Project - Mentor',
    });

    expect(result.members).not.toContainEqual(
      expect.objectContaining({ id: 'user-key-personnel' }),
    );
  });

  it('includes multiple trainees when only trainee roles are present', () => {
    const traineeWithoutMentors = {
      ...getTraineeProjectGraphqlItem(),
      sys: { id: 'trainee-no-mentors' },
      membersCollection: {
        total: 2,
        items: [
          {
            sys: { id: 'membership-trainee-1' },
            role: 'Independent Project - Lead',
            projectMember: {
              __typename: 'Users',
              sys: { id: 'user-primary' },
              firstName: 'Morgan',
              nickname: '',
              lastName: 'Hill',
              email: 'morgan@example.com',
              onboarded: true,
              avatar: { url: null },
              alumniSinceDate: undefined,
            },
          },
          {
            sys: { id: 'membership-trainee-2' },
            role: 'Independent Project - Lead',
            projectMember: {
              __typename: 'Users',
              sys: { id: 'user-secondary' },
              firstName: 'Riley',
              nickname: '',
              lastName: 'Poe',
              email: 'riley@example.com',
              onboarded: true,
              avatar: { url: null },
              alumniSinceDate: undefined,
            },
          },
        ],
      },
    } as ReturnType<typeof getTraineeProjectGraphqlItem>;

    const result = parseContentfulProject(
      traineeWithoutMentors,
    ) as TraineeProject;

    // Should include all members (both trainees)
    expect(result.members).toHaveLength(2);
    expect(result.members[0]).toMatchObject({
      id: 'user-primary',
      role: 'Independent Project - Lead',
    });
    expect(result.members[1]).toMatchObject({
      id: 'user-secondary',
      role: 'Independent Project - Lead',
    });
  });

  it('falls back to an unknown trainer when no user members are available', () => {
    const traineeWithoutUsers = {
      ...getTraineeProjectGraphqlItem(),
      sys: { id: 'trainee-empty' },
      membersCollection: {
        total: 1,
        items: [
          {
            sys: { id: 'membership-trainee-team' },
            role: 'Supporting Team',
            projectMember: {
              __typename: 'Teams',
              sys: { id: 'team-support' },
              displayName: 'Support Team',
              inactiveSince: null,
              researchTheme: null,
            },
          },
        ],
      },
    } as ReturnType<typeof getTraineeProjectGraphqlItem>;

    const result = parseContentfulProject(
      traineeWithoutUsers,
    ) as TraineeProject;

    // When no user members exist, members array should be empty
    expect(result.members).toHaveLength(0);
  });

  describe('fetchProjectMilestones', () => {
    const emptySearchResponse = { hits: { hits: [] } };
    const defaultProjectMilestonesOptions: FetchProjectMilestonesOptions = {
      grantType: 'supplement',
    };

    beforeEach(() => {
      opensearchProviderMock.search.mockResolvedValue(emptySearchResponse);
    });

    it('fetches project milestones from OpenSearch', async () => {
      opensearchProviderMock.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'milestone-1',
                description: 'First milestone',
                aimNumbers: '1',
                status: 'Complete',
                articleCount: 4,
                articlesDOI: '',
                projectId: 'project-1',
                projectName: 'Project One',
                grantType: 'supplement',
                createdDate: '2026-03-30T15:48:05.665Z',
                lastDate: '2026-03-30T15:48:05.665Z',
              },
            },
            {
              _source: {
                id: 'milestone-2',
                description: 'Second milestone',
                status: 'In Progress',
                aimNumbers: '2,5',
                articleCount: 2,
                articlesDOI: '',
                projectId: 'project-1',
                projectName: 'Project One',
                grantType: 'supplement',
                createdDate: '2026-02-30T15:48:05.665Z',
                lastDate: '2026-02-30T15:48:05.665Z',
              },
            },
          ],
          total: {
            value: 2,
          },
        },
      });

      const result = await dataProvider.fetchProjectMilestones(
        'project-with-milestones',
        defaultProjectMilestonesOptions,
      );

      expect(opensearchProviderMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'project-milestones',
          body: expect.objectContaining({
            query: {
              bool: {
                filter: [
                  { term: { projectId: 'project-with-milestones' } },
                  { term: { grantType: 'supplement' } },
                ],
              },
            },
            sort: [
              expect.objectContaining({
                _script: expect.objectContaining({
                  type: 'string',
                  order: 'asc',
                  script: expect.objectContaining({
                    source: expect.stringContaining("doc['aimNumbers']"),
                  }),
                }),
              }),
            ],
            from: 0,
            size: 10,
          }),
        }),
      );
      expect(result).not.toBeNull();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]).toMatchObject({
        id: 'milestone-1',
        description: 'First milestone',
        articleCount: 4,
        aims: '1',
        status: 'Complete',
      });
      expect(result.items[1]).toMatchObject({
        id: 'milestone-2',
        description: 'Second milestone',
        articleCount: 2,
        aims: '2,5',
        status: 'In Progress',
      });
    });

    it('does not filter by grant type if not provided', async () => {
      opensearchProviderMock.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'milestone-1',
                description: 'First milestone',
                aimNumbers: '1',
                status: 'Complete',
                articleCount: 4,
                articlesDOI: '',
                projectId: 'project-1',
                projectName: 'Project One',
                grantType: 'supplement',
                createdDate: '2026-03-30T15:48:05.665Z',
                lastDate: '2026-03-30T15:48:05.665Z',
              },
            },
            {
              _source: {
                id: 'milestone-2',
                description: 'Second milestone',
                status: 'In Progress',
                aimNumbers: '2,5',
                articleCount: 2,
                articlesDOI: '',
                projectId: 'project-1',
                projectName: 'Project One',
                grantType: 'original',
                createdDate: '2026-02-30T15:48:05.665Z',
                lastDate: '2026-02-30T15:48:05.665Z',
              },
            },
          ],
          total: {
            value: 2,
          },
        },
      });

      const result = await dataProvider.fetchProjectMilestones(
        'project-with-milestones',
        {
          skip: 10,
          take: 5,
        },
      );

      expect(opensearchProviderMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'project-milestones',
          body: expect.objectContaining({
            query: {
              bool: {
                filter: [{ term: { projectId: 'project-with-milestones' } }],
              },
            },
            sort: [
              expect.objectContaining({
                _script: expect.objectContaining({
                  type: 'string',
                  order: 'asc',
                }),
              }),
            ],
            from: 10,
            size: 5,
          }),
        }),
      );
      expect(result).not.toBeNull();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('applies description search and status filters', async () => {
      await dataProvider.fetchProjectMilestones('project-with-milestones', {
        ...defaultProjectMilestonesOptions,
        search: 'interim milestone',
        filter: ['Complete', 'Pending', 'invalid'],
      });

      expect(opensearchProviderMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'project-milestones',
          body: expect.objectContaining({
            query: {
              bool: {
                filter: [
                  { term: { projectId: 'project-with-milestones' } },
                  { term: { grantType: 'supplement' } },
                  { terms: { status: ['Complete', 'Pending'] } },
                ],
                must: [
                  {
                    match: {
                      description: {
                        query: 'interim milestone',
                        fuzziness: 'AUTO',
                        operator: 'and',
                      },
                    },
                  },
                ],
              },
            },
          }),
        }),
      );
    });

    it('sorts using descending aim numbers script when sort=aim_desc', async () => {
      opensearchProviderMock.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'milestone-1',
                description: 'First milestone',
                aimNumbers: '1,2',
                status: 'Complete',
                articleCount: 0,
                articlesDOI: '',
                projectId: 'project-1',
                projectName: 'Project One',
                grantType: 'supplement',
                createdDate: '2026-03-30T15:48:05.665Z',
                lastDate: '2026-03-30T15:48:05.665Z',
              },
            },
          ],
          total: { value: 1 },
        },
      });

      const result = await dataProvider.fetchProjectMilestones(
        'project-with-milestones',
        { ...defaultProjectMilestonesOptions, sort: 'aim_desc' },
      );

      expect(opensearchProviderMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            sort: [
              expect.objectContaining({
                _script: expect.objectContaining({
                  type: 'string',
                  order: 'asc',
                  script: expect.objectContaining({
                    source: expect.stringContaining('999 - n'),
                  }),
                }),
              }),
            ],
          }),
        }),
      );
      expect(result.items[0]?.aims).toBe('1,2');
    });

    it('sorts using ascending aim numbers script when sort=aim_asc explicitly', async () => {
      await dataProvider.fetchProjectMilestones('project-with-milestones', {
        ...defaultProjectMilestonesOptions,
        sort: 'aim_asc',
      });

      expect(opensearchProviderMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            sort: [
              expect.objectContaining({
                _script: expect.objectContaining({
                  type: 'string',
                  order: 'asc',
                  script: expect.objectContaining({
                    source: expect.stringContaining("doc['aimNumbers']"),
                  }),
                }),
              }),
            ],
          }),
        }),
      );
    });

    it('handles null hits.hits gracefully', async () => {
      opensearchProviderMock.search.mockResolvedValueOnce({ hits: {} });

      const result = await dataProvider.fetchProjectMilestones(
        'discovery-1',
        defaultProjectMilestonesOptions,
      );

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('throws an error when opensearch provider is not configured properly', async () => {
      const dataProviderWithoutOpenSearch = new ProjectContentfulDataProvider(
        contentfulClientMock,
        undefined,
      );
      await expect(
        dataProviderWithoutOpenSearch.fetchProjectMilestones('project-1', {
          grantType: 'original',
        }),
      ).rejects.toThrow(
        'Opensearch Provider not configured for ProjectContentfulDataProvider',
      );
    });
  });

  describe('exportProjectMilestones', () => {
    const milestoneHit = (overrides: Record<string, unknown> = {}) => ({
      _source: {
        id: 'milestone-1',
        description: 'A milestone',
        aimNumbers: '1, 2',
        status: 'Complete',
        articleCount: 1,
        articlesDOI: '10.1093/brain/awad214',
        projectId: 'project-1',
        projectName: 'Project One',
        grantType: 'supplement',
        createdDate: '2026-03-01T00:00:00Z',
        lastDate: '2026-03-30T00:00:00Z',
        ...overrides,
      },
    });

    const aimHit = (overrides: Record<string, unknown> = {}) => ({
      _source: {
        id: 'aim-1',
        aimOrder: 1,
        description: 'Aim description',
        articlesDOI: '10.1093/brain/awad214',
        projectId: 'project-1',
        projectName: 'Project One',
        grantType: 'supplement',
        status: 'Complete',
        createdDate: '2026-02-14T00:00:00Z',
        lastDate: '2026-03-21T00:00:00Z',
        ...overrides,
      },
    });

    const mockSearchResponses = (
      milestones: ReturnType<typeof milestoneHit>[],
      aims: ReturnType<typeof aimHit>[],
    ) => {
      opensearchProviderMock.search.mockImplementation(
        ({ index }: { index: string }) =>
          Promise.resolve(
            index === 'project-milestones'
              ? {
                  hits: {
                    hits: milestones,
                    total: { value: milestones.length },
                  },
                }
              : { hits: { hits: aims, total: { value: aims.length } } },
          ),
      );
    };

    it('throws when opensearch provider is not configured', async () => {
      const dataProviderWithoutOpenSearch = new ProjectContentfulDataProvider(
        contentfulClientMock,
        undefined,
      );
      await expect(
        dataProviderWithoutOpenSearch.exportProjectMilestones('project-1', {}),
      ).rejects.toThrow(
        'Opensearch Provider not configured for ProjectContentfulDataProvider',
      );
    });

    it('maps milestone and aim hits into export rows', async () => {
      mockSearchResponses([milestoneHit()], [aimHit()]);

      const result = await dataProvider.exportProjectMilestones('project-1', {
        grantType: 'supplement',
      });

      expect(result.milestones).toEqual([
        {
          projectName: 'Project One',
          grantType: 'supplement',
          description: 'A milestone',
          relatedAimNumbers: 'A1; A2',
          articlesDOI: '10.1093/brain/awad214',
          createdDate: '2026-03-01T00:00:00Z',
          lastUpdated: '2026-03-30T00:00:00Z',
          status: 'Complete',
        },
      ]);
      expect(result.aims).toEqual([
        {
          projectName: 'Project One',
          grantType: 'supplement',
          aimNumber: 'A1',
          description: 'Aim description',
          articlesDOI: '10.1093/brain/awad214',
          createdDate: '2026-02-14T00:00:00Z',
          lastUpdated: '2026-03-21T00:00:00Z',
          status: 'Complete',
        },
      ]);
    });

    it('applies grant type, status filters and search query to the milestone query', async () => {
      mockSearchResponses([], []);

      await dataProvider.exportProjectMilestones('project-1', {
        grantType: 'original',
        search: '  alpha  ',
        filter: ['Complete', 'In Progress'],
        sort: 'aim_desc',
      });

      const milestoneCall = opensearchProviderMock.search.mock.calls.find(
        ([arg]) => arg.index === 'project-milestones',
      );
      expect(milestoneCall).toBeDefined();
      const milestoneBody = milestoneCall![0].body;
      expect(milestoneBody.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { projectId: 'project-1' } },
          { term: { grantType: 'original' } },
          { terms: { status: ['Complete', 'In Progress'] } },
        ]),
      );
      expect(milestoneBody.query.bool.must).toEqual([
        {
          match: {
            description: {
              query: 'alpha',
              fuzziness: 'AUTO',
              operator: 'and',
            },
          },
        },
      ]);
    });

    it('narrows aims to those referenced by exported milestones when a status filter is applied', async () => {
      mockSearchResponses(
        [milestoneHit({ aimNumbers: '2' })],
        [
          aimHit({ aimOrder: 1, description: 'A1' }),
          aimHit({ aimOrder: 2, description: 'A2' }),
          aimHit({ aimOrder: 3, description: 'A3' }),
        ],
      );

      const result = await dataProvider.exportProjectMilestones('project-1', {
        grantType: 'supplement',
        filter: ['Complete'],
      });

      expect(result.aims.map((a) => a.aimNumber)).toEqual(['A2']);
    });

    it('narrows aims to those referenced by exported milestones when a search query is applied', async () => {
      mockSearchResponses(
        [milestoneHit({ aimNumbers: '2' })],
        [
          aimHit({ aimOrder: 1, description: 'A1' }),
          aimHit({ aimOrder: 2, description: 'A2' }),
          aimHit({ aimOrder: 3, description: 'A3' }),
        ],
      );

      const result = await dataProvider.exportProjectMilestones('project-1', {
        search: 'alpha',
      });

      expect(result.aims.map((a) => a.aimNumber)).toEqual(['A2']);
    });

    it('returns all aims when only grant type and sort are applied, regardless of milestone references', async () => {
      mockSearchResponses(
        [milestoneHit({ aimNumbers: '2' })],
        [
          aimHit({ aimOrder: 1, description: 'A1' }),
          aimHit({ aimOrder: 2, description: 'A2' }),
          aimHit({ aimOrder: 3, description: 'A3' }),
        ],
      );

      const result = await dataProvider.exportProjectMilestones('project-1', {
        grantType: 'supplement',
        sort: 'aim_desc',
      });

      expect(result.aims.map((a) => a.aimNumber)).toEqual(['A1', 'A2', 'A3']);
    });

    it('returns all aims when no table filters are applied', async () => {
      mockSearchResponses(
        [milestoneHit({ aimNumbers: '2' })],
        [
          aimHit({ aimOrder: 1, description: 'A1' }),
          aimHit({ aimOrder: 2, description: 'A2' }),
          aimHit({ aimOrder: 3, description: 'A3' }),
        ],
      );

      const result = await dataProvider.exportProjectMilestones(
        'project-1',
        {},
      );

      expect(result.aims.map((a) => a.aimNumber)).toEqual(['A1', 'A2', 'A3']);
    });

    it('ignores filter values that are not valid milestone statuses', async () => {
      mockSearchResponses([], []);

      await dataProvider.exportProjectMilestones('project-1', {
        filter: ['Complete', 'NotAStatus' as never],
      });

      const milestoneCall = opensearchProviderMock.search.mock.calls.find(
        ([arg]) => arg.index === 'project-milestones',
      );
      expect(milestoneCall![0].body.query.bool.filter).toEqual(
        expect.arrayContaining([{ terms: { status: ['Complete'] } }]),
      );
    });
  });
});

describe('parseContentfulProject - tools parsing', () => {
  it('parses tools from toolsCollection', () => {
    const item = {
      ...getDiscoveryProjectGraphqlItem(),
      toolsCollection: {
        items: [
          {
            sys: { id: 'tool-1' },
            name: 'Slack',
            url: 'https://slack.com',
            description: 'Team communication',
          },
          {
            sys: { id: 'tool-2' },
            name: 'GitHub',
            url: 'https://github.com',
            description: null,
          },
        ],
      },
    };

    const result = parseContentfulProject(item as never);

    expect(result.tools).toEqual([
      {
        id: 'tool-1',
        name: 'Slack',
        url: 'https://slack.com',
        description: 'Team communication',
      },
      {
        id: 'tool-2',
        name: 'GitHub',
        url: 'https://github.com',
        description: undefined,
      },
    ]);
  });

  it('returns undefined for tools when toolsCollection is empty', () => {
    const item = {
      ...getDiscoveryProjectGraphqlItem(),
      toolsCollection: { items: [] },
    };

    const result = parseContentfulProject(item as never);

    expect(result.tools).toBeUndefined();
  });

  it('filters out tools missing name or url', () => {
    const item = {
      ...getDiscoveryProjectGraphqlItem(),
      toolsCollection: {
        items: [
          null,
          {
            sys: { id: 'tool-no-url' },
            name: 'No URL',
            url: null,
            description: null,
          },
          {
            sys: { id: 'tool-no-name' },
            name: null,
            url: 'https://example.com',
            description: null,
          },
          {
            sys: { id: 'tool-valid' },
            name: 'Valid',
            url: 'https://valid.com',
            description: null,
          },
        ],
      },
    };

    const result = parseContentfulProject(item as never);

    expect(result.tools).toEqual([
      {
        id: 'tool-valid',
        name: 'Valid',
        url: 'https://valid.com',
        description: undefined,
      },
    ]);
  });
});

describe('ProjectContentfulDataProvider - update', () => {
  const contentfulClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const dataProvider = new ProjectContentfulDataProvider(
    contentfulClientMock,
    contentfulRestClientMock,
  );

  const dataProviderWithoutRestClient = new ProjectContentfulDataProvider(
    contentfulClientMock,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when REST client is not configured', async () => {
    await expect(
      dataProviderWithoutRestClient.update('project-1', { tools: [] }),
    ).rejects.toThrow(
      'REST client not configured for ProjectContentfulDataProvider',
    );
  });

  it('creates a new tool when no id is provided', async () => {
    const projectId = 'project-1';
    const tool = {
      name: 'Slack',
      url: 'https://slack.com',
      description: 'Team communication',
    };

    const projectMock = getEntry({});
    environmentMock.getEntry.mockResolvedValueOnce(projectMock);

    const toolMock = getEntry({});
    environmentMock.createEntry.mockResolvedValueOnce(toolMock);
    toolMock.publish = jest.fn().mockResolvedValueOnce(toolMock);

    const projectMockUpdated = getEntry({});
    projectMock.patch = jest.fn().mockResolvedValueOnce(projectMockUpdated);

    await dataProvider.update(projectId, { tools: [tool] });

    expect(environmentMock.getEntry).toHaveBeenCalledWith(projectId);
    expect(environmentMock.createEntry).toHaveBeenCalledWith('externalTools', {
      fields: {
        name: { 'en-US': tool.name },
        url: { 'en-US': tool.url },
        description: { 'en-US': tool.description },
      },
    });
    expect(projectMockUpdated.publish).toHaveBeenCalled();
  });

  it('updates an existing tool when id is provided', async () => {
    const projectId = 'project-1';
    const tool = {
      id: 'existing-tool-id',
      name: 'Updated Slack',
      url: 'https://slack.com/updated',
      description: 'Updated description',
    };

    const projectMock = getEntry({});
    environmentMock.getEntry.mockResolvedValueOnce(projectMock);

    const toolEntryMock = getEntry({});
    toolEntryMock.sys.id = tool.id;
    toolEntryMock.update = jest.fn().mockResolvedValueOnce(toolEntryMock);
    toolEntryMock.publish = jest.fn().mockResolvedValueOnce(toolEntryMock);
    environmentMock.getEntry.mockResolvedValueOnce(toolEntryMock);

    const projectMockUpdated = getEntry({});
    projectMock.patch = jest.fn().mockResolvedValueOnce(projectMockUpdated);

    await dataProvider.update(projectId, { tools: [tool] });

    expect(environmentMock.getEntry).toHaveBeenCalledWith(projectId);
    expect(environmentMock.getEntry).toHaveBeenCalledWith(tool.id);
    expect(toolEntryMock.update).toHaveBeenCalled();
    expect(toolEntryMock.publish).toHaveBeenCalled();
    expect(environmentMock.createEntry).not.toHaveBeenCalled();
  });

  it('deletes tools that are no longer in the incoming list', async () => {
    const projectId = 'project-1';
    const tool = {
      name: 'New Tool',
      url: 'https://new-tool.com',
    };

    const projectMock = getEntry({
      tools: {
        'en-US': [
          { sys: { id: 'old-tool-1', linkType: 'Entry', type: 'Link' } },
          { sys: { id: 'old-tool-2', linkType: 'Entry', type: 'Link' } },
        ],
      },
    });
    environmentMock.getEntry.mockResolvedValueOnce(projectMock);

    const oldTool1Mock = getEntry({});
    oldTool1Mock.unpublish = jest.fn().mockResolvedValueOnce(oldTool1Mock);
    oldTool1Mock.delete = jest.fn().mockResolvedValueOnce(undefined);
    environmentMock.getEntry.mockResolvedValueOnce(oldTool1Mock);

    const oldTool2Mock = getEntry({});
    oldTool2Mock.unpublish = jest.fn().mockResolvedValueOnce(oldTool2Mock);
    oldTool2Mock.delete = jest.fn().mockResolvedValueOnce(undefined);
    environmentMock.getEntry.mockResolvedValueOnce(oldTool2Mock);

    const toolMock = getEntry({});
    toolMock.sys.id = 'new-tool';
    environmentMock.createEntry.mockResolvedValueOnce(toolMock);
    toolMock.publish = jest.fn().mockResolvedValueOnce(toolMock);

    const projectMockUpdated = getEntry({});
    projectMock.patch = jest.fn().mockResolvedValueOnce(projectMockUpdated);

    await dataProvider.update(projectId, { tools: [tool] });

    expect(environmentMock.getEntry).toHaveBeenCalledWith('old-tool-1');
    expect(environmentMock.getEntry).toHaveBeenCalledWith('old-tool-2');
    expect(oldTool1Mock.unpublish).toHaveBeenCalled();
    expect(oldTool1Mock.delete).toHaveBeenCalled();
    expect(oldTool2Mock.unpublish).toHaveBeenCalled();
    expect(oldTool2Mock.delete).toHaveBeenCalled();
    expect(projectMockUpdated.publish).toHaveBeenCalled();
  });

  it('strips blank description from tool payload', async () => {
    const projectId = 'project-1';
    const tool = {
      name: 'Clean Tool',
      url: 'https://clean.com',
      description: '   ',
    };

    const projectMock = getEntry({});
    environmentMock.getEntry.mockResolvedValueOnce(projectMock);

    const toolMock = getEntry({});
    environmentMock.createEntry.mockResolvedValueOnce(toolMock);
    toolMock.publish = jest.fn().mockResolvedValueOnce(toolMock);

    const projectMockUpdated = getEntry({});
    projectMock.patch = jest.fn().mockResolvedValueOnce(projectMockUpdated);

    await dataProvider.update(projectId, { tools: [tool] });

    expect(environmentMock.createEntry).toHaveBeenCalledWith('externalTools', {
      fields: {
        name: { 'en-US': tool.name },
        url: { 'en-US': tool.url },
      },
    });
  });
});

describe('parseContentfulProject', () => {
  it('parses a team-based resource project', () => {
    const resourceTeamItem = {
      ...getResourceTeamProjectGraphqlItem(),
      projectType: 'Resource Project',
    };

    const result = parseContentfulProject(resourceTeamItem as never);

    expect(result).toEqual(getExpectedResourceTeamProject());
  });

  it('parses an individual resource project with user members', () => {
    const resourceIndividualItem = {
      ...getResourceIndividualProjectGraphqlItem(),
      projectType: 'Resource Project',
    };

    const result = parseContentfulProject(resourceIndividualItem as never);

    expect(result).toEqual(getExpectedResourceIndividualProject());
  });
});

describe('parseProjectUserMember', () => {
  it('formats user membership details when typename matches Users', () => {
    const membership = {
      sys: { id: 'membership-users-1' },
      role: 'Contributor',
      projectMember: {
        __typename: 'Users',
        sys: { id: 'user-1' },
        firstName: 'Taylor',
        lastName: 'Swift',
        nickname: 'T',
        email: 'taylor@example.com',
        avatar: { url: 'https://example.com/avatar.png' },
        alumniSinceDate: '2024-01-01',
      },
    } as unknown as UserProjectMembershipItem;

    expect(parseProjectUserMember(membership)).toEqual({
      id: 'user-1',
      displayName: 'Taylor (T) Swift',
      firstName: 'Taylor',
      lastName: 'Swift',
      avatarUrl: 'https://example.com/avatar.png',
      role: 'Contributor',
      email: 'taylor@example.com',
      alumniSinceDate: '2024-01-01',
    });
  });

  it('parses the latest award received by a user member', () => {
    const membership = {
      sys: { id: 'membership-users-1' },
      role: 'Contributor',
      projectMember: {
        __typename: 'Users',
        sys: { id: 'user-1' },
        firstName: 'Taylor',
        lastName: 'Swift',
        nickname: 'T',
        email: 'taylor@example.com',
        avatar: { url: 'https://example.com/avatar.png' },
        alumniSinceDate: '2024-01-01',
        teamsCollection: {
          items: [
            {
              awardsCollection: {
                items: [
                  {
                    date: '2025-09-11',
                    awardType: {
                      name: 'Open Science Champion',
                      icon: {
                        url: 'https://example.com/avatar.jpg',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    } as unknown as UserProjectMembershipItem;

    expect(parseProjectUserMember(membership)).toEqual({
      id: 'user-1',
      displayName: 'Taylor (T) Swift',
      firstName: 'Taylor',
      lastName: 'Swift',
      avatarUrl: 'https://example.com/avatar.png',
      role: 'Contributor',
      email: 'taylor@example.com',
      alumniSinceDate: '2024-01-01',
      latestAward: {
        name: 'Open Science Champion',
        date: '2025-09-11',
        iconUrl: 'https://example.com/avatar.jpg',
      },
    });
  });
});

describe('parseProjectTeamMember', () => {
  it('formats team membership details when typename matches Teams', () => {
    const membership = {
      sys: { id: 'membership-teams-1' },
      projectMember: {
        __typename: 'Teams',
        sys: { id: 'team-1' },
        displayName: 'Awesome Team',
      },
    } as unknown as ProjectMembershipItem;

    expect(parseProjectTeamMember(membership)).toEqual({
      id: 'team-1',
      displayName: 'Awesome Team',
    });
  });

  it('returns placeholder when membership is not a team', () => {
    const membership = {
      sys: { id: 'membership-teams-2' },
      projectMember: {
        __typename: 'WrongType',
        sys: { id: 'user-2' },
      },
    } as unknown as ProjectMembershipItem;

    expect(parseProjectTeamMember(membership)).toEqual({
      id: 'unknown-team-membership-teams-2',
      displayName: '',
    });
  });
});

describe('parseContentfulAims', () => {
  it('returns undefined for undefined input', () => {
    expect(parseContentfulAims(undefined)).toBeUndefined();
  });

  it('returns undefined for array of all null items', () => {
    expect(parseContentfulAims([null, null])).toBeUndefined();
  });

  it('returns undefined for items with empty descriptions', () => {
    expect(
      parseContentfulAims([
        { sys: { id: 'aim-1' }, description: '' },
        { sys: { id: 'aim-2' }, description: '   ' },
      ]),
    ).toBeUndefined();
  });

  it('filters out null items and items with empty descriptions', () => {
    const result = parseContentfulAims([
      null,
      { sys: { id: 'aim-1' }, description: '' },
      { sys: { id: 'aim-2' }, description: 'Valid aim' },
      null,
      { sys: { id: 'aim-3' }, description: '   ' },
      { sys: { id: 'aim-4' }, description: 'Another valid aim' },
    ]);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      expect.objectContaining({ id: 'aim-2', description: 'Valid aim' }),
      expect.objectContaining({
        id: 'aim-4',
        description: 'Another valid aim',
      }),
    ]);
  });

  it('returns properly shaped aims with sequential order starting at 1', () => {
    const result = parseContentfulAims([
      { sys: { id: 'aim-1' }, description: 'First aim' },
      { sys: { id: 'aim-2' }, description: 'Second aim' },
      { sys: { id: 'aim-3' }, description: 'Third aim' },
    ]);

    expect(result).toEqual([
      {
        id: 'aim-1',
        order: 1,
        description: 'First aim',
        status: 'Pending',
        articleCount: 0,
      },
      {
        id: 'aim-2',
        order: 2,
        description: 'Second aim',
        status: 'Pending',
        articleCount: 0,
      },
      {
        id: 'aim-3',
        order: 3,
        description: 'Third aim',
        status: 'Pending',
        articleCount: 0,
      },
    ]);
  });

  it('trims whitespace from descriptions', () => {
    const result = parseContentfulAims([
      { sys: { id: 'aim-1' }, description: '  Padded aim  ' },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ description: 'Padded aim' }),
    ]);
  });

  it('sums article totals across milestones for articleCount', () => {
    const result = parseContentfulAims([
      {
        sys: { id: 'aim-1' },
        description: 'First aim',
        milestonesCollection: {
          items: [
            { status: 'Complete', relatedArticlesCollection: { total: 3 } },
            { status: 'Complete', relatedArticlesCollection: { total: 4 } },
          ],
        },
      },
    ]);

    expect(result![0]).toMatchObject({ articleCount: 7 });
  });

  it('sets articleCount to 0 when aim has no milestones', () => {
    const result = parseContentfulAims([
      { sys: { id: 'aim-1' }, description: 'Test aim' },
    ]);

    expect(result![0]).toMatchObject({ articleCount: 0 });
  });

  describe('deriveAimStatus', () => {
    const aim = (statuses: string[]) => {
      const result = parseContentfulAims([
        {
          sys: { id: 'aim-1' },
          description: 'Test aim',
          milestonesCollection: {
            items: statuses.map((status) => ({
              status,
              relatedArticlesCollection: { total: 0 },
            })),
          },
        },
      ]);
      if (!result?.[0]) throw new Error('Expected aim to be defined');
      return result[0].status;
    };

    it('returns Pending when aim has no milestones', () => {
      const result = parseContentfulAims([
        { sys: { id: 'aim-1' }, description: 'Test aim' },
      ]);
      expect(result![0]).toMatchObject({ status: 'Pending' });
    });

    it('returns Pending when all milestones are Pending', () => {
      expect(aim(['Pending', 'Pending'])).toBe('Pending');
    });

    it('returns Complete when all milestones are Complete', () => {
      expect(aim(['Complete', 'Complete'])).toBe('Complete');
    });

    it('returns Terminated when all milestones are Terminated', () => {
      expect(aim(['Terminated', 'Terminated'])).toBe('Terminated');
    });

    it('returns In Progress when at least one milestone is In Progress', () => {
      expect(aim(['Complete', 'In Progress'])).toBe('In Progress');
    });

    it('returns In Progress when some are Complete and others are Pending', () => {
      expect(aim(['Complete', 'Pending'])).toBe('In Progress');
    });

    it('returns In Progress when some are Terminated and others are Pending', () => {
      expect(aim(['Terminated', 'Pending'])).toBe('In Progress');
    });

    it('returns Complete when some are Complete and others are Terminated', () => {
      expect(aim(['Complete', 'Terminated'])).toBe('Complete');
    });

    it('returns In Progress for a mix of Complete, Terminated, and Pending', () => {
      expect(aim(['Complete', 'Terminated', 'Pending'])).toBe('In Progress');
    });
  });
});

describe('processTraineeProjectMembers', () => {
  it('orders members: trainees, then mentors, then those with no role', () => {
    const members: ProjectMembershipItem[] = [
      {
        sys: { id: 'membership-mentor-1' },
        role: 'Independent Project - Mentor',
        projectMember: {
          __typename: 'Users',
          sys: { id: 'user-mentor-1' },
          firstName: 'Mentor',
          nickname: '',
          lastName: 'One',
          email: 'mentor1@example.com',
          onboarded: true,
          avatar: { url: null },
          alumniSinceDate: undefined,
        },
      },
      {
        sys: { id: 'membership-trainee-1' },
        role: 'Independent Project - Lead',
        projectMember: {
          __typename: 'Users',
          sys: { id: 'user-trainee-1' },
          firstName: 'Trainee',
          nickname: '',
          lastName: 'One',
          email: 'trainee1@example.com',
          onboarded: true,
          avatar: { url: null },
          alumniSinceDate: undefined,
        },
      },
      {
        sys: { id: 'membership-key-personnel' },
        role: 'Trainee Project - Key Personnel',
        projectMember: {
          __typename: 'Users',
          sys: { id: 'user-key-personnel' },
          firstName: 'Key',
          nickname: '',
          lastName: 'Personnel',
          email: 'key@example.com',
          onboarded: true,
          avatar: { url: null },
          alumniSinceDate: undefined,
        },
      },
      {
        sys: { id: 'membership-trainee-2' },
        role: 'Independent Project - Lead',
        projectMember: {
          __typename: 'Users',
          sys: { id: 'user-trainee-2' },
          firstName: 'Trainee',
          nickname: '',
          lastName: 'Two',
          email: 'trainee2@example.com',
          onboarded: true,
          avatar: { url: null },
          alumniSinceDate: undefined,
        },
      },
      {
        sys: { id: 'membership-team' },
        role: 'Supporting Team',
        projectMember: {
          __typename: 'Teams',
          sys: { id: 'team-support' },
          displayName: 'Support Team',
          inactiveSince: null,
          researchTheme: null,
        },
      },
      {
        sys: { id: 'membership-invalid-role' },
        role: 'Invalid Role',
        projectMember: {
          __typename: 'Users',
          sys: { id: 'user-invalid' },
          firstName: 'Invalid',
          nickname: '',
          lastName: 'Role',
          email: 'invalid@example.com',
          onboarded: true,
          avatar: { url: null },
          alumniSinceDate: undefined,
        },
      },
      {
        sys: { id: 'membership-no-role' },
        role: null,
        projectMember: {
          __typename: 'Users',
          sys: { id: 'user-no-role' },
          firstName: 'No',
          nickname: '',
          lastName: 'Role',
          email: 'no-role@example.com',
          onboarded: true,
          avatar: { url: null },
          alumniSinceDate: undefined,
        },
      },
    ] as ProjectMembershipItem[];

    const result = processTraineeProjectMembers(members);

    expect(result).toHaveLength(4);

    // Trainees should come first
    expect(result[0]).toMatchObject({
      id: 'user-trainee-1',
      role: 'Independent Project - Lead',
    });
    expect(result[1]).toMatchObject({
      id: 'user-trainee-2',
      role: 'Independent Project - Lead',
    });

    // Mentors should come after
    expect(result[2]).toMatchObject({
      id: 'user-mentor-1',
      role: 'Independent Project - Mentor',
    });

    // Members with no role come last, so the summary rows stay stable
    expect(result[3]).toMatchObject({ id: 'user-no-role' });
    expect(result[3]?.role).toBeUndefined();

    // Teams, and users holding a role that is not a trainee or mentor role,
    // are not listed on the project
    for (const id of ['team-support', 'user-key-personnel', 'user-invalid']) {
      expect(result).not.toContainEqual(expect.objectContaining({ id }));
    }
  });

  it('returns empty array when the project has no user members', () => {
    const members: ProjectMembershipItem[] = [
      {
        sys: { id: 'membership-team' },
        role: 'Supporting Team',
        projectMember: {
          __typename: 'Teams',
          sys: { id: 'team-support' },
          displayName: 'Support Team',
          inactiveSince: null,
          researchTheme: null,
        },
      },
    ] as ProjectMembershipItem[];

    const result = processTraineeProjectMembers(members);

    expect(result).toHaveLength(0);
  });
});

describe('parseContentfulProjectDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses Discovery Project detail with originalGrant and supplementGrant', () => {
    const discoveryItem = getDiscoveryProjectDetailGraphqlItem({
      originalGrant: 'Original Grant Title',
      proposalId: 'proposal-1',
      supplementGrant: getSupplementGrantFields({
        id: 'supplement-1',
        title: 'Supplement Grant Title',
        description: 'Supplement grant description',
        startDate: '2024-06-01',
        endDate: '2025-06-01',
        proposalId: 'proposal-2',
      }),
      teamDescription: 'Team description for discovery',
    });

    const result = parseContentfulProjectDetail(discoveryItem);

    expect(result).toMatchObject(
      getExpectedDiscoveryProjectDetailWithAllFields(),
    );
  });

  it('parses Discovery Project detail without supplementGrant or teamDescription', () => {
    const discoveryItem = getDiscoveryProjectDetailGraphqlItem({
      originalGrant: 'Original Grant',
      proposalId: null,
      supplementGrant: null,
      teamDescription: null,
    });

    const result = parseContentfulProjectDetail(discoveryItem);

    expect(result).toMatchObject({
      originalGrant: 'Original Grant',
      originalGrantProposalId: undefined,
      supplementGrant: undefined,
      fundedTeam: {
        teamDescription: undefined,
      },
    });
  });

  it('parses Resource Project detail (team-based) with teamDescription', () => {
    const resourceItem = getResourceTeamProjectDetailGraphqlItem({
      originalGrant: 'Resource Original Grant',
      proposalId: 'resource-proposal-1',
      supplementGrant: getSupplementGrantFields({
        id: 'resource-supplement-1',
        title: 'Resource Supplement',
        description: 'Resource supplement description',
        startDate: '2024-01-01',
        endDate: '2025-01-01',
        proposalId: 'resource-proposal-2',
      }),
      teamDescription: 'Resource team description',
    });

    const result = parseContentfulProjectDetail(resourceItem);

    expect(result).toMatchObject({
      id: 'resource-team-1',
      projectType: 'Resource Project',
      originalGrant: 'Resource Original Grant',
      originalGrantProposalId: 'resource-proposal-1',
      supplementGrant: {
        grantTitle: 'Resource Supplement',
        grantDescription: 'Resource supplement description',
        grantProposalId: 'resource-proposal-2',
        grantStartDate: '2024-01-01',
        grantEndDate: '2025-01-01',
      },
      fundedTeam: {
        id: 'resource-team-main',
        displayName: 'Resource Team',
        teamType: 'Resource Team',
        researchTheme: 'Resource Theme',
        teamDescription: 'Resource team description',
      },
    });
  });

  it('parses Resource Project detail (non-team-based) with user members', () => {
    const resourceItem = getResourceIndividualProjectDetailGraphqlItem({
      originalGrant: 'Individual Resource Grant',
      proposalId: 'individual-proposal-1',
      supplementGrant: null,
    });

    const result = parseContentfulProjectDetail(resourceItem);

    expect(result).toMatchObject({
      id: 'resource-individual-1',
      projectType: 'Resource Project',
      originalGrant: 'Individual Resource Grant',
      originalGrantProposalId: 'individual-proposal-1',
      supplementGrant: undefined,
      members: [
        {
          id: 'user-2',
          displayName: 'Jamie Lee',
        },
        {
          id: 'user-3',
          displayName: 'Pat (Patty) Stone',
        },
      ],
    });
    expect(result).not.toHaveProperty('fundedTeam');
  });

  it('parses Trainee Project detail with grants', () => {
    const traineeItem = getTraineeProjectDetailGraphqlItem({
      originalGrant: 'Trainee Original Grant',
      proposalId: 'trainee-proposal-1',
      supplementGrant: getSupplementGrantFields({
        id: 'trainee-supplement-1',
        title: 'Trainee Supplement',
        description: 'Trainee supplement description',
        startDate: '2024-06-01',
        endDate: '2025-06-01',
        proposalId: 'trainee-proposal-2',
      }),
    });

    const result = parseContentfulProjectDetail(
      traineeItem,
    ) as TraineeProjectDetail;

    expect(result).toMatchObject({
      id: 'trainee-1',
      projectType: 'Trainee Project',
      originalGrant: 'Trainee Original Grant',
      originalGrantProposalId: 'trainee-proposal-1',
      supplementGrant: {
        grantTitle: 'Trainee Supplement',
        grantDescription: 'Trainee supplement description',
        grantProposalId: 'trainee-proposal-2',
        grantStartDate: '2024-06-01',
        grantEndDate: '2025-06-01',
      },
    });

    // Verify members are included and ordered correctly: trainees first, then mentors
    expect(result.members).toBeDefined();
    expect(result.members).toHaveLength(2);
    expect(result.members[0]).toMatchObject({
      id: 'user-trainee',
      role: 'Independent Project - Lead',
    });
    // Mentor should come after
    expect(result.members[1]).toMatchObject({
      id: 'user-trainer',
      role: 'Independent Project - Mentor',
    });
  });

  it('parses Trainee Project detail dropping a member whose role was retired', () => {
    const traineeItem = getTraineeProjectDetailGraphqlItem({
      originalGrant: 'Trainee Original Grant',
      proposalId: 'trainee-proposal-1',
    });

    traineeItem.membersCollection = {
      total: 2,
      items: [
        {
          sys: { id: 'membership-trainee-trainee' },
          role: 'Independent Project - Lead',
          projectMember: {
            __typename: 'Users',
            sys: { id: 'user-trainee' },
            firstName: 'Dana',
            nickname: '',
            lastName: 'Lopez',
            email: 'dana@example.com',
            onboarded: true,
            avatar: { url: null },
            alumniSinceDate: undefined,
          },
        },
        {
          sys: { id: 'membership-trainee-key-personnel' },
          role: 'Trainee Project - Key Personnel',
          projectMember: {
            __typename: 'Users',
            sys: { id: 'user-key-personnel' },
            firstName: 'Key',
            nickname: '',
            lastName: 'Personnel',
            email: 'key@example.com',
            onboarded: true,
            avatar: { url: null },
            alumniSinceDate: undefined,
          },
        },
      ],
    };

    const result = parseContentfulProjectDetail(
      traineeItem,
    ) as TraineeProjectDetail;

    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toMatchObject({
      id: 'user-trainee',
      role: 'Independent Project - Lead',
    });
    expect(result.members).not.toContainEqual(
      expect.objectContaining({ id: 'user-key-personnel' }),
    );
  });

  it('parses Discovery Project detail fallback when no team member exists', () => {
    const discoveryItemWithoutTeam = {
      ...getDiscoveryProjectWithoutTeamGraphqlItem(),
      ...getOriginalGrantFields({
        originalGrant: 'Original Grant Without Team',
        proposalId: 'proposal-no-team',
      }),
      supplementGrant: getSupplementGrantFields({
        id: 'supplement-no-team',
        title: 'Supplement Grant Without Team',
        description: 'Supplement grant description',
        proposalId: 'supplement-proposal-no-team',
      }),
    };

    const result = parseContentfulProjectDetail(discoveryItemWithoutTeam);

    expect(result).toMatchObject({
      id: 'discovery-no-team',
      projectType: 'Discovery Project',
      originalGrant: 'Original Grant Without Team',
      originalGrantProposalId: 'proposal-no-team',
      supplementGrant: {
        grantTitle: 'Supplement Grant Without Team',
        grantDescription: 'Supplement grant description',
        grantProposalId: 'supplement-proposal-no-team',
      },
      // Should not have fundedTeam or collaborators when no team exists
      researchTheme: '',
      teamName: '',
    });
    expect(result).not.toHaveProperty('fundedTeam');
    expect(result).not.toHaveProperty('collaborators');
  });

  it('throws when parseContentfulProjectDetail encounters an unknown project type', () => {
    const invalidItem = {
      ...getDiscoveryProjectDetailGraphqlItem({
        originalGrant: 'Test Grant',
        proposalId: null,
        supplementGrant: null,
        teamDescription: null,
      }),
      projectType: 'Unknown Project Type', // Invalid type
    };

    expect(() => parseContentfulProjectDetail(invalidItem as never)).toThrow(
      'Unknown project type: Unknown Project Type',
    );
  });

  describe('parseContentfulProjectDetail - collaboratingTeams', () => {
    const setFundedTeamResearchOutputs = (
      graphqlItem: ReturnType<typeof getDiscoveryProjectDetailGraphqlItem>,
      items: unknown[],
    ) => {
      const teamMember = (graphqlItem as Record<string, unknown>)
        .membersCollection as {
        items: Array<{ projectMember: Record<string, unknown> }>;
      };
      const team = teamMember.items.find(
        (m) =>
          (m.projectMember as { __typename?: string }).__typename === 'Teams',
      );
      const existing =
        (team!.projectMember.linkedFrom as Record<string, unknown>) || {};
      team!.projectMember.linkedFrom = {
        ...existing,
        researchOutputsCollection: { items },
      };
    };

    it('groups co-author teams from funded team Articles', () => {
      const graphqlItem = getDiscoveryProjectDetailGraphqlItem();
      setFundedTeamResearchOutputs(graphqlItem, [
        {
          sys: { id: 'ro-1' },
          title: 'Shared Article 1',
          documentType: 'Article',
          type: 'Preprint',
          teamsCollection: {
            items: [
              { sys: { id: 'team-1' }, displayName: 'Funded' },
              { sys: { id: 'team-b' }, displayName: 'Team B' },
            ],
          },
        },
        {
          sys: { id: 'ro-2' },
          title: 'Shared Article 2',
          documentType: 'Article',
          type: 'Published',
          teamsCollection: {
            items: [
              { sys: { id: 'team-1' }, displayName: 'Funded' },
              { sys: { id: 'team-a' }, displayName: 'Team A' },
              { sys: { id: 'team-b' }, displayName: 'Team B' },
            ],
          },
        },
      ]);

      const result = parseContentfulProjectDetail(graphqlItem);

      expect(result).toMatchObject({
        collaboratingTeams: [
          {
            id: 'team-a',
            displayName: 'Team A',
            articles: [
              { id: 'ro-2', title: 'Shared Article 2', type: 'Published' },
            ],
          },
          {
            id: 'team-b',
            displayName: 'Team B',
            articles: [
              { id: 'ro-1', title: 'Shared Article 1', type: 'Preprint' },
              { id: 'ro-2', title: 'Shared Article 2', type: 'Published' },
            ],
          },
        ],
      });
    });

    it('ignores research outputs that are not Articles', () => {
      const graphqlItem = getDiscoveryProjectDetailGraphqlItem();
      setFundedTeamResearchOutputs(graphqlItem, [
        {
          sys: { id: 'ro-dataset' },
          title: 'A dataset',
          documentType: 'Dataset',
          type: 'Code',
          teamsCollection: {
            items: [
              { sys: { id: 'team-1' }, displayName: 'Funded' },
              { sys: { id: 'team-b' }, displayName: 'Team B' },
            ],
          },
        },
      ]);

      const result = parseContentfulProjectDetail(graphqlItem);

      expect(
        (result as { collaboratingTeams?: unknown }).collaboratingTeams,
      ).toBeUndefined();
    });

    it('captures each collaborating team’s own teamType', () => {
      const graphqlItem = getDiscoveryProjectDetailGraphqlItem();
      setFundedTeamResearchOutputs(graphqlItem, [
        {
          sys: { id: 'ro-mix' },
          title: 'Mixed Article',
          documentType: 'Article',
          type: 'Preprint',
          teamsCollection: {
            items: [
              {
                sys: { id: 'team-1' },
                displayName: 'Funded',
                teamType: 'Discovery Team',
              },
              {
                sys: { id: 'team-discovery' },
                displayName: 'Team Discovery',
                teamType: 'Discovery Team',
              },
              {
                sys: { id: 'team-resource' },
                displayName: 'Team Resource',
                teamType: 'Resource Team',
              },
            ],
          },
        },
      ]);

      const result = parseContentfulProjectDetail(graphqlItem) as {
        collaboratingTeams?: Array<{ id: string; teamType?: string }>;
      };

      expect(result.collaboratingTeams).toEqual([
        expect.objectContaining({
          id: 'team-discovery',
          teamType: 'Discovery Team',
        }),
        expect.objectContaining({
          id: 'team-resource',
          teamType: 'Resource Team',
        }),
      ]);
    });

    it('omits collaboratingTeams when there are no co-authors', () => {
      const graphqlItem = getDiscoveryProjectDetailGraphqlItem();
      setFundedTeamResearchOutputs(graphqlItem, [
        {
          sys: { id: 'ro-solo' },
          title: 'Solo Article',
          documentType: 'Article',
          type: 'Preprint',
          teamsCollection: {
            items: [{ sys: { id: 'team-1' }, displayName: 'Funded' }],
          },
        },
      ]);

      const result = parseContentfulProjectDetail(graphqlItem);

      expect(
        (result as { collaboratingTeams?: unknown }).collaboratingTeams,
      ).toBeUndefined();
    });

    it('populates collaboratingTeams on a team-based Resource project', () => {
      const graphqlItem = getResourceTeamProjectDetailGraphqlItem();
      const teamMember = (graphqlItem as Record<string, unknown>)
        .membersCollection as {
        items: Array<{ projectMember: Record<string, unknown> }>;
      };
      const team = teamMember.items.find(
        (m) =>
          (m.projectMember as { __typename?: string }).__typename === 'Teams',
      );
      const existing =
        (team!.projectMember.linkedFrom as Record<string, unknown>) || {};
      team!.projectMember.linkedFrom = {
        ...existing,
        researchOutputsCollection: {
          items: [
            {
              sys: { id: 'ro-resource-1' },
              title: 'Resource Article 1',
              documentType: 'Article',
              type: 'Preprint',
              teamsCollection: {
                items: [
                  {
                    sys: { id: 'resource-team-main' },
                    displayName: 'Resource Team',
                    teamType: 'Resource Team',
                  },
                  {
                    sys: { id: 'team-collab' },
                    displayName: 'Collab Team',
                    teamType: 'Discovery Team',
                  },
                ],
              },
            },
          ],
        },
      };

      const result = parseContentfulProjectDetail(graphqlItem) as {
        collaboratingTeams?: Array<{ id: string; displayName: string }>;
      };

      expect(result.collaboratingTeams).toEqual([
        expect.objectContaining({
          id: 'team-collab',
          displayName: 'Collab Team',
        }),
      ]);
    });
  });

  describe('ProjectContentfulDataProvider - fetch with projectMembershipId filter', () => {
    const contentfulClientMock = getContentfulGraphqlClientMock();
    const dataProvider = new ProjectContentfulDataProvider(
      contentfulClientMock,
    );

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('fetches projects by membership ID when projectMembershipId filter is provided', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        projectMembership: {
          sys: { id: 'membership-1' },
          linkedFrom: {
            projectsCollection: {
              total: 2,
              items: [
                getDiscoveryProjectGraphqlItem(),
                getResourceTeamProjectGraphqlItem(),
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetch({
        filter: { projectMembershipId: 'membership-1' },
        take: 10,
        skip: 0,
      });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(contentfulClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        {
          membershipId: 'membership-1',
          limit: 20,
        },
      );
    });

    it('returns empty list when project membership does not exist', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        projectMembership: null,
      });

      const result = await dataProvider.fetch({
        filter: { projectMembershipId: 'non-existent' },
      });

      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    it('returns empty list when project membership has no linked projects', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        projectMembership: {
          sys: { id: 'membership-1' },
          linkedFrom: {
            projectsCollection: null,
          },
        },
      });

      const result = await dataProvider.fetch({
        filter: { projectMembershipId: 'membership-1' },
      });

      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    it('filters out null projects from the results', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        projectMembership: {
          sys: { id: 'membership-1' },
          linkedFrom: {
            projectsCollection: {
              total: 3,
              items: [
                getDiscoveryProjectGraphqlItem(),
                null,
                getResourceTeamProjectGraphqlItem(),
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetch({
        filter: { projectMembershipId: 'membership-1' },
      });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it('applies pagination correctly to filtered results', async () => {
      const projects = [
        getDiscoveryProjectGraphqlItem(),
        getResourceTeamProjectGraphqlItem(),
        getResourceIndividualProjectGraphqlItem(),
        getTraineeProjectGraphqlItem(),
      ];

      contentfulClientMock.request.mockResolvedValueOnce({
        projectMembership: {
          sys: { id: 'membership-1' },
          linkedFrom: {
            projectsCollection: {
              total: 4,
              items: projects,
            },
          },
        },
      });

      const result = await dataProvider.fetch({
        filter: { projectMembershipId: 'membership-1' },
        take: 2,
        skip: 1,
      });

      expect(result.total).toBe(4);
      expect(result.items).toHaveLength(2);
      // Should return items at index 1 and 2
      expect(result.items[0]).toMatchObject({
        id: projects[1]?.sys.id,
      });
      expect(result.items[1]).toMatchObject({
        id: projects[2]?.sys.id,
      });
    });
  });

  describe('ProjectContentfulDataProvider - fetchByTeamId', () => {
    const contentfulClientMock = getContentfulGraphqlClientMock();
    const dataProvider = new ProjectContentfulDataProvider(
      contentfulClientMock,
    );

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('fetches projects for a given team ID', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        teams: {
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getDiscoveryProjectGraphqlItem()],
                    },
                  },
                },
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getResourceTeamProjectGraphqlItem()],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetchByTeamId('team-1', {
        take: 10,
        skip: 0,
      });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(contentfulClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        {
          teamId: 'team-1',
          limit: 100,
        },
      );
    });

    it('returns empty list when team does not exist', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        teams: null,
      });

      const result = await dataProvider.fetchByTeamId('non-existent', {
        take: 10,
        skip: 0,
      });

      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    it('returns empty list when team has no project memberships', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        teams: {
          linkedFrom: {
            projectMembershipCollection: null,
          },
        },
      });

      const result = await dataProvider.fetchByTeamId('team-1', {
        take: 10,
        skip: 0,
      });

      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    it('deduplicates projects when team has multiple memberships to same project', async () => {
      const discoveryProject = getDiscoveryProjectGraphqlItem();

      contentfulClientMock.request.mockResolvedValueOnce({
        teams: {
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [discoveryProject],
                    },
                  },
                },
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [discoveryProject], // Same project again
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetchByTeamId('team-1', {
        take: 10,
        skip: 0,
      });

      expect(result.total).toBe(1); // Should be deduplicated
      expect(result.items).toHaveLength(1);
    });

    it('filters out null memberships', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        teams: {
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                null,
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getDiscoveryProjectGraphqlItem()],
                    },
                  },
                },
                null,
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetchByTeamId('team-1', {
        take: 10,
        skip: 0,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('applies pagination correctly after deduplication', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        teams: {
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getDiscoveryProjectGraphqlItem()],
                    },
                  },
                },
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getResourceTeamProjectGraphqlItem()],
                    },
                  },
                },
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getResourceIndividualProjectGraphqlItem()],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetchByTeamId('team-1', {
        take: 1,
        skip: 1,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('ProjectContentfulDataProvider - fetchByUserId', () => {
    const contentfulClientMock = getContentfulGraphqlClientMock();
    const dataProvider = new ProjectContentfulDataProvider(
      contentfulClientMock,
    );

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('fetches projects for a given user ID', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        users: {
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getDiscoveryProjectGraphqlItem()],
                    },
                  },
                },
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getResourceTeamProjectGraphqlItem()],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetchByUserId('user-1', {
        take: 10,
        skip: 0,
      });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(contentfulClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        {
          userId: 'user-1',
          limit: 100,
        },
      );
    });

    it('returns empty list when user does not exist', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        users: null,
      });

      const result = await dataProvider.fetchByUserId('non-existent', {
        take: 10,
        skip: 0,
      });

      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    it('returns empty list when user has no project memberships', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        users: {
          linkedFrom: {
            projectMembershipCollection: null,
          },
        },
      });

      const result = await dataProvider.fetchByUserId('user-1', {
        take: 10,
        skip: 0,
      });

      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    it('deduplicates projects when user has multiple memberships to same project', async () => {
      const discoveryProject = getDiscoveryProjectGraphqlItem();

      contentfulClientMock.request.mockResolvedValueOnce({
        users: {
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [discoveryProject],
                    },
                  },
                },
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [discoveryProject], // Same project again
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetchByUserId('user-1', {
        take: 10,
        skip: 0,
      });

      expect(result.total).toBe(1); // Should be deduplicated
      expect(result.items).toHaveLength(1);
    });

    it('filters out null memberships', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        users: {
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                null,
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getDiscoveryProjectGraphqlItem()],
                    },
                  },
                },
                null,
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetchByUserId('user-1', {
        take: 10,
        skip: 0,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('applies pagination correctly after deduplication', async () => {
      contentfulClientMock.request.mockResolvedValueOnce({
        users: {
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getDiscoveryProjectGraphqlItem()],
                    },
                  },
                },
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getResourceTeamProjectGraphqlItem()],
                    },
                  },
                },
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [getResourceIndividualProjectGraphqlItem()],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await dataProvider.fetchByUserId('user-1', {
        take: 1,
        skip: 1,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(1);
    });
  });
});

describe('ProjectContentfulDataProvider - createMilestone', () => {
  const contentfulClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const dataProvider = new ProjectContentfulDataProvider(
    contentfulClientMock,
    contentfulRestClientMock,
  );

  const dataProviderWithoutRestClient = new ProjectContentfulDataProvider(
    contentfulClientMock,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  const milestoneData: MilestoneCreateRequest = {
    grantType: 'original',
    description: 'Test milestone',
    status: 'Complete',
    relatedArticleIds: ['article-1'],
    aimIds: ['aim-1', 'aim-2'],
  };

  it('throws when REST client is not available', async () => {
    await expect(
      dataProviderWithoutRestClient.createMilestone(milestoneData, 'user-1'),
    ).rejects.toThrow('REST client not available');
  });

  it('creates and publishes a milestone, recording status and outputs-linked audit fields when articles are associated', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-04T10:00:00.000Z'));

    const publish = jest.fn().mockResolvedValue({} as Entry);

    const milestoneEntryMock = {
      sys: { id: 'milestone-1' },
      publish,
    } as unknown as Entry;

    environmentMock.createEntry.mockResolvedValueOnce(milestoneEntryMock);

    const aimEntryMock = {
      fields: { milestones: { 'en-US': [] } },
      patch: jest.fn().mockResolvedValue({ publish }),
    } as unknown as Entry;

    environmentMock.getEntry.mockResolvedValue(aimEntryMock);

    const result = await dataProvider.createMilestone(milestoneData, 'user-1');

    expect(environmentMock.createEntry).toHaveBeenCalledWith(
      'milestones',
      expect.objectContaining({
        fields: {
          description: { 'en-US': milestoneData.description },
          status: { 'en-US': milestoneData.status },
          relatedArticles: {
            'en-US': [
              {
                sys: {
                  id: 'article-1',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
          statusUpdatedAt: { 'en-US': new Date('2026-05-04T10:00:00.000Z') },
          statusUpdatedBy: {
            'en-US': {
              sys: { type: 'Link', linkType: 'Entry', id: 'user-1' },
            },
          },
          outputsLinkedAt: { 'en-US': new Date('2026-05-04T10:00:00.000Z') },
          outputsLinkedBy: {
            'en-US': {
              sys: { type: 'Link', linkType: 'Entry', id: 'user-1' },
            },
          },
        },
      }),
    );

    expect(publish).toHaveBeenCalled();
    expect(result).toBe('milestone-1');

    jest.useRealTimers();
  });

  it('appends milestone link to each aim and publishes', async () => {
    const publish = jest.fn().mockResolvedValue({} as Entry);

    const milestoneEntryMock = {
      sys: { id: 'milestone-1' },
      publish,
    } as unknown as Entry;

    environmentMock.createEntry.mockResolvedValueOnce(milestoneEntryMock);

    const aimEntryMock1 = {
      fields: { milestones: { 'en-US': [] } },
      patch: jest.fn().mockResolvedValue({ publish }),
    } as unknown as Entry;

    const existingMilestone = {
      sys: { id: 'existing', linkType: 'Entry', type: 'Link' },
    };

    const aimEntryMock2 = {
      fields: { milestones: { 'en-US': [existingMilestone] } },
      patch: jest.fn().mockResolvedValue({ publish }),
    } as unknown as Entry;

    environmentMock.getEntry
      .mockResolvedValueOnce(aimEntryMock1)
      .mockResolvedValueOnce(aimEntryMock2);

    await dataProvider.createMilestone(milestoneData, 'user-1');

    expect(environmentMock.getEntry).toHaveBeenCalledWith('aim-1');
    expect(environmentMock.getEntry).toHaveBeenCalledWith('aim-2');

    expect(aimEntryMock1.patch).toHaveBeenCalledWith([
      {
        op: 'replace',
        path: '/fields/milestones',
        value: {
          'en-US': [
            {
              sys: {
                id: 'milestone-1',
                linkType: 'Entry',
                type: 'Link',
              },
            },
          ],
        },
      },
    ]);

    expect(aimEntryMock2.patch).toHaveBeenCalledWith([
      {
        op: 'replace',
        path: '/fields/milestones',
        value: {
          'en-US': [
            existingMilestone,
            {
              sys: {
                id: 'milestone-1',
                linkType: 'Entry',
                type: 'Link',
              },
            },
          ],
        },
      },
    ]);
  });

  it('records status audit fields but not outputs-linked fields when no articles are associated', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-04T10:00:00.000Z'));

    const publish = jest.fn().mockResolvedValue({} as Entry);

    const milestoneEntryMock = {
      sys: { id: 'milestone-1' },
      publish,
    } as unknown as Entry;

    environmentMock.createEntry.mockResolvedValueOnce(milestoneEntryMock);

    const aimEntryMock = {
      fields: { milestones: { 'en-US': [] } },
      patch: jest.fn().mockResolvedValue({ publish }),
    } as unknown as Entry;

    environmentMock.getEntry.mockResolvedValue(aimEntryMock);

    await dataProvider.createMilestone(
      {
        ...milestoneData,
        relatedArticleIds: [],
      },
      'user-1',
    );

    expect(environmentMock.createEntry).toHaveBeenCalledWith(
      'milestones',
      expect.objectContaining({
        fields: {
          description: { 'en-US': milestoneData.description },
          status: { 'en-US': milestoneData.status },
          relatedArticles: { 'en-US': [] },
          statusUpdatedAt: { 'en-US': new Date('2026-05-04T10:00:00.000Z') },
          statusUpdatedBy: {
            'en-US': {
              sys: { type: 'Link', linkType: 'Entry', id: 'user-1' },
            },
          },
        },
      }),
    );

    const createCall = environmentMock.createEntry.mock.calls[0]?.[1];
    expect(createCall?.fields).not.toHaveProperty('outputsLinkedAt');
    expect(createCall?.fields).not.toHaveProperty('outputsLinkedBy');

    jest.useRealTimers();
  });
});

describe('ProjectContentfulDataProvider - isProjectMilestonesSynced', () => {
  const contentfulClientMock = getContentfulGraphqlClientMock();

  const opensearchProviderMock = {
    search: jest.fn(),
  };

  const dataProvider = new ProjectContentfulDataProvider(
    contentfulClientMock,
    undefined,
    opensearchProviderMock as any,
  );

  const mockProjectMilestoneIdsResponse = {
    projects: {
      originalGrantAimsCollection: {
        items: [
          {
            milestonesCollection: {
              items: [{ sys: { id: 'a' } }, { sys: { id: 'b' } }],
            },
          },
          {
            milestonesCollection: {
              items: [{ sys: { id: 'c' } }],
            },
          },
        ],
      },
      supplementGrant: {
        aimsCollection: {
          items: [
            {
              milestonesCollection: {
                items: [{ sys: { id: 'd' } }],
              },
            },
          ],
        },
      },
    },
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns true when Contentful and OpenSearch milestone IDs match', async () => {
    contentfulClientMock.request.mockResolvedValueOnce(
      mockProjectMilestoneIdsResponse,
    );

    // OpenSearch response
    opensearchProviderMock.search.mockResolvedValueOnce({
      hits: {
        hits: [
          { _source: { id: 'b' } },
          { _source: { id: 'a' } },
          { _source: { id: 'c' } },
          { _source: { id: 'd' } },
        ],
      },
    });

    const result = await dataProvider.isProjectMilestonesSynced('project-1');

    expect(result).toBe(true);
  });

  it('returns false when counts differ', async () => {
    contentfulClientMock.request.mockResolvedValueOnce(
      mockProjectMilestoneIdsResponse,
    );

    opensearchProviderMock.search.mockResolvedValueOnce({
      hits: {
        hits: [{ _source: { id: 'a' } }],
      },
    });

    const result = await dataProvider.isProjectMilestonesSynced('project-1');

    expect(result).toBe(false);
  });

  it('throws an error when opensearch provider is not configured properly', async () => {
    contentfulClientMock.request.mockResolvedValueOnce(
      mockProjectMilestoneIdsResponse,
    );
    const dataProviderWithoutOpenSearch = new ProjectContentfulDataProvider(
      contentfulClientMock,
      undefined,
    );
    await expect(
      dataProviderWithoutOpenSearch.isProjectMilestonesSynced('project-1'),
    ).rejects.toThrow(
      'Opensearch Provider not configured for ProjectContentfulDataProvider',
    );
  });
});
