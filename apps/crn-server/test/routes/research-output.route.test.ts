import {
  createResearchOutputResponse,
  createUserResponse,
} from '@asap-hub/fixtures';
import {
  UserResponse,
  teamRole,
  workingGroupRole,
  ResearchOutputWorkingGroupResponse,
  ResearchOutputTeamResponse,
  TeamRole,
  TeamType,
  WorkingGroupRole,
  Role,
  Project,
} from '@asap-hub/model';
import { AuthHandler } from '@asap-hub/server-common';
import Boom from '@hapi/boom';
import 'express-async-errors';
import supertest from 'supertest';
import { appFactory } from '../../src/app';
import {
  getListResearchOutputResponse,
  getResearchOutputDataObject,
  getResearchOutputPostRequest,
  getResearchOutputPutRequest,
  getResearchOutputResponse,
} from '../fixtures/research-output.fixtures';
import { getManuscriptResponse } from '../fixtures/manuscript.fixtures';
import { loggerMock } from '../mocks/logger.mock';
import { researchOutputControllerMock } from '../mocks/research-output.controller.mock';
import { manuscriptControllerMock } from '../mocks/manuscript.controller.mock';
import { projectControllerMock } from '../mocks/project.controller.mock';
import { teamControllerMock } from '../mocks/team.controller.mock';
import { getTeamResponse } from '../fixtures/teams.fixtures';

