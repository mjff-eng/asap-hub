import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { analytics } from '@asap-hub/routing';
import { colour } from '..';
import { Dropdown, Headline3, Paragraph, Subtitle } from '../atoms';
import { AnalyticsControls } from '../molecules';
import { rem } from '../pixels';

export type AwardsMetricOption = 'os-champion' | 'network-spotlight';

export const awardsMetricOptions: Record<AwardsMetricOption, string> = {
  'os-champion': 'Open Science Champion',
  'network-spotlight': 'Network Spotlight',
};

const metricDescription: Record<AwardsMetricOption, string> = {
  'os-champion': 'Number of Open Science Champion awards by team',
  'network-spotlight': 'Number of Network Spotlight awards by team',
};

type AwardsAnalyticsProps = Pick<
  ComponentProps<typeof AnalyticsControls>,
  'timeRange'
> & {
  children: React.ReactNode;
  metric: AwardsMetricOption;
  tags: string[];
  currentPage: number;
  loadTags?: (
    tagsQuery: string,
  ) => Promise<Array<{ label: string; value: string }>>;
  setTags: (tags: string[]) => void;
  setMetric: (option: AwardsMetricOption) => void;
  exportResults: () => Promise<void>;
};

const metricDropdownStyles = css({
  marginBottom: rem(48),
});

const tableHeaderStyles = css({
  paddingBottom: rem(24),
});

const AnalyticsAwardsPageBody: React.FC<AwardsAnalyticsProps> = ({
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
  const metricOptionList = Object.keys(awardsMetricOptions).map((value) => ({
    value: value as AwardsMetricOption,
    label: awardsMetricOptions[value as AwardsMetricOption],
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
        <Headline3>{awardsMetricOptions[metric]}</Headline3>
        <Paragraph styles={css({ color: colour.foreground.tertiary })}>
          {metricDescription[metric]}.
        </Paragraph>
      </div>
      <AnalyticsControls
        currentPage={currentPage}
        exportResults={exportResults}
        href={analytics({}).awards({}).metric({ metric }).$}
        loadTags={loadTags}
        metricOption={'user'}
        noOptionsMessage="Sorry, no teams or users match"
        setTags={setTags}
        tags={tags}
        timeRange={timeRange}
        useLimitedTimeRange={true}
      />
      {children}
    </article>
  );
};

export default AnalyticsAwardsPageBody;
