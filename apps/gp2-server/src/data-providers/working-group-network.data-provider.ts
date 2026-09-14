import { gp2 as gp2Contentful, GraphQLClient } from '@asap-hub/contentful';
import { gp2 as gp2Model } from '@asap-hub/model';
import { WorkingGroupNetworkDataProvider } from './types';
import { fetchWorkingGroupMembersPage, withAllMembers } from './transformers';
import {
  GraphQLWorkingGroup,
  parseWorkingGroupToDataObject,
} from './working-group.data-provider';

const { workingGroupNetworkRole } = gp2Model;
export class WorkingGroupNetworkContentfulDataProvider
  implements WorkingGroupNetworkDataProvider
{
  constructor(private graphQLClient: GraphQLClient) {}

  async fetchById(): Promise<null> {
    throw new Error('Method not implemented.');
  }
  async fetch() {
    const { workingGroupNetworkCollection: networks } =
      await this.graphQLClient.request<
        gp2Contentful.FetchWorkingGroupNetworkQuery,
        gp2Contentful.FetchWorkingGroupNetworkQueryVariables
      >(gp2Contentful.FETCH_WORKING_GROUP_NETWORK);

    const workingGroupNetwork = networks?.items.filter(
      (network): network is GraphQLWorkingGroupNetwork => network !== null,
    )[0];
    if (!workingGroupNetwork) {
      return {
        items: [],
        total: 0,
      };
    }
    const items = await parseWorkingGroupNetworkToDataObject(
      workingGroupNetwork,
      (workingGroup) =>
        withAllMembers(
          workingGroup,
          fetchWorkingGroupMembersPage(this.graphQLClient),
        ),
    );
    return {
      items,
      total: items.length,
    };
  }
}

export type GraphQLWorkingGroupNetwork = NonNullable<
  NonNullable<gp2Contentful.FetchWorkingGroupNetworkQuery>['workingGroupNetworkCollection']
>['items'][number];

export const parseWorkingGroupNetworkToDataObject = (
  network: NonNullable<GraphQLWorkingGroupNetwork>,
  resolveAllMembers: (
    workingGroup: GraphQLWorkingGroup,
  ) => Promise<GraphQLWorkingGroup>,
): Promise<gp2Model.WorkingGroupNetworkDataObject[]> =>
  Promise.all(
    workingGroupNetworkRole.map(async (role) => {
      const workingGroups = await Promise.all(
        (network[`${role}Collection`]?.items || [])
          .filter(
            (workingGroup): workingGroup is GraphQLWorkingGroup =>
              workingGroup !== null,
          )
          .map(resolveAllMembers),
      );
      return {
        role,
        workingGroups: workingGroups.map(parseWorkingGroupToDataObject),
      };
    }),
  );
