import { DiscoverDataProvider } from '../../../src/data-providers/types';
import { DiscoverContentfulDataProvider } from '../../../src/data-providers/contentful/discover.data-provider';
import { getContentfulGraphqlClientMockServer } from '@asap-hub/contentful';
import {
  getDiscoverDataObject,
  getContentfulGraphqlDiscover,
  getContentfulGraphqlDiscoverResponse,
  getContentfulGraphqlDiscoverMembers,
  getContentfulGraphqlAsapArea,
  getContentfulGraphqlAsapAreaMembership,
} from '../../fixtures/discover.fixtures';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';

describe('Discover data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const dataProvider: DiscoverDataProvider = new DiscoverContentfulDataProvider(
    contentfulGraphqlClientMock,
  );

  describe('Fetch', () => {
    const emptyDiscover = {
      members: [],
      scientificAdvisoryBoard: [],
      cnsQuestMembers: [],
      membersTeamId: undefined,
      aboutUs: '',
      asapAreas: [],
    };

    test('it should return the Discover object from the mock server', async () => {
      const contentfulGraphqlClientMockServer =
        getContentfulGraphqlClientMockServer({
          Discover: () =>
            getContentfulGraphqlDiscover({
              asapAreasCollection: { items: [] },
            }),
        });
      const dataProviderWithMockServer: DiscoverDataProvider =
        new DiscoverContentfulDataProvider(contentfulGraphqlClientMockServer);
      const result = await dataProviderWithMockServer.fetch();

      const expectation = { ...getDiscoverDataObject(), asapAreas: [] };

      expect(result).toMatchObject(expectation);
    });

    test('parses rich text into html', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        ...getContentfulGraphqlDiscoverResponse({
          aboutUs: {
            json: {
              nodeType: 'document',
              data: {},
              content: [
                {
                  nodeType: 'paragraph',
                  data: {},
                  content: [
                    {
                      nodeType: 'text',
                      value: 'rich text',
                      marks: [],
                      data: {},
                    },
                  ],
                },
              ],
            },
            links: {
              entries: {
                inline: [],
              },
              assets: {
                block: [],
              },
            },
          },
        }),
      });

      const result = await dataProvider.fetch();

      expect(result!.aboutUs).toEqual('<p>rich text</p>');
    });

    test('defaults entries to empty arrays if no value is found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        ...getContentfulGraphqlDiscoverResponse({
          membersCollection: null,
          scientificAdvisoryBoardCollection: null,
          cnsQuestMembersCollection: null,
          membersTeam: null,
          aboutUs: null,
          asapAreasCollection: null,
        }),
      });

      const result = await dataProvider.fetch();

      expect(result).toEqual(emptyDiscover);
    });

    test('removes null items from collections', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        ...getContentfulGraphqlDiscoverResponse({
          membersCollection: {
            items: [null, ...getContentfulGraphqlDiscoverMembers()],
          },
        }),
      });

      const result = await dataProvider.fetch();
      const expectation = getDiscoverDataObject();

      expect(result.members).toHaveLength(2);
      expect(result).toMatchObject(expectation);
    });

    test('it should return empty data if no discover collection is found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        discoverCollection: null,
      });

      const result = await dataProvider.fetch();

      expect(result).toEqual(emptyDiscover);
    });

    test('it should return empty data if no discover page is found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        discoverCollection: {
          items: [],
        },
      });

      const result = await dataProvider.fetch();

      expect(result).toEqual(emptyDiscover);
    });
  });

  describe('ASAP areas', () => {
    const fetchAreas = async (areaProps = {}) => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulGraphqlDiscoverResponse({
          asapAreasCollection: {
            items: [null, getContentfulGraphqlAsapArea(areaProps)],
          },
        }),
      );
      return (await dataProvider.fetch()).asapAreas;
    };

    const fetchMemberIds = async (areaProps = {}) =>
      (await fetchAreas(areaProps)).flatMap(({ members }) =>
        members.map(({ id }) => id),
      );

    const membersOf = (
      items: ReturnType<typeof getContentfulGraphqlAsapAreaMembership>[],
    ) => ({ linkedFrom: { teamMembershipCollection: { items } } });

    test('returns the areas with their members in the CMS order', async () => {
      const areas = await fetchAreas();

      expect(areas).toEqual(getDiscoverDataObject().asapAreas);
    });

    test('adds active members missing from the Members field at the end, sorted by name', async () => {
      const memberIds = await fetchMemberIds({
        membersCollection: { items: [null, { sys: { id: 'area-user-1' } }] },
        ...membersOf([
          getContentfulGraphqlAsapAreaMembership({
            id: 'area-user-3',
            firstName: 'Zoe',
          }),
          getContentfulGraphqlAsapAreaMembership({
            id: 'area-user-2',
            firstName: 'Amy',
          }),
          getContentfulGraphqlAsapAreaMembership(),
        ]),
      });

      expect(memberIds).toEqual(['area-user-1', 'area-user-2', 'area-user-3']);
    });

    test('sorts missing members with the same first name by last name', async () => {
      const memberIds = await fetchMemberIds({
        membersCollection: { items: [] },
        ...membersOf([
          getContentfulGraphqlAsapAreaMembership({
            id: 'area-user-2',
            lastName: 'Smith',
          }),
          getContentfulGraphqlAsapAreaMembership({
            id: 'area-user-1',
            lastName: 'Adams',
          }),
        ]),
      });

      expect(memberIds).toEqual(['area-user-1', 'area-user-2']);
    });

    test('leaves out people in the Members field who no longer have the area', async () => {
      const memberIds = await fetchMemberIds(
        membersOf([getContentfulGraphqlAsapAreaMembership()]),
      );

      expect(memberIds).toEqual(['area-user-1']);
    });

    test.each`
      description                   | props
      ${'past members'}             | ${{ inactiveSinceDate: '2026-01-01' }}
      ${'alumni'}                   | ${{ alumniSinceDate: '2026-01-01' }}
      ${'users not onboarded'}      | ${{ onboarded: false }}
      ${'memberships with no role'} | ${{ role: null }}
    `('leaves out $description', async ({ props }) => {
      const memberIds = await fetchMemberIds(
        membersOf([
          getContentfulGraphqlAsapAreaMembership({
            id: 'area-user-2',
            ...props,
          }),
          getContentfulGraphqlAsapAreaMembership(),
        ]),
      );

      expect(memberIds).toEqual(['area-user-1']);
    });

    test('ignores null memberships and areas without memberships', async () => {
      expect(await fetchMemberIds(membersOf([null as never]))).toEqual([]);
      expect(
        await fetchMemberIds({ linkedFrom: null, membersCollection: null }),
      ).toEqual([]);
    });

    test('defaults missing text fields', async () => {
      const [area] = await fetchAreas({
        name: null,
        objective: null,
        primaryEmail: null,
        secondaryEmail: null,
        ...membersOf([
          getContentfulGraphqlAsapAreaMembership({
            firstName: null as never,
            lastName: null as never,
            nickname: null,
          }),
        ]),
      });

      expect(area).toMatchObject({
        name: '',
        objective: '',
        primaryEmail: '',
        secondaryEmail: undefined,
        members: [{ firstName: '', lastName: '', displayName: ' ' }],
      });
    });
  });
});
