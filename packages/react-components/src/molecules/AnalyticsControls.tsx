import { css } from '@emotion/react';
import { useCallback } from 'react';
import {
  DocumentCategoryOption,
  OutputTypeOption,
  TimeRangeOption,
  timeRangeOptions,
  limitedTimeRangeOptions,
} from '@asap-hub/model';
import { useDebouncedCallback } from 'use-debounce';
import { add } from 'date-fns';

import { dropdownChevronIcon } from '../icons';
import DropdownButton from './DropdownButton';
import { rem, tabletScreen } from '../pixels';
import { MultiSelect, Paragraph, Subtitle } from '../atoms';
import { formatDateToTimezone, noop, searchIcon } from '..';
import ExportButton from './ExportButton';

export type MetricOption = 'user' | 'team';
const containerStyles = css({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
});

const controlsContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',

  gap: rem(33),
  'span + svg': {
    width: '11px',
    marginRight: '10px',
  },
  paddingBottom: rem(33),
  button: {
    padding: `${rem(8)} ${rem(16)}`,
  },

  [`@media (max-width: ${tabletScreen.min}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: rem(24),
    width: '100%',
  },
});

const selectContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(15),
  'span + svg': {
    width: '11px',
    marginRight: '10px',
  },
  button: {
    padding: `${rem(8)} ${rem(16)}`,
  },

  [`@media (max-width: ${tabletScreen.min}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: rem(24),
    width: '100%',
  },
});

const searchSelectContainerStyles = css({
  display: 'flex',
  gap: rem(33),
  paddingBottom: rem(24),
});

const filterContainerStyles = css({
  marginLeft: 'auto',
  '> div': {
    height: '100%',
    '> button': {
      alignItems: 'center',
    },
  },
});

const searchContainerStyles = css({
  display: 'flex',
  gap: rem(15),
  alignItems: 'center',
});

const searchStyles = css({
  flexGrow: 1,
});

