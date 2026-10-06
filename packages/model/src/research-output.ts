import { CategoryResponse } from './category';
import { DecisionOption, ListResponse } from './common';
import { EventDataObject } from './event';
import { ExternalAuthorResponse } from './external-author';
import { ImpactResponse } from './impact';
import { LabResponse } from './lab';
import { GrantType, ProjectDataObject } from './project';
import { TeamResponse, TeamType } from './team';
import { UserDataObject, UserResponse } from './user';
import { WorkingGroupResponse } from './working-group';

export const researchOutputDocumentTypes = [
  'Grant Document',
  'Presentation',
  'Dataset',
  'Bioinformatics',
  'Protocol',
  'Lab Material',
  'Article',
  'Report',
] as const;

export type ResearchOutputDocumentType =
  (typeof researchOutputDocumentTypes)[number];

export const researchOutputTypes = [
  '3D Printing',
  'ASAP annual meeting',
  'ASAP subgroup meeting',
  'Analysis',
  'Animal Model',
  'Antibody',
  'Assay',
  'Behavioral',
  'Biosample',
  'Cell Culture & Differentiation',
  'Cell line',
  'Clinical',
  'Cloning',
  'Code',
  'Compound',
  'Computational Model',
  'Data portal',
  'Electrophysiology',
  'External meeting',
  'Genetic Data - DNA',
  'Genetic Data - RNA',
  'Genotyping',
  'Material Generation',
  'Microscopy & Imaging',
  'Model System',
  'Plasmid',
  'Preprint',
  'Proposal',
  'Protein Data',
  'Protein expression',
  'Published',
  'Report',
  'Sample Prep',
  'Sequencing',
  'Shipment Procedure',
  'Software',
  'Spectroscopy',
  'Team meeting',
  'Viral Vector',
] as const;

export const ResearchOutputPublishingEntitiesValues = <const>[
  'Project',
  'Team',
  'Working Group',
];

export type ResearchOutputPublishingEntities =
  (typeof ResearchOutputPublishingEntitiesValues)[number];

export type ResearchOutputType = (typeof researchOutputTypes)[number];

export type ResearchOutputFilterOptionTypes =
  | ResearchOutputPublishingEntities
  | ResearchOutputDocumentType;

export type FetchResearchOutputsFilter = {
  source?: ResearchOutputPublishingEntities[];
  documentType?: ResearchOutputDocumentType[];
};

export const researchOutputDocumentTypeToType: Record<
  ResearchOutputDocumentType,
  Set<ResearchOutputType>
> = {
  Article: new Set<ResearchOutputType>(['Preprint', 'Published']),
  Dataset: new Set<ResearchOutputType>([
    'Behavioral',
    'Clinical',
    'Electrophysiology',
    'Genetic Data - DNA',
    'Genetic Data - RNA',
    'Protein Data',
    'Microscopy & Imaging',
    'Spectroscopy',
  ]),
  Bioinformatics: new Set<ResearchOutputType>([
    'Code',
    'Computational Model',
    'Data portal',
    'Software',
  ]),
  Protocol: new Set<ResearchOutputType>([
    '3D Printing',
    'Analysis',
    'Assay',
    'Cell Culture & Differentiation',
    'Cloning',
    'Genotyping',
    'Material Generation',
    'Microscopy & Imaging',
    'Model System',
    'Protein expression',
    'Sample Prep',
    'Sequencing',
    'Shipment Procedure',
  ]),
  'Lab Material': new Set<ResearchOutputType>([
    'Animal Model',
    'Antibody',
    'Assay',
    'Biosample',
    'Cell line',
    'Compound',
    'Plasmid',
    'Viral Vector',
  ]),
  Presentation: new Set<ResearchOutputType>([
    'ASAP annual meeting',
    'ASAP subgroup meeting',
    'External meeting',
    'Team meeting',
  ]),
  'Grant Document': new Set<ResearchOutputType>(['Proposal', 'Report']),
  Report: new Set(),
};

export const isResearchOutputDocumentType = (
  type: string,
): type is ResearchOutputDocumentType =>
  (researchOutputDocumentTypes as ReadonlyArray<string>).includes(type);

export const isResearchOutputType = (
  type: string,
): type is ResearchOutputType =>
  (researchOutputTypes as ReadonlyArray<string>).includes(type);

export const researchOutputMapType = (
  type?: string | null,
): ResearchOutputType | null => {
  if (type && isResearchOutputType(type)) {
    return type;
  }

  return null;
};

export enum ResearchOutputIdentifierType {
  Empty = '',
  None = 'None',
  DOI = 'DOI',
  AccessionNumber = 'Accession Number',
  RRID = 'RRID',
}

