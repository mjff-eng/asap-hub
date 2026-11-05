import {
  convertBooleanToDecision,
  convertDecisionToBoolean,
  isProjectType,
  isResearchOutputDocumentType,
  ListResearchOutputDataObject,
  ProjectType,
  ResearchOutputCreateDataObject,
  ResearchOutputDataObject,
  ResearchOutputGrantDocument,
  researchOutputMapType,
  ResearchOutputPublishingEntities,
  ResearchOutputUpdateDataObject,
  TeamType,
} from '@asap-hub/model';
import {
  addLocaleToFields,
  Environment,
  FETCH_RESEARCH_OUTPUT_BY_ID,
  FETCH_RESEARCH_OUTPUTS,
  FetchResearchOutputByIdQuery,
  FetchResearchOutputByIdQueryVariables,
  FetchResearchOutputsQuery,
  FetchResearchOutputsQueryVariables,
  getLinkEntities,
  getLinkEntity,
  GraphQLClient,
  parseRichText,
  patch,
  pollContentfulGql,
  ResearchOutputsFilter,
  ResearchOutputsOrder,
  RichTextFromQuery,
  patchAndPublish,
} from '@asap-hub/contentful';
import { cleanArray, parseUserDisplayName } from '@asap-hub/server-common';
import { isSharingStatus } from '../transformers/research-output';
import {
  CreateResearchOutputOptions,
  FetchResearchOutputOptions,
  ResearchOutputDataProvider,
  UpdateResearchOutputOptions,
} from '../types';

type ResearchOutputItem = NonNullable<
  FetchResearchOutputByIdQuery['researchOutputs']
>;

type TeamItem = NonNullable<
  NonNullable<ResearchOutputItem['teamsCollection']>['items'][number]
>;

type LabItem = NonNullable<
  NonNullable<ResearchOutputItem['labsCollection']>['items'][number]
>;

type AuthorItem = NonNullable<
  NonNullable<ResearchOutputItem['authorsCollection']>['items'][number]
>;

type RelatedResearchItem = NonNullable<
  NonNullable<ResearchOutputItem['relatedResearchCollection']>['items'][number]
>;
type RelatedEventItem = NonNullable<
  NonNullable<ResearchOutputItem['relatedEventsCollection']>['items'][number]
>;

type OutputVersionItem = NonNullable<
  NonNullable<ResearchOutputItem['versionsCollection']>['items'][number]
>;

