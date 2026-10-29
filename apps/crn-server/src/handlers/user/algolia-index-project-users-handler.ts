import {
  AlgoliaClient,
  algoliaSearchClientFactory,
  Payload,
} from '@asap-hub/algolia';
import { NotFoundError } from '@asap-hub/errors';
import {
  ProjectEvent,
  ProjectMembershipEvent,
  ProjectResponse,
  ResourceProject,
  toUserListItem,
  TraineeProject,
} from '@asap-hub/model';
import {
  cleanArray,
  createProcessingFunction,
  EventBridgeHandler,
  userFilter,
} from '@asap-hub/server-common';
import { algoliaApiKey, algoliaAppId, algoliaIndex } from '../../config';
import ProjectController from '../../controllers/project.controller';
import UserController from '../../controllers/user.controller';
import { getProjectDataProvider } from '../../dependencies/projects.dependencies';
import {
  getAssetDataProvider,
  getResearchTagsDataProvider,
  getUserDataProvider,
} from '../../dependencies/users.dependencies';
import logger from '../../utils/logger';
import { sentryWrapper } from '../../utils/sentry-wrapper';

type ProjectUsersEvent = ProjectEvent | ProjectMembershipEvent;
type ProjectUsersPayload = {
  resourceId: string;
};

const UNRESOLVED_USER_ID_PREFIX = 'unknown-user-';
const MAX_PROJECTS_PER_MEMBERSHIP = 20;

const isProjectEvent = (
  detailType: ProjectUsersEvent,
): detailType is ProjectEvent =>
  detailType === 'ProjectsPublished' || detailType === 'ProjectsUnpublished';

const isIndividualProject = (
  project: ProjectResponse,
): project is TraineeProject | ResourceProject =>
  project.projectType === 'Trainee Project' ||
  (project.projectType === 'Resource Project' && !project.isTeamBased);

const getUserMemberIds = (project: ProjectResponse): string[] =>
  isIndividualProject(project)
    ? (project.members ?? [])
        .map(({ id }) => id)
        .filter((id) => !id.startsWith(UNRESOLVED_USER_ID_PREFIX))
    : [];

const ignoreNotFound = <T>(promise: Promise<T>): Promise<T | null> =>
  promise.catch((error) => {
    if (error instanceof NotFoundError) {
      return null;
    }
    throw error;
  });

const fetchProjects = async (
  projectController: ProjectController,
  detailType: ProjectUsersEvent,
  resourceId: string,
): Promise<ProjectResponse[]> => {
  switch (detailType) {
    case 'ProjectsUnpublished':
      return [];
    case 'ProjectsPublished':
      return cleanArray([
        await ignoreNotFound(projectController.fetchById(resourceId)),
      ]);
    default: {
      // Returns no projects on unpublish: Contentful no longer resolves the membership.
      const { items } = await projectController.fetch({
        filter: { projectMembershipId: resourceId },
        take: MAX_PROJECTS_PER_MEMBERSHIP,
      });
      return items;
    }
  }
};

const fetchIndexedUserIds = async (
  algoliaClient: AlgoliaClient<'crn'>,
  projectIds: string[],
): Promise<string[]> => {
  const { hits } = await algoliaClient.search(['user'], '', {
    filters: projectIds
      .map((id) => `individualProjects.id:"${id}"`)
      .join(' OR '),
    hitsPerPage: 1000,
  });
  return hits.map(({ id }) => id);
};

export const indexProjectUsersHandler = (
  projectController: ProjectController,
  userController: UserController,
  algoliaClient: AlgoliaClient<'crn'>,
): EventBridgeHandler<ProjectUsersEvent, ProjectUsersPayload> => {
  const saveUsers = createProcessingFunction<Payload, 'user'>(
    algoliaClient,
    'user',
    logger,
    userFilter,
  );

  return async (event) => {
    const detailType = event['detail-type'];
    const { resourceId } = event.detail;
    logger.debug(`Event ${detailType}`);

    const projects = await fetchProjects(
      projectController,
      detailType,
      resourceId,
    );
    const projectIds = isProjectEvent(detailType)
      ? [resourceId]
      : projects.map(({ id }) => id);

    if (projectIds.length === 0) {
      return;
    }

    // Users removed from a project are only found through their Algolia records.
    const userIds = [
      ...new Set([
        ...projects.flatMap(getUserMemberIds),
        ...(await fetchIndexedUserIds(algoliaClient, projectIds)),
      ]),
    ];
    logger.debug(`Reindexing users [${userIds}] for projects [${projectIds}]`);

    if (userIds.length === 0) {
      return;
    }

    const users = await Promise.all(
      userIds.map((id) =>
        ignoreNotFound(userController.fetchByIdForAlgoliaList(id)),
      ),
    );
    const items = cleanArray(users).map(toUserListItem);
    await saveUsers({ total: items.length, items });
  };
};

/* istanbul ignore next */
export const handler = sentryWrapper(
  indexProjectUsersHandler(
    new ProjectController(getProjectDataProvider()),
    new UserController(
      getUserDataProvider(),
      getAssetDataProvider(),
      getResearchTagsDataProvider(),
    ),
    algoliaSearchClientFactory({ algoliaApiKey, algoliaAppId, algoliaIndex }),
  ),
);
