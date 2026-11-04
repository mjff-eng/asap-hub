import { AlgoliaClient, algoliaSearchClientFactory } from '@asap-hub/algolia';
import { NotFoundError } from '@asap-hub/errors';
import {
  toUserListItem,
  UserEvent,
  TeamMembershipEvent,
  UserListItemSource,
} from '@asap-hub/model';
import { EventBridgeHandler, UserPayload } from '@asap-hub/server-common';
import { isBoom } from '@hapi/boom';
import { EventBridgeEvent } from 'aws-lambda';
import { algoliaApiKey, algoliaAppId, algoliaIndex } from '../../config';
import UserController from '../../controllers/user.controller';
import {
  getAssetDataProvider,
  getUserDataProvider,
  getResearchTagsDataProvider,
} from '../../dependencies/users.dependencies';
import logger from '../../utils/logger';
import { sentryWrapper } from '../../utils/sentry-wrapper';

type TeamMembershipPayload = {
  resourceId: string;
  fields: {
    team: {
      'en-US': {
        sys: { id: string };
      };
    };
  };
};

type IndexUserEvent = UserEvent | TeamMembershipEvent;
type IndexUserPayload = UserPayload | TeamMembershipPayload;

const isTeamMembershipEvent = (type: string): type is TeamMembershipEvent =>
  type.startsWith('TeamMembership');

const isNotFoundError = (e: unknown): e is Error =>
  (isBoom(e) && e.output.statusCode === 404) || e instanceof NotFoundError;

const shouldIndexUser = (
  user: Pick<UserListItemSource, 'onboarded' | 'role'>,
): boolean => Boolean(user.onboarded) && user.role !== 'Hidden';

async function fetchUserFromTeamMembership(
  userController: UserController,
  membershipId: string,
): Promise<UserListItemSource> {
  const userList = await userController.fetch({
    filter: { teamMembershipId: membershipId },
    take: 1,
    skip: 0,
  });

  const first = userList.items[0];
  if (!first) {
    throw new NotFoundError(
      undefined,
      `user with teamMembershipId ${membershipId} not found`,
    );
  }

  logger.debug(
    { membershipId, userId: first.id, detailType: 'TeamMembership' },
    'Successfully resolved user from TeamMembership',
  );

  return userController.fetchByIdForAlgoliaList(first.id);
}

async function fetchUserFromEvent(
  userController: UserController,
  detailType: string,
  payload: IndexUserPayload | TeamMembershipPayload,
): Promise<UserListItemSource> {
  logger.info({ payload, detailType }, 'Fetching user from event payload');
  if (isTeamMembershipEvent(detailType)) {
    return fetchUserFromTeamMembership(userController, payload.resourceId);
  }
  const user = await userController.fetchByIdForAlgoliaList(payload.resourceId);
  return user;
}

async function syncUserToAlgolia(
  algolia: AlgoliaClient<'crn'>,
  user: UserListItemSource,
): Promise<void> {
  if (shouldIndexUser(user)) {
    await algolia.save({ data: toUserListItem(user), type: 'user' });
    logger.info({ userId: user.id }, 'User indexed');
  } else {
    await algolia.remove(user.id);
    logger.info({ userId: user.id }, 'User removed (not indexable)');
  }
}

async function handleNotFoundError(
  algolia: AlgoliaClient<'crn'>,
  detailType: string,
  resourceId: string,
  originalError: Error,
): Promise<void> {
  if (isTeamMembershipEvent(detailType)) {
    logger.warn(
      {
        detailType,
        resourceId,
        originalError: originalError.message,
      },
      'TeamMembership event received but no associated user found',
    );
    return;
  }
  await algolia.remove(resourceId);
  logger.info(
    { userId: resourceId, detailType },
    'User removed (not found on fetchByIdForAlgoliaList)',
  );
}

/* istanbul ignore next */
export const indexUserHandler =
  (
    userController: UserController,
    algoliaClient: AlgoliaClient<'crn'>,
  ): EventBridgeHandler<IndexUserEvent, IndexUserPayload> =>
  async (event) => {
    const detailType = event['detail-type'];
    logger.debug({ detailType }, 'Received event');

    try {
      const user = await fetchUserFromEvent(
        userController,
        detailType,
        event.detail,
      );
      await syncUserToAlgolia(algoliaClient, user);
    } catch (error) {
      if (isNotFoundError(error)) {
        await handleNotFoundError(
          algoliaClient,
          detailType,
          (event.detail as { resourceId: string }).resourceId,
          error,
        );
        return;
      }
      logger.error(error, 'Error saving user to Algolia');
      throw error;
    }
  };

export const handler = sentryWrapper(
  indexUserHandler(
    new UserController(
      getUserDataProvider(),
      getAssetDataProvider(),
      getResearchTagsDataProvider(),
    ),
    algoliaSearchClientFactory({ algoliaApiKey, algoliaAppId, algoliaIndex }),
  ),
);

export type UserIndexEventBridgeEvent = EventBridgeEvent<
  UserEvent | TeamMembershipEvent,
  UserPayload | TeamMembershipPayload
>;