export class ResearchOutputContentfulDataProvider
  implements ResearchOutputDataProvider
{
  constructor(
    private contentfulClient: GraphQLClient,
    private contentfulPreviewClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}

  async fetch(
    options: FetchResearchOutputOptions,
  ): Promise<ListResearchOutputDataObject> {
    const {
      take = 8,
      skip = 0,
      filter,
      search,
      includeDrafts,
      relatedResearchFilter,
    } = options;

    const searchTerms = (search || '').split(' ').filter(Boolean);
    const where: ResearchOutputsFilter = {};
    const relatedResearchWhere: ResearchOutputsFilter = {};

    if (searchTerms.length) {
      where.OR = [
        ...searchTerms.map((term) => ({ title_contains: term })),
        ...searchTerms.map((term) => ({ keywords: { name: term } })),
      ];
    }

    if (relatedResearchFilter) {
      if (relatedResearchFilter.sharingStatus) {
        relatedResearchWhere.sharingStatus =
          relatedResearchFilter.sharingStatus;
      }
      if (relatedResearchFilter.asapFunded) {
        relatedResearchWhere.asapFunded = relatedResearchFilter.asapFunded;
      }
    }

    if (filter) {
      if (filter.teamId) {
        where.teams = { sys: { id: filter.teamId } };
      }
      if (filter.workingGroupId) {
        where.workingGroup = { sys: { id: filter.workingGroupId } };
      }
      if (filter.projectId) {
        where.project = { sys: { id: filter.projectId } };
      }
      if (filter.documentType) {
        if (Array.isArray(filter.documentType)) {
          where.documentType_in = filter.documentType;
        } else {
          where.documentType = filter.documentType;
        }
      }

      if (filter.source) {
        where.OR = getResearchOutputSourceFilter(
          Array.isArray(filter.source) ? filter.source : [filter.source],
        );
      }

      if (filter.title) {
        where.title = filter.title;
      }
      if (filter.link) {
        where.link = filter.link;
      }
      if (filter.status) {
        where.sys = {
          publishedVersion_exists: filter.status !== 'draft',
        };
      }
      if (filter.sharingStatus) {
        where.sharingStatus = filter.sharingStatus;
      }
      if (filter.asapFunded) {
        where.asapFunded = filter.asapFunded;
      }

      if (filter.relatedManuscriptVersion) {
        where.relatedManuscriptVersion = {
          sys: { id: filter.relatedManuscriptVersion },
        };
      }
    }
    const client = includeDrafts
      ? this.contentfulPreviewClient
      : this.contentfulClient;
    const { researchOutputsCollection } = await client.request<
      FetchResearchOutputsQuery,
      FetchResearchOutputsQueryVariables
    >(FETCH_RESEARCH_OUTPUTS, {
      limit: take,
      skip,
      where,
      order: [
        ResearchOutputsOrder.SysFirstPublishedAtDesc,
        ResearchOutputsOrder.CreatedDateDesc,
      ],
      preview: includeDrafts,
      relatedResearchWhere,
    });

    if (!researchOutputsCollection) {
      return { total: 0, items: [] };
    }

    return {
      total: researchOutputsCollection.total,
      items: researchOutputsCollection.items
        .filter((item): item is ResearchOutputItem => item !== null)
        .map(parseGraphQLResearchOutput),
    };
  }

  private async fetchOutputById(
    id: string,
    relatedResearchWhere: ResearchOutputsFilter = {},
    includeGrantDocument = false,
  ) {
    return this.contentfulClient.request<
      FetchResearchOutputByIdQuery,
      FetchResearchOutputByIdQueryVariables
    >(FETCH_RESEARCH_OUTPUT_BY_ID, {
      id,
      preview: false,
      relatedResearchWhere,
      includeGrantDocument,
    });
  }

  async fetchById(
    id: string,
    options?: FetchResearchOutputOptions,
  ): Promise<ResearchOutputDataObject | null> {
    const relatedResearchWhere: ResearchOutputsFilter = {};

    if (options?.relatedResearchFilter) {
      const { relatedResearchFilter } = options;
      if (relatedResearchFilter.sharingStatus) {
        relatedResearchWhere.sharingStatus =
          relatedResearchFilter.sharingStatus;
      }
      if (relatedResearchFilter.asapFunded) {
        relatedResearchWhere.asapFunded = relatedResearchFilter.asapFunded;
      }
    }

    const includeGrantDocument = !!options?.includeGrantDocument;
    const { researchOutputs } = await this.fetchOutputById(
      id,
      relatedResearchWhere,
      includeGrantDocument,
    );

    if (!researchOutputs) {
      const { researchOutputs: draftResearchOutput } =
        await this.contentfulPreviewClient.request<
          FetchResearchOutputByIdQuery,
          FetchResearchOutputByIdQueryVariables
        >(FETCH_RESEARCH_OUTPUT_BY_ID, {
          id,
          preview: true,
          includeGrantDocument,
        });
      if (!draftResearchOutput) {
        return null;
      }
      return withGrantDocument(draftResearchOutput);
    }

    return withGrantDocument(researchOutputs);
  }

  async create(
    input: ResearchOutputCreateDataObject,
    createOptions: CreateResearchOutputOptions,
  ): Promise<string> {
    const environment = await this.getRestClient();

    const researchOutputEntry = await environment.createEntry(
      'researchOutputs',
      {
        fields: addLocaleToFields({
          ...prepareInputForCreate(input),
          addedDate: createOptions.publish ? new Date().toISOString() : null,
        }),
      },
    );

    if (createOptions.publish) {
      await researchOutputEntry.publish();
    }

    if (input.relatedManuscriptVersion && input.relatedManuscript) {
      const manuscriptEntry = await environment.getEntry(
        input.relatedManuscript,
      );
      await patchAndPublish(manuscriptEntry, {
        relatedResearchOutput: getLinkEntity(researchOutputEntry.sys.id),
      });
    }

    return researchOutputEntry.sys.id;
  }

  async update(
    id: string,
    input: ResearchOutputUpdateDataObject,
    updateOptions: UpdateResearchOutputOptions,
  ): Promise<void> {
    const environment = await this.getRestClient();
    const entry = await environment.getEntry(id);
    const data = input;

    if (updateOptions.newVersion) {
      const { relatedManuscriptVersion } = updateOptions.newVersion;
      const versionEntry = await environment.createEntry(
        'researchOutputVersions',
        {
          fields: addLocaleToFields({
            ...updateOptions.newVersion,
            relatedManuscriptVersion: relatedManuscriptVersion
              ? getLinkEntity(relatedManuscriptVersion)
              : null,
          }),
        },
      );
      await versionEntry.publish();

      const { id: versionId } = versionEntry.sys;
      data.versions = entry.fields?.versions?.['en-US']
        ? [
            ...entry.fields.versions['en-US']
              .filter(
                (version: { sys: { id: string } } | null) => version !== null,
              )
              .map(({ sys }: { sys: { id: string } }) => sys.id),
            versionId,
          ]
        : [versionId];
    }

    const update = prepareInputForUpdate(data);
    const result = await patch(entry, update);

    if (updateOptions.publish) {
      let toPublish = result;
      if (!entry.fields?.addedDate?.['en-US']) {
        toPublish = await patch(result, {
          addedDate: update.lastUpdatedPartial,
        });
      }
      const published = await toPublish.publish();

      const fetchOutputById = () => this.fetchOutputById(id);

      await pollContentfulGql<FetchResearchOutputByIdQuery>(
        published.sys.publishedVersion || Infinity,
        fetchOutputById,
        'researchOutputs',
      );
    }
  }
}