export const researchOutputToIdentifierType: Record<
  ResearchOutputDocumentType,
  ResearchOutputIdentifierType[]
> = {
  Article: [
    ResearchOutputIdentifierType.None,
    ResearchOutputIdentifierType.DOI,
  ],
  Bioinformatics: [
    ResearchOutputIdentifierType.None,
    ResearchOutputIdentifierType.DOI,
    ResearchOutputIdentifierType.RRID,
  ],
  'Lab Material': [
    ResearchOutputIdentifierType.None,
    ResearchOutputIdentifierType.DOI,
    ResearchOutputIdentifierType.RRID,
  ],
  Dataset: [
    ResearchOutputIdentifierType.None,
    ResearchOutputIdentifierType.DOI,
    ResearchOutputIdentifierType.AccessionNumber,
  ],
  Protocol: [
    ResearchOutputIdentifierType.None,
    ResearchOutputIdentifierType.DOI,
  ],
  'Grant Document': [],
  Presentation: [],
  Report: [],
};

export const sharingStatuses = ['Public', 'Network Only'] as const;

export type ResearchOutputSharingStatus = (typeof sharingStatuses)[number];

export type ResearchOutputCoreObject = {
  accession?: string;
  addedDate?: string;
  asapFunded?: boolean;
  description?: string;
  shortDescription?: string;
  changelog?: string;
  descriptionMD?: string;
  documentType: ResearchOutputDocumentType;
  doi?: string;
  isInReview: boolean;
  labCatalogNumber?: string;
  lastModifiedDate?: string;
  link?: string;
  publishDate?: string;
  rrid?: string;
  sharingStatus: ResearchOutputSharingStatus;
  title: string;
  type?: ResearchOutputType;
  usageNotes?: string;
  usedInPublication?: boolean;
  researchTheme?: string[];
  relatedManuscriptVersion?: string;
  relatedManuscript?: string;
};

export type ResearchOutputVersionCoreObject = Pick<
  ResearchOutputCoreObject,
  | 'documentType'
  | 'type'
  | 'title'
  | 'link'
  | 'addedDate'
  | 'doi'
  | 'rrid'
  | 'accession'
  | 'publishDate'
  | 'relatedManuscriptVersion'
>;

export type ResearchOutputVersionPostRequest = ResearchOutputVersionCoreObject;

export type ResearchOutputVersion = ResearchOutputVersionCoreObject & {
  id: string;
};

