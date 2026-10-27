import {
  AnalyticsAwardsPageBody,
  AwardsMetricOption,
  AwardsTable,
  awardsMetricOptions,
} from '@asap-hub/react-components';
import { analytics } from '@asap-hub/routing';
import { FC } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useAnalytics, usePaginationParams, useSearch } from '../../hooks';
import { useAwardsSort } from '../utils/awards-sort';

const Awards: FC<Record<string, never>> = () => {
  const navigate = useNavigate();
  const { metric: metricParam } = useParams<{
    metric: AwardsMetricOption;
  }>();
  const metric = (metricParam ?? 'os-champion') as AwardsMetricOption;

  const { currentPage } = usePaginationParams();
  const { timeRange } = useAnalytics();
  const { tags, setTags } = useSearch();
  const { sort, setSort, sortingDirection } = useAwardsSort();

  const setMetric = (newMetric: AwardsMetricOption) => {
    void navigate(analytics({}).awards({}).metric({ metric: newMetric }).$);
  };

  return (
    <AnalyticsAwardsPageBody
      currentPage={currentPage}
      tags={tags}
      setTags={setTags}
      metric={metric}
      setMetric={setMetric}
      exportResults={() => Promise.resolve()}
      timeRange={timeRange}
    >
      <AwardsTable
        awardLabel={awardsMetricOptions[metric]}
        data={[]}
        sort={sort}
        setSort={setSort}
        sortingDirection={sortingDirection}
        numberOfPages={1}
        currentPageIndex={currentPage}
        renderPageHref={() => ''}
      />
    </AnalyticsAwardsPageBody>
  );
};

export default Awards;
