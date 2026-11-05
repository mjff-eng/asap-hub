import {
  canPublishProjectOutput,
  mapManuscriptLifecycleToType,
  mapManuscriptTypeToSubType,
  teamHasActiveProjectManager,
  ListResearchOutputResponse,
  ResearchOutputPostRequest,
  ResearchOutputResponse,
  UserResponse,
} from '@asap-hub/model';
import {
  getUserRole,
  hasEditResearchOutputPermission,
  hasResearchOutputDraftAccess,
} from '@asap-hub/validation';
import Boom from '@hapi/boom';
import { Response, Router } from 'express';
import ManuscriptController from '../controllers/manuscript.controller';
import ProjectController from '../controllers/project.controller';
import ResearchOutputController from '../controllers/research-output.controller';
import TeamController from '../controllers/team.controller';

import {
  validateResearchOutputParameters,
  validateResearchOutputPostRequestParameters,
  validateResearchOutputPostRequestParametersIdentifiers,
  validateResearchOutputPutRequestParameters,
  validateResearchOutputFetchOptions,
  validateResearchOutputPostPreprintRequestParameters,
} from '../validation/research-output.validation';

const resolveOutputAssociation = (
  request: Pick<
    ResearchOutputPostRequest,
    'projectId' | 'workingGroups' | 'teams'
  >,
):
  | { association: 'projects'; associationIds: string[] }
  | { association: 'workingGroups'; associationIds: string[] }
  | { association: 'teams'; associationIds: string[] } => {
  if (request.projectId) {
    return { association: 'projects', associationIds: [request.projectId] };
  }
  if (request.workingGroups.length) {
    return {
      association: 'workingGroups',
      associationIds: request.workingGroups,
    };
  }
  return { association: 'teams', associationIds: request.teams };
};