export type ResearchOutputGrant = {
  researchOutputId?: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

export type ResearchOutputGrantDocument = {
  grantType: GrantType;
  project: Pick<ProjectDataObject, 'id' | 'title' | 'projectType'>;
  original: ResearchOutputGrant;
  supplement?: ResearchOutputGrant;
};

export type ResearchOutputDataObject = ResearchOutputCoreObject & {
  authors: (
    | Pick<
        UserResponse,
        | 'id'
        | 'firstName'
        | 'lastName'
        | 'displayName'
        | 'avatarUrl'
        | 'orcid'
        | 'email'
        | 'alumniSinceDate'
      >
    | ExternalAuthorResponse
  )[];
  usageNotesMD?: string;
  contactEmails: string[];
  created: string;
  environments: string[];
  id: string;
  labs: LabResponse[];
  impact?: ImpactResponse;
  layImpactStatement?: string;
  categories?: CategoryResponse[];
  lastUpdatedPartial: string;
  methods: string[];
  organisms: string[];
  subtype?: string;
  keywords: string[];
  teams: (Pick<TeamResponse, 'id' | 'displayName'> & {
    teamType?: TeamType;
    project?: Pick<
      ProjectDataObject,
      'id' | 'title' | 'projectType' | 'projectId'
    >;
  })[];
  workingGroups: Pick<WorkingGroupResponse, 'id' | 'title'>[];
  project?: Pick<
    ProjectDataObject,
    'id' | 'title' | 'projectType' | 'projectId'
  >;
  published: boolean;
  relatedResearch: Array<
    Pick<
      ResearchOutputDataObject,
      'id' | 'title' | 'type' | 'documentType' | 'teams' | 'workingGroups'
    > & { isOwnRelatedResearchLink?: boolean }
  >;
  versions: Array<ResearchOutputVersion>;
  relatedEvents: Array<Pick<EventDataObject, 'id' | 'title' | 'endDate'>>;
  statusChangedBy?: Pick<UserDataObject, 'id' | 'firstName' | 'lastName'>;
  statusChangedAt?: string;
  publishingEntity: ResearchOutputPublishingEntities;
  grantDocument?: ResearchOutputGrantDocument;
};

export type ResearchOutputDraftDataObject = Omit<
  ResearchOutputDataObject,
  'addedDate'
>;
export type ResearchOutputPublishedDataObject = ResearchOutputDataObject & {
  addedDate: string;
};

export type ListResearchOutputDataObject =
  ListResponse<ResearchOutputDataObject>;

export const getProjectResearchOutputDisplaySource = (
  researchOutput: Partial<ResearchOutputDataObject>,
): 'project' | 'team' => (researchOutput.project ? 'project' : 'team');

export type AuthorUpsertDataObject =
  | { userId: string }
  | { externalAuthorId: string };

export type ResearchOutputCreateDataObject = ResearchOutputCoreObject & {
  authors: AuthorUpsertDataObject[];
  createdBy: string;
  environmentIds: string[];
  labIds: string[];
  methodIds: string[];
  organismIds: string[];
  subtypeId?: string;
  keywordIds: string[];
  teamIds: string[];
  workingGroups?: string[];
  projectId?: string;
  relatedResearchIds: string[];
  relatedEventIds: string[];
  impact?: string;
  layImpactStatement?: string;
  categories?: string[];
  relatedManuscript?: string;
};

export type PublishedResearchOutputCreateDataObject =
  ResearchOutputCreateDataObject & {
    addedDate: string;
  };

export type DraftResearchOutputCreateDataObject = Omit<
  ResearchOutputCreateDataObject,
  'addedDate'
>;

export type ResearchOutputUpdateDataObject = ResearchOutputCoreObject & {
  authors: AuthorUpsertDataObject[];
  environmentIds: string[];
  labIds: string[];
  methodIds: string[];
  organismIds: string[];
  subtypeId?: string;
  keywordIds: string[];
  teamIds: string[];
  updatedBy: string;
  workingGroups: string[];
  projectId?: string;
  relatedResearchIds: string[];
  relatedEventIds: string[];
  statusChangedById?: string;
  statusChangedAt?: string;
  versions?: string[];
  impact?: string;
  layImpactStatement?: string;
  categories?: string[];
  relatedManuscriptVersion?: string;
  relatedManuscript?: string;
};

export type ResearchOutputBaseResponse = Omit<
  ResearchOutputDataObject,
  'createdBy' | 'workingGroups'
>;

export type ResearchOutputTeamResponse = ResearchOutputBaseResponse & {
  workingGroups: undefined;
};

export type ResearchOutputWorkingGroupResponse = ResearchOutputBaseResponse & {
  workingGroups: [Pick<WorkingGroupResponse, 'id' | 'title'>];
};

export type ResearchOutputResponse =
  | ResearchOutputWorkingGroupResponse
  | ResearchOutputTeamResponse;

export type ListResearchOutputResponse = ListResponse<ResearchOutputResponse>;

export type PublicResearchOutputResponse = Pick<
  ResearchOutputResponse,
  | 'id'
  | 'title'
  | 'sharingStatus'
  | 'asapFunded'
  | 'type'
  | 'relatedResearch'
  | 'created'
  | 'description'
  | 'shortDescription'
  | 'researchTheme'
  | 'documentType'
> & {
  hyperlink: ResearchOutputResponse['link'];
  teams: Pick<TeamResponse, 'id' | 'displayName' | 'teamType'>[];
  authors: Array<{ id?: string; name: string }>;
  tags: string[];
  persistentIdentifier: ResearchOutputResponse['doi'];
  finalPublishDate?: string;
  preprintPublishDate?: string;
  preprint?: {
    title?: string;
    link?: string;
    addedDate?: string;
  };
  lastModifiedDate?: string;
  impact?: string;
  categories: string[];
  workingGroup?: {
    id: string;
    title: string;
  };
};

export type ListPublicOutputResponse =
  ListResponse<PublicResearchOutputResponse>;

export type AuthorPostRequest =
  | { userId: string }
  | { externalAuthorId: string }
  | { externalAuthorName: string };

export type ResearchOutputPostRequest = {
  accession?: string;
  asapFunded?: boolean;
  authors?: AuthorPostRequest[];
  description?: string;
  descriptionMD: string;
  shortDescription: string;
  changelog?: string;
  documentType: ResearchOutputDocumentType;
  doi?: string;
  environments: string[];
  isInReview?: boolean;
  labCatalogNumber?: string;
  labs?: string[];
  impact?: string;
  layImpactStatement?: string;
  categories?: string[];
  link?: string;
  methods: string[];
  organisms: string[];
  publishDate?: string;
  rrid?: string;
  sharingStatus: ResearchOutputSharingStatus;
  subtype?: string;
  keywords: string[];
  teams: string[];
  workingGroups: string[];
  projectId?: string;
  relatedResearch: string[];
  relatedManuscriptVersion?: string;
  relatedManuscript?: string;
  title: string;
  type?: ResearchOutputType;
  usageNotes?: string;
  usedInPublication?: boolean;
  published: boolean;
  relatedEvents: string[];
};

export type OutputGenerateContentResponse = Partial<
  Pick<ResearchOutputResponse, 'shortDescription'>
>;

export type ResearchOutputGenerateContentRequest = Partial<
  Pick<ResearchOutputPostRequest, 'descriptionMD'>
>;

export type ResearchOutputAssociations =
  | 'team'
  | 'teams'
  | 'working group'
  | 'project';

export type ResearchOutputPutRequest = ResearchOutputPostRequest & {
  statusChangedById?: string;
  hasStatusChanged?: boolean;
  isInReview: boolean;
  createVersion?: boolean;
};

type NonEmptyArray<T> = [T, ...T[]];

export type ResearchOutputWorkingGroupPostRequest =
  ResearchOutputPostRequest & {
    workingGroups: NonEmptyArray<string>;
  };

export const convertDecisionToBoolean = (
  decision: string | null | DecisionOption,
): boolean | undefined =>
  decision && ['Yes', 'No'].includes(decision) ? decision === 'Yes' : undefined;

export const convertBooleanToDecision = (bool?: boolean): DecisionOption => {
  if (typeof bool === 'undefined') {
    return 'Not Sure';
  }
  return bool ? 'Yes' : 'No';
};

export const RESEARCH_OUTPUT_FLOW_IDS = {
  TEAM_CREATE_MANUAL: 'team-create-manual',
  TEAM_CREATE_IMPORTED_FROM_MANUSCRIPT: 'team-create-imported-from-manuscript',
  TEAM_EDIT_DRAFT: 'team-edit-draft',
  TEAM_EDIT_PUBLISHED: 'team-edit-published',
  TEAM_ADD_VERSION: 'team-add-version',
  TEAM_ADD_VERSION_FROM_MANUSCRIPT: 'team-add-version-from-manuscript',
  TEAM_DUPLICATE: 'team-duplicate',

  PROJECT_CREATE_MANUAL: 'project-create-manual',
  PROJECT_CREATE_IMPORTED_FROM_MANUSCRIPT:
    'project-create-imported-from-manuscript',
  PROJECT_EDIT_DRAFT: 'project-edit-draft',
  PROJECT_EDIT_PUBLISHED: 'project-edit-published',
  PROJECT_ADD_VERSION: 'project-add-version',
  PROJECT_ADD_VERSION_FROM_MANUSCRIPT: 'project-add-version-from-manuscript',
  PROJECT_DUPLICATE: 'project-duplicate',

  WORKING_GROUP_CREATE: 'working-group-create',
  WORKING_GROUP_EDIT_DRAFT: 'working-group-edit-draft',
  WORKING_GROUP_EDIT_PUBLISHED: 'working-group-edit-published',
  WORKING_GROUP_ADD_VERSION: 'working-group-add-version',
  WORKING_GROUP_DUPLICATE: 'working-group-duplicate',
} as const;

export type ResearchOutputFlowId =
  (typeof RESEARCH_OUTPUT_FLOW_IDS)[keyof typeof RESEARCH_OUTPUT_FLOW_IDS];

export type ResearchOutputFlowDescriptor = {
  entity: 'team' | 'project' | 'working-group';
  action: 'create' | 'edit' | 'add-version' | 'duplicate';
  origin: 'manual' | 'manuscript';
  startsPublished: boolean;
};

export const FLOW_DEFINITIONS = {
  [RESEARCH_OUTPUT_FLOW_IDS.TEAM_CREATE_MANUAL]: {
    entity: 'team',
    action: 'create',
    origin: 'manual',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.TEAM_CREATE_IMPORTED_FROM_MANUSCRIPT]: {
    entity: 'team',
    action: 'create',
    origin: 'manuscript',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.TEAM_EDIT_DRAFT]: {
    entity: 'team',
    action: 'edit',
    origin: 'manual',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.TEAM_EDIT_PUBLISHED]: {
    entity: 'team',
    action: 'edit',
    origin: 'manual',
    startsPublished: true,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.TEAM_ADD_VERSION]: {
    entity: 'team',
    action: 'add-version',
    origin: 'manual',
    startsPublished: true,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.TEAM_ADD_VERSION_FROM_MANUSCRIPT]: {
    entity: 'team',
    action: 'add-version',
    origin: 'manuscript',
    startsPublished: true,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.TEAM_DUPLICATE]: {
    entity: 'team',
    action: 'duplicate',
    origin: 'manual',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.PROJECT_CREATE_MANUAL]: {
    entity: 'project',
    action: 'create',
    origin: 'manual',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.PROJECT_CREATE_IMPORTED_FROM_MANUSCRIPT]: {
    entity: 'project',
    action: 'create',
    origin: 'manuscript',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.PROJECT_EDIT_DRAFT]: {
    entity: 'project',
    action: 'edit',
    origin: 'manual',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.PROJECT_EDIT_PUBLISHED]: {
    entity: 'project',
    action: 'edit',
    origin: 'manual',
    startsPublished: true,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.PROJECT_ADD_VERSION]: {
    entity: 'project',
    action: 'add-version',
    origin: 'manual',
    startsPublished: true,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.PROJECT_ADD_VERSION_FROM_MANUSCRIPT]: {
    entity: 'project',
    action: 'add-version',
    origin: 'manuscript',
    startsPublished: true,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.PROJECT_DUPLICATE]: {
    entity: 'project',
    action: 'duplicate',
    origin: 'manual',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_CREATE]: {
    entity: 'working-group',
    action: 'create',
    origin: 'manual',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_EDIT_DRAFT]: {
    entity: 'working-group',
    action: 'edit',
    origin: 'manual',
    startsPublished: false,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_EDIT_PUBLISHED]: {
    entity: 'working-group',
    action: 'edit',
    origin: 'manual',
    startsPublished: true,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_ADD_VERSION]: {
    entity: 'working-group',
    action: 'add-version',
    origin: 'manual',
    startsPublished: true,
  },
  [RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_DUPLICATE]: {
    entity: 'working-group',
    action: 'duplicate',
    origin: 'manual',
    startsPublished: false,
  },
} as const satisfies Record<ResearchOutputFlowId, ResearchOutputFlowDescriptor>;

const isAddVersionFlow = (flow: ResearchOutputFlowDescriptor): boolean =>
  flow.action === 'add-version';

const isCreateFlow = (flow: ResearchOutputFlowDescriptor): boolean =>
  flow.action === 'create';

const isEditFlow = (flow: ResearchOutputFlowDescriptor): boolean =>
  flow.action === 'edit';

const isProjectFlow = (flow: ResearchOutputFlowDescriptor): boolean =>
  flow.entity === 'project';

const isImportedFromManuscript = (
  flow: ResearchOutputFlowDescriptor,
): boolean => flow.origin === 'manuscript';

const supportsDrafts = (flow: ResearchOutputFlowDescriptor): boolean =>
  flow.origin !== 'manuscript' &&
  flow.action !== 'add-version' &&
  !flow.startsPublished;

const requiresAddVersionConfirm = (
  flow: ResearchOutputFlowDescriptor,
): boolean => flow.action === 'add-version';

const requiresPublishConfirm = (flow: ResearchOutputFlowDescriptor): boolean =>
  !flow.startsPublished;

const requiresDescriptionConfirm = (
  flow: ResearchOutputFlowDescriptor,
): boolean => flow.action === 'duplicate';

const publishesOnSave = (flow: ResearchOutputFlowDescriptor): boolean =>
  !flow.startsPublished || flow.action === 'add-version';

export type ResearchOutputFlowBehavior = {
  isAddVersionFlow: boolean;
  isCreateFlow: boolean;
  isEditFlow: boolean;
  isProjectFlow: boolean;
  isImportedFromManuscript: boolean;
  supportsDrafts: boolean;
  requiresAddVersionConfirm: boolean;
  requiresPublishConfirm: boolean;
  requiresSameDescriptionConfirm: boolean;
  publishesOnSave: boolean;
};

export const getResearchOutputFlowBehavior = (
  flowId: ResearchOutputFlowId,
): ResearchOutputFlowBehavior => {
  const flow = FLOW_DEFINITIONS[flowId];
  return {
    isAddVersionFlow: isAddVersionFlow(flow),
    isCreateFlow: isCreateFlow(flow),
    isEditFlow: isEditFlow(flow),
    isProjectFlow: isProjectFlow(flow),
    isImportedFromManuscript: isImportedFromManuscript(flow),
    supportsDrafts: supportsDrafts(flow),
    requiresAddVersionConfirm: requiresAddVersionConfirm(flow),
    requiresPublishConfirm: requiresPublishConfirm(flow),
    requiresSameDescriptionConfirm: requiresDescriptionConfirm(flow),
    publishesOnSave: publishesOnSave(flow),
  };
};

export type ResearchOutputEntityType = 'team' | 'working-group' | 'project';
