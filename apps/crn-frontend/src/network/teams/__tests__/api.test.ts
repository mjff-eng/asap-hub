import {
  AlgoliaSearchClient,
  ClientSearchResponse,
  createAlgoliaResponse,
} from '@asap-hub/algolia';
import {
  createDiscussionResponse,
  createListLabsResponse,
  createListTeamResponse,
  createManuscriptResponse,
  createManuscriptVersionResponse,
  createMessage,
  createPartialManuscriptResponse,
  createTeamListItemResponse,
  createTeamResponse,
} from '@asap-hub/fixtures';
import {
  DiscussionCreateRequest,
  DiscussionDataObject,
  DiscussionResponse,
  ManuscriptFileResponse,
  ManuscriptPutRequest,
  RequestedAPCCoverageOption,
  ResearchOutputPostRequest,
} from '@asap-hub/model';
import { GetListOptions } from '@asap-hub/frontend-utils';
import nock from 'nock';
import { getPresignedUrl } from '../../../shared-api/files';

import { API_BASE_URL } from '../../../config';
import { CARD_VIEW_PAGE_SIZE } from '../../../hooks';
import {
  createDiscussion,
  createPreprintResearchOutput,
  createResearchOutput,
  getAlgoliaTeams,
  getDiscussion,
  getLabs,
  getManuscript,
  getManuscripts,
  getManuscriptVersionByManuscriptId,
  getManuscriptVersions,
  getManuscriptWorkspaceUrl,
  getTeam,
  getTeams,
  GetTeamsListOptions,
  markDiscussionAsRead,
  updateDiscussion,
  updateManuscript,
  updateTeamResearchOutput,
  uploadManuscriptFile,
  getTeamAwardMetrics,
} from '../api';

jest.mock('../../../config', () => ({
  API_BASE_URL: 'http://api',
}));

afterEach(() => {
  nock.cleanAll();
});

const options: GetTeamsListOptions = {
  pageSize: CARD_VIEW_PAGE_SIZE,
  currentPage: 0,
  searchQuery: '',
  teamType: 'all',
};

