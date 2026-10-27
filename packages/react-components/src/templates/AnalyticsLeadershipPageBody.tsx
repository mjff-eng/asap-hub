import { isEnabled } from '@asap-hub/flags';
import { analytics } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { Dropdown, Headline3, Paragraph, Subtitle } from '../atoms';
import { AnalyticsControls } from '../molecules';
import { rem } from '../pixels';

export type MetricOption = 'working-group' | 'interest-group' | 'os-champion';

const metricOptions: Record<MetricOption, string> = {
  'working-group': 'Working Group Leadership & Membership',
  'interest-group': 'Interest Group Leadership & Membership',
  'os-champion': 'Open Science Champion',
};

const metricDescription = {
  'working-group':
    'Teams that are currently or have been previously in a leadership or a membership role within a Working Group.',
  'interest-group':
    'Teams that are currently or have been previously in a leadership or a membership role within a Interest Group.',
  'os-champion': 'Number of Open Science Champion awards by team.',
};

type LeadershipAndMembershipAnalyticsProps = Pick<
  ComponentProps<typeof AnalyticsControls>,
  'currentPage' | 'timeRange'
> & {
  children: React.ReactNode;
  tags: string[];
  loadTags?: (
    tagsQuery: string,
  ) => Promise<Array<{ label: string; value: string }>>;
  setTags: (tags: string[]) => void;
  metric: MetricOption;
  setMetric: (option: MetricOption) => void;
  exportResults: () => Promise<void>;
};

const metricDropdownStyles = css({
  marginBottom: rem(48),
});

const tableHeaderStyles = css({
  paddingBottom: rem(24),
});

const LeadershipPageBody: React.FC<LeadershipAndMembershipAnalyticsProps> = ({
  children,
  tags,
  setTags,
  loadTags = async () => [],
  timeRange,
  currentPage,
  metric,
  setMetric,
  exportResults,
}) => {
  const metricOptionList = (Object.keys(metricOptions) as MetricOption[])
    .filter((value) => value !== 'os-champion' || !isEnabled('AWARDS_TAB'))
    .map((value) => ({
      value,
      label: metricOptions[value],
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
        <Paragraph>{metricDescription[metric]}</Paragraph>
      </div>
      <AnalyticsControls
        currentPage={currentPage}
        metricOption={metric === 'os-champion' ? 'user' : 'team'}
        tags={tags}
        loadTags={loadTags}
        setTags={setTags}
        exportResults={exportResults}
        noOptionsMessage={
          metric === 'os-champion'
            ? 'Sorry, no teams or users match'
            : undefined
        }
        href={analytics({}).leadership({}).metric({ metric }).$}
        timeRange={timeRange}
      />
      {children}
    </article>
  );
};

export default LeadershipPageBody;