const exportContainerStyles = css({
  display: 'flex',
  justifyContent: 'right',
  gap: rem(33),
  [`@media (max-width: ${tabletScreen.min}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
    gap: 0,
  },
});

const documentCategoryOptions: Record<DocumentCategoryOption, string> = {
  all: 'All',
  article: 'Article',
  bioinformatics: 'Bioinformatics',
  dataset: 'Dataset',
  'lab-material': 'Lab Material',
  protocol: 'Protocol',
};

const outputTypeOptions: Record<OutputTypeOption, string> = {
  all: 'ASAP Output',
  public: 'ASAP Public Output',
};

const searchTexts = {
  user: {
    label: 'Users & Teams',
    placeholder: 'Enter user and/or team names...',
  },
  team: {
    label: 'Teams',
    placeholder: 'Enter team names...',
  },
};

const generateLink = (
  href?: string,
  currentPage?: number,
  tagsQueryString?: string,
  timeRange?: string,
  documentCategory?: string,
  outputType?: string,
) =>
  `${href}?range=${timeRange}${
    documentCategory ? `&documentCategory=${documentCategory}` : ''
  }${
    outputType ? `&outputType=${outputType}` : ''
  }&currentPage=${currentPage}${tagsQueryString}`;

const updateSearchParams = (): URLSearchParams => {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.delete('range');
  searchParams.delete('currentPage');
  searchParams.delete('documentCategory');
  searchParams.delete('outputType');
  return searchParams;
};

const getLastUpdate = () => {
  const lastUpdate = new Date();
  lastUpdate.setUTCHours(6, 0, 0);

  const completedSyncDate = add(lastUpdate, { hours: 1 });
  const now = new Date();

  if (completedSyncDate > now) lastUpdate.setDate(lastUpdate.getDate() - 1);

  return formatDateToTimezone(
    lastUpdate.toISOString(),
    'do MMMM y, h:mm aaa (z)',
  );
};

interface AnalyticsControlsProps {
  readonly useLimitedTimeRange?: boolean;
  readonly timeRange?: TimeRangeOption;
  readonly documentCategory?: DocumentCategoryOption;
  readonly outputType?: OutputTypeOption;
  readonly metricOption?: MetricOption;
  readonly tags: string[];
  readonly loadTags?: (
    tagsQuery: string,
  ) => Promise<Array<{ label: string; value: string }>>;
  readonly setTags?: (tags: string[]) => void;
  readonly href?: string;
  readonly currentPage?: number;
  readonly exportResults?: () => Promise<void>;
  readonly noOptionsMessage?: string;
}
const AnalyticsControls: React.FC<AnalyticsControlsProps> = ({
  timeRange,
  documentCategory,
  outputType,
  metricOption,
  tags,
  setTags = noop,
  loadTags = async () => [],
  exportResults,
  currentPage,
  href,
  noOptionsMessage,
  useLimitedTimeRange = false,
}) => {
  const searchParams = updateSearchParams();
  const tagsQueryString = searchParams.has('tag')
    ? `&${searchParams.toString()}`
    : '';

  const debouncedFetch = useDebouncedCallback(
    async (
      inputValue: string,
      resolve: (options: Array<{ label: string; value: string }>) => void,
    ) => {
      const results = await loadTags(inputValue);
      if (Array.isArray(results)) {
        resolve(results);
      }
      resolve([]);
    },
    500,
  );

  const debouncedLoadTags = useCallback(
    (inputValue: string) =>
      new Promise<Array<{ label: string; value: string }>>((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        debouncedFetch(inputValue, resolve);
      }),
    [debouncedFetch],
  );
  return (
    <>
      <div css={searchSelectContainerStyles}>
        {metricOption && (
          <div css={[searchContainerStyles, searchStyles]}>
            <Subtitle>{searchTexts[metricOption].label}:</Subtitle>
            <span role="search" css={searchStyles}>
              <MultiSelect
                noMargin
                leftIndicator={searchIcon}
                noOptionsMessage={({ inputValue }) =>
                  noOptionsMessage
                    ? `${noOptionsMessage} ${inputValue}`
                    : 'No results found'
                }
                loadOptions={debouncedLoadTags}
                loadOptionsDebounceMs={0}
                onChange={(items) => setTags(items.map(({ value }) => value))}
                values={tags.map((tag) => ({
                  label: tag,
                  value: tag,
                }))}
                key={`${tags.join('')},${metricOption}`}
                placeholder={searchTexts[metricOption].placeholder}
              />
            </span>
          </div>
        )}
        {documentCategory && (
          <div css={[selectContainerStyles, filterContainerStyles]}>
            <strong>Document Category:</strong>
            <DropdownButton
              noMargin
              buttonChildren={() => (
                <>
                  <span css={{ marginRight: rem(8) }}>
                    {documentCategoryOptions[documentCategory]}
                  </span>
                  {dropdownChevronIcon}
                </>
              )}
            >
              {Object.keys(documentCategoryOptions).map((key) => ({
                item: (
                  <>{documentCategoryOptions[key as DocumentCategoryOption]}</>
                ),
                href: generateLink(
                  href,
                  currentPage,
                  tagsQueryString,
                  timeRange,
                  key,
                ),
              }))}
            </DropdownButton>
          </div>
        )}
        {outputType && (
          <div css={[selectContainerStyles, filterContainerStyles]}>
            <Subtitle>Type:</Subtitle>
            <DropdownButton
              noMargin
              buttonChildren={() => (
                <>
                  <span css={{ marginRight: rem(8) }}>
                    {outputTypeOptions[outputType]}
                  </span>
                  {dropdownChevronIcon}
                </>
              )}
            >
              {Object.keys(outputTypeOptions).map((key) => ({
                item: <>{outputTypeOptions[key as OutputTypeOption]}</>,
                href: generateLink(
                  href,
                  currentPage,
                  tagsQueryString,
                  timeRange,
                  undefined,
                  key,
                ),
              }))}
            </DropdownButton>
          </div>
        )}
      </div>
      <div css={containerStyles}>
        <Paragraph noMargin accent="neutral900">
          Last Update: {getLastUpdate()}
        </Paragraph>
        <span css={controlsContainerStyles}>
          {timeRange && (
            <span css={selectContainerStyles}>
              <strong>View:</strong>
              <DropdownButton
                noMargin
                buttonChildren={() => (
                  <>
                    <span css={{ marginRight: rem(10) }}>
                      {timeRangeOptions[timeRange]}
                    </span>
                    {dropdownChevronIcon}
                  </>
                )}
              >
                {Object.keys(
                  useLimitedTimeRange
                    ? limitedTimeRangeOptions
                    : timeRangeOptions,
                ).map((key) => ({
                  item: <>{timeRangeOptions[key as TimeRangeOption]}</>,
                  href: generateLink(
                    href,
                    currentPage,
                    tagsQueryString,
                    key,
                    documentCategory,
                  ),
                }))}
              </DropdownButton>
            </span>
          )}
          {exportResults && (
            <span css={exportContainerStyles}>
              <ExportButton exportResults={exportResults} />
            </span>
          )}
        </span>
      </div>
    </>
  );
};

export default AnalyticsControls;
