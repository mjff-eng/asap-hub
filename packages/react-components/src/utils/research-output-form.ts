import {
  convertDecisionToBoolean,
  DecisionOption,
  EventResponse,
  ResearchOutputDataObject,
  ResearchOutputDocumentType,
  ResearchOutputIdentifierType,
  ResearchOutputPostRequest,
  ResearchOutputPutRequest,
  ResearchOutputResponse,
  TeamResponse,
} from '@asap-hub/model';
import { isInternalUser } from '@asap-hub/validation';
import { ComponentPropsWithRef } from 'react';
import { MultiSelectOptionsType } from '../atoms';
import { OptionsType } from '../select';
import AuthorSelect, { AuthorOption } from '../organisms/AuthorSelect';

export type getTeamState = {
  team: TeamResponse | undefined;
  researchOutputData: ResearchOutputResponse | undefined;
};

export type ResearchOutputOption = {
  documentType: string;
  type?: string;
} & MultiSelectOptionsType;

export type ResearchOutputRelatedEventsOption = Pick<EventResponse, 'endDate'> &
  MultiSelectOptionsType;

const identifierTypeToFieldName: Record<
  ResearchOutputIdentifierType,
  'doi' | 'accession' | 'labCatalogNumber' | 'rrid' | undefined
> = {
  [ResearchOutputIdentifierType.Empty]: undefined,
  [ResearchOutputIdentifierType.None]: undefined,
  [ResearchOutputIdentifierType.DOI]: 'doi',
  [ResearchOutputIdentifierType.AccessionNumber]: 'accession',
  [ResearchOutputIdentifierType.RRID]: 'rrid',
};

export const createIdentifierField = (
  identifierType: ResearchOutputIdentifierType,
  rawIdentifier: string,
):
  | { rrid: string }
  | { doi: string }
  | { accession: string }
  | Record<never, never> => {
  const fieldName = identifierTypeToFieldName[identifierType];
  if (fieldName) {
    return { [fieldName]: rawIdentifier };
  }

  return {};
};

export const getIdentifierType = (
  researchOutputData?: ResearchOutputResponse,
): ResearchOutputIdentifierType => {
  if (researchOutputData?.doi) return ResearchOutputIdentifierType.DOI;

  if (researchOutputData?.accession)
    return ResearchOutputIdentifierType.AccessionNumber;

  if (researchOutputData?.rrid) return ResearchOutputIdentifierType.RRID;

  return researchOutputData
    ? ResearchOutputIdentifierType.None
    : ResearchOutputIdentifierType.Empty;
};

export const getPostAuthors = (
  authors: ComponentPropsWithRef<typeof AuthorSelect>['values'],
) =>
  (authors as OptionsType<AuthorOption>)?.map(({ value, author }) => {
    if (author) {
      return isInternalUser(author)
        ? { userId: value }
        : { externalAuthorId: value };
    }
    return { externalAuthorName: value };
  });
export const getPublishDate = (publishDate?: string): Date | undefined => {
  if (publishDate) {
    return new Date(publishDate);
  }
  return undefined;
};

export const getDecision = (
  decision?: boolean,
  documentType?: ResearchOutputDocumentType,
): DecisionOption => {
  if (documentType === 'Article' && decision === undefined) {
    return 'Yes';
  }
  return decision === undefined ? 'Not Sure' : decision ? 'Yes' : 'No';
};

export const getSharingStatus = (
  sharingStatus?: ResearchOutputPostRequest['sharingStatus'],
  documentType?: ResearchOutputDocumentType,
): ResearchOutputPostRequest['sharingStatus'] => {
  if (sharingStatus !== undefined) {
    return sharingStatus;
  }
  return documentType === 'Article' ? 'Public' : 'Network Only';
};

export const getOwnRelatedResearchLinks = (
  relatedResearch?: ResearchOutputDataObject['relatedResearch'],
) =>
  relatedResearch
    ?.filter(({ isOwnRelatedResearchLink }) => !!isOwnRelatedResearchLink)
    .map((research) => ({
      value: research.id,
      label: research.title,
      type: research.type,
      documentType: research.documentType,
    })) || [];