describe('getTeams', () => {
  it('makes an authorized GET request for teams', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .get('/teams')
      .query({ take: '10', skip: '0' })
      .reply(200, {});
    await getTeams(options, 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('returns successfully fetched teams', async () => {
    const teams = createListTeamResponse(1);
    nock(API_BASE_URL)
      .get('/teams')
      .query({ take: '10', skip: '0' })
      .reply(200, teams);
    expect(await getTeams(options, '')).toEqual(teams);
  });

  it('errors for error status', async () => {
    nock(API_BASE_URL)
      .get('/teams')
      .query({ take: '10', skip: '0' })
      .reply(500);
    await expect(
      getTeams(options, ''),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to fetch team list. Expected status 2xx. Received status 500."`,
    );
  });
});

describe('getAlgoliaTeams', () => {
  type Search = () => Promise<ClientSearchResponse<'crn', 'team'>>;
  const search: jest.MockedFunction<Search> = jest.fn();

  const algoliaSearchClient = {
    search,
  } as unknown as AlgoliaSearchClient<'crn'>;

  beforeEach(() => {
    search.mockReset();

    const teamResponse = createTeamListItemResponse();

    search.mockResolvedValue(
      createAlgoliaResponse<'crn', 'team'>([
        {
          ...teamResponse,
          objectID: teamResponse.id,
          __meta: { type: 'team' },
        },
      ]),
    );
  });

  it('will not specify page and limits hits per page by default', async () => {
    await getAlgoliaTeams(algoliaSearchClient, {
      ...options,
      pageSize: null,
      currentPage: null,
    });
    expect(search).toHaveBeenCalledWith(
      ['team'],
      '',
      expect.objectContaining({
        hitsPerPage: undefined,
        page: undefined,
      }),
    );
  });

  it('will pass the search query to algolia', async () => {
    await getAlgoliaTeams(algoliaSearchClient, {
      ...options,
      searchQuery: 'Hello World!',
    });
    expect(search).toHaveBeenCalledWith(
      ['team'],
      'Hello World!',
      expect.objectContaining({}),
    );
  });

  it('can filter teams by a single team status', async () => {
    await getAlgoliaTeams(algoliaSearchClient, {
      ...options,
      teamType: 'Discovery Team',
      status: ['Active'],
    });
    expect(search).toHaveBeenCalledWith(
      ['team'],
      '',
      expect.objectContaining({
        filters: '(teamType:"Discovery Team") AND (teamStatus:"Active")',
      }),
    );
  });

  it('can filter teams by multiple team statuses (OR)', async () => {
    await getAlgoliaTeams(algoliaSearchClient, {
      ...options,
      teamType: 'Discovery Team',
      status: ['Active', 'Inactive'],
    });
    expect(search).toHaveBeenCalledWith(
      ['team'],
      '',
      expect.objectContaining({
        filters:
          '(teamType:"Discovery Team") AND (teamStatus:"Active" OR teamStatus:"Inactive")',
      }),
    );
  });

  it.each`
    teamType            | filter
    ${'Discovery Team'} | ${'teamType:"Discovery Team"'}
    ${'Resource Team'}  | ${'teamType:"Resource Team"'}
    ${'all'}            | ${'teamType:"Discovery Team" OR teamType:"Resource Team"'}
  `('can filter teams by team type $teamType', async ({ teamType, filter }) => {
    await getAlgoliaTeams(algoliaSearchClient, {
      ...options,
      teamType,
    });
    expect(search).toHaveBeenCalledWith(
      ['team'],
      '',
      expect.objectContaining({
        filters: filter,
      }),
    );
  });

  it('can filter teams by team type and status', async () => {
    const teamType = 'Resource Team';
    await getAlgoliaTeams(algoliaSearchClient, {
      ...options,
      teamType,
      status: ['Inactive'],
    });
    expect(search).toHaveBeenCalledWith(
      ['team'],
      '',
      expect.objectContaining({
        filters: `(teamType:"${teamType}") AND (teamStatus:"Inactive")`,
      }),
    );
  });

  it('can filter teams by research theme', async () => {
    await getAlgoliaTeams(algoliaSearchClient, {
      ...options,
      teamType: 'Discovery Team',
      researchTheme: ['Theme1'],
    });
    expect(search).toHaveBeenCalledWith(
      ['team'],
      '',
      expect.objectContaining({
        filters: '(teamType:"Discovery Team") AND (researchTheme:"Theme1")',
      }),
    );
  });

  it('can filter teams by team type, status, and research theme', async () => {
    await getAlgoliaTeams(algoliaSearchClient, {
      ...options,
      teamType: 'Discovery Team',
      status: ['Active'],
      researchTheme: ['Theme1', 'Theme2'],
    });
    expect(search).toHaveBeenCalledWith(
      ['team'],
      '',
      expect.objectContaining({
        filters:
          '(teamType:"Discovery Team") AND (teamStatus:"Active") AND (researchTheme:"Theme1" OR researchTheme:"Theme2")',
      }),
    );
  });

  it('returns successfully fetched teams', async () => {
    const teams = createListTeamResponse(1);

    const transformedTeams = {
      ...teams,
      items: teams.items.map((item) => ({
        ...item,
        objectID: '',
        __meta: {
          type: 'team' as const,
        },
      })),
    };
    search.mockResolvedValueOnce({
      hits: transformedTeams.items,
      nbHits: transformedTeams.total,
      page: 0,
      nbPages: 0,
      hitsPerPage: 0,
      processingTimeMS: 0,
      exhaustiveNbHits: false,
      query: '',
      params: '',
    });
    expect(await getAlgoliaTeams(algoliaSearchClient, options)).toEqual(
      transformedTeams,
    );
  });
});

describe('getTeam', () => {
  it('makes an authorized GET request for the team id', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .get('/teams/42')
      .reply(200, {});
    await getTeam('42', 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('returns a successfully fetched team', async () => {
    const team = createTeamResponse();
    nock(API_BASE_URL).get('/teams/42').reply(200, team);
    expect(await getTeam('42', '')).toEqual(team);
  });

  it('returns undefined for a 404', async () => {
    nock(API_BASE_URL).get('/teams/42').reply(404);
    expect(await getTeam('42', '')).toBe(undefined);
  });

  it('errors for another status', async () => {
    nock(API_BASE_URL).get('/teams/42').reply(500);
    await expect(getTeam('42', '')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to fetch team with id 42. Expected status 2xx or 404. Received status 500."`,
    );
  });
});

describe('Team Research Output', () => {
  const payload: ResearchOutputPostRequest = {
    teams: ['90210'],
    documentType: 'Bioinformatics',
    link: 'http://a-link',
    title: 'A title',
    asapFunded: false,
    usedInPublication: false,
    sharingStatus: 'Public',
    publishDate: undefined,
    description: '',
    descriptionMD: '',
    shortDescription: '',
    type: 'Software',
    labs: ['lab1'],
    methods: [],
    keywords: [],
    organisms: [],
    environments: [],
    workingGroups: [],
    relatedResearch: [],
    relatedEvents: [],
    published: true,
  };
  it('makes an authorized POST request to create a research output', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .post('/research-outputs', payload)
      .reply(201, { id: 123 });

    await createResearchOutput(payload, 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('makes an authorized POST request to create a draft research output', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .post('/research-outputs', payload)
      .reply(201, { id: 123 });

    await createResearchOutput(payload, 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('makes an authorized PUT request to update a research output', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .put('/research-outputs/123', payload)
      .reply(200, { id: 123 });

    await updateTeamResearchOutput('123', payload, 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('makes an authorized PUT request to update and publish a research output', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .put('/research-outputs/123', payload)
      .reply(200, { id: 123 });

    await updateTeamResearchOutput('123', payload, 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('errors for an error status', async () => {
    nock(API_BASE_URL).post('/research-outputs').reply(500, {});

    await expect(
      createResearchOutput(payload, 'Bearer x'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to create research output for Team. Expected status 201. Received status 500."`,
    );
  });

  it('errors for an error status in edit mode', async () => {
    nock(API_BASE_URL).put('/research-outputs/123').reply(500, {});

    await expect(
      updateTeamResearchOutput('123', payload, 'Bearer x'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to update research output for teams 90210 Expected status 200. Received status 500."`,
    );
  });
});

describe('createPreprintResearchOutput', () => {
  it('makes an authorized POST request to create a preprint research output', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .post('/research-outputs/preprint', { manuscriptId: '123' })
      .reply(201, { id: 123 });

    await createPreprintResearchOutput('123', 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('errors for an error status', async () => {
    nock(API_BASE_URL).post('/research-outputs/preprint').reply(500, {});

    await expect(
      createPreprintResearchOutput('123', 'Bearer x'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to create preprint research output for manuscript 123. Expected status 201. Received status 500."`,
    );
  });
});
describe('getLabs', () => {
  const labOptions: GetListOptions = {
    searchQuery: '',
    currentPage: 0,
    pageSize: 10,
    filters: new Set(),
  };
  it('makes an authorized GET request for labs', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .get('/labs')
      .query({ take: '10', skip: '0' })
      .reply(200, {});
    await getLabs(labOptions, 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('returns successfully fetched labs', async () => {
    const labs = createListLabsResponse(1);
    nock(API_BASE_URL)
      .get('/labs')
      .query({ take: '10', skip: '0' })
      .reply(200, labs);
    expect(await getLabs(labOptions, '')).toEqual(labs);
  });
  it('errors for error status', async () => {
    nock(API_BASE_URL).get('/labs').query({ take: '10', skip: '0' }).reply(500);
    await expect(
      getLabs(labOptions, ''),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to fetch labs. Expected status 2xx. Received status 500."`,
    );
  });
});

describe('Manuscript', () => {
  describe('PUT', () => {
    const manuscriptId = 'manuscript-1';
    const payload: ManuscriptPutRequest = {
      status: 'Addendum Required',
    };
    it('makes an authorized PUT request to update a manuscript', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .put(`/manuscripts/${manuscriptId}`, payload)
        .reply(200, createManuscriptResponse());

      await updateManuscript(manuscriptId, payload, 'Bearer x');
      expect(nock.isDone()).toBe(true);
    });

    it('errors for an error status', async () => {
      nock(API_BASE_URL).put(`/manuscripts/${manuscriptId}`).reply(500, {});

      await expect(
        updateManuscript(manuscriptId, payload, 'Bearer x'),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update manuscript with id manuscript-1. Expected status 200. Received status 500."`,
      );
    });
  });

  describe('GET', () => {
    it('makes an authorized GET request for the manuscript id', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .get('/manuscripts/42')
        .reply(200, {});
      await getManuscript('42', 'Bearer x');
      expect(nock.isDone()).toBe(true);
    });

    it('returns a successfully fetched manuscript', async () => {
      const manuscript = createManuscriptResponse();
      nock(API_BASE_URL).get('/manuscripts/42').reply(200, manuscript);
      expect(await getManuscript('42', '')).toEqual(manuscript);
    });

    it('returns undefined for a 404', async () => {
      nock(API_BASE_URL).get('/manuscripts/42').reply(404);
      expect(await getManuscript('42', '')).toBe(undefined);
    });

    it('errors for another status', async () => {
      nock(API_BASE_URL).get('/manuscripts/42').reply(500);
      await expect(
        getManuscript('42', ''),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to fetch manuscript with id 42. Expected status 2xx or 404. Received status 500."`,
      );
    });
  });

  describe('GET workspace-url', () => {
    it('makes an authorized GET request for the manuscript workspace url', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .get('/manuscripts/42/workspace-url')
        .reply(200, {});
      await getManuscriptWorkspaceUrl('42', 'Bearer x');
      expect(nock.isDone()).toBe(true);
    });

    it('makes a GET request with tab query param', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .get('/manuscripts/42/workspace-url')
        .query({ tab: 'discussions' })
        .reply(200, {});
      await getManuscriptWorkspaceUrl('42', 'Bearer x', 'discussions');
      expect(nock.isDone()).toBe(true);
    });

    it('returns a successfully resolved workspace url', async () => {
      const workspaceUrl = {
        url: '/network/teams/team-1/workspace#manuscript-1',
      };
      nock(API_BASE_URL)
        .get('/manuscripts/42/workspace-url')
        .reply(200, workspaceUrl);
      expect(await getManuscriptWorkspaceUrl('42', '')).toEqual(workspaceUrl);
    });

    it('returns undefined for a 404', async () => {
      nock(API_BASE_URL).get('/manuscripts/42/workspace-url').reply(404);
      expect(await getManuscriptWorkspaceUrl('42', '')).toBe(undefined);
    });

    it('returns undefined for a 403', async () => {
      nock(API_BASE_URL).get('/manuscripts/42/workspace-url').reply(403);
      expect(await getManuscriptWorkspaceUrl('42', '')).toBe(undefined);
    });

    it('errors for another status', async () => {
      nock(API_BASE_URL).get('/manuscripts/42/workspace-url').reply(500);
      await expect(
        getManuscriptWorkspaceUrl('42', ''),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to resolve manuscript workspace url for id 42. Expected status 2xx, 403 or 404. Received status 500."`,
      );
    });
  });

  describe('getManuscripts', () => {
    type Search = () => Promise<ClientSearchResponse<'crn', 'manuscript'>>;
    const search: jest.MockedFunction<Search> = jest.fn();
    const algoliaSearchClient = {
      search,
    } as unknown as AlgoliaSearchClient<'crn'>;

    const algoliaManuscriptResponse = createPartialManuscriptResponse();

    beforeEach(() => {
      search.mockReset();
      search.mockResolvedValue(
        createAlgoliaResponse<'crn', 'manuscript'>([
          {
            ...algoliaManuscriptResponse,
            objectID: algoliaManuscriptResponse.id,
            __meta: { type: 'manuscript' },
          },
        ]),
      );
    });

    it('should return successfully fetched manuscripts', async () => {
      const workingGroups = await getManuscripts(algoliaSearchClient, {
        searchQuery: '',
        pageSize: null,
        currentPage: null,
        requestedAPCCoverage: 'all',
        completedStatus: 'show',
        selectedStatuses: [],
      });
      expect(workingGroups).toEqual(
        expect.objectContaining({
          items: [
            {
              ...algoliaManuscriptResponse,
              __meta: { type: 'manuscript' },
              objectID: algoliaManuscriptResponse.id,
            },
          ],
          total: 1,
        }),
      );
    });

    describe('APC coverage + status filters', () => {
      type APCCase = {
        requestedAPCCoverage: RequestedAPCCoverageOption;
        apcFilter: string;
      };

      const apcCases: APCCase[] = [
        {
          requestedAPCCoverage: 'all',
          apcFilter: '', // no filter when 'all'
        },
        {
          requestedAPCCoverage: 'apcNotRequested',
          apcFilter: 'apcRequested:false',
        },
        {
          requestedAPCCoverage: 'apcRequested',
          apcFilter: 'apcRequested:true',
        },
        {
          requestedAPCCoverage: 'paid',
          apcFilter: 'apcRequested:true AND apcCoverageRequestStatus:"paid"',
        },
        {
          requestedAPCCoverage: 'notPaid',
          apcFilter: 'apcRequested:true AND apcCoverageRequestStatus:"notPaid"',
        },
        {
          requestedAPCCoverage: 'declined',
          apcFilter:
            'apcRequested:true AND apcCoverageRequestStatus:"declined"',
        },
      ];

      const someStatuses = ['Waiting for Report', 'Compliant'] as const;
      const statusFilterFragment = `(status:"${someStatuses[0]}" OR status:"${someStatuses[1]}")`;

      it.each(apcCases)(
        'should combine status filters with APC coverage filter when requestedAPCCoverage="%s"',
        async ({ requestedAPCCoverage, apcFilter }) => {
          await getManuscripts(algoliaSearchClient, {
            searchQuery: '',
            pageSize: null,
            currentPage: null,
            requestedAPCCoverage,
            completedStatus: 'show',
            selectedStatuses: [...someStatuses],
          });

          const expectedFilters =
            apcFilter === ''
              ? statusFilterFragment
              : `${apcFilter} AND ${statusFilterFragment}`;

          expect(search).toHaveBeenCalledWith(
            ['manuscript'],
            '',
            expect.objectContaining({
              filters: expectedFilters,
            }),
            true,
          );
        },
      );

      it('should send no filters when requestedAPCCoverage="incorrect-value"', async () => {
        await getManuscripts(algoliaSearchClient, {
          searchQuery: '',
          pageSize: null,
          currentPage: null,
          requestedAPCCoverage:
            'incorrect' as unknown as RequestedAPCCoverageOption, // only for test
          completedStatus: 'show',
          selectedStatuses: [],
        });

        expect(search).toHaveBeenCalledWith(
          ['manuscript'],
          '',
          expect.objectContaining({
            filters: '',
          }),
          true,
        );
      });
    });

    it('should pass through search query', async () => {
      await getManuscripts(algoliaSearchClient, {
        searchQuery: 'test query',
        pageSize: null,
        currentPage: null,
        requestedAPCCoverage: 'all',
        completedStatus: 'show',
        selectedStatuses: [],
      });

      expect(search).toHaveBeenCalledWith(
        ['manuscript'],
        'test query',
        expect.any(Object),
        true,
      );
    });

    it('should pass through pagination parameters', async () => {
      await getManuscripts(algoliaSearchClient, {
        searchQuery: '',
        pageSize: 25,
        currentPage: 2,
        requestedAPCCoverage: 'all',
        completedStatus: 'show',
        selectedStatuses: [],
      });

      expect(search).toHaveBeenCalledWith(
        ['manuscript'],
        '',
        expect.objectContaining({
          hitsPerPage: 25,
          page: 2,
        }),
        true,
      );
    });

    describe('status filters', () => {
      it('should generate correct filter for single status', async () => {
        await getManuscripts(algoliaSearchClient, {
          searchQuery: '',
          pageSize: null,
          currentPage: null,
          requestedAPCCoverage: 'all',
          completedStatus: 'show',
          selectedStatuses: ['Waiting for Report'],
        });

        expect(search).toHaveBeenCalledWith(
          ['manuscript'],
          '',
          expect.objectContaining({
            filters: '(status:"Waiting for Report")',
          }),
          true,
        );
      });

      it('should generate correct filter for multiple statuses', async () => {
        await getManuscripts(algoliaSearchClient, {
          searchQuery: '',
          pageSize: null,
          currentPage: null,
          requestedAPCCoverage: 'all',
          completedStatus: 'show',
          selectedStatuses: ['Waiting for Report', 'Review Compliance Report'],
        });

        expect(search).toHaveBeenCalledWith(
          ['manuscript'],
          '',
          expect.objectContaining({
            filters:
              '(status:"Waiting for Report" OR status:"Review Compliance Report")',
          }),
          true,
        );
      });

      it('should combine status filters with APC coverage filter', async () => {
        await getManuscripts(algoliaSearchClient, {
          searchQuery: '',
          pageSize: null,
          currentPage: null,
          requestedAPCCoverage: 'apcRequested',
          completedStatus: 'show',
          selectedStatuses: ['Waiting for Report', 'Compliant'],
        });

        expect(search).toHaveBeenCalledWith(
          ['manuscript'],
          '',
          expect.objectContaining({
            filters:
              'apcRequested:true AND (status:"Waiting for Report" OR status:"Compliant")',
          }),
          true,
        );
      });

      it('should combine status filters with completed status filter', async () => {
        await getManuscripts(algoliaSearchClient, {
          searchQuery: '',
          pageSize: null,
          currentPage: null,
          completedStatus: 'hide',
          requestedAPCCoverage: 'all',
          selectedStatuses: ['Waiting for Report', 'Review Compliance Report'],
        });

        expect(search).toHaveBeenCalledWith(
          ['manuscript'],
          '',
          expect.objectContaining({
            filters:
              '(NOT status:Compliant AND NOT status:"Closed (other)") AND (status:"Waiting for Report" OR status:"Review Compliance Report")',
          }),
          true,
        );
      });
    });
  });

  describe('getManuscriptVersions', () => {
    type Search = () => Promise<
      ClientSearchResponse<'crn', 'manuscript-version'>
    >;
    const search: jest.MockedFunction<Search> = jest.fn();
    const algoliaSearchClient = {
      search,
    } as unknown as AlgoliaSearchClient<'crn'>;

    const algoliaManuscriptVersionsResponse = createManuscriptVersionResponse();

    beforeEach(() => {
      search.mockReset();
      search.mockResolvedValue(
        createAlgoliaResponse<'crn', 'manuscript-version'>([
          {
            ...algoliaManuscriptVersionsResponse,
            objectID: algoliaManuscriptVersionsResponse.id,
            __meta: { type: 'manuscript-version' },
          },
        ]),
      );
    });

    it('should return successfully fetched manuscript versions', async () => {
      const versionSuggestions = await getManuscriptVersions(
        algoliaSearchClient,
        {
          searchQuery: '',
          pageSize: null,
          currentPage: null,
        },
      );
      expect(versionSuggestions).toEqual(
        expect.objectContaining({
          items: [
            {
              ...algoliaManuscriptVersionsResponse,
              __meta: { type: 'manuscript-version' },
              objectID: algoliaManuscriptVersionsResponse.id,
            },
          ],
          total: 1,
        }),
      );
    });

    it('should pass through search query', async () => {
      await getManuscriptVersions(algoliaSearchClient, {
        searchQuery: 'test query',
        pageSize: null,
        currentPage: null,
      });

      expect(search).toHaveBeenCalledWith(
        ['manuscript-version'],
        'test query',
        expect.any(Object),
      );
    });

    it('should pass through pagination parameters', async () => {
      await getManuscriptVersions(algoliaSearchClient, {
        searchQuery: '',
        pageSize: 25,
        currentPage: 2,
      });

      expect(search).toHaveBeenCalledWith(
        ['manuscript-version'],
        '',
        expect.objectContaining({
          hitsPerPage: 25,
          page: 2,
        }),
      );
    });

    it('can filter by team id', async () => {
      const teamId = 'team-id-1';
      await getManuscriptVersions(algoliaSearchClient, {
        searchQuery: '',
        pageSize: 25,
        currentPage: 2,
        teamId,
      });

      expect(search).toHaveBeenCalledWith(
        ['manuscript-version'],
        '',
        expect.objectContaining({
          hitsPerPage: 25,
          page: 2,
          filters: `(teamId:"${teamId}" OR teams.id:"${teamId}")`,
        }),
      );
    });

    it('can filter by project id', async () => {
      const projectId = 'project-id-1';
      await getManuscriptVersions(algoliaSearchClient, {
        searchQuery: '',
        pageSize: 25,
        currentPage: 2,
        projectId,
      });

      expect(search).toHaveBeenCalledWith(
        ['manuscript-version'],
        '',
        expect.objectContaining({
          hitsPerPage: 25,
          page: 2,
          filters: `project.id:"${projectId}"`,
        }),
      );
    });

    it('filters by project id even when a team id is also given', async () => {
      const projectId = 'project-id-1';
      await getManuscriptVersions(algoliaSearchClient, {
        searchQuery: '',
        pageSize: 25,
        currentPage: 2,
        projectId,
        teamId: 'team-id-1',
      });

      expect(search).toHaveBeenCalledWith(
        ['manuscript-version'],
        '',
        expect.objectContaining({
          filters: `project.id:"${projectId}"`,
        }),
      );
    });
  });

  describe('uploadManuscriptFile', () => {
    // nock does not deal well with actual files so we use this as a mock instead
    const file = 'test-file' as unknown as File;
    const mockResponse: ManuscriptFileResponse = {
      id: '42',
      filename: 'test-file',
      url: 'https://example.com/test-file',
    };

    afterEach(() => {
      nock.cleanAll();
    });

    it('makes an authorized POST request', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .post('/manuscripts/file-upload')
        .reply(200, {});

      await uploadManuscriptFile(
        file,
        'Manuscript File',
        'Bearer x',
        jest.fn(),
      );
      expect(nock.isDone()).toBe(true);
    });

    it('passes the object in the body', async () => {
      nock(API_BASE_URL)
        .post('/manuscripts/file-upload', (body) => {
          if (typeof body === 'string' && body.includes('test-file')) {
            return true;
          }
          return false;
        })
        .reply(200, {});

      await uploadManuscriptFile(
        file,
        'Manuscript File',
        'Bearer x',
        jest.fn(),
      );
      expect(nock.isDone()).toBe(true);
    });

    it('returns a successfully uploaded file data', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .post('/manuscripts/file-upload')
        .reply(200, mockResponse);

      const response = await uploadManuscriptFile(
        file,
        'Manuscript File',
        'Bearer x',
        jest.fn(),
      );
      expect(response).toEqual(mockResponse);
    });

    it('errors for an error status', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .post('/manuscripts/file-upload')
        .reply(500, {});

      await expect(
        uploadManuscriptFile(file, 'Manuscript File', 'Bearer x', jest.fn()),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to upload manuscript file. Expected status 2xx. Received status 500."`,
      );
    });

    it('invokes handleError with the error message when a 400 error occurs', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .post('/manuscripts/file-upload')
        .reply(400, {
          message: 'Validation Error',
        });

      const handleErrorMock = jest.fn();
      await uploadManuscriptFile(
        file,
        'Manuscript File',
        'Bearer x',
        handleErrorMock,
      );

      expect(handleErrorMock).toHaveBeenCalledWith('Validation Error');
    });
  });

  it('should return successfully fetched manuscript version given manuscript id', async () => {
    type Search = () => Promise<
      ClientSearchResponse<'crn', 'manuscript-version'>
    >;
    const search: jest.MockedFunction<Search> = jest.fn();
    const algoliaSearchClient = {
      search,
    } as unknown as AlgoliaSearchClient<'crn'>;
    const manuscriptVersionResponse = createManuscriptVersionResponse();
    search.mockResolvedValue(
      createAlgoliaResponse<'crn', 'manuscript-version'>([
        {
          ...manuscriptVersionResponse,
          objectID: manuscriptVersionResponse.id,
          __meta: { type: 'manuscript-version' },
        },
      ]),
    );
    const version = await getManuscriptVersionByManuscriptId(
      algoliaSearchClient,
      manuscriptVersionResponse.id,
    );
    expect(version).toEqual(
      expect.objectContaining({
        ...manuscriptVersionResponse,
      }),
    );
  });
});

describe('Discussion', () => {
  describe('getDiscussion', () => {
    it('makes an authorized GET request for the discussion id', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .get('/discussions/42')
        .reply(200, {});
      await getDiscussion('42', 'Bearer x');
      expect(nock.isDone()).toBe(true);
    });

    it('returns a successfully fetched discussion', async () => {
      const discussion = createDiscussionResponse();
      nock(API_BASE_URL).get('/discussions/42').reply(200, discussion);
      expect(await getDiscussion('42', '')).toEqual(discussion);
    });

    it('returns undefined for a 404', async () => {
      nock(API_BASE_URL).get('/discussions/42').reply(404);
      expect(await getDiscussion('42', '')).toBe(undefined);
    });

    it('errors for another status', async () => {
      nock(API_BASE_URL).get('/discussions/42').reply(500);
      await expect(
        getDiscussion('42', ''),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to fetch discussion with id 42. Expected status 2xx or 404. Received status 500."`,
      );
    });
  });

  describe('updateDiscussion', () => {
    const patch = {
      text: 'test reply',
      manuscriptId: 'manuscript-id-1',
    };
    it('makes an authorized PATCH request for the discussion id', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .patch('/discussions/42')
        .reply(200, {});

      await updateDiscussion('42', patch, 'Bearer x');
      expect(nock.isDone()).toBe(true);
    });

    it('passes the patch object in the body', async () => {
      nock(API_BASE_URL).patch('/discussions/42', patch).reply(200, {});

      await updateDiscussion('42', patch, '');
      expect(nock.isDone()).toBe(true);
    });

    it('returns a successfully updated discussion', async () => {
      const updated: Partial<DiscussionResponse> = {
        replies: [createMessage('')],
      };
      nock(API_BASE_URL).patch('/discussions/42', patch).reply(200, updated);

      expect(await updateDiscussion('42', patch, '')).toEqual(updated);
    });

    it('errors for an error status', async () => {
      nock(API_BASE_URL).patch('/discussions/42', patch).reply(500, {});

      await expect(
        updateDiscussion('42', patch, ''),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update discussion with id 42. Expected status 200. Received status 500."`,
      );
    });
  });

  describe('createDiscussion', () => {
    const manuscriptId = '42';
    const title = 'test discussion title';
    const text = 'test discussion message';

    const payload: DiscussionCreateRequest = {
      text,
      manuscriptId,
      title,
    };

    it('makes an authorized POST request to create compliance discussion', async () => {
      nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
        .post('/discussions')
        .reply(200, {});

      await createDiscussion({ manuscriptId, title, text }, 'Bearer x');
      expect(nock.isDone()).toBe(true);
    });

    it('passes the post object in the body', async () => {
      nock(API_BASE_URL).post('/discussions', payload).reply(200, {});

      await createDiscussion({ manuscriptId, title, text }, 'Bearer x');
      expect(nock.isDone()).toBe(true);
    });

    it('returns a successfully created discussion', async () => {
      const created: Partial<DiscussionDataObject> = {
        id: 'discussion-1',
        message: createMessage(text),
        replies: [],
      };
      nock(API_BASE_URL).post('/discussions', payload).reply(200, created);

      expect(
        await createDiscussion({ manuscriptId, title, text }, 'Bearer x'),
      ).toEqual(created);
    });

    it('shows errors for an error status', async () => {
      nock(API_BASE_URL).post('/discussions', payload).reply(500, {});

      await expect(
        createDiscussion({ manuscriptId, title, text }, 'Bearer x'),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create discussion. Expected status 201. Received status 500."`,
      );
    });
  });
});

describe('getPresignedUrl', () => {
  const authorization = 'Bearer token';
  const payload = {
    filename: 'test-file.pdf',
    contentType: 'application/pdf',
  };

  it('successfully returns presignedUrl', async () => {
    const presignedUrl =
      'https://bucket-name.s3.amazonaws.com/test-file.pdf?signature=abc';
    nock('http://api').post('/files/get-url').reply(200, { presignedUrl });

    const response = await getPresignedUrl(
      payload.filename,
      authorization,
      payload.contentType,
    );

    expect(response).toEqual({ presignedUrl });
  });

  it('throws on invalid JSON response', async () => {
    nock('http://api').post('/files/get-url').reply(200, 'not-json');

    await expect(
      getPresignedUrl(
        payload.filename,
        authorization,
        payload.contentType,
        'upload',
      ),
    ).rejects.toThrow('Failed to parse JSON response');
  });

  it('throws on non-200 status', async () => {
    nock('http://api')
      .post('/files/get-url')
      .reply(500, { error: 'something broke' });

    await expect(
      getPresignedUrl(
        payload.filename,
        authorization,
        payload.contentType,
        'upload',
      ),
    ).rejects.toThrow(
      'Failed to generate presigned URL. Expected status 200. Received status 500',
    );
  });
});

describe('markDiscussionAsRead', () => {
  it('makes an authorized PATCH request to mark a discussion as read', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .patch('/discussions/42/read')
      .reply(200, {});

    await markDiscussionAsRead('42', 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('returns a successfully marked discussion', async () => {
    const discussion = createDiscussionResponse();
    nock(API_BASE_URL).patch('/discussions/42/read').reply(200, discussion);
    expect(await markDiscussionAsRead('42', '')).toEqual(discussion);
  });

  it('throws an error if the request fails', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .patch('/discussions/42/read')
      .reply(500, { error: 'something broke' });

    await expect(markDiscussionAsRead('42', 'Bearer x')).rejects.toThrow(
      'Failed to mark discussion with id 42 as read. Expected status 200. Received status 500.',
    );
  });
});

describe('getTeamAwardMetrics', () => {
  it('makes an authorized GET request for the team award metrics', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .get('/teams/42/award-metrics')
      .reply(200, { total: 0, items: [] });
    await getTeamAwardMetrics('42', 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('returns the fetched award metrics', async () => {
    const awardMetrics = {
      total: 1,
      items: [
        {
          id: 'award-type-1',
          name: 'Open Science Champion Award',
          asapPhilosophy: 'Philosophy',
          metricDefinition: 'Definition',
          received: true,
        },
      ],
    };
    nock(API_BASE_URL).get('/teams/42/award-metrics').reply(200, awardMetrics);
    expect(await getTeamAwardMetrics('42', '')).toEqual(awardMetrics);
  });

  it('errors for an error status', async () => {
    nock(API_BASE_URL).get('/teams/42/award-metrics').reply(500);
    await expect(
      getTeamAwardMetrics('42', ''),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to fetch award metrics for team with id 42. Expected status 2xx. Received status 500."`,
    );
  });
});
