import {
  Environment,
  getLinkEntities,
  gp2 as gp2Contentful,
  GraphQLClient,
  patchAndPublish,
  pollContentfulGql,
} from '@asap-hub/contentful';
import { gp2 as gp2Model } from '@asap-hub/model';
import { TagItem, parseTag } from './tag.data-provider';
import {
  deleteEntries,
  fetchProjectMembersPage,
  parseCalendar,
  parseMembers,
  parseMilestones,
  parseResources,
  processMembers,
  processResources,
  withAllMembers,
} from './transformers';
import { ProjectDataProvider } from './types';

const noRecords = {
  total: 0,
  items: [],
};
export class ProjectContentfulDataProvider implements ProjectDataProvider {
  constructor(
    private graphQLClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}

  private fetchProjectById(id: string) {
    return this.graphQLClient.request<
      gp2Contentful.FetchProjectByIdQuery,
      gp2Contentful.FetchProjectByIdQueryVariables
    >(gp2Contentful.FETCH_PROJECT_BY_ID, { id });
  }
  private async fetchProjects(limit: number, skip: number) {
    const { projectsCollection } = await this.graphQLClient.request<
      gp2Contentful.FetchProjectsQuery,
      gp2Contentful.FetchProjectsQueryVariables
    >(gp2Contentful.FETCH_PROJECTS, {
      limit,
      skip,
    });

    return projectsCollection;
  }
  private async fetchProjectsByUserId(
    limit: number,
    skip: number,
    userId: string,
  ) {
    const { projectMembershipCollection } = await this.graphQLClient.request<
      gp2Contentful.FetchProjectsByUserQuery,
      gp2Contentful.FetchProjectsByUserQueryVariables
    >(gp2Contentful.FETCH_PROJECTS_BY_USER, {
      limit,
      skip,
      userId,
    });

    return projectMembershipCollection;
  }

  private withAllMembers(project: GraphQLProject) {
    return withAllMembers(project, fetchProjectMembersPage(this.graphQLClient));
  }

  private parseProjects(projects: GraphQLProject[]) {
    return Promise.all(
      projects.map(async (project) =>
        parseProjectToDataObject(await this.withAllMembers(project)),
      ),
    );
  }

  async fetchById(id: string): Promise<gp2Model.ProjectDataObject | null> {
    const { projects } = await this.fetchProjectById(id);
    return projects
      ? parseProjectToDataObject(await this.withAllMembers(projects))
      : null;
  }

  async fetch(
    options: gp2Model.FetchApiProjectOptions,
  ): Promise<gp2Model.ListProjectDataObject> {
    const { take = 10, skip = 0, filter } = options;
    if (filter?.userId) {
      return this.fetchFilterByUserId(take, skip, filter.userId);
    }

    const projectsCollection = await this.fetchProjects(take, skip);
    return projectsCollection
      ? {
          total: projectsCollection.total,
          items: await this.parseProjects(
            projectsCollection.items.filter(
              (project): project is GraphQLProject => project !== null,
            ),
          ),
        }
      : noRecords;
  }

  private async fetchFilterByUserId(
    take: number,
    skip: number,
    userId: string,
  ) {
    const projectMembershipCollection = await this.fetchProjectsByUserId(
      take,
      skip,
      userId,
    );
    const items = projectMembershipCollection?.items
      .map(
        (projectMembership) =>
          projectMembership?.linkedFrom?.projectsCollection?.items,
      )
      .flat()
      .filter((project): project is GraphQLProject => !!project);

    return projectMembershipCollection && items && items.length
      ? {
          total: projectMembershipCollection.total,
          items: await this.parseProjects(items),
        }
      : noRecords;
  }

  async update(
    id: string,
    project: gp2Model.ProjectUpdateDataObject,
  ): Promise<void> {
    const previousProjectDataObject = await this.fetchById(id);
    const environment = await this.getRestClient();
    const doNotProcessEntity = { fields: {}, idsToDelete: [] };

    const { fields: resourceFields, idsToDelete: resourceIdsToDelete } =
      project.resources
        ? await processResources(
            environment,
            project.resources,
            previousProjectDataObject?.resources,
          )
        : doNotProcessEntity;
    const { fields: memberFields, idsToDelete: memberIdsToDelete } =
      project.members
        ? await processMembers<gp2Model.ProjectMemberRole>(
            environment,
            project.members,
            previousProjectDataObject?.members,
            'projectMembership',
          )
        : doNotProcessEntity;
    const previousProject = await environment.getEntry(id);

    const result = await patchAndPublish(previousProject, {
      ...project,
      ...resourceFields,
      ...memberFields,
      ...(project.tags
        ? { tags: getLinkEntities(project.tags.map((tag) => tag.id)) }
        : {}),
    });

    await deleteEntries(
      [...resourceIdsToDelete, ...memberIdsToDelete],
      environment,
    );
    const fetchEventById = () => this.fetchProjectById(id);
    await pollContentfulGql<gp2Contentful.FetchProjectByIdQuery>(
      result.sys.publishedVersion ?? Infinity,
      fetchEventById,
      'projects',
    );
  }
}

export type GraphQLProject = NonNullable<
  NonNullable<NonNullable<gp2Contentful.FetchProjectByIdQuery>['projects']>
>;

export type GraphQLProjectCalendar = NonNullable<GraphQLProject['calendar']>;

export function parseProjectToDataObject(
  project: GraphQLProject,
): gp2Model.ProjectDataObject {
  const members = parseMembers<gp2Model.ProjectMemberRole>(
    project.membersCollection,
  );
  const milestones = parseMilestones(project.milestonesCollection);
  const resources = parseResources(project.resourcesCollection);
  const calendar = parseCalendar(project.calendar);
  const tags =
    project.tagsCollection?.items
      .filter((tag): tag is TagItem => tag !== null)
      .map(parseTag) ?? [];

  return {
    id: project.sys.id,
    title: project.title ?? '',
    startDate: project.startDate ?? undefined,
    endDate: project.endDate ?? undefined,
    status: project.status as gp2Model.ProjectStatus,
    projectProposalUrl: project.projectProposal ?? undefined,
    pmEmail: project.pmEmail ?? '',
    leadEmail: project.leadEmail ?? undefined,
    description: project.description ?? undefined,
    members,
    tags,
    milestones,
    resources,
    traineeProject: project.traineeProject ?? false,
    opportunitiesAvailable: project.opportunitiesAvailable ?? false,
    opportunitiesLinkName: project.opportunitiesLinkName ?? undefined,
    opportunitiesShortText: project.opportunitiesShortText ?? undefined,
    opportunitiesLink: project.opportunitiesLink ?? undefined,
    calendar,
  };
}