describe('/research-outputs/ route', () => {
  const userMockFactory = jest.fn<UserResponse, []>();
  const authHandlerMock: AuthHandler = (req, _res, next) => {
    req.loggedInUser = userMockFactory();
    next();
  };
  const app = appFactory({
    researchOutputController: researchOutputControllerMock,
    manuscriptController: manuscriptControllerMock,
    projectController: projectControllerMock,
    teamController: teamControllerMock,
    authHandler: authHandlerMock,
    logger: loggerMock,
  });

  const teamResponseWithProjectManager = () => ({
    ...getTeamResponse(),
    members: [
      ...getTeamResponse().members,
      {
        id: 'pm-user-id',
        email: 'pm@example.com',
        firstName: 'Pat',
        lastName: 'Manager',
        displayName: 'Pat Manager',
        role: 'Project Manager' as TeamRole,
      },
    ],
  });

  const userTeam = {
    id: 'team-1',
    displayName: 'team 1',
    role: 'Project Manager' as TeamRole,
    teamType: 'Discovery Team' as TeamType,
  };

  const userWorkingGroup = {
    id: 'wg-1',
    name: 'wg 1',
    role: 'Project Manager' as WorkingGroupRole,
    active: true,
  };

  const user: UserResponse = {
    ...createUserResponse(),
    teams: [userTeam],
    workingGroups: [userWorkingGroup],
  };

  beforeEach(() => {
    userMockFactory.mockReturnValue(createUserResponse());
    teamControllerMock.fetchById.mockResolvedValue(
      teamResponseWithProjectManager(),
    );
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /research-outputs', () => {
    test('Should return 200 when no research output exists', async () => {
      researchOutputControllerMock.fetch.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const response = await supertest(app).get('/research-outputs');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        total: 0,
        items: [],
      });
    });

    test('Should return the results correctly', async () => {
      const listResearchOutputResponse = getListResearchOutputResponse();

      researchOutputControllerMock.fetch.mockResolvedValueOnce(
        listResearchOutputResponse,
      );

      const response = await supertest(app).get('/research-outputs');

      expect(response.body).toEqual(listResearchOutputResponse);
    });

    test('Should call the controller with the right parameters', async () => {
      await supertest(app)
        .get('/research-outputs')
        .query({
          take: 15,
          skip: 5,
          search: 'something',
          filter: {
            documentType: ['Article', 'Grant Document'],
          },
        });

      const expectedParams = {
        take: 15,
        skip: 5,
        search: 'something',
        filter: {
          documentType: ['Article', 'Grant Document'],
        },
      };

      expect(researchOutputControllerMock.fetch).toHaveBeenCalledWith(
        expectedParams,
      );
    });

    describe('Parameter validation', () => {
      test('Should return a validation error when additional fields exist', async () => {
        const response = await supertest(app).get(`/research-outputs`).query({
          additionalField: 'some-data',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when the arguments are not valid', async () => {
        const response = await supertest(app).get(`/research-outputs`).query({
          take: 'invalid param',
        });

        expect(response.status).toBe(400);
      });
    });

    describe('Drafts', () => {
      test('Should exclusively return drafts', async () => {
        const listResearchOutputResponse = getListResearchOutputResponse();

        listResearchOutputResponse.items[0]!.published = false;

        researchOutputControllerMock.fetch.mockResolvedValueOnce(
          listResearchOutputResponse,
        );

        const response = await supertest(app).get('/research-outputs');

        expect(response.status).toBe(200);
        expect(response.body.items[0].published).toBe(false);
      });

      test('Should return a validation error when additional fields exist', async () => {
        const response = await supertest(app).get(`/research-outputs`).query({
          status: 'draft',
          teamId: '123',
          additionalField: 'some-data',
        });

        expect(response.status).toBe(400);
      });

      test('Should call the controller with the right parameters', async () => {
        await supertest(app)
          .get('/research-outputs')
          .query({
            take: 15,
            skip: 5,
            status: 'draft',
            teamId: 'team-id-0',
            workingGroupId: 'workingGroup-id-0',
            filter: {
              documentType: ['Article', 'Grant Document'],
            },
          });

        const expectedParams = {
          take: 15,
          skip: 5,
          filter: {
            teamId: 'team-id-0',
            status: 'draft',
            workingGroupId: 'workingGroup-id-0',
            documentType: ['Article', 'Grant Document'],
          },
          includeDrafts: true,
        };

        expect(researchOutputControllerMock.fetch).toHaveBeenCalledWith(
          expectedParams,
        );
      });

      test('Should call the controller with projectId when listing drafts', async () => {
        userMockFactory.mockReturnValueOnce({
          ...createUserResponse(),
          projects: [
            {
              id: 'project-id-0',
              title: 'Test Project',
              projectType: 'Resource Project',
              status: 'Active',
            },
          ],
        });

        await supertest(app).get('/research-outputs').query({
          take: 15,
          skip: 5,
          status: 'draft',
          projectId: 'project-id-0',
        });

        expect(researchOutputControllerMock.fetch).toHaveBeenCalledWith({
          take: 15,
          skip: 5,
          filter: {
            status: 'draft',
            projectId: 'project-id-0',
          },
          includeDrafts: true,
        });
      });

      test("Should return 403 if user is not associated to output's team", async () => {
        const response = await supertest(app).get('/research-outputs').query({
          take: 15,
          skip: 5,
          status: 'draft',
          teamId: 'team-id-403',
        });

        expect(response.status).toBe(403);
      });

      test("Should return 403 if user is not associated to output's working group", async () => {
        const response = await supertest(app).get('/research-outputs').query({
          take: 15,
          skip: 5,
          status: 'draft',
          workingGroupId: 'workingGroup-id-403',
        });

        expect(response.status).toBe(403);
      });

      test('Should return 403 if user is not a member of the project', async () => {
        const response = await supertest(app).get('/research-outputs').query({
          take: 15,
          skip: 5,
          status: 'draft',
          projectId: 'project-id-403',
        });

        expect(response.status).toBe(403);
      });

      test('Should allow ASAP staff to list project drafts without project membership', async () => {
        userMockFactory.mockReturnValueOnce({
          ...createUserResponse(),
          role: 'Staff',
          projects: [],
        });

        researchOutputControllerMock.fetch.mockResolvedValueOnce({
          items: [],
          total: 0,
        });

        const response = await supertest(app).get('/research-outputs').query({
          status: 'draft',
          projectId: 'project-id-1',
        });

        expect(response.status).toBe(200);
        expect(researchOutputControllerMock.fetch).toHaveBeenCalledWith({
          filter: {
            status: 'draft',
            projectId: 'project-id-1',
          },
          includeDrafts: true,
        });
      });
    });
  });

  describe('GET /research-outputs/{research_output_id}', () => {
    test('Should return a 404 error when the team or members are not found', async () => {
      researchOutputControllerMock.fetchById.mockRejectedValueOnce(
        Boom.notFound(),
      );

      const response = await supertest(app).get('/research-outputs/123');

      expect(response.status).toBe(404);
    });

    test('Should return the result correctly', async () => {
      const researchOutputResponse = getResearchOutputResponse();

      researchOutputControllerMock.fetchById.mockResolvedValueOnce(
        researchOutputResponse,
      );

      const response = await supertest(app).get('/research-outputs/123');

      expect(response.body).toEqual(researchOutputResponse);
    });

    test('Should call the controller with the right parameter', async () => {
      const researchOutputId = 'abc123';

      await supertest(app).get(`/research-outputs/${researchOutputId}`);

      expect(researchOutputControllerMock.fetchById).toHaveBeenCalledWith(
        researchOutputId,
        { includeGrantDocument: true },
      );
    });
    test('Should return 404 when you are trying to get a draft and are not part of the team', async () => {
      userMockFactory.mockReturnValueOnce(user);

      const researchOutputResponse: ResearchOutputTeamResponse = {
        ...getResearchOutputResponse(),
        published: false,
        teams: [{ ...userTeam, id: 'nop' }],
        workingGroups: undefined,
      };

      researchOutputControllerMock.fetchById.mockResolvedValueOnce(
        researchOutputResponse,
      );

      const response = await supertest(app).get('/research-outputs/123');

      expect(response.status).toEqual(404);
    });
    test('Should return 404 when you are trying to get a draft and are not part of the working group', async () => {
      userMockFactory.mockReturnValueOnce(user);

      const researchOutputResponse: ResearchOutputWorkingGroupResponse = {
        ...getResearchOutputResponse(),
        published: false,
        teams: [userTeam],
        workingGroups: [
          { ...userWorkingGroup, id: 'nop', title: 'not part of this wg' },
        ],
      };

      researchOutputControllerMock.fetchById.mockResolvedValueOnce(
        researchOutputResponse,
      );

      const response = await supertest(app).get('/research-outputs/123');

      expect(response.status).toEqual(404);
    });
    test('Should return 200 when you are ASAP staff member and are trying to get a draft', async () => {
      userMockFactory.mockReturnValueOnce({ ...user, role: 'Staff' });

      const researchOutputResponse: ResearchOutputWorkingGroupResponse = {
        ...getResearchOutputResponse(),
        published: false,
        teams: [{ ...userTeam, id: 'nop' }],
        workingGroups: [{ ...userWorkingGroup, id: 'nop', title: 'nop' }],
      };

      researchOutputControllerMock.fetchById.mockResolvedValueOnce(
        researchOutputResponse,
      );

      const response = await supertest(app).get('/research-outputs/123');

      expect(response.status).toEqual(200);
    });
    describe('Should return the team draft research output if you have the right permissions', () => {
      test.each(teamRole)('for commonTeam role %s', async (teamRole) => {
        const loggedInUser: UserResponse = {
          ...user,
          teams: [{ ...userTeam, role: teamRole }],
          workingGroups: [{ ...userWorkingGroup, id: 'nop' }],
        };

        userMockFactory.mockReturnValueOnce(loggedInUser);

        const researchOutputResponse: ResearchOutputTeamResponse = {
          ...getResearchOutputResponse(),
          published: false,
          teams: [{ ...userTeam }],
          workingGroups: undefined,
        };

        researchOutputControllerMock.fetchById.mockResolvedValueOnce(
          researchOutputResponse,
        );

        const response = await supertest(app).get('/research-outputs/123');

        expect(response.status).toEqual(200);
      });
    });

    describe('Should return the working group draft research output if you have the right permissions', () => {
      test.each(workingGroupRole)(
        'for workingGroup role %s',
        async (workingGroupRole) => {
          const loggedInUser: UserResponse = {
            ...user,
            teams: [{ ...userTeam, id: 'nop' }],
            workingGroups: [
              {
                ...userWorkingGroup,
                role: workingGroupRole,
              },
            ],
          };

          userMockFactory.mockReturnValueOnce(loggedInUser);
          const researchOutputResponse: ResearchOutputWorkingGroupResponse = {
            ...createResearchOutputResponse(),
            published: false,
            teams: [userTeam],
            workingGroups: [
              { ...userWorkingGroup, title: 'working group title' },
            ],
          };

          researchOutputControllerMock.fetchById.mockResolvedValueOnce(
            researchOutputResponse,
          );

          const response = await supertest(app).get('/research-outputs/123');

          expect(response.status).toEqual(200);
        },
      );
    });
  });

  describe('POST /research-outputs/', () => {
    const researchOutputResponse = getResearchOutputResponse();

    test('Should return a 201 when is hit', async () => {
      const createResearchOutputRequest = getResearchOutputPostRequest();

      researchOutputControllerMock.create.mockResolvedValueOnce(
        researchOutputResponse,
      );

      const response = await supertest(app)
        .post('/research-outputs')
        .send(createResearchOutputRequest)
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(researchOutputControllerMock.create).toHaveBeenCalledWith({
        ...createResearchOutputRequest,
        createdBy: 'user-id-0',
      });

      expect(response.body).toEqual(researchOutputResponse);
    });

    test('Should return 403 when user is not permitted to create research output', async () => {
      const researchOutput = getResearchOutputPostRequest();

      const response = await supertest(app)
        .post('/research-outputs/')
        .send({
          ...researchOutput,
          teams: ['team-id-that-does-not-belong-to-user'],
        });
      expect(response.status).toBe(403);
    });

    describe('Creating a research output from a team', () => {
      test.each([
        {
          publish: false,
          teamRole: 'Key Personnel',
          expected: 201,
          userRole: 'Grantee',
        },
        {
          publish: false,
          teamRole: 'Project Manager',
          expected: 201,
          userRole: 'Grantee',
        },
        {
          publish: false,
          teamRole: 'Key Personnel',
          expected: 201,
          userRole: 'Staff',
        },
        {
          publish: true,
          teamRole: 'Project Manager',
          expected: 201,
          userRole: 'Grantee',
        },
        {
          publish: true,
          teamRole: 'Key Personnel',
          expected: 403,
          userRole: 'Grantee',
        },
        {
          publish: true,
          teamRole: 'Key Personnel',
          expected: 201,
          userRole: 'Staff',
        },
        {
          publish: true,
          teamRole: 'Key Personnel',
          expected: 201,
          userRole: 'Grantee',
          relatedManuscript: 'manuscript-id-1',
          relatedManuscriptVersion: 'manuscript-version-id-1',
        },
        {
          publish: true,
          teamRole: 'Project Manager',
          expected: 201,
          userRole: 'Grantee',
          relatedManuscript: 'manuscript-id-1',
          relatedManuscriptVersion: 'manuscript-version-id-1',
        },
        {
          publish: true,
          teamRole: 'Key Personnel',
          expected: 201,
          userRole: 'Staff',
          relatedManuscript: 'manuscript-id-1',
          relatedManuscriptVersion: 'manuscript-version-id-1',
        },
      ])(
        'Should return $expected when a user has team role: $teamRole and has user role: $userRole and tries to publish: $publish',
        async ({
          publish,
          teamRole,
          expected,
          userRole,
          relatedManuscript,
          relatedManuscriptVersion,
        }) => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: userRole as Role,
            teams: [
              {
                id: 'team-1',
                displayName: 'team-1',
                role: teamRole as TeamRole,
              },
            ],
            workingGroups: [
              { id: 'wg-1', name: 'wg-1', role: 'Member', active: true },
            ],
          });
          const response = await supertest(app)
            .post('/research-outputs')
            .send({
              ...getResearchOutputPostRequest(),
              teams: ['team-1'],
              published: publish,
              relatedManuscript,
              relatedManuscriptVersion,
            });
          expect(response.status).toBe(expected);
        },
      );

      test('Should let a team member publish when the team has no active project manager', async () => {
        userMockFactory.mockReturnValueOnce({
          ...user,
          role: 'Grantee' as Role,
          teams: [
            { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
          ],
        });
        teamControllerMock.fetchById.mockResolvedValueOnce({
          ...getTeamResponse(),
          members: [
            {
              id: 'user-id-1',
              email: 'lead@example.com',
              firstName: 'Lead',
              lastName: 'Pi',
              displayName: 'Lead Pi',
              role: 'Lead PI (Core Leadership)',
            },
          ],
        });

        const response = await supertest(app)
          .post('/research-outputs')
          .send({
            ...getResearchOutputPostRequest(),
            teams: ['team-1'],
            published: true,
          });

        expect(response.status).toBe(201);
      });

      test('Should block a team member from publishing when the team has an active project manager', async () => {
        userMockFactory.mockReturnValueOnce({
          ...user,
          role: 'Grantee' as Role,
          teams: [
            { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
          ],
        });
        teamControllerMock.fetchById.mockResolvedValueOnce(
          teamResponseWithProjectManager(),
        );

        const response = await supertest(app)
          .post('/research-outputs')
          .send({
            ...getResearchOutputPostRequest(),
            teams: ['team-1'],
            published: true,
          });

        expect(response.status).toBe(403);
      });
    });

    describe('Creating a research output from a working group', () => {
      test.each([
        {
          publish: false,
          wgRole: 'Member',
          expected: 201,
          userRole: 'Grantee',
        },
        {
          publish: false,
          wgRole: 'Project Manager',
          expected: 201,
          userRole: 'Grantee',
        },
        {
          publish: true,
          wgRole: 'Project Manager',
          expected: 201,
          userRole: 'Grantee',
        },
        { publish: true, wgRole: 'Member', expected: 403, userRole: 'Grantee' },
        { publish: false, wgRole: 'Member', expected: 201, userRole: 'Staff' },
        { publish: true, wgRole: 'Member', expected: 201, userRole: 'Staff' },
      ])(
        'Should return $expected when a user has WG role: $wgRole and has user role: $userRole and tries to publish: $publish',
        async ({ publish, wgRole, expected, userRole }) => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: userRole as Role,
            teams: [
              { id: 'team-1', displayName: 'team-1', role: 'Collaborating PI' },
            ],
            workingGroups: [
              {
                id: 'wg-1',
                name: 'wg-1',
                role: wgRole as WorkingGroupRole,
                active: true,
              },
            ],
          });
          const response = await supertest(app)
            .post('/research-outputs')
            .send({
              ...getResearchOutputPostRequest(),
              teams: ['not-a-team'],
              workingGroups: ['wg-1'],
              published: publish,
            });
          expect(response.status).toBe(expected);
        },
      );
    });

    describe('Creating a research output from a project', () => {
      const projectWithNoLead: Project = {
        id: 'project-1',
        title: 'Project 1',
        projectType: 'Trainee Project',
        status: 'Active',
        statusRank: 1,
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        tags: [],
        members: [
          {
            id: 'user-id-0',
            displayName: 'Member',
            role: 'Independent Project - Mentor',
          },
        ],
      };
      const projectWhereUserIsLead: Project = {
        ...projectWithNoLead,
        members: [
          {
            id: 'user-id-0',
            displayName: 'Lead',
            role: 'Independent Project - Lead',
          },
        ],
      };
      const projectWithOtherLead: Project = {
        ...projectWithNoLead,
        members: [
          {
            id: 'someone-else',
            displayName: 'Lead',
            role: 'Independent Project - Lead',
          },
          {
            id: 'user-id-0',
            displayName: 'Member',
            role: 'Independent Project - Mentor',
          },
        ],
      };

      test.each([
        {
          name: 'member saving a draft',
          publish: false,
          expected: 201,
          userRole: 'Grantee',
          isProjectMember: true,
          project: projectWithNoLead,
        },
        {
          name: 'non-member saving a draft',
          publish: false,
          expected: 403,
          userRole: 'Grantee',
          isProjectMember: false,
          project: projectWithNoLead,
        },
        {
          name: 'member publishing when the project has no lead',
          publish: true,
          expected: 201,
          userRole: 'Grantee',
          isProjectMember: true,
          project: projectWithNoLead,
        },
        {
          name: 'non-lead member publishing when the project has a lead',
          publish: true,
          expected: 403,
          userRole: 'Grantee',
          isProjectMember: true,
          project: projectWithOtherLead,
        },
        {
          name: 'project lead publishing',
          publish: true,
          expected: 201,
          userRole: 'Grantee',
          isProjectMember: true,
          project: projectWhereUserIsLead,
        },
        {
          name: 'staff publishing without membership',
          publish: true,
          expected: 201,
          userRole: 'Staff',
          isProjectMember: false,
          project: projectWithOtherLead,
        },
        {
          name: 'non-lead member publishing a manuscript output when the project has a lead',
          publish: true,
          expected: 403,
          userRole: 'Grantee',
          isProjectMember: true,
          project: projectWithOtherLead,
          relatedManuscriptVersion: 'manuscript-version-id-1',
        },
      ])(
        'Should return $expected for $name',
        async ({
          publish,
          expected,
          userRole,
          isProjectMember,
          project,
          relatedManuscriptVersion,
        }) => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: userRole as Role,
            projects: isProjectMember
              ? [
                  {
                    id: 'project-1',
                    title: 'Project 1',
                    projectType: 'Trainee Project',
                    status: 'Active',
                  },
                ]
              : [],
          });
          projectControllerMock.fetchById.mockResolvedValueOnce(project);
          const response = await supertest(app)
            .post('/research-outputs')
            .send({
              ...getResearchOutputPostRequest(),
              teams: [],
              workingGroups: [],
              projectId: 'project-1',
              published: publish,
              relatedManuscriptVersion,
            });
          expect(response.status).toBe(expected);
        },
      );
    });

    test('Should return a 500 error when creating a research output fails due to server error', async () => {
      const researchOutput = getResearchOutputPostRequest();

      researchOutputControllerMock.create.mockRejectedValueOnce(
        Boom.badImplementation(),
      );

      await supertest(app)
        .post('/research-outputs')
        .send({ ...researchOutput })
        .set('Accept', 'application/json')
        .expect(500);
    });

    describe('Parameter validation', () => {
      const {
        rrid: _rrid,
        doi: _doi,
        accession: _accession,
        ...researchOutput
      } = getResearchOutputPostRequest();

      test('Should return a validation error when the arguments are not valid', async () => {
        const response = await supertest(app).post('/research-outputs/').send({
          unknown_field: 2,
        });

        expect(response.status).toBe(400);
      });

      const validDOI = { doi: '10.1234' };
      const validRRID = { rrid: 'RRID:Hi' };
      const validAccession = { accession: 'NP_1234' };
      const noIdentifier = {};
      test.each`
        documentType        | identifier        | status
        ${'Article'}        | ${validDOI}       | ${201}
        ${'Article'}        | ${validRRID}      | ${400}
        ${'Article'}        | ${validAccession} | ${400}
        ${'Article'}        | ${noIdentifier}   | ${201}
        ${'Bioinformatics'} | ${validDOI}       | ${201}
        ${'Bioinformatics'} | ${validRRID}      | ${201}
        ${'Bioinformatics'} | ${validAccession} | ${400}
        ${'Bioinformatics'} | ${noIdentifier}   | ${201}
        ${'Lab Material'}   | ${validDOI}       | ${201}
        ${'Lab Material'}   | ${validRRID}      | ${201}
        ${'Lab Material'}   | ${validAccession} | ${400}
        ${'Lab Material'}   | ${noIdentifier}   | ${201}
        ${'Dataset'}        | ${validDOI}       | ${201}
        ${'Dataset'}        | ${validRRID}      | ${400}
        ${'Dataset'}        | ${validAccession} | ${201}
        ${'Dataset'}        | ${noIdentifier}   | ${201}
        ${'Protocol'}       | ${validDOI}       | ${201}
        ${'Protocol'}       | ${validRRID}      | ${400}
        ${'Protocol'}       | ${validAccession} | ${400}
        ${'Protocol'}       | ${noIdentifier}   | ${201}
        ${'Grant Document'} | ${validDOI}       | ${400}
        ${'Grant Document'} | ${validRRID}      | ${400}
        ${'Grant Document'} | ${validAccession} | ${400}
        ${'Grant Document'} | ${noIdentifier}   | ${201}
        ${'Presentation'}   | ${validDOI}       | ${400}
        ${'Presentation'}   | ${validRRID}      | ${400}
        ${'Presentation'}   | ${validAccession} | ${400}
        ${'Presentation'}   | ${noIdentifier}   | ${201}
      `(
        'on type $type returns status $status for $identifier',
        async ({ documentType, identifier, status }) => {
          const response = await supertest(app)
            .post('/research-outputs/')
            .send({
              ...researchOutput,
              documentType,
              ...identifier,
            });
          expect(response.status).toBe(status);
        },
      );

      test('Do not require an identifier if funded and used in publication', async () => {
        const response = await supertest(app)
          .post('/research-outputs/')
          .send({
            ...researchOutput,
            asapFunded: true,
            usedInPublication: true,
          });

        expect(response.status).toBe(201);
      });

      test('Accepts doi based on the regex', async () => {
        const response = await supertest(app)
          .post('/research-outputs/')
          .send({
            ...researchOutput,
            documentType: 'Article',
            ...validDOI,
          });
        expect(response.status).toBe(201);
      });

      test('Rejects doi based on the regex', async () => {
        const response = await supertest(app)
          .post('/research-outputs/')
          .send({
            ...researchOutput,
            documentType: 'Article',
            doi: '10.222',
          });
        expect(response.status).toBe(400);
      });

      test('Accepts accession based on the regex', async () => {
        const response = await supertest(app)
          .post('/research-outputs/')
          .send({
            ...researchOutput,
            documentType: 'Dataset',
            ...validAccession,
          });
        expect(response.status).toBe(201);
      });

      test('Rejects accession based on the regex', async () => {
        const response = await supertest(app)
          .post('/research-outputs/')
          .send({
            ...researchOutput,
            documentType: 'Dataset',
            accession: 'NP_HELLO_WORLD',
          });
        expect(response.status).toBe(400);
      });

      test('Accepts rrid based on the regex', async () => {
        const response = await supertest(app)
          .post('/research-outputs/')
          .send({
            ...researchOutput,
            documentType: 'Lab Material',
            ...validRRID,
          });
        expect(response.status).toBe(201);
      });

      test('Rejects rrid based on the regex', async () => {
        const response = await supertest(app)
          .post('/research-outputs/')
          .send({
            ...researchOutput,
            documentType: 'Bioinformatics',
            rrid: 'HelloWorld',
          });
        expect(response.status).toBe(400);
      });

      test.each([
        'documentType',
        'descriptionMD',
        'keywords',
        'title',
        'sharingStatus',
        'teams',
        'published',
      ])(
        'Should return a validation error when %s is missing',
        async (field) => {
          const response = await supertest(app)
            .post('/research-outputs/')
            .send({
              ...researchOutput,
              [field]: undefined,
            });

          expect(response.status).toBe(400);
          expect(response.body).toEqual({
            data: [
              {
                instancePath: '',
                keyword: 'required',
                message: `must have required property '${field}'`,
                params: {
                  missingProperty: field,
                },
                schemaPath:
                  field === 'teams' ? '#/else/required' : '#/required',
              },
            ],
            error: 'Bad Request',
            message: 'Validation error',
            statusCode: 400,
          });
        },
      );

      describe('Authors validation', () => {
        const { ...researchOutputPostRequest } = getResearchOutputPostRequest();

        test('Should return a validation error when required field is missing', async () => {
          const response = await supertest(app)
            .post('/research-outputs')
            .send({
              ...researchOutputPostRequest,
              authors: [{ name: 'random-value' }],
            })
            .set('Accept', 'application/json');

          expect(response.status).toBe(400);
          expect(response.body).toEqual({
            error: 'Bad Request',
            message: 'Validation error',
            statusCode: 400,
            data: [
              ...['userId', 'externalAuthorId', 'externalAuthorName'].map(
                (field, idx) => ({
                  instancePath: '/authors/0',
                  schemaPath: `#/properties/authors/items/oneOf/${idx}/required`,
                  keyword: 'required',
                  params: {
                    missingProperty: field,
                  },
                  message: `must have required property '${field}'`,
                }),
              ),
              {
                instancePath: '/authors/0',
                keyword: 'oneOf',
                message: 'must match exactly one schema in oneOf',
                params: {
                  passingSchemas: null,
                },
                schemaPath: '#/properties/authors/items/oneOf',
              },
            ],
          });
        });
        test('Should return a validation error when passing invalid schema (userId, externalAuthorId, externalAuthorName)', async () => {
          const response = await supertest(app)
            .post('/research-outputs')
            .send({
              ...researchOutputPostRequest,
              authors: [
                {
                  userId: 'userId-1',
                  externalAuthorId: 'external-id-1',
                  externalAuthorName: 'author-name-1',
                },
              ],
            })
            .set('Accept', 'application/json');

          expect(response.status).toBe(400);
          expect(response.body.message).toEqual('Validation error');
          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                message: 'must match exactly one schema in oneOf',
              }),
            ]),
          );
        });
        test('Should return a validation error when passing invalid schema (userId, externalAuthorId)', async () => {
          const response = await supertest(app)
            .post('/research-outputs')
            .send({
              ...researchOutputPostRequest,
              authors: [
                {
                  userId: 'userId-1',
                  externalAuthorId: 'external-id-1',
                },
              ],
            })
            .set('Accept', 'application/json');

          expect(response.status).toBe(400);
          expect(response.body.message).toEqual('Validation error');
          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                message: 'must match exactly one schema in oneOf',
              }),
            ]),
          );
        });
        test('Should return a validation error when passing invalid schema (userId, externalAuthorName)', async () => {
          const response = await supertest(app)
            .post('/research-outputs')
            .send({
              ...researchOutputPostRequest,
              authors: [
                {
                  userId: 'userId-1',
                  externalAuthorName: 'author-name-1',
                },
              ],
            })
            .set('Accept', 'application/json');

          expect(response.status).toBe(400);
          expect(response.body.message).toEqual('Validation error');
          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                message: 'must match exactly one schema in oneOf',
              }),
            ]),
          );
        });
      });
    });

    describe('POST /research-outputs/preprint', () => {
      const manuscriptResponse = getManuscriptResponse({
        id: 'manuscript-id-1',
        title: 'Test Manuscript',
        url: 'https://example.com/manuscript',
        versions: [
          {
            id: 'version-1',
            lifecycle: 'Preprint',
            type: 'Original Research',
            description: 'A good description',
            shortDescription: 'A good short description',
            count: 1,
            createdBy: {
              id: 'user-id-1',
              firstName: 'John',
              lastName: 'Doe',
              displayName: 'John Doe',
              teams: [{ id: 'team-1', name: 'Team 1' }],
            },
            updatedBy: {
              id: 'user-id-1',
              firstName: 'John',
              lastName: 'Doe',
              displayName: 'John Doe',
              teams: [{ id: 'team-1', name: 'Team 1' }],
            },
            createdDate: '2020-09-23T20:45:22.000Z',
            publishedAt: '2020-09-23T20:45:22.000Z',
            manuscriptFile: {
              filename: 'manuscript.pdf',
              url: 'https://example.com/manuscript.pdf',
              id: 'file-id',
            },
            keyResourceTable: {
              filename: 'manuscript.csv',
              url: 'https://example.com/manuscript.csv',
              id: 'file-table-id',
            },
            teams: [
              { id: 'team-1', displayName: 'Test 1', inactiveSince: undefined },
            ],
            labs: [{ id: 'lab-1', name: 'Lab 1' }],
            firstAuthors: [
              {
                id: 'author-1',
                displayName: 'Author 1',
                email: 'author1@example.com',
                firstName: 'Author',
                lastName: '1',
                avatarUrl: undefined,
              },
            ],
            correspondingAuthor: [
              {
                id: 'author-2',
                displayName: 'Author 2',
                email: 'author2@example.com',
                firstName: 'Author',
                lastName: '2',
                avatarUrl: undefined,
              },
            ],
            additionalAuthors: [
              {
                id: 'author-3',
                displayName: 'Author 3',
                email: 'author3@example.com',
                firstName: 'Author',
                lastName: '3',
                avatarUrl: undefined,
              },
            ],
          },
        ],
      });

      const researchOutputResponse = getResearchOutputResponse();

      beforeEach(() => {
        userMockFactory.mockReturnValue(createUserResponse());
      });

      test('Should return 400 when manuscriptId is missing', async () => {
        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({});

        expect(response.status).toBe(400);
      });

      test('Should return 400 when additional fields exist', async () => {
        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({
            manuscriptId: 'manuscript-id-1',
            additionalField: 'some-data',
          });

        expect(response.status).toBe(400);
      });

      test('Should return 404 when manuscript is not found', async () => {
        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          undefined as any,
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'non-existent-manuscript' });

        expect(response.status).toBe(404);
        expect(manuscriptControllerMock.fetchById).toHaveBeenCalledWith(
          'non-existent-manuscript',
          'user-id-0',
        );
      });

      test('Should return 200 when manuscript version with preprint lifecycle is not found', async () => {
        const manuscriptWithoutPreprint = getManuscriptResponse({
          versions: [
            {
              id: 'version-1',
              lifecycle: 'Publication',
              type: 'Original Research',
              description: 'A good description',
              shortDescription: 'A good short description',
              count: 1,
              createdBy: {
                id: 'user-id-1',
                firstName: 'John',
                lastName: 'Doe',
                displayName: 'John Doe',
                teams: [{ id: 'team-1', name: 'Team 1' }],
              },
              updatedBy: {
                id: 'user-id-1',
                firstName: 'John',
                lastName: 'Doe',
                displayName: 'John Doe',
                teams: [{ id: 'team-1', name: 'Team 1' }],
              },
              createdDate: '2020-09-23T20:45:22.000Z',
              publishedAt: '2020-09-23T20:45:22.000Z',
              manuscriptFile: {
                filename: 'manuscript.pdf',
                url: 'https://example.com/manuscript.pdf',
                id: 'file-id',
              },
              keyResourceTable: {
                filename: 'manuscript.csv',
                url: 'https://example.com/manuscript.csv',
                id: 'file-table-id',
              },
              teams: [
                {
                  id: 'team-1',
                  displayName: 'Test 1',
                  inactiveSince: undefined,
                },
              ],
              labs: [{ id: 'lab-1', name: 'Lab 1' }],
              firstAuthors: [],
              correspondingAuthor: [],
              additionalAuthors: [],
            },
          ],
        });

        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          manuscriptWithoutPreprint,
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'manuscript-id-1' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'Manuscript version with lifecycle preprint not found',
        });
      });

      test('Should return 200 when research output already exists for manuscript version', async () => {
        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          manuscriptResponse,
        );
        manuscriptControllerMock.getResearchOutputLinked.mockResolvedValueOnce(
          getResearchOutputDataObject(),
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'manuscript-id-1' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(getResearchOutputDataObject());
        expect(
          manuscriptControllerMock.getResearchOutputLinked,
        ).toHaveBeenCalledWith('version-1');
      });

      test('Should create research output successfully when all conditions are met', async () => {
        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          manuscriptResponse,
        );
        manuscriptControllerMock.getResearchOutputLinked.mockResolvedValueOnce(
          null,
        );
        researchOutputControllerMock.create.mockResolvedValueOnce(
          researchOutputResponse,
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'manuscript-id-1' });

        expect(response.status).toBe(201);
        expect(response.body).toEqual(researchOutputResponse);

        expect(manuscriptControllerMock.fetchById).toHaveBeenCalledWith(
          'manuscript-id-1',
          'user-id-0',
        );
        expect(
          manuscriptControllerMock.getResearchOutputLinked,
        ).toHaveBeenCalledWith('version-1');

        expect(researchOutputControllerMock.create).toHaveBeenCalledWith({
          title: 'Test Manuscript',
          link: 'https://example.com/manuscript',
          type: 'Preprint',
          subtype: 'Original Research',
          descriptionMD: 'A good description',
          shortDescription: 'A good short description',
          labs: ['lab-1'],
          authors: [
            { userId: 'author-1' },
            { userId: 'author-2' },
            { userId: 'author-3' },
          ],
          teams: ['team-1'],
          isInReview: false,
          sharingStatus: 'Public',
          asapFunded: true,
          usedInPublication: true,
          environments: [],
          documentType: 'Article',
          createdBy: 'user-id-0',
          methods: [],
          organisms: [],
          relatedEvents: [],
          relatedResearch: [],
          keywords: [],
          workingGroups: [],
          impact: undefined,
          categories: undefined,
          relatedManuscriptVersion: 'version-1',
          relatedManuscript: 'manuscript-id-1',
          published: true,
        });
      });

      test('Should handle manuscript with no authors correctly', async () => {
        const manuscriptWithNoAuthors = getManuscriptResponse({
          versions: [
            {
              id: 'version-1',
              lifecycle: 'Preprint',
              type: 'Original Research',
              description: 'A good description',
              shortDescription: 'A good short description',
              count: 1,
              createdBy: {
                id: 'user-id-1',
                firstName: 'John',
                lastName: 'Doe',
                displayName: 'John Doe',
                teams: [{ id: 'team-1', name: 'Team 1' }],
              },
              updatedBy: {
                id: 'user-id-1',
                firstName: 'John',
                lastName: 'Doe',
                displayName: 'John Doe',
                teams: [{ id: 'team-1', name: 'Team 1' }],
              },
              createdDate: '2020-09-23T20:45:22.000Z',
              publishedAt: '2020-09-23T20:45:22.000Z',
              manuscriptFile: {
                filename: 'manuscript.pdf',
                url: 'https://example.com/manuscript.pdf',
                id: 'file-id',
              },
              keyResourceTable: {
                filename: 'manuscript.csv',
                url: 'https://example.com/manuscript.csv',
                id: 'file-table-id',
              },
              teams: [],
              labs: [],
              firstAuthors: [],
              correspondingAuthor: [],
              additionalAuthors: [],
            },
          ],
        });

        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          manuscriptWithNoAuthors,
        );
        manuscriptControllerMock.getResearchOutputLinked.mockResolvedValueOnce(
          null,
        );
        researchOutputControllerMock.create.mockResolvedValueOnce(
          researchOutputResponse,
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'manuscript-id-1' });

        expect(response.status).toBe(201);
        expect(researchOutputControllerMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            authors: [],
            labs: [],
            teams: [],
          }),
        );
      });

      test('Should handle manuscript with empty optional fields correctly', async () => {
        const manuscriptWithEmptyFields = getManuscriptResponse({
          versions: [
            {
              id: 'version-1',
              lifecycle: 'Preprint',
              type: 'Original Research',
              description: 'A good description',
              shortDescription: 'A good short description',
              count: 1,
              createdBy: {
                id: 'user-id-1',
                firstName: 'John',
                lastName: 'Doe',
                displayName: 'John Doe',
                teams: [{ id: 'team-1', name: 'Team 1' }],
              },
              updatedBy: {
                id: 'user-id-1',
                firstName: 'John',
                lastName: 'Doe',
                displayName: 'John Doe',
                teams: [{ id: 'team-1', name: 'Team 1' }],
              },
              createdDate: '2020-09-23T20:45:22.000Z',
              publishedAt: '2020-09-23T20:45:22.000Z',
              manuscriptFile: {
                filename: 'manuscript.pdf',
                url: 'https://example.com/manuscript.pdf',
                id: 'file-id',
              },
              keyResourceTable: {
                filename: 'manuscript.csv',
                url: 'https://example.com/manuscript.csv',
                id: 'file-table-id',
              },
              teams: [],
              labs: [],
              firstAuthors: [],
              correspondingAuthor: [],
              additionalAuthors: [],
            },
          ],
        });

        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          manuscriptWithEmptyFields,
        );
        manuscriptControllerMock.getResearchOutputLinked.mockResolvedValueOnce(
          null,
        );
        researchOutputControllerMock.create.mockResolvedValueOnce(
          researchOutputResponse,
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'manuscript-id-1' });

        expect(response.status).toBe(201);
        expect(researchOutputControllerMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            authors: [],
            labs: [],
            teams: [],
          }),
        );
      });

      const author1 = {
        id: 'author-1',
        displayName: 'Author 1',
        email: 'author1@example.com',
        firstName: 'Author',
        lastName: '1',
        avatarUrl: undefined,
      };
      const author2 = {
        id: 'author-2',
        displayName: 'Author 2',
        email: 'author2@example.com',
        firstName: 'Author',
        lastName: '2',
        avatarUrl: undefined,
      };
      const author3 = {
        id: 'author-3',
        displayName: 'Author 3',
        email: 'author3@example.com',
        firstName: 'Author',
        lastName: '3',
        avatarUrl: undefined,
      };

      test.each([
        {
          testName: 'Should handle manuscript with no firstAuthors correctly',
          firstAuthors: [],
          correspondingAuthor: [author2],
          additionalAuthors: [author3],
          expectedAuthors: [{ userId: 'author-2' }, { userId: 'author-3' }],
        },
        {
          testName:
            'Should handle manuscript with empty correspondingAuthor correctly',
          firstAuthors: [author1],
          correspondingAuthor: [],
          additionalAuthors: [author3],
          expectedAuthors: [{ userId: 'author-1' }, { userId: 'author-3' }],
        },
        {
          testName:
            'Should handle manuscript with empty additionalAuthors correctly',
          firstAuthors: [author1],
          correspondingAuthor: [author2],
          additionalAuthors: [],
          expectedAuthors: [{ userId: 'author-1' }, { userId: 'author-2' }],
        },
      ])(
        '$testName',
        async ({
          firstAuthors,
          correspondingAuthor,
          additionalAuthors,
          expectedAuthors,
        }) => {
          const manuscriptWithEmptyAuthors = getManuscriptResponse({
            versions: [
              {
                id: 'version-1',
                lifecycle: 'Preprint',
                type: 'Original Research',
                description: 'A good description',
                shortDescription: 'A good short description',
                count: 1,
                createdBy: {
                  id: 'user-id-1',
                  firstName: 'John',
                  lastName: 'Doe',
                  displayName: 'John Doe',
                  teams: [{ id: 'team-1', name: 'Team 1' }],
                },
                updatedBy: {
                  id: 'user-id-1',
                  firstName: 'John',
                  lastName: 'Doe',
                  displayName: 'John Doe',
                  teams: [{ id: 'team-1', name: 'Team 1' }],
                },
                createdDate: '2020-09-23T20:45:22.000Z',
                publishedAt: '2020-09-23T20:45:22.000Z',
                manuscriptFile: {
                  filename: 'manuscript.pdf',
                  url: 'https://example.com/manuscript.pdf',
                  id: 'file-id',
                },
                keyResourceTable: {
                  filename: 'manuscript.csv',
                  url: 'https://example.com/manuscript.csv',
                  id: 'file-table-id',
                },
                teams: [
                  {
                    id: 'team-1',
                    displayName: 'Test 1',
                    inactiveSince: undefined,
                  },
                ],
                labs: [{ id: 'lab-1', name: 'Lab 1' }],
                firstAuthors,
                correspondingAuthor,
                additionalAuthors,
              },
            ],
          });

          manuscriptControllerMock.fetchById.mockResolvedValueOnce(
            manuscriptWithEmptyAuthors,
          );
          manuscriptControllerMock.getResearchOutputLinked.mockResolvedValueOnce(
            null,
          );
          researchOutputControllerMock.create.mockResolvedValueOnce(
            researchOutputResponse,
          );

          const response = await supertest(app)
            .post('/research-outputs/preprint')
            .send({ manuscriptId: 'manuscript-id-1' });

          expect(response.status).toBe(201);
          expect(researchOutputControllerMock.create).toHaveBeenCalledWith(
            expect.objectContaining({
              authors: expectedAuthors,
              labs: ['lab-1'],
              teams: ['team-1'],
            }),
          );
        },
      );

      test('Should handle manuscript with categories correctly', async () => {
        const manuscriptWithCategories = getManuscriptResponse({
          categories: [
            { id: 'category-1', name: 'Category 1' },
            { id: 'category-2', name: 'Category 2' },
          ],
        });

        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          manuscriptWithCategories,
        );
        manuscriptControllerMock.getResearchOutputLinked.mockResolvedValueOnce(
          null,
        );
        researchOutputControllerMock.create.mockResolvedValueOnce(
          researchOutputResponse,
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'manuscript-id-1' });

        expect(response.status).toBe(201);
        expect(researchOutputControllerMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            categories: ['category-1', 'category-2'],
          }),
        );
      });

      test('Should handle manuscript with undefined categories correctly', async () => {
        const manuscriptWithUndefinedCategories = getManuscriptResponse({
          categories: undefined,
        });

        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          manuscriptWithUndefinedCategories,
        );
        manuscriptControllerMock.getResearchOutputLinked.mockResolvedValueOnce(
          null,
        );
        researchOutputControllerMock.create.mockResolvedValueOnce(
          researchOutputResponse,
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'manuscript-id-1' });

        expect(response.status).toBe(201);
        expect(researchOutputControllerMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            categories: undefined,
          }),
        );
      });

      test('Should handle manuscript with empty categories array correctly', async () => {
        const manuscriptWithEmptyCategories = getManuscriptResponse({
          categories: [],
        });

        manuscriptControllerMock.fetchById.mockResolvedValueOnce(
          manuscriptWithEmptyCategories,
        );
        manuscriptControllerMock.getResearchOutputLinked.mockResolvedValueOnce(
          null,
        );
        researchOutputControllerMock.create.mockResolvedValueOnce(
          researchOutputResponse,
        );

        const response = await supertest(app)
          .post('/research-outputs/preprint')
          .send({ manuscriptId: 'manuscript-id-1' });

        expect(response.status).toBe(201);
        expect(researchOutputControllerMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            categories: [],
          }),
        );
      });
    });
  });

  describe('PUT /research-outputs/', () => {
    const researchOutputResponse = getResearchOutputResponse();
    const {
      rrid: _rrid,
      doi: _doi,
      accession: _accession,
      ...researchOutputPutRequest
    } = getResearchOutputPutRequest();
    beforeEach(() => {
      researchOutputControllerMock.fetchById.mockResolvedValue(
        researchOutputResponse,
      );
    });
    describe('Updating a research output', () => {
      test('Should send the data to the controller and return status 200 along with all the research output data', async () => {
        researchOutputControllerMock.update.mockResolvedValueOnce(
          researchOutputResponse,
        );

        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send(researchOutputPutRequest)
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        expect(researchOutputControllerMock.update).toHaveBeenCalledWith(
          'abc123',
          {
            ...researchOutputPutRequest,
            updatedBy: 'user-id-0',
          },
        );
        expect(response.body).toEqual(researchOutputResponse);
      });

      test('Should allow a user to save a draft as a non PM team member', async () => {
        userMockFactory.mockReturnValueOnce({
          ...user,
          role: 'Grantee',
          teams: [
            { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
          ],
        });
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            teams: ['team-1'],
            published: false,
          });
        expect(response.status).toBe(200);
      });

      test('Should allow a user to save a draft as a non PM working group member', async () => {
        userMockFactory.mockReturnValueOnce({
          ...user,
          role: 'Grantee',
          teams: [
            { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
          ],
          workingGroups: [
            { id: 'wg-1', name: 'wg-1', role: 'Member', active: true },
          ],
        });
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            teams: ['not-the-same-team'],
            workingGroups: ['wg-1'],
            published: false,
          });
        expect(response.status).toBe(200);
      });

      test('Should return 403 when user is not permitted to update research output', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            teams: ['team-id-that-does-not-belong-to-user'],
          });
        expect(response.status).toBe(403);
      });
    });

    describe('Publishing a research output', () => {
      describe('when research output is not a manuscript output', () => {
        test('Should return 403 when user is not ASAP Staff or team PM', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Grantee',
            teams: [
              { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              teams: ['team-1'],
              published: true,
            });
          expect(response.status).toBe(403);
        });

        test('Should return 403 when user is not ASAP Staff or working group PM', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Grantee',
            workingGroups: [
              { id: 'wg-1', name: 'wg-1', role: 'Member', active: true },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              teams: ['team-does-not-belong-to-user'],
              workingGroups: ['wg-1'],
              published: true,
            });
          expect(response.status).toBe(403);
        });

        test('Should return 200 when user is a PM of the team', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Grantee',
            teams: [
              { id: 'team-1', displayName: 'team-1', role: 'Project Manager' },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              teams: ['team-1'],
              published: true,
            });
          expect(response.status).toBe(200);
        });

        test('Should return 200 when user is a PM of the working group', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Grantee',
            teams: [
              { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
            ],
            workingGroups: [
              {
                id: 'wg-1',
                name: 'wg-1',
                role: 'Project Manager',
                active: true,
              },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              workingGroups: ['wg-1'],
              published: true,
            });
          expect(response.status).toBe(200);
        });

        test('Should return 200 when user is asap staff', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Staff',
            teams: [
              { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
            ],
            workingGroups: [
              { id: 'wg-1', name: 'wg-1', role: 'Member', active: true },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({ ...researchOutputPutRequest, published: true });
          expect(response.status).toBe(200);
        });
      });

      describe('when research output is a manuscript output', () => {
        const relatedManuscriptVersion = 'manuscript-version-id-1';
        const relatedManuscript = 'manuscript-id-1';
        test('Should return 403 when user is not team member', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Grantee',
            teams: [
              {
                id: 'other-team',
                displayName: 'Other Team',
                role: 'Key Personnel',
              },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              teams: ['team-1'],
              published: true,
              relatedManuscriptVersion,
              relatedManuscript,
            });
          expect(response.status).toBe(403);
        });

        test('Should return 200 when user is a team member', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Grantee',
            teams: [
              { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              teams: ['team-1'],
              published: true,
              relatedManuscriptVersion,
              relatedManuscript,
            });
          expect(response.status).toBe(200);
        });

        test('Should return 200 when user is a PM of the team', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Grantee',
            teams: [
              { id: 'team-1', displayName: 'team-1', role: 'Project Manager' },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              teams: ['team-1'],
              published: true,
              relatedManuscriptVersion,
              relatedManuscript,
            });
          expect(response.status).toBe(200);
        });

        test('Should return 200 when user is asap staff', async () => {
          userMockFactory.mockReturnValueOnce({
            ...user,
            role: 'Staff',
            teams: [
              { id: 'team-1', displayName: 'team-1', role: 'Key Personnel' },
            ],
          });
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              published: true,
              relatedManuscriptVersion,
              relatedManuscript,
            });
          expect(response.status).toBe(200);
        });
      });
    });

    describe('Parameter validation', () => {
      test('Should return a validation error when the arguments are not valid', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            unknown_field: 2,
          });

        expect(response.status).toBe(400);
      });

      const validDOI = { doi: '10.1234' };
      const validRRID = { rrid: 'RRID:Hi' };
      const validAccession = { accession: 'NP_1234' };
      const noIdentifier = {};
      test.each`
        documentType        | identifier        | status
        ${'Article'}        | ${validDOI}       | ${200}
        ${'Article'}        | ${validRRID}      | ${400}
        ${'Article'}        | ${validAccession} | ${400}
        ${'Article'}        | ${noIdentifier}   | ${200}
        ${'Bioinformatics'} | ${validDOI}       | ${200}
        ${'Bioinformatics'} | ${validRRID}      | ${200}
        ${'Bioinformatics'} | ${validAccession} | ${400}
        ${'Bioinformatics'} | ${noIdentifier}   | ${200}
        ${'Lab Material'}   | ${validDOI}       | ${200}
        ${'Lab Material'}   | ${validRRID}      | ${200}
        ${'Lab Material'}   | ${validAccession} | ${400}
        ${'Lab Material'}   | ${noIdentifier}   | ${200}
        ${'Dataset'}        | ${validDOI}       | ${200}
        ${'Dataset'}        | ${validRRID}      | ${400}
        ${'Dataset'}        | ${validAccession} | ${200}
        ${'Dataset'}        | ${noIdentifier}   | ${200}
        ${'Protocol'}       | ${validDOI}       | ${200}
        ${'Protocol'}       | ${validRRID}      | ${400}
        ${'Protocol'}       | ${validAccession} | ${400}
        ${'Protocol'}       | ${noIdentifier}   | ${200}
        ${'Grant Document'} | ${validDOI}       | ${400}
        ${'Grant Document'} | ${validRRID}      | ${400}
        ${'Grant Document'} | ${validAccession} | ${400}
        ${'Grant Document'} | ${noIdentifier}   | ${200}
        ${'Presentation'}   | ${validDOI}       | ${400}
        ${'Presentation'}   | ${validRRID}      | ${400}
        ${'Presentation'}   | ${validAccession} | ${400}
        ${'Presentation'}   | ${noIdentifier}   | ${200}
      `(
        'on type $type returns status $status for $identifier',
        async ({ documentType, identifier, status }) => {
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              documentType,
              ...identifier,
            });
          expect(response.status).toBe(status);
        },
      );

      test('Do not require an identifier if funded and used in publication', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            asapFunded: true,
            usedInPublication: true,
          });
        expect(response.status).toBe(200);
      });

      test('Accepts doi based on the regex', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            documentType: 'Article',
            ...validDOI,
          });
        expect(response.status).toBe(200);
      });

      test('Rejects doi based on the regex', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            documentType: 'Article',
            doi: 'doi:1.222',
          });
        expect(response.status).toBe(400);
      });

      test('Accepts accession based on the regex', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            documentType: 'Dataset',
            ...validAccession,
          });
        expect(response.status).toBe(200);
      });

      test('Rejects accession based on the regex', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            documentType: 'Dataset',
            accession: 'NP_HELLO_WORLD',
          });
        expect(response.status).toBe(400);
      });

      test('Accepts rrid based on the regex', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            documentType: 'Lab Material',
            ...validRRID,
          });
        expect(response.status).toBe(200);
      });

      test('Rejects rrid based on the regex', async () => {
        const response = await supertest(app)
          .put('/research-outputs/abc123')
          .send({
            ...researchOutputPutRequest,
            documentType: 'Bioinformatics',
            rrid: 'HelloWorld',
          });
        expect(response.status).toBe(400);
      });

      test.each([
        'documentType',
        'descriptionMD',
        'keywords',
        'title',
        'sharingStatus',
        'teams',
        'methods',
        'organisms',
        'environments',
      ])(
        'Should return a validation error when %s is missing',
        async (field) => {
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              [field]: undefined,
            });

          expect(response.status).toBe(400);
          expect(response.body).toEqual({
            data: [
              {
                instancePath: '',
                keyword: 'required',
                message: `must have required property '${field}'`,
                params: {
                  missingProperty: field,
                },
                schemaPath:
                  field === 'teams' ? '#/else/required' : '#/required',
              },
            ],
            error: 'Bad Request',
            message: 'Validation error',
            statusCode: 400,
          });
        },
      );

      describe('Authors validation', () => {
        test('Should return a validation error when required field is missing', async () => {
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              authors: [{ name: 'random-value' }],
            })
            .set('Accept', 'application/json');

          expect(response.status).toBe(400);
          expect(response.body).toEqual({
            error: 'Bad Request',
            message: 'Validation error',
            statusCode: 400,
            data: [
              ...['userId', 'externalAuthorId', 'externalAuthorName'].map(
                (field, idx) => ({
                  instancePath: '/authors/0',
                  schemaPath: `#/properties/authors/items/oneOf/${idx}/required`,
                  keyword: 'required',
                  params: {
                    missingProperty: field,
                  },
                  message: `must have required property '${field}'`,
                }),
              ),
              {
                instancePath: '/authors/0',
                keyword: 'oneOf',
                message: 'must match exactly one schema in oneOf',
                params: {
                  passingSchemas: null,
                },
                schemaPath: '#/properties/authors/items/oneOf',
              },
            ],
          });
        });

        test('Should return a validation error when passing invalid schema (userId, externalAuthorId, externalAuthorName)', async () => {
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              authors: [
                {
                  userId: 'userId-1',
                  externalAuthorId: 'external-id-1',
                  externalAuthorName: 'author-name-1',
                },
              ],
            })
            .set('Accept', 'application/json');

          expect(response.status).toBe(400);
          expect(response.body.message).toEqual('Validation error');
          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                message: 'must match exactly one schema in oneOf',
              }),
            ]),
          );
        });

        test('Should return a validation error when passing invalid schema (userId, externalAuthorId)', async () => {
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              authors: [
                {
                  userId: 'userId-1',
                  externalAuthorId: 'external-id-1',
                },
              ],
            })
            .set('Accept', 'application/json');

          expect(response.status).toBe(400);
          expect(response.body.message).toEqual('Validation error');
          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                message: 'must match exactly one schema in oneOf',
              }),
            ]),
          );
        });

        test('Should return a validation error when passing invalid schema (userId, externalAuthorName)', async () => {
          const response = await supertest(app)
            .put('/research-outputs/abc123')
            .send({
              ...researchOutputPutRequest,
              authors: [
                {
                  userId: 'userId-1',
                  externalAuthorName: 'author-name-1',
                },
              ],
            })
            .set('Accept', 'application/json');

          expect(response.status).toBe(400);
          expect(response.body.message).toEqual('Validation error');
          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                message: 'must match exactly one schema in oneOf',
              }),
            ]),
          );
        });
      });
    });
  });
});