export type ResearchOutputFormValues = {
  identifierType: ResearchOutputIdentifierType;
  identifier: string;
  link: ResearchOutputPostRequest['link'];
  descriptionMD: ResearchOutputPostRequest['descriptionMD'];
  shortDescription: ResearchOutputPostRequest['shortDescription'];
  changelog: ResearchOutputPostRequest['changelog'];
  title: ResearchOutputPostRequest['title'];
  type: ResearchOutputPostRequest['type'] | '' | undefined;
  authors: AuthorOption[];
  labs: MultiSelectOptionsType[];
  teams: MultiSelectOptionsType[];
  relatedResearch: ResearchOutputOption[];
  usageNotes: ResearchOutputPostRequest['usageNotes'];
  asapFunded: DecisionOption;
  usedInPublication: DecisionOption;
  sharingStatus: ResearchOutputPostRequest['sharingStatus'];
  publishDate?: Date;
  labCatalogNumber: ResearchOutputPostRequest['labCatalogNumber'];
  methods: string[];
  organisms: string[];
  environments: string[];
  subtype?: string;
  keywords: string[];
  relatedEvents: ResearchOutputRelatedEventsOption[];
  impact: MultiSelectOptionsType;
  layImpactStatement: ResearchOutputPostRequest['layImpactStatement'];
  categories: MultiSelectOptionsType[];
};

export type ResearchOutputPayload = Omit<
  ResearchOutputFormValues,
  'impact' | 'categories' | 'type'
> & {
  documentType: ResearchOutputDocumentType;
  description: ResearchOutputPostRequest['description'];
  type: ResearchOutputPostRequest['type'] | '';
  published: boolean;
  impact?: string;
  categories?: string[];
  relatedManuscriptVersion?: string;
  relatedManuscript?: string;
};

export const getResearchOutputFormDefaultValues = ({
  researchOutputData,
  selectedTeams,
  versionAction,
  documentType,
  isCreateFlow,
  descriptionMD,
  isImportedFromManuscript,
}: {
  researchOutputData?: ResearchOutputResponse;
  selectedTeams: ResearchOutputFormValues['teams'];
  versionAction?: 'create' | 'edit';
  documentType: ResearchOutputDocumentType;
  isCreateFlow: boolean;
  descriptionMD: ResearchOutputFormValues['descriptionMD'];
  isImportedFromManuscript?: boolean;
}): ResearchOutputFormValues => ({
  type: researchOutputData?.type || undefined,
  title: researchOutputData?.title || '',
  impact:
    researchOutputData?.impact?.id && researchOutputData.impact.name
      ? {
          value: researchOutputData.impact.id,
          label: researchOutputData.impact.name,
        }
      : {
          value: '',
          label: '',
        },
  categories:
    researchOutputData?.categories?.map((category) => ({
      value: category.id,
      label: category.name,
    })) || [],
  labCatalogNumber: researchOutputData?.labCatalogNumber || '',
  labs:
    researchOutputData?.labs.map((lab) => ({
      value: lab.id,
      label: lab.name,
    })) || [],
  authors:
    researchOutputData?.authors.map((author) => ({
      author,
      value: author.id,
      label: author.displayName,
    })) || [],
  teams: selectedTeams,
  relatedResearch: getOwnRelatedResearchLinks(
    researchOutputData?.relatedResearch,
  ),
  relatedEvents: (researchOutputData?.relatedEvents ?? []).map(
    ({ title: label, id, endDate }) => ({
      value: id,
      label,
      endDate,
    }),
  ),
  descriptionMD,
  shortDescription: researchOutputData?.shortDescription || '',
  layImpactStatement: researchOutputData?.layImpactStatement || '',
  changelog:
    versionAction === 'create' ? '' : researchOutputData?.changelog || '',
  link: researchOutputData?.link || '',
  usageNotes:
    researchOutputData?.usageNotesMD || researchOutputData?.usageNotes || '',
  asapFunded: getDecision(researchOutputData?.asapFunded),
  usedInPublication: getDecision(
    researchOutputData?.usedInPublication,
    isCreateFlow ? documentType : undefined,
  ),
  sharingStatus: getSharingStatus(
    researchOutputData?.sharingStatus,
    isCreateFlow ? documentType : undefined,
  ),
  publishDate: getPublishDate(researchOutputData?.publishDate) || undefined,
  // An output imported from a manuscript is always identified by its DOI, even
  // when the manuscript version does not carry one yet.
  identifierType: isImportedFromManuscript
    ? ResearchOutputIdentifierType.DOI
    : getIdentifierType(researchOutputData),
  identifier: isImportedFromManuscript
    ? researchOutputData?.doi || ''
    : researchOutputData?.doi ||
      researchOutputData?.rrid ||
      researchOutputData?.accession ||
      '',
  methods: researchOutputData?.methods || [],
  organisms: researchOutputData?.organisms || [],
  environments: researchOutputData?.environments || [],
  subtype: researchOutputData?.subtype ?? '',
  keywords: researchOutputData?.keywords || [],
});

