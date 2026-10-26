import {
  AlgoliaClient,
  algoliaSearchClientFactory,
  Payload,
} from '@asap-hub/algolia';
import { ListUserResponse, TeamEvent, toUserListItem } from '@asap-hub/model';
import {
  createProcessingFunction,
  loopOverCustomCollection,
  LoopOverCustomCollectionFetchOptions,
  userFilter,
} from '@asap-hub/server-common';
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
import { TeamPayload } from '../event-bus';

export const indexTeamUsersHandler = (
  userController: UserController,
  algoliaClient: AlgoliaClient<'crn'>,
): ((event: EventBridgeEvent<TeamEvent, TeamPayload>) => Promise<void>) => {
  const processingFunction = createProcessingFunction<Payload, 'user'>(
    algoliaClient,
    'user',
    logger,
    userFilter,
  );
  return async (event) => {
    logger.debug(`Event ${event['detail-type']}`);

    if (event['detail-type'] === 'TeamsUnpublished') {
      // Contentful no longer matches the memberships of an unpublished team,
      // so its members are found through their Algolia records.
      const { hits } = await algoliaClient.search(['user'], '', {
        filters: `teams.id:"${event.detail.resourceId}"`,
        hitsPerPage: 1000,
      });
      const users = await Promise.all(
        hits.map(({ id }) => userController.fetchByIdForAlgoliaList(id)),
      );
      await processingFunction({
        total: users.length,
        items: users.map(toUserListItem),
      });
      return;
    }

    const fetchFunction = ({
      skip,
      take,
    }: LoopOverCustomCollectionFetchOptions): Promise<ListUserResponse> =>
      userController.fetch({
        filter: {
          teamId: event.detail.resourceId,
        },
        skip,
        take,
      });

    await loopOverCustomCollection(fetchFunction, processingFunction, 8);
  };
};

const rawHandler = indexTeamUsersHandler(
  new UserController(
    getUserDataProvider(),
    getAssetDataProvider(),
    getResearchTagsDataProvider(),
  ),
  algoliaSearchClientFactory({ algoliaApiKey, algoliaAppId, algoliaIndex }),
);

/* istanbul ignore next */
export const handler = sentryWrapper(rawHandler);

export type UserIndexEventBridgeEvent = EventBridgeEvent<
  TeamEvent,
  TeamPayload
>;