export const researchOutputRouteFactory = (
  researchOutputController: ResearchOutputController,
  manuscriptController: ManuscriptController,
  projectController: ProjectController,
  teamController: TeamController,
): Router => {
  const researchOutputRoutes = Router();

  const canEditOutput = async (
    user: UserResponse,
    request: Pick<
      ResearchOutputPostRequest,
      'projectId' | 'workingGroups' | 'teams' | 'published'
    >,
    isManuscriptOutput: boolean,
  ): Promise<boolean> => {
    const { association, associationIds } = resolveOutputAssociation(request);
    const userRole = getUserRole(user, association, associationIds);

    if (
      association === 'projects' &&
      request.published &&
      userRole === 'Member' &&
      associationIds[0]
    ) {
      const project = await projectController.fetchById(associationIds[0]);
      return canPublishProjectOutput(user.id, user.teams, project);
    }

    if (
      association === 'teams' &&
      request.published &&
      !isManuscriptOutput &&
      userRole === 'Member' &&
      associationIds[0]
    ) {
      const team = await teamController.fetchById(associationIds[0]);
      if (!teamHasActiveProjectManager(team.members)) {
        return true;
      }
    }

    return hasEditResearchOutputPermission(
      userRole,
      request.published,
      isManuscriptOutput,
    );
  };

  researchOutputRoutes.get(
    '/research-outputs',
    async (req, res: Response<ListResearchOutputResponse>) => {
      const { query, loggedInUser } = req;
      const { teamId, status, workingGroupId, projectId, filter, ...options } =
        validateResearchOutputFetchOptions(query);
      const isRequestingDrafts = status === 'draft';

      if (
        isRequestingDrafts &&
        !hasResearchOutputDraftAccess(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          loggedInUser!,
          {
            teams: teamId ? [teamId] : undefined,
            workingGroups: workingGroupId ? [workingGroupId] : undefined,
            projects: projectId ? [projectId] : undefined,
          },
        )
      ) {
        throw Boom.forbidden();
      }

      const scopeFilter = {
        ...(teamId && { teamId }),
        ...(workingGroupId && { workingGroupId }),
        ...(projectId && { projectId }),
      };

      const result = await researchOutputController.fetch({
        ...options,
        ...(isRequestingDrafts
          ? {
              includeDrafts: true,
              filter: {
                ...filter,
                status,
                ...scopeFilter,
              },
            }
          : {
              filter: {
                ...filter,
                ...scopeFilter,
              },
            }),
      });

      res.json(result);
    },
  );

  researchOutputRoutes.get<{ researchOutputId: string }>(
    '/research-outputs/:researchOutputId',
    async (req, res: Response<ResearchOutputResponse>) => {
      const { params } = req;

      if (!req.loggedInUser) throw Boom.forbidden();

      const { researchOutputId } = validateResearchOutputParameters(params);

      const result = await researchOutputController.fetchById(
        researchOutputId,
        { includeGrantDocument: true },
      );

      if (
        !result.published &&
        !hasResearchOutputDraftAccess(req.loggedInUser, {
          ...(result.workingGroups
            ? {
                workingGroups: result.workingGroups.map(
                  (workingGroup) => workingGroup.id,
                ),
              }
            : { teams: result.teams.map((team) => team.id) }),
          projects: result.project ? [result.project.id] : undefined,
        })
      ) {
        throw Boom.notFound(
          'You do not have permission to view this research-output',
        );
      }

      res.json(result);
    },
  );

  researchOutputRoutes.post('/research-outputs', async (req, res) => {
    const { body, loggedInUser } = req;
    const createRequest = validateResearchOutputPostRequestParameters(body);
    validateResearchOutputPostRequestParametersIdentifiers(createRequest);

    const isManuscriptOutput = !!createRequest.relatedManuscriptVersion;

    if (
      !loggedInUser ||
      !(await canEditOutput(
        loggedInUser as UserResponse,
        createRequest,
        isManuscriptOutput,
      ))
    ) {
      throw Boom.forbidden();
    }

    const researchOutput = await researchOutputController.create({
      ...createRequest,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      createdBy: loggedInUser!.id,
    });

    res.status(201).json(researchOutput);
  });

  researchOutputRoutes.put(
    '/research-outputs/:researchOutputId',
    async (req, res) => {
      const { body, params, loggedInUser } = req;
      const { researchOutputId } = validateResearchOutputParameters(params);
      const updateRequest = validateResearchOutputPutRequestParameters(body);
      validateResearchOutputPostRequestParametersIdentifiers(body);

      const isManuscriptOutput = !!updateRequest.relatedManuscriptVersion;

      if (
        !loggedInUser ||
        !(await canEditOutput(
          loggedInUser as UserResponse,
          updateRequest,
          isManuscriptOutput,
        ))
      ) {
        throw Boom.forbidden();
      }

      const researchOutput = await researchOutputController.update(
        researchOutputId,
        {
          ...updateRequest,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          updatedBy: loggedInUser!.id,
        },
      );

      res.status(200).json(researchOutput);
    },
  );

  researchOutputRoutes.post('/research-outputs/preprint', async (req, res) => {
    const { body, loggedInUser } = req;

    // loggedInUser is guaranteed to be defined by the permissionHandler middleware
    // but TypeScript doesn't know this, so we use a type assertion
    const user = loggedInUser as UserResponse;

    const { manuscriptId } =
      validateResearchOutputPostPreprintRequestParameters(body);
    const manuscript = await manuscriptController.fetchById(
      manuscriptId,
      user.id,
    );
    if (!manuscript) {
      throw Boom.notFound('Manuscript not found');
    }

    const preprintManuscriptVersion = manuscript.versions.find(
      (version) => version.lifecycle === 'Preprint',
    );

    if (!preprintManuscriptVersion) {
      return res.status(200).json({
        message: 'Manuscript version with lifecycle preprint not found',
      });
    }

    const researchOutputLinked =
      await manuscriptController.getResearchOutputLinked(
        preprintManuscriptVersion?.id,
      );

    if (researchOutputLinked) {
      return res.status(200).json(researchOutputLinked);
    }

    const authors = Array.from(
      new Set([
        ...preprintManuscriptVersion.firstAuthors.map((author) => author.id),
        ...preprintManuscriptVersion.correspondingAuthor.map(
          (author) => author.id,
        ),
        ...preprintManuscriptVersion.additionalAuthors.map(
          (author) => author.id,
        ),
      ]),
    );

    const researchOutput = await researchOutputController.create({
      title: manuscript.title,
      link: preprintManuscriptVersion.url || manuscript.url,
      type:
        preprintManuscriptVersion.lifecycle &&
        mapManuscriptLifecycleToType(preprintManuscriptVersion.lifecycle),
      subtype:
        preprintManuscriptVersion.type &&
        mapManuscriptTypeToSubType(preprintManuscriptVersion.type),
      descriptionMD: preprintManuscriptVersion.description,
      shortDescription: preprintManuscriptVersion.shortDescription,
      labs: preprintManuscriptVersion.labs?.map((lab) => lab.id) || [],
      authors: authors.map((author) => ({ userId: author })),
      teams: preprintManuscriptVersion.teams?.map((team) => team.id) || [],
      projectId: manuscript.projectId,
      isInReview: false,
      sharingStatus: 'Public',
      asapFunded: true,
      usedInPublication: true,
      environments: [],
      documentType: 'Article',
      createdBy: user.id,
      methods: [],
      organisms: [],
      relatedEvents: [],
      relatedResearch: [],
      keywords: [],
      workingGroups: [],
      impact: manuscript.impact?.id,
      layImpactStatement: manuscript.layImpactStatement,
      categories: manuscript.categories?.map((category) => category.id),
      relatedManuscriptVersion: preprintManuscriptVersion.id,
      relatedManuscript: manuscript.id,
      publishDate: manuscript.preprintDate,
      published: true,
    });

    return res.status(201).json(researchOutput);
  });

  return researchOutputRoutes;
};