const mapTeams = (items: (TeamItem | null)[]) =>
  items
    .filter((team: TeamItem | null): team is TeamItem => team !== null)
    .map((team) => {
      const projectItem =
        team.linkedFrom?.projectMembershipCollection?.items[0]?.linkedFrom
          ?.projectsCollection?.items[0] ?? null;

      return {
        id: team.sys.id,
        displayName: team.displayName || '',
        teamType: (team.teamType || 'Discovery Team') as TeamType,
        project: projectItem
          ? {
              id: projectItem.sys.id,
              title: projectItem.title || '',
              projectType: projectItem.projectType as ProjectType,
              projectId: projectItem.projectId || '',
            }
          : undefined,
      };
    });

export const mapOutputVersions = (items: (OutputVersionItem | null)[]) =>
  items
    .filter(
      (output: OutputVersionItem | null): output is OutputVersionItem =>
        output !== null,
    )
    .map((output: OutputVersionItem) => ({
      id: output?.sys.id || '',
      title: output?.title || '',
      link: output?.link || '',
      type: researchOutputMapType(output?.type) || undefined,
      documentType:
        output?.documentType &&
        isResearchOutputDocumentType(output.documentType)
          ? output.documentType
          : 'Grant Document',
      addedDate: output?.addedDate || '',
      rrid: output?.rrid || '',
      accession: output?.accession || '',
      doi: output?.doi || '',
    }));

const withGrantDocument = (
  item: ResearchOutputItem,
): ResearchOutputDataObject => {
  const researchOutput = parseGraphQLResearchOutput(item);

  return researchOutput.documentType === 'Grant Document'
    ? { ...researchOutput, grantDocument: parseGrantDocument(item) }
    : researchOutput;
};

