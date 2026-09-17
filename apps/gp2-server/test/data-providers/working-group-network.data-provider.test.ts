import {
  getGP2ContentfulGraphqlClientMockServer,
  gp2 as gp2Contentful,
} from '@asap-hub/contentful';
import { WorkingGroupNetworkContentfulDataProvider } from '../../src/data-providers/working-group-network.data-provider';
import { getContentfulTagsCollectionGraphqlResponse } from '../fixtures/tag.fixtures';
import {
  getContentfulGraphqlWorkingGroupNetwork,
  getContentfulGraphqlWorkingGroupNetworkResponse,
  getListWorkingGroupNetworkDataObject,
} from '../fixtures/working-group-network.fixtures';
import {
  getContentfulGraphqlWorkingGroupMembers,
  getContentfulGraphqlWorkingGroupMilestones,
  getContentfulGraphqlWorkingGroupResources,
} from '../fixtures/working-group.fixtures';
import { getContentfulGraphqlClientMock } from '../mocks/contentful-graphql-client.mock';

describe('Working Group Network Data Provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();

  const workingGroupDataProvider =
    new WorkingGroupNetworkContentfulDataProvider(contentfulGraphqlClientMock);

  const contentfulGraphqlClientMockServer =
    getGP2ContentfulGraphqlClientMockServer({
      WorkingGroupNetwork: () => getContentfulGraphqlWorkingGroupNetwork(),
      WorkingGroupsMembersCollection: () =>
        getContentfulGraphqlWorkingGroupMembers(),
      WorkingGroupsMilestonesCollection: () =>
        getContentfulGraphqlWorkingGroupMilestones(),
      WorkingGroupsResourcesCollection: () =>
        getContentfulGraphqlWorkingGroupResources(),
      WorkingGroupsTagsCollection: () =>
        getContentfulTagsCollectionGraphqlResponse(),
    });

  const workingGroupNetworkDataProviderWithMockServer =
    new WorkingGroupNetworkContentfulDataProvider(
      contentfulGraphqlClientMockServer,
    );

  beforeEach(jest.resetAllMocks);

  describe('Fetch', () => {
    test('Should fetch the working group network from graphql', async () => {
      const result =
        await workingGroupNetworkDataProviderWithMockServer.fetch();

      expect(result).toMatchObject(getListWorkingGroupNetworkDataObject());
    });

    test('Should return an empty result', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroupNetwork: { total: 0, items: [] },
      });
      const result = await workingGroupDataProvider.fetch();
      expect(result).toEqual({ total: 0, items: [] });
    });
    test('the working group network is parsed', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulGraphqlWorkingGroupNetworkResponse(),
      );
      const result = await workingGroupDataProvider.fetch();
      const expected = getListWorkingGroupNetworkDataObject();
      expect(result).toEqual(expected);
    });
    test('Should fetch remaining member pages of each working group', async () => {
      const response = getContentfulGraphqlWorkingGroupNetworkResponse();
      const network = response.workingGroupNetworkCollection!.items[0]!;
      const [member] = getContentfulGraphqlWorkingGroupMembers().items;
      network.supportCollection!.items[0]!.membersCollection = {
        total: 2,
        items: [member!],
      };
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce({
          workingGroups: {
            membersCollection: {
              total: 2,
              items: [
                {
                  ...member,
                  sys: { id: '33' },
                  user: { ...member!.user, sys: { id: '12' } },
                },
              ],
            },
          },
        });

      const result = await workingGroupDataProvider.fetch();

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(2);
      expect(contentfulGraphqlClientMock.request).toHaveBeenLastCalledWith(
        gp2Contentful.FETCH_WORKING_GROUP_MEMBERS,
        { id: '11', limit: 100, skip: 1 },
      );
      const support = result.items.find(({ role }) => role === 'support');
      expect(
        support?.workingGroups[0]?.members.map(({ userId }) => userId),
      ).toEqual(['11', '12']);
    });
    test('the working group network is parsed2', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroupNetworkCollection: {
          total: 1,
          items: [
            {
              noCollection: {
                total: 1,
                items: [],
              },
            },
          ],
        },
      });
      const result = await workingGroupDataProvider.fetch();
      expect(result).toEqual({
        items: [
          { role: 'operational', workingGroups: [] },
          { role: 'monogenic', workingGroups: [] },
          { role: 'complexDisease', workingGroups: [] },
          { role: 'support', workingGroups: [] },
        ],
        total: 4,
      });
    });
  });
  describe('Fetch-by-id method', () => {
    test('Should throw as not implemented', async () => {
      expect.assertions(1);
      await expect(workingGroupDataProvider.fetchById()).rejects.toThrow(
        /Method not implemented/i,
      );
    });
  });
});
