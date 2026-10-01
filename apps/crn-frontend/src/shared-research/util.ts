import {
  manuscriptIdFromVersionRecordId,
  mapManuscriptLifecycleToType,
  mapManuscriptTypeToSubType,
  ManuscriptVersionResponse,
  ResearchOutputPublishingEntities,
  ResearchOutputResponse,
  ResearchOutputFlowId,
  RESEARCH_OUTPUT_FLOW_IDS,
  ResearchOutputVersion,
  ResearchOutputEntityType,
  ResearchOutputGrantDocument,
} from '@asap-hub/model';
import { endOfDay, isAfter, parseISO } from 'date-fns';

export const mapManuscriptVersionToResearchOutput = (
  output: ResearchOutputResponse | undefined,
  manuscriptVersion: ManuscriptVersionResponse,
  publishingEntity: ResearchOutputPublishingEntities,
): ResearchOutputResponse => ({
  ...output,
  id: output?.id || '',
  title: manuscriptVersion.title,
  link: manuscriptVersion.url,
  type:
    manuscriptVersion.lifecycle &&
    mapManuscriptLifecycleToType(manuscriptVersion.lifecycle),
  subtype:
    manuscriptVersion.type &&
    mapManuscriptTypeToSubType(manuscriptVersion.type),
  descriptionMD: manuscriptVersion.description,
  shortDescription: manuscriptVersion.shortDescription,
  labs: manuscriptVersion.labs || [],
  authors: manuscriptVersion.authors || [],
  teams: manuscriptVersion.teams || [],
  isInReview: false,
  published: output?.published ?? false,
  sharingStatus: 'Public',
  asapFunded: true,
  usedInPublication: true,
  environments: [],
  documentType: 'Article',
  methods: [],
  created: '',
  contactEmails: [],
  organisms: [],
  versions: output?.versions || [],
  relatedEvents: [],
  relatedResearch: [],
  keywords: [],
  publishingEntity,
  lastUpdatedPartial: '',
  workingGroups: undefined,
  impact: manuscriptVersion.impact,
  layImpactStatement: manuscriptVersion.layImpactStatement,
  categories: manuscriptVersion.categories,
  relatedManuscriptVersion: manuscriptVersion.versionId,
  relatedManuscript: manuscriptIdFromVersionRecordId(manuscriptVersion.id),
  doi: manuscriptVersion.doi,
  publishDate:
    manuscriptVersion.lifecycle === 'Publication' ||
    manuscriptVersion.lifecycle === 'Publication with addendum or corrigendum'
      ? manuscriptVersion.publicationDate
      : manuscriptVersion.preprintDate,
});

export type { ResearchOutputEntityType };

type EntityFlowIds = {
  create: ResearchOutputFlowId;
  createFromManuscript?: ResearchOutputFlowId;
  editDraft: ResearchOutputFlowId;
  editPublished: ResearchOutputFlowId;
  addVersion: ResearchOutputFlowId;
  addVersionFromManuscript?: ResearchOutputFlowId;
  duplicate: ResearchOutputFlowId;
};

const flowIdsByEntity: Record<ResearchOutputEntityType, EntityFlowIds> = {
  team: {
    create: RESEARCH_OUTPUT_FLOW_IDS.TEAM_CREATE_MANUAL,
    createFromManuscript:
      RESEARCH_OUTPUT_FLOW_IDS.TEAM_CREATE_IMPORTED_FROM_MANUSCRIPT,
    editDraft: RESEARCH_OUTPUT_FLOW_IDS.TEAM_EDIT_DRAFT,
    editPublished: RESEARCH_OUTPUT_FLOW_IDS.TEAM_EDIT_PUBLISHED,
    addVersion: RESEARCH_OUTPUT_FLOW_IDS.TEAM_ADD_VERSION,
    addVersionFromManuscript:
      RESEARCH_OUTPUT_FLOW_IDS.TEAM_ADD_VERSION_FROM_MANUSCRIPT,
    duplicate: RESEARCH_OUTPUT_FLOW_IDS.TEAM_DUPLICATE,
  },
  project: {
    create: RESEARCH_OUTPUT_FLOW_IDS.PROJECT_CREATE_MANUAL,
    createFromManuscript:
      RESEARCH_OUTPUT_FLOW_IDS.PROJECT_CREATE_IMPORTED_FROM_MANUSCRIPT,
    editDraft: RESEARCH_OUTPUT_FLOW_IDS.PROJECT_EDIT_DRAFT,
    editPublished: RESEARCH_OUTPUT_FLOW_IDS.PROJECT_EDIT_PUBLISHED,
    addVersion: RESEARCH_OUTPUT_FLOW_IDS.PROJECT_ADD_VERSION,
    addVersionFromManuscript:
      RESEARCH_OUTPUT_FLOW_IDS.PROJECT_ADD_VERSION_FROM_MANUSCRIPT,
    duplicate: RESEARCH_OUTPUT_FLOW_IDS.PROJECT_DUPLICATE,
  },
  'working-group': {
    create: RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_CREATE,
    editDraft: RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_EDIT_DRAFT,
    editPublished: RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_EDIT_PUBLISHED,
    addVersion: RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_ADD_VERSION,
    duplicate: RESEARCH_OUTPUT_FLOW_IDS.WORKING_GROUP_DUPLICATE,
  },
};

export type ResolveFlowIdParams = {
  entityType: ResearchOutputEntityType;
  versionAction?: 'create' | 'edit';
  published: boolean;
  isImportedFromManuscript?: boolean;
  isDuplicate: boolean;
  hasResearchOutputId: boolean;
};

export const resolveResearchOutputFlowId = ({
  entityType,
  versionAction,
  published,
  isImportedFromManuscript = false,
  isDuplicate,
  hasResearchOutputId,
}: ResolveFlowIdParams): ResearchOutputFlowId => {
  const flowIds = flowIdsByEntity[entityType];

  if (isDuplicate) {
    return flowIds.duplicate;
  }

  if (versionAction === 'create' && hasResearchOutputId) {
    if (isImportedFromManuscript && flowIds.addVersionFromManuscript) {
      return flowIds.addVersionFromManuscript;
    }

    return flowIds.addVersion;
  }

  if (versionAction === 'edit' && hasResearchOutputId) {
    return published ? flowIds.editPublished : flowIds.editDraft;
  }

  if (isImportedFromManuscript && flowIds.createFromManuscript) {
    return flowIds.createFromManuscript;
  }

  return flowIds.create;
};

export const toResearchOutputVersion = (
  output?: ResearchOutputResponse,
): ResearchOutputVersion => ({
  id: output?.id ?? '',
  title: output?.title ?? '',
  documentType: output?.documentType ?? 'Article',
  type: output?.type,
  link: output?.link,
  addedDate: output?.addedDate,
});

export const isGrantEnded = (
  grantDocument: ResearchOutputGrantDocument | undefined,
  now = new Date(),
): boolean => {
  const endDate = (grantDocument?.supplement ?? grantDocument?.original)
    ?.endDate;
  return !!endDate && isAfter(now, endOfDay(parseISO(endDate)));
};