const parseGrantDocument = (
  researchOutput: ResearchOutputItem,
): ResearchOutputGrantDocument | undefined => {
  const supplementProject =
    researchOutput.linkedFrom?.supplementGrantCollection?.items[0]?.linkedFrom
      ?.projectsCollection?.items[0];
  const project =
    supplementProject ??
    researchOutput.linkedFrom?.projectsCollection?.items[0];

  if (!project || !isProjectType(project.projectType)) {
    return undefined;
  }

  const { proposal, supplementGrant, membersCollection } = project;
  const teams = cleanArray(membersCollection?.items).flatMap(
    ({ projectMember }) =>
      projectMember?.__typename === 'Teams'
        ? [
            {
              id: projectMember.sys.id,
              displayName: projectMember.displayName || '',
            },
          ]
        : [],
  );

  return {
    grantType: supplementProject ? 'supplement' : 'original',
    project: {
      id: project.sys.id,
      title: project.title || '',
      projectType: project.projectType,
      teams,
    },
    original: {
      researchOutputId: proposal?.sys.id,
      title: proposal?.title || '',
      description: project.originalGrant || undefined,
      startDate: project.startDate || undefined,
      endDate: project.endDate || undefined,
    },
    supplement: supplementGrant
      ? {
          researchOutputId: supplementGrant.proposal?.sys.id,
          title: supplementGrant.title || '',
          description: supplementGrant.description || undefined,
          startDate: supplementGrant.startDate || undefined,
          endDate: supplementGrant.endDate || undefined,
        }
      : undefined,
    pdfUrl: researchOutput.grantPdf?.url || undefined,
  };
};

const mapRelatedResearch = (
  items: (RelatedResearchItem | null)[],
  isOwnRelatedResearchLink: boolean,
) =>
  items
    .filter(
      (ro: RelatedResearchItem | null): ro is RelatedResearchItem =>
        ro !== null,
    )
    .map((ro: RelatedResearchItem) => ({
      id: ro?.sys.id,
      title: ro.title || '',
      type: researchOutputMapType(ro.type) || undefined,
      documentType:
        ro.documentType && isResearchOutputDocumentType(ro.documentType)
          ? ro.documentType
          : 'Grant Document',
      teams: mapTeams(ro.teamsCollection?.items || []),
      workingGroups: ro.workingGroup
        ? [
            {
              id: ro.workingGroup.sys.id,
              title: ro.workingGroup.title || '',
            },
          ]
        : [],
      isOwnRelatedResearchLink,
    }));

const getResearchOutputSourceFilter = (
  sourceFilter: ResearchOutputPublishingEntities[],
) => {
  const sourceConditions = [];
  if (sourceFilter?.length) {
    if (sourceFilter.includes('Working Group')) {
      sourceConditions.push({
        workingGroup_exists: true,
      });
    }

    if (sourceFilter.includes('Team')) {
      sourceConditions.push({
        AND: [{ workingGroup_exists: false }, { project_exists: false }],
      });
    }
  }
  return sourceConditions;
};

