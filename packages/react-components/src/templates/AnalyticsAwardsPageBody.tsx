import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { analytics } from '@asap-hub/routing';
import { colour } from '..';
import { Dropdown, Headline3, Paragraph, Subtitle } from '../atoms';
import { AnalyticsControls } from '../molecules';
import { rem } from '../pixels';

export type AwardsMetricOption = {
  value: string;
  label: string;
};

type AwardsAnalyticsProps = Pick<
  ComponentProps<typeof AnalyticsControls>,
  'timeRange'
> & {
  children: React.ReactNode;
  metric: string;
  metricOptions: ReadonlyArray<AwardsMetricOption>;
  tags: string[];
  currentPage: number;
  loadTags?: (
    tagsQuery: string,
  ) => Promise<Array<{ label: string; value: string }>>;
  setTags: (tags: string[]) => void;
  setMetric: (option: string) => void;
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
  metricOptions,
  tags,
  timeRange,
  currentPage,
  setTags,
  loadTags = async () => [],
  setMetric,
  exportResults,
}) => {
  const metricLabel =
    metricOptions.find(({ value }) => value === metric)?.label ?? '';

  return (
    <article>
      <div css={metricDropdownStyles}>
        <Subtitle>Metric</Subtitle>
        <Dropdown
          options={metricOptions}
          value={metric}
          onChange={setMetric}
          required
        />
      </div>
      <div css={tableHeaderStyles}>
        <Headline3>{metricLabel}</Headline3>
        <Paragraph styles={css({ color: colour.foreground.tertiary })}>
          Number of {metricLabel} awards by team.
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
