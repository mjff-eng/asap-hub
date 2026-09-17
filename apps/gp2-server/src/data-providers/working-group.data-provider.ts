import {
  Environment,
  getLinkEntities,
  gp2 as gp2Contentful,
  GraphQLClient,
  parseRichText,
  patchAndPublish,
  pollContentfulGql,
  RichTextFromQuery,
} from '@asap-hub/contentful';
import { gp2 as gp2Model } from '@asap-hub/model';
import { parseTag, TagItem } from './tag.data-provider';
import {
  deleteEntries,
  fetchWorkingGroupMembersPage,
  parseCalendar,
  parseMembers,
  parseMilestones,
  parseResources,
  processMembers,
  processResources,
  withAllMembers,
} from './transformers';
import { WorkingGroupDataProvider } from './types';

export class WorkingGroupContentfulDataProvider
  implements WorkingGroupDataProvider
{
  constructor(
    private graphQLClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}

  async fetch(): Promise<gp2Model.ListWorkingGroupDataObject> {
    const { workingGroupsCollection } = await this.graphQLClient.request<
      gp2Contentful.FetchWorkingGroupsQuery,
      gp2Contentful.FetchWorkingGroupsQueryVariables
    >(gp2Contentful.FETCH_WORKING_GROUPS, {});

    if (!workingGroupsCollection) {
      return {
        total: 0,
        items: [],
      };
    }

    const workingGroups = await Promise.all(
      workingGroupsCollection.items
        .filter(
          (workingGroup): workingGroup is GraphQLWorkingGroup =>
            workingGroup !== null,
        )
        .map((workingGroup) => this.withAllMembers(workingGroup)),
    );

    return {
      total: workingGroupsCollection.total,
      items: workingGroups.map(parseWorkingGroupToDataObject),
    };
  }
  async update(
    id: string,
    workingGroup: gp2Model.WorkingGroupUpdateDataObject,
  ): Promise<void> {
    const previousWorkingGroupDataObject = await this.fetchById(id);
    const environment = await this.getRestClient();
    const doNotProcessEntity = { fields: {}, idsToDelete: [] };

    const { fields: resourceFields, idsToDelete: resourceIdsToDelete } =
      workingGroup.resources
        ? await processResources(
            environment,
            workingGroup.resources,
            previousWorkingGroupDataObject?.resources,
          )
        : doNotProcessEntity;
    const { fields: memberFields, idsToDelete: memberIdsToDelete } =
      workingGroup.members
        ? await processMembers<gp2Model.WorkingGroupMemberRole>(
            environment,
            workingGroup.members,
            previousWorkingGroupDataObject?.members,
            'workingGroupMembership',
          )
        : doNotProcessEntity;

    const previousWorkingGroup = await environment.getEntry(id);
    const result = await patchAndPublish(previousWorkingGroup, {
      ...workingGroup,
      ...resourceFields,
      ...memberFields,
      ...(workingGroup.tags
        ? { tags: getLinkEntities(workingGroup.tags.map((tag) => tag.id)) }
        : {}),
    });

    await deleteEntries(
      [...resourceIdsToDelete, ...memberIdsToDelete],
      environment,
    );
    const fetchEventById = () => this.fetchWorkingGroupById(id);
    await pollContentfulGql<gp2Contentful.FetchWorkingGroupByIdQuery>(
      result.sys.publishedVersion ?? Infinity,
      fetchEventById,
      'workingGroups',
    );
  }

  private fetchWorkingGroupById(id: string) {
    return this.graphQLClient.request<
      gp2Contentful.FetchWorkingGroupByIdQuery,
      gp2Contentful.FetchWorkingGroupByIdQueryVariables
    >(gp2Contentful.FETCH_WORKING_GROUP_BY_ID, { id });
  }
  async fetchById(id: string) {
    const { workingGroups } = await this.fetchWorkingGroupById(id);

    return workingGroups
      ? parseWorkingGroupToDataObject(await this.withAllMembers(workingGroups))
      : null;
  }

  private withAllMembers(workingGroup: GraphQLWorkingGroup) {
    return withAllMembers(
      workingGroup,
      fetchWorkingGroupMembersPage(this.graphQLClient),
    );
  }
}
export type GraphQLWorkingGroup = NonNullable<
  NonNullable<
    NonNullable<gp2Contentful.FetchWorkingGroupByIdQuery>['workingGroups']
  >
>;

export const parseWorkingGroupToDataObject = (
  workingGroup: GraphQLWorkingGroup,
): gp2Model.WorkingGroupDataObject => {
  const members = parseMembers<gp2Model.WorkingGroupMemberRole>(
    workingGroup.membersCollection,
  );
  const milestones = parseMilestones(workingGroup.milestonesCollection);
  const resources = parseResources(workingGroup.resourcesCollection);
  const calendar = parseCalendar(workingGroup.calendar);

  const tags =
    workingGroup.tagsCollection?.items
      .filter((tag): tag is TagItem => tag !== null)
      .map(parseTag) ?? [];

  return {
    id: workingGroup.sys.id,
    title: workingGroup.title ?? '',
    shortDescription: workingGroup.shortDescription ?? '',
    description: workingGroup.description
      ? parseRichText(workingGroup.description as RichTextFromQuery)
      : '',
    primaryEmail: workingGroup.primaryEmail ?? undefined,
    secondaryEmail: workingGroup.secondaryEmail ?? undefined,
    leadingMembers: workingGroup.leadingMembers ?? '',
    publishDate: workingGroup.sys.publishedAt,
    systemPublishedVersion: workingGroup.sys.publishedVersion || undefined,
    tags,
    members,
    milestones,
    resources,
    calendar,
  };
};
