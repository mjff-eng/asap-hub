import { InterestGroupTeamPayload } from '../../../src/handlers/event-bus';
import { indexInterestGroupTeamsHandler } from '../../../src/handlers/interest-group/algolia-index-interest-group-teams-handler';
import { getInterestGroupResponse } from '../../fixtures/interest-groups.fixtures';
import {
  getTeamContentfulWebhookDetail,
  getTeamPublishedEvent,
  getTeamUnpublishedEvent,
} from '../../fixtures/teams.fixtures';
import { createEventBridgeEventMock } from '../../helpers/events';
import { getAlgoliaSearchClientMock } from '../../mocks/algolia-client.mock';
import { interestGroupControllerMock } from '../../mocks/interest-group.controller.mock';
import { interestGroupDataProviderMock } from '../../mocks/interest-group.data-provider.mock';

jest.mock('../../../src/utils/logger');

describe('Index interest groups on interest group team and team events', () => {
  const algoliaSearchClientMock = getAlgoliaSearchClientMock();
  const handler = indexInterestGroupTeamsHandler(
    interestGroupDataProviderMock,
    interestGroupControllerMock,
    algoliaSearchClientMock,
  );

  const teamDetail = getTeamContentfulWebhookDetail('ig-team-1');
  const interestGroupTeamPublishedEvent = createEventBridgeEventMock(
    {
      ...teamDetail,
      sys: {
        ...teamDetail.sys,
        contentType: {
          sys: {
            type: 'Link',
            linkType: 'ContentType',
            id: 'interestGroupsTeams',
          },
        },
      },
    } as InterestGroupTeamPayload,
    'InterestGroupsTeamsPublished' as const,
    'ig-team-1',
  );
  const teamPublishedEvent = getTeamPublishedEvent('team-1');

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Should reindex the interest group of a published interest group team', async () => {
    interestGroupDataProviderMock.fetchIdByInterestGroupTeamId.mockResolvedValue(
      'group-id-1',
    );
    interestGroupControllerMock.fetchById.mockResolvedValue({
      ...getInterestGroupResponse(),
      id: 'group-id-1',
    });

    await handler(interestGroupTeamPublishedEvent);

    expect(
      interestGroupDataProviderMock.fetchIdByInterestGroupTeamId,
    ).toHaveBeenCalledWith('ig-team-1');
    expect(interestGroupControllerMock.fetchById).toHaveBeenCalledWith(
      'group-id-1',
    );
    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
      {
        data: expect.objectContaining({ id: 'group-id-1' }),
        type: 'interest-group',
      },
    ]);
  });

  test('Should reindex every interest group of a published team', async () => {
    interestGroupDataProviderMock.fetchIdsByTeamId.mockResolvedValue([
      'group-id-1',
      'group-id-2',
    ]);
    interestGroupControllerMock.fetchById.mockImplementation(async (id) => ({
      ...getInterestGroupResponse(),
      id,
    }));

    await handler(teamPublishedEvent);

    expect(interestGroupDataProviderMock.fetchIdsByTeamId).toHaveBeenCalledWith(
      'team-1',
    );
    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
      {
        data: expect.objectContaining({ id: 'group-id-1' }),
        type: 'interest-group',
      },
      {
        data: expect.objectContaining({ id: 'group-id-2' }),
        type: 'interest-group',
      },
    ]);
  });

  test('Should reindex the interest groups that list an unpublished team in Algolia', async () => {
    algoliaSearchClientMock.search.mockResolvedValue({
      hits: [{ id: 'group-id-1' }, { id: 'group-id-2' }],
    } as never);
    interestGroupControllerMock.fetchById.mockImplementation(async (id) => ({
      ...getInterestGroupResponse(),
      id,
    }));

    await handler(getTeamUnpublishedEvent('team-1'));

    expect(algoliaSearchClientMock.search).toHaveBeenCalledWith(
      ['interest-group'],
      '',
      { filters: 'teams.id:"team-1"', hitsPerPage: 1000 },
    );
    expect(
      interestGroupDataProviderMock.fetchIdsByTeamId,
    ).not.toHaveBeenCalled();
    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
      {
        data: expect.objectContaining({ id: 'group-id-1' }),
        type: 'interest-group',
      },
      {
        data: expect.objectContaining({ id: 'group-id-2' }),
        type: 'interest-group',
      },
    ]);
  });

  test('Should not touch Algolia when the entry belongs to no interest group', async () => {
    interestGroupDataProviderMock.fetchIdByInterestGroupTeamId.mockResolvedValue(
      null,
    );

    await handler(interestGroupTeamPublishedEvent);

    expect(interestGroupControllerMock.fetchById).not.toHaveBeenCalled();
    expect(algoliaSearchClientMock.saveMany).not.toHaveBeenCalled();
  });

  test('Should fail without saving when an interest group cannot be fetched', async () => {
    const error = new Error('Contentful is down');
    interestGroupDataProviderMock.fetchIdsByTeamId.mockResolvedValue([
      'group-id-1',
    ]);
    interestGroupControllerMock.fetchById.mockRejectedValue(error);

    await expect(handler(teamPublishedEvent)).rejects.toThrow(error);
    expect(algoliaSearchClientMock.saveMany).not.toHaveBeenCalled();
  });
});
