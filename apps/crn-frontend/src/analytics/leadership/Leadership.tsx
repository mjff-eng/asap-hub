import { resultsToStream, createCsvFileStream } from '@asap-hub/frontend-utils';
import {
  AnalyticsTeamLeadershipResponse,
  OSChampionOpensearchResponse,
  SortLeadershipAndMembership,
} from '@asap-hub/model';
import {
  AnalyticsLeadershipPageBody,
  MetricOption,
} from '@asap-hub/react-components';
import { analytics } from '@asap-hub/routing';
import { format } from 'date-fns';
import { FC, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import {
  useSearch,
  useAnalyticsOpensearch,
  useAnalytics,
  usePaginationParams,
  useOpensearchMetrics,
} from '../../hooks';
import { getAwardsSortFromSearch } from '../utils/awards-sort';
import { getAnalyticsOSChampion } from './api';
import { leadershipToCSV, osChampionToCSV } from './export';
import OSChampion from './OSChampion';
import TeamLeadership from './TeamLeadership';

const Leadership: FC<Record<string, never>> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { metric: metricParam } = useParams<{
    metric: MetricOption;
  }>();
  const metric = (metricParam ?? 'working-group') as MetricOption;
  const { currentPage } = usePaginationParams();

  const [teamSort, setTeamSort] =
    useState<SortLeadershipAndMembership>('team_asc');
  const setMetric = (newMetric: MetricOption) => {
    void navigate(analytics({}).leadership({}).metric({ metric: newMetric }).$);
  };

  const { tags, setTags } = useSearch();
  const { timeRange } = useAnalytics();
  const opensearchMetrics = useOpensearchMetrics();
  const osChampionClient =
    useAnalyticsOpensearch<OSChampionOpensearchResponse>('os-champion');
  const isOSChampionPage = metric === 'os-champion';

  const exportTeamLeadership = () =>
    resultsToStream<AnalyticsTeamLeadershipResponse>(
      createCsvFileStream(
        `leadership_${metric}_${format(new Date(), 'MMddyy')}.csv`,
        {
          header: true,
        },
      ),
      (paginationParams) => {
        const fetcher =
          metric === 'working-group'
            ? opensearchMetrics.getAnalyticsWorkingGroupLeadership
            : opensearchMetrics.getAnalyticsInterestGroupLeadership;
        return fetcher({
          tags,
          sort: teamSort,
          ...paginationParams,
        });
      },
      leadershipToCSV(
        metric as 'working-group' | 'interest-group' | 'os-champion',
      ),
    );

  const exportOSChampion = () =>
    resultsToStream<OSChampionOpensearchResponse>(
      createCsvFileStream(
        `leadership_${metric}_${format(new Date(), 'MMddyy')}.csv`,
        {
          header: true,
        },
      ),
      (paginationParams) =>
        getAnalyticsOSChampion(osChampionClient.client, {
          tags,
          timeRange,
          sort: getAwardsSortFromSearch(location.search),
          ...paginationParams,
        }),
      osChampionToCSV,
    );

  const exportResults = isOSChampionPage
    ? exportOSChampion
    : exportTeamLeadership;

  const loadTags = async (tagQuery: string) => {
    if (isOSChampionPage) {
      const response =
        await osChampionClient.client.getTagSuggestions(tagQuery);

      return response.map((value) => ({
        label: value,
        value,
      }));
    }
    const fetcher =
      metric === 'working-group'
        ? opensearchMetrics.getAnalyticsWorkingGroupLeadershipTagSuggestions
        : opensearchMetrics.getAnalyticsInterestGroupLeadershipTagSuggestions;
    const response = await fetcher(tagQuery);
    return response.map((value) => ({
      label: value,
      value,
    }));
  };

  return (
    <AnalyticsLeadershipPageBody
      tags={tags}
      setTags={setTags}
      loadTags={async (tagQuery) => loadTags(tagQuery)}
      metric={metric}
      setMetric={setMetric}
      exportResults={exportResults}
      timeRange={isOSChampionPage ? timeRange : undefined}
      currentPage={currentPage}
    >
      {isOSChampionPage ? (
        <OSChampion tags={tags} />
      ) : (
        <TeamLeadership
          tags={tags}
          sort={teamSort}
          setSort={setTeamSort}
          metric={metric as 'working-group' | 'interest-group'}
        />
      )}
    </AnalyticsLeadershipPageBody>
  );
};

export default Leadership;
