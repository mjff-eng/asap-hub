import { AwardsResponse } from '@asap-hub/model';
import {
  AnalyticsAwardsPageBody,
  AwardsTable,
} from '@asap-hub/react-components';
import { analytics } from '@asap-hub/routing';
import { FC } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import {
  useAnalytics,
  useAnalyticsOpensearch,
  usePaginationParams,
  useSearch,
} from '../../hooks';
import { useAwardsSort } from '../utils/awards-sort';
import AwardsList from './AwardsList';
import { useAnalyticsAwardTypes } from './state';

const Awards: FC<Record<string, never>> = () => {
  const navigate = useNavigate();
  const { metric: metricParam } = useParams<{ metric: string }>();

  const awardTypes = useAnalyticsAwardTypes();
  const awardsClient = useAnalyticsOpensearch<AwardsResponse>('awards').client;

  const { currentPage } = usePaginationParams();
  const { timeRange } = useAnalytics();
  const { tags, setTags } = useSearch();
  const { sort, setSort, sortingDirection } = useAwardsSort();

  const selectedAwardType = awardTypes.find(
    ({ value }) => value === metricParam,
  );

  const [defaultAwardType] = awardTypes;

  if (!selectedAwardType && defaultAwardType) {
    return (
      <Navigate
        to={
          analytics({}).awards({}).metric({ metric: defaultAwardType.value }).$
        }
        replace
      />
    );
  }

  const setMetric = (newMetric: string) => {
    void navigate(analytics({}).awards({}).metric({ metric: newMetric }).$);
  };

  const loadTags = async (tagQuery: string) => {
    const response = await awardsClient.getTagSuggestions(tagQuery);
    return response.map((value) => ({
      label: value,
      value,
    }));
  };

  return (
    <AnalyticsAwardsPageBody
      currentPage={currentPage}
      tags={tags}
      setTags={setTags}
      loadTags={loadTags}
      metric={selectedAwardType?.value ?? ''}
      metricOptions={awardTypes}
      setMetric={setMetric}
      exportResults={() => Promise.resolve()}
      timeRange={timeRange}
    >
      {selectedAwardType ? (
        <AwardsList
          awardType={selectedAwardType.value}
          awardLabel={selectedAwardType.label}
          tags={tags}
        />
      ) : (
        <AwardsTable
          awardLabel=""
          data={[]}
          sort={sort}
          setSort={setSort}
          sortingDirection={sortingDirection}
          numberOfPages={1}
          currentPageIndex={currentPage}
          renderPageHref={() => ''}
        />
      )}
    </AnalyticsAwardsPageBody>
  );
};

export default Awards;