export const parseGraphQLResearchOutput = (
  researchOutputs: ResearchOutputItem,
): ResearchOutputDataObject => {
  const teams = mapTeams(researchOutputs.teamsCollection?.items || []);
  const contactEmails =
    (researchOutputs.teamsCollection?.items || [])
      .flatMap(
        (team: TeamItem | null) =>
          team?.linkedFrom?.teamMembershipCollection?.items
            .filter(
              (membership) =>
                membership?.role === 'Project Manager' &&
                membership?.inactiveSinceDate === null,
            )
            .map(
              (membership) =>
                membership?.linkedFrom?.usersCollection?.items[0]?.email,
            ),
      )
      .filter((x): x is string => !!x) || [];
  return {
    id: researchOutputs.sys.id,
    title: researchOutputs.title || '',
    researchTheme: (researchOutputs.teamsCollection?.items || [])
      .map((teamItem) => teamItem?.researchTheme?.name)
      .filter((item): item is string => item !== undefined),
    impact: researchOutputs?.impact
      ? {
          id: researchOutputs.impact.sys.id,
          name: researchOutputs.impact.name || '',
        }
      : undefined,
    layImpactStatement: researchOutputs.layImpactStatement || undefined,
    categories: cleanArray(
      researchOutputs.categoriesCollection?.items || [],
    ).map((category) => ({
      id: category.sys.id,
      name: category.name || '',
    })),
    description: researchOutputs.description
      ? parseRichText(researchOutputs.description as RichTextFromQuery)
      : undefined,
    descriptionMD: researchOutputs.descriptionMd || '',
    shortDescription: researchOutputs.shortDescription || '',
    changelog: researchOutputs.changelog || undefined,
    usageNotesMD: researchOutputs.usageNotes || '',
    link: researchOutputs.link || undefined,
    asapFunded: convertDecisionToBoolean(researchOutputs.asapFunded || null),
    usedInPublication: convertDecisionToBoolean(
      researchOutputs.usedInAPublication || null,
    ),
    type: researchOutputMapType(researchOutputs.type) || undefined,
    subtype: researchOutputs.subtype?.name || undefined,
    rrid: researchOutputs.rrid || undefined,
    accession: researchOutputs.accession || undefined,
    doi: researchOutputs.doi || undefined,
    labCatalogNumber: researchOutputs.labCatalogNumber || undefined,
    addedDate: researchOutputs.addedDate,
    publishDate: researchOutputs.publishDate,
    created: researchOutputs.createdDate,
    documentType:
      researchOutputs.documentType &&
      isResearchOutputDocumentType(researchOutputs.documentType)
        ? researchOutputs.documentType
        : 'Grant Document',
    sharingStatus:
      researchOutputs.sharingStatus &&
      isSharingStatus(researchOutputs.sharingStatus)
        ? researchOutputs.sharingStatus
        : 'Network Only',
    publishingEntity: getPublishingEntity(researchOutputs),
    workingGroups: researchOutputs.workingGroup
      ? [
          {
            id: researchOutputs.workingGroup.sys.id,
            title: researchOutputs.workingGroup.title || '',
          },
        ]
      : [],
    project: researchOutputs.project
      ? {
          id: researchOutputs.project.sys.id,
          title: researchOutputs.project.title || '',
          projectType: researchOutputs.project.projectType as ProjectType,
          projectId: researchOutputs.project.projectId || '',
        }
      : undefined,
    authors:
      researchOutputs.authorsCollection?.items
        ?.filter((author): author is AuthorItem => author !== null)
        ?.filter(
          (author) =>
            author.__typename !== 'Users' || author?.onboarded !== false,
        )
        .map((author) => {
          if (author.__typename === 'Users') {
            return {
              id: author.sys.id,
              firstName: author.firstName || '',
              lastName: author.lastName || '',
              email: author.email || '',
              displayName: parseUserDisplayName(
                author.firstName || '',
                author.lastName || '',
                undefined,
                author.nickname || '',
              ),
              avatarUrl: author.avatar?.url || undefined,
              alumniSinceDate: author.alumniSinceDate || undefined,
            };
          }

          return {
            id: author.sys.id,
            displayName: author?.name || '',
            orcid: author.orcid || '',
          };
        }) || [],
    contactEmails: [...new Set(contactEmails)],
    lastUpdatedPartial: researchOutputs.lastUpdatedPartial,
    labs:
      researchOutputs.labsCollection?.items
        .filter((x): x is LabItem => x !== null && !!x.name)
        .map((lab: LabItem) => ({ id: lab.sys.id, name: lab.name || '' })) ||
      [],
    keywords:
      researchOutputs.keywordsCollection?.items
        .map((keyword) => keyword?.name || '')
        .filter(Boolean) || [],
    methods:
      researchOutputs.methodsCollection?.items
        .map((method) => method?.name || '')
        .filter(Boolean) || [],
    organisms:
      researchOutputs.organismsCollection?.items
        .map((organism) => organism?.name || '')
        .filter(Boolean) || [],
    environments:
      researchOutputs.environmentsCollection?.items
        .map((environment) => environment?.name || '')
        .filter(Boolean) || [],
    teams,
    published: !!researchOutputs.sys.publishedVersion,
    relatedResearch: [
      ...mapRelatedResearch(
        researchOutputs.relatedResearchCollection?.items || [],
        true,
      ),
      ...mapRelatedResearch(
        researchOutputs.linkedFrom?.researchOutputsCollection?.items || [],
        false,
      ),
    ],
    relatedEvents:
      researchOutputs.relatedEventsCollection?.items
        ?.filter((event): event is RelatedEventItem => event !== null)
        .map((event) => ({
          id: event.sys.id,
          title: event?.title || '',
          endDate: event.endDate || '',
        })) || [],
    relatedManuscriptVersion: researchOutputs.relatedManuscriptVersion?.sys.id,
    relatedManuscript:
      researchOutputs.relatedManuscriptVersion?.linkedFrom
        ?.manuscriptsCollection?.items[0]?.sys.id,
    versions: mapOutputVersions(
      researchOutputs.versionsCollection?.items || [],
    ),
    statusChangedBy: researchOutputs.statusChangedBy
      ? {
          id: researchOutputs.statusChangedBy.sys.id,
          firstName: researchOutputs.statusChangedBy.firstName || '',
          lastName: researchOutputs.statusChangedBy.lastName || '',
        }
      : undefined,
    statusChangedAt: researchOutputs.statusChangedAt,
    isInReview: !!researchOutputs.isInReview,
  };
};

