import { EngagementType } from '@asap-hub/model';
import { analytics } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import { Dropdown, Headline3, Paragraph, Subtitle } from '../atoms';
import { AnalyticsControls } from '../molecules';
import { rem } from '../pixels';

const tableHeaderStyles = css({
  paddingBottom: rem(24),
});

const metricDropdownStyles = css({
  marginBottom: rem(48),
});

const metricOptions: Record<EngagementType, string> = {
  presenters: 'Representation of Presenters',
  attendance: 'Meeting Rep Attendance',
};

type AnalyticsEngagementPageBodyProps = Pick<
  ComponentProps<typeof AnalyticsControls>,
  'currentPage' | 'loadTags' | 'setTags' | 'tags' | 'timeRange'
> & {
  children: React.ReactNode;

  metric: EngagementType;
  setMetric: (option: EngagementType) => void;
  exportResults: () => Promise<void>;
};

const getPageHeaderDescription = (metric: EngagementType) =>
  metric === 'attendance'
    ? {
        header: 'Meeting Rep Attendance',
        description:
          'Percentage of team representatives attending interest group meetings.',
      }
    : {
        header: 'Representation of Presenters',
        description:
          'Number of presentations conducted by each team, along with an overview of which type of presenters were represented.',
      };

const AnalyticsEngagementPageBody: React.FC<
  AnalyticsEngagementPageBodyProps
> = ({
  exportResults,
  tags,
  timeRange,
  setTags,
  loadTags,
  metric,
  setMetric,
  children,
  currentPage,
}) => {
  const { header, description } = getPageHeaderDescription(metric);

  const metricOptionList = Object.keys(metricOptions).map((value) => ({
    value: value as EngagementType,
    label: metricOptions[value as EngagementType],
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
        <Headline3 styleAsHeading={5}>{header}</Headline3>
        <Paragraph>{description}</Paragraph>
      </div>
      <AnalyticsControls
        currentPage={currentPage}
        metricOption={'team'}
        tags={tags}
        loadTags={loadTags}
        setTags={setTags}
        timeRange={timeRange}
        href={analytics({}).engagement({}).metric({ metric }).$}
        exportResults={exportResults}
        useLimitedTimeRange={metric === 'attendance'}
        noOptionsMessage={
          metric === 'attendance' ? 'Sorry, no teams match' : undefined
        }
      />
      {children}
    </article>
  );
};

export default AnalyticsEngagementPageBody;