export const getPayload = ({
  identifierType,
  identifier,
  documentType,
  link,
  description,
  descriptionMD,
  shortDescription,
  changelog,
  title,
  type,
  authors,
  labs,
  teams,
  relatedResearch,
  usageNotes,
  asapFunded,
  usedInPublication,
  sharingStatus,
  publishDate,
  labCatalogNumber,
  methods,
  organisms,
  environments,
  subtype,
  keywords,
  published,
  relatedEvents,
  impact,
  layImpactStatement,
  categories,
  relatedManuscriptVersion,
  relatedManuscript,
}: ResearchOutputPayload): ResearchOutputPostRequest => ({
  ...createIdentifierField(identifierType, identifier),
  documentType,
  link: String(link).trim() === '' ? undefined : link,
  description,
  descriptionMD,
  shortDescription,
  changelog,
  title,
  type: type as ResearchOutputPostRequest['type'],
  authors: getPostAuthors(authors),
  labs: (labs as OptionsType<MultiSelectOptionsType>).map(({ value }) => value),
  teams: (teams as OptionsType<MultiSelectOptionsType>).map(
    ({ value }) => value,
  ),
  relatedResearch: relatedResearch.map(({ value }) => value),
  usageNotes,
  asapFunded: convertDecisionToBoolean(asapFunded),
  usedInPublication: convertDecisionToBoolean(usedInPublication),
  sharingStatus,
  publishDate:
    sharingStatus === 'Public' ? publishDate?.toISOString() : undefined,
  workingGroups: [],
  labCatalogNumber: labCatalogNumber || undefined,
  methods,
  organisms,
  environments,
  subtype,
  keywords,
  published,
  relatedEvents: relatedEvents.map(({ value }) => value),
  impact,
  layImpactStatement,
  categories,
  relatedManuscriptVersion,
  relatedManuscript,
});

export function transformResearchOutputResponseToRequest(
  researchOutputData: ResearchOutputResponse,
): ResearchOutputPutRequest {
  const {
    id: _id,
    researchTheme: _researchTheme,
    usageNotesMD: _usageNotesMD,
    addedDate: _addedDate,
    created: _created,
    lastUpdatedPartial: _lastUpdatedPartial,
    lastModifiedDate: _lastModifiedDate,
    publishingEntity: _publishingEntity,
    contactEmails: _contactEmails,
    versions: _versions,
    statusChangedAt: _statusChangedAt,
    project: _project,

    authors,
    descriptionMD,
    shortDescription,
    labs,
    teams,
    workingGroups,
    relatedResearch,
    relatedEvents,
    statusChangedBy,
    impact,
    categories,
    ...rest
  } = researchOutputData;
  return {
    ...rest,
    authors: getPostAuthors(
      authors.map((author) => ({
        author,
        value: author.id,
        label: author.displayName,
      })),
    ),
    descriptionMD: descriptionMD || '',
    shortDescription: shortDescription || '',
    labs: labs.map(({ id }) => id),
    teams: teams.map((team) => team.id),
    workingGroups: workingGroups ? workingGroups.map((wg) => wg.id) : [],
    relatedResearch: relatedResearch.map((research) => research.id),
    relatedEvents: relatedEvents.map((event) => event.id),
    statusChangedById: statusChangedBy ? statusChangedBy.id : undefined,
    impact: impact?.id,
    categories: categories?.map((category) => category.id),
    projectId: _project?.id ?? undefined,
  };
}

// Output forms aren't part of any section, so no navigation item is
// highlighted there.
const outputFormPath =
  /\/(create-output|duplicate)\/[^/]+\/?$|^\/shared-research\/[^/]+\/(edit|version)\/?$/;
export const isOutputFormPath = (pathname: string) =>
  outputFormPath.test(pathname);
