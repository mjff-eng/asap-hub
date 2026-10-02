import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { analytics } from '@asap-hub/routing';
import { colour } from '..';
import { Dropdown, Headline3, Paragraph, Subtitle } from '../atoms';
import { AnalyticsControls } from '../molecules';
import { rem } from '../pixels';

export type MetricOption = 'preprint-compliance' | 'publication-compliance';

const metricOptions: Record<MetricOption, string> = {
  'preprint-compliance': 'Preprint Compliance',
  'publication-compliance': 'Publication Compliance',
};

const metricDescription = {
  'preprint-compliance':
    'Number of preprints posted to a preprint repository and percentage posted prior to journal submission by each team',
  'publication-compliance':
    'Percent compliance by research output type for each team',
};

type OpenScienceAnalyticsProps = Pick<
  ComponentProps<typeof AnalyticsControls>,
  'timeRange'
> & {
  children: React.ReactNode;
  metric: MetricOption;
  tags: string[];
  currentPage: number;
  loadTags?: (
    tagsQuery: string,
  ) => Promise<Array<{ label: string; value: string }>>;
  setTags: (tags: string[]) => void;
  setMetric: (option: MetricOption) => void;
  exportResults: () => Promise<void>;
};

const metricDropdownStyles = css({
  marginBottom: rem(48),
});

const tableHeaderStyles = css({
  paddingBottom: rem(24),
});

const AnalyticsOpenSciencePageBody: React.FC<OpenScienceAnalyticsProps> = ({
  children,
  metric,
  tags,
  timeRange,
  currentPage,
  setTags,
  loadTags = async () => [],
  setMetric,
  exportResults,
}) => {
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
      <div css={tableHeaderStyles}>
        <Headline3>{metricOptions[metric]}</Headline3>
        <Paragraph styles={css({ color: colour.foreground.tertiary })}>
          {metricDescription[metric]}.
        </Paragraph>
      </div>
      <AnalyticsControls
        currentPage={currentPage}
        exportResults={exportResults}
        href={analytics({}).openScience({}).metric({ metric }).$}
        loadTags={loadTags}
        metricOption={'team'}
        setTags={setTags}
        tags={tags}
        timeRange={timeRange}
        useLimitedTimeRange={true}
      />
      {children}
    </article>
  );
};

export default AnalyticsOpenSciencePageBody;
