import { analytics } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import { Dropdown, Headline3, Paragraph, Subtitle } from '../atoms';
import { AnalyticsControls } from '../molecules';
import { rem } from '../pixels';

type MetricOption = 'user' | 'team' | 'sharing-prelim-findings';
type TypeOption = 'within-team' | 'across-teams';

const metricOptions: Record<MetricOption, string> = {
  user: 'User Co-Production',
  team: 'Team Co-Production',
  'sharing-prelim-findings': 'Sharing Preliminary Findings',
};

const typeOptions: Record<TypeOption, string> = {
  'within-team': 'Within Team',
  'across-teams': 'Across Teams',
};

const typeOptionList = Object.keys(typeOptions).map((value) => ({
  value: value as TypeOption,
  label: typeOptions[value as TypeOption],
}));

const getPageHeaderDescription = (
  metric: MetricOption,
  type: TypeOption | undefined,
) =>
  metric === 'user'
    ? type === 'within-team'
      ? {
          header: 'Co-Production Within Team by User',
          description:
            'Number of outputs where a user has co-authored an output with another user on the same team from a different lab',
        }
      : {
          header: 'Co-Production Across Teams by User',
          description:
            'Number of outputs where a user has co-authored an output with another CRN user who is not from the same CRN team',
        }
    : metric === 'team'
      ? type === 'within-team'
        ? {
            header: 'Co-Production Within Teams by Team',
            description:
              'Number of team outputs that are co-produced by different labs within same team',
          }
        : {
            header: 'Co-Production Across Teams by Team',
            description:
              'Number of outputs in which additional teams are listed as contributors to the output',
          }
      : {
          header: 'Sharing Preliminary Findings',
          description:
            'Percentage of preliminary findings shared by each team during interest group meetings',
        };

type CollaborationAnalyticsProps = Pick<
  ComponentProps<typeof AnalyticsControls>,
  | 'currentPage'
  | 'documentCategory'
  | 'loadTags'
  | 'outputType'
  | 'setTags'
  | 'tags'
  | 'timeRange'
> & {
  children: React.ReactNode;
  exportResults: () => Promise<void>;
  metric: MetricOption;
  setMetric: (option: MetricOption) => void;
  setType: (option: TypeOption) => void;
  type: TypeOption | undefined;
};

const metricDropdownStyles = css({
  marginBottom: rem(48),
});

const tableHeaderStyles = css({
  paddingBottom: rem(24),
});

const AnalyticsCollaborationPageBody: React.FC<CollaborationAnalyticsProps> = ({
  children,
  currentPage,
  documentCategory,
  exportResults,
  loadTags,
  metric,
  outputType,
  setMetric,
  setTags,
  setType,
  tags,
  timeRange,
  type,
}) => {
  const { header, description } = getPageHeaderDescription(metric, type);
  const metricOptionList = Object.keys(metricOptions).map((value) => ({
    value: value as MetricOption,
    label: metricOptions[value as MetricOption],
  }));
  return (
    <article>
      <div css={metricDropdownStyles}>
        <Subtitle>Metric</Subtitle>
        <Dropdown
          options={metricOptionList}
          value={metric}
          onChange={setMetric}
          required
        />
      </div>
      {type && (
        <div css={metricDropdownStyles}>
          <Subtitle>Type</Subtitle>
          <Dropdown
            options={typeOptionList}
            value={type}
            onChange={setType}
            required
          />
        </div>
      )}
      <div css={tableHeaderStyles}>
        <Headline3 styleAsHeading={5}>{header}</Headline3>
        <Paragraph>{description}.</Paragraph>
      </div>
      <AnalyticsControls
        useLimitedTimeRange={metric === 'sharing-prelim-findings'}
        currentPage={currentPage}
        documentCategory={documentCategory}
        exportResults={exportResults}
        href={
          analytics({}).collaboration({}).collaborationPath({ metric, type }).$
        }
        loadTags={loadTags}
        metricOption={
          ['team', 'sharing-prelim-findings'].includes(metric) ? 'team' : 'user'
        }
        outputType={outputType}
        setTags={setTags}
        tags={tags}
        timeRange={timeRange}
      />
      {children}
    </article>
  );
};

export default AnalyticsCollaborationPageBody;