const prepareInput = (
  input: ResearchOutputCreateDataObject | ResearchOutputUpdateDataObject,
) => {
  const {
    authors,
    teamIds,
    relatedResearchIds,
    relatedEventIds,
    labIds,
    methodIds,
    environmentIds,
    organismIds,
    subtypeId,
    keywordIds,
    workingGroups,
    projectId,
    impact,
    categories,
    relatedManuscriptVersion,
    ...researchOutputData
  } = input;

  const {
    usedInPublication: _usedInPublication,
    description: _description,
    relatedManuscript: _relatedManuscript,
    ...researchOutput
  } = {
    ...researchOutputData,
    descriptionMD: researchOutputData.descriptionMD,
    asapFunded: convertBooleanToDecision(researchOutputData.asapFunded),
    usedInAPublication: convertBooleanToDecision(
      researchOutputData.usedInPublication,
    ),
    authors: getLinkEntities(
      authors.map((author) =>
        'userId' in author ? author.userId : author.externalAuthorId,
      ),
    ),
    labs: getLinkEntities(labIds),
    teams: getLinkEntities(teamIds),
    relatedResearch: getLinkEntities(relatedResearchIds),
    relatedEvents: getLinkEntities(relatedEventIds),
    methods: getLinkEntities(methodIds),
    keywords: getLinkEntities(keywordIds),
    environments: getLinkEntities(environmentIds),
    organisms: getLinkEntities(organismIds),
    workingGroup:
      workingGroups && workingGroups[0]
        ? getLinkEntity(workingGroups[0])
        : null,
    project: projectId ? getLinkEntity(projectId) : null,
    subtype: subtypeId ? getLinkEntity(subtypeId) : null,
    impact: impact ? getLinkEntity(impact) : null,
    categories: categories ? getLinkEntities(categories) : null,
    relatedManuscriptVersion: relatedManuscriptVersion
      ? getLinkEntity(relatedManuscriptVersion)
      : null,
  };

  return researchOutput;
};

const prepareInputForCreate = (input: ResearchOutputCreateDataObject) => ({
  ...prepareInput(input),
  createdBy: getLinkEntity(input.createdBy),
  updatedBy: getLinkEntity(input.createdBy),
  createdDate: new Date().toISOString(),
  lastUpdatedPartial: new Date().toISOString(),
});

const prepareInputForUpdate = (input: ResearchOutputUpdateDataObject) => {
  const {
    statusChangedById: _statusChangedById,
    addedDate: _addedDate,
    ...researchOutput
  } = input;

  return {
    ...prepareInput(researchOutput),
    updatedBy: getLinkEntity(input.updatedBy),
    lastUpdatedPartial: new Date().toISOString(),
    versions: input.versions ? getLinkEntities(input.versions) : undefined,
    statusChangedBy: _statusChangedById
      ? getLinkEntity(_statusChangedById)
      : null,
  };
};

const getPublishingEntity = (researchOutputs: ResearchOutputItem) => {
  if (researchOutputs.workingGroup) return 'Working Group';
  if (researchOutputs.project) return 'Project';
  return 'Team';
};
