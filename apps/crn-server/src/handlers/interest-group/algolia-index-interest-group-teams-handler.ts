import { AlgoliaClient, algoliaSearchClientFactory } from '@asap-hub/algolia';
import {
  InterestGroupResponse,
  InterestGroupTeamEvent,
  TeamEvent,
} from '@asap-hub/model';
import { EventBridgeHandler } from '@asap-hub/server-common';
import { algoliaApiKey, algoliaAppId, algoliaIndex } from '../../config';
import InterestGroupController from '../../controllers/interest-group.controller';
import { InterestGroupDataProvider } from '../../data-providers/types';
import { getInterestGroupDataProvider } from '../../dependencies/interest-groups.dependencies';
import { getUserDataProvider } from '../../dependencies/users.dependencies';
import { getInterestGroupIdsForEntry } from '../../utils/interest-group-ids';
import logger from '../../utils/logger';
import { sentryWrapper } from '../../utils/sentry-wrapper';
import { InterestGroupTeamPayload, TeamPayload } from '../event-bus';
import { addTagsFunction } from '../helper';

/**
 * Interest group records embed their memberships and teams, but publishing a
 * membership or a team doesn't republish the interest group, so its record is
 * reindexed here.
 */
export const indexInterestGroupTeamsHandler =
  (
    interestGroupDataProvider: InterestGroupDataProvider,
    interestGroupController: InterestGroupController,
    algoliaClient: AlgoliaClient<'crn'>,
  ): EventBridgeHandler<
    InterestGroupTeamEvent | TeamEvent,
    InterestGroupTeamPayload | TeamPayload
  > =>
  async (event) => {
    const { resourceId } = event.detail;
    // Contentful no longer matches the memberships of an unpublished team, so
    // its groups are found through their Algolia records.
    const interestGroupIds =
      event['detail-type'] === 'TeamsUnpublished'
        ? (
            await algoliaClient.search(['interest-group'], '', {
              filters: `teams.id:"${resourceId}"`,
              hitsPerPage: 1000,
            })
          ).hits.map(({ id }) => id)
        : await getInterestGroupIdsForEntry(
            interestGroupDataProvider,
            event['detail-type'],
            resourceId,
          );
    logger.debug(
      `Reindexing interest groups [${interestGroupIds}] for entry ${resourceId}`,
    );

    if (interestGroupIds.length === 0) {
      return;
    }

    const interestGroups = await Promise.all(
      interestGroupIds.map((id) => interestGroupController.fetchById(id)),
    );
    await algoliaClient.saveMany(
      interestGroups.map((interestGroup) => ({
        data: addTagsFunction(interestGroup) as InterestGroupResponse,
        type: 'interest-group' as const,
      })),
    );
  };

const interestGroupDataProvider = getInterestGroupDataProvider();
/* istanbul ignore next */
export const handler = sentryWrapper(
  indexInterestGroupTeamsHandler(
    interestGroupDataProvider,
    new InterestGroupController(
      interestGroupDataProvider,
      getUserDataProvider(),
    ),
    algoliaSearchClientFactory({ algoliaApiKey, algoliaAppId, algoliaIndex }),
  ),
);
