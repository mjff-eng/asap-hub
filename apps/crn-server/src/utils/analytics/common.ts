import { Maybe, ResearchOutputs, Sys } from '@asap-hub/contentful';
import {
  DocumentCategoryOption,
  EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT,
  TeamOutputDocumentType,
  teamOutputDocumentTypes,
  TimeRangeOption,
  OutputTypeOption,
} from '@asap-hub/model';
import { DateTime } from 'luxon';

type AnalyticOutput = Maybe<
  Pick<
    ResearchOutputs,
    | 'documentType'
    | 'sharingStatus'
    | 'addedDate'
    | 'createdDate'
    | 'asapFunded'
  > & {
    authorsCollection?: Maybe<{
      items: Array<
        Maybe<
          | { __typename: 'ExternalAuthors' }
          | ({ __typename: 'Users' } & {
              sys: Pick<Sys, 'id'>;
            })
        >
      >;
    }>;
  }
>;

export const getRangeFilterParams = (
  rangeKey?: TimeRangeOption,
): string | null => {
  const now = new Date();
  const options: Record<TimeRangeOption, string | null> = {
    '30d': new Date(new Date().setDate(now.getDate() - 30)).toISOString(),
    '90d': new Date(new Date().setDate(now.getDate() - 90)).toISOString(),
    'current-year': new Date(now.getFullYear(), 0, 1).toISOString(),
    'last-year': new Date(
      new Date().setDate(now.getDate() - 365),
    ).toISOString(),
    all: null,
  };
  if (rangeKey && rangeKey in options) {
    return options[rangeKey];
  }
  return options.all;
};

export const isPastEvent = (endDate?: Maybe<string>): endDate is string =>
  !!endDate &&
  DateTime.fromISO(endDate).plus({
    hours: EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT,
  }) < DateTime.now();

export const isNotCancelledEventStatus = (status?: Maybe<string>): boolean =>
  status !== 'Cancelled';

export const getFilterOutputByRange =
  (rangeKey?: TimeRangeOption) => (item: AnalyticOutput) => {
    const filter = getRangeFilterParams(rangeKey);
    if (item && filter) {
      return item.addedDate
        ? item.addedDate >= filter
        : item.createdDate >= filter;
    }
    return true;
  };

const documentCategoryMap: Record<DocumentCategoryOption, string | null> = {
  all: null,
  article: 'Article',
  bioinformatics: 'Bioinformatics',
  dataset: 'Dataset',
  'lab-material': 'Lab Material',
  protocol: 'Protocol',
};

export const getFilterOutputByDocumentCategory =
  (documentCategory?: DocumentCategoryOption) => (item: AnalyticOutput) => {
    if (item && documentCategory && documentCategory !== 'all') {
      return item.documentType
        ? item.documentType === documentCategoryMap[documentCategory]
        : false;
    }
    return true;
  };

export const isTeamOutputDocumentType = (
  documentType: string,
): documentType is TeamOutputDocumentType =>
  teamOutputDocumentTypes.includes(documentType as TeamOutputDocumentType);

export const isAsapFundedResearchOutput = (
  researchOutput: AnalyticOutput,
): boolean => researchOutput?.asapFunded === 'Yes';

// remove string from one array that are present in another array and return a new array of strings
export const removeDuplicates = (arr1: string[], arr2: string[]): string[] => [
  ...arr1.filter((elem) => !arr2.includes(elem)),
];

export const getUniqueIdCount = (arr: (string | undefined)[]): number =>
  [...new Set(arr.filter((elem) => !!elem))].length;

export const getFilterOutputBySharingStatus =
  (outputType?: OutputTypeOption) => (item: AnalyticOutput) => {
    if (outputType === 'public') {
      return item?.sharingStatus === 'Public';
    }
    return true;
  };
