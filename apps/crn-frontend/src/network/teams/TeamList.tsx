import { network } from '@asap-hub/routing';
import { useLocation } from 'react-router';
import { FetchTeamsFilter, TeamDataObject } from '@asap-hub/model';
import {
  NetworkTeams,
  DiscoveryTeamIcon,
  ResourceTeamIcon,
  colour,
} from '@asap-hub/react-components';
import { ReactElement } from 'react';

import { useTeams } from './state';
import { usePaginationParams, usePagination } from '../../hooks';

interface NetworkTeamListProps {
  filtersMap: FetchTeamsFilter;
  searchQuery?: string;
}

const NoResultsIcon: Record<TeamDataObject['teamType'], ReactElement> = {
  'Discovery Team': <DiscoveryTeamIcon color={colour.neutral[900]} />,
  'Resource Team': <ResourceTeamIcon color={colour.neutral[900]} />,
};

const NetworkTeamList: React.FC<NetworkTeamListProps> = ({
  filtersMap,
  searchQuery = '',
}) => {
  const location = useLocation();
  const path = location.pathname;

  const teamType: TeamDataObject['teamType'] | null =
    path === network({}).discoveryTeams({}).$
      ? 'Discovery Team'
      : path === network({}).resourceTeams({}).$
        ? 'Resource Team'
        : null;

  const { currentPage, pageSize } = usePaginationParams();

  if (!teamType) {
    throw new Error(`Invalid route`);
  }

  const result = useTeams({
    searchQuery,
    currentPage,
    pageSize,
    teamType,
    researchTheme: filtersMap.researchTheme,
    resourceType: filtersMap.resourceType,
    status: filtersMap.status,
  });

  const { numberOfPages, renderPageHref } = usePagination(
    result.total,
    pageSize,
  );

  return (
    <NetworkTeams
      teams={result.items}
      icon={NoResultsIcon[teamType]}
      numberOfItems={result.total}
      numberOfPages={numberOfPages}
      currentPageIndex={currentPage}
      renderPageHref={renderPageHref}
    />
  );
};

export default NetworkTeamList;
