import {
  engagementInitialSortingDirection,
  EngagementSortingDirection,
  SortEngagement,
  TimeRangeOption,
} from '@asap-hub/model';
import {
  CaptionCard,
  CaptionItem,
  LimitedDataCaptionItem,
  LoadingContentBodyTable,
  RepresentationOfPresentersTable,
} from '@asap-hub/react-components';
import { Dispatch, FC, SetStateAction, Suspense, useState } from 'react';
import { useLocation } from 'react-router';

import { usePagination, usePaginationParams } from '../../hooks';
import { useAnalyticsEngagement, useEngagementPerformance } from './state';

interface RepresentationOfPresentersProps {
  tags: string[];
  timeRange: TimeRangeOption;
  sort: SortEngagement;
  setSort: Dispatch<SetStateAction<SortEngagement>>;
}

const RepresentationOfPresentersContent: FC<
  RepresentationOfPresentersProps
> = ({ setSort, sort, tags, timeRange }) => {
  const { currentPage, pageSize } = usePaginationParams();

  const [sortingDirection, setSortingDirection] =
    useState<EngagementSortingDirection>(engagementInitialSortingDirection);

  const { items: data, total } = useAnalyticsEngagement({
    currentPage,
    pageSize,
    sort,
    tags,
    timeRange,
  });

  const { numberOfPages, renderPageHref } = usePagination(total, pageSize);

  const performance = useEngagementPerformance({ timeRange });

  return (
    <>
      <CaptionCard
        legend={`'Unique Speakers: All Roles' and 'Unique Speakers: Key Personnel'
            percentage is based on 'Members'`}
      >
        <>
          <CaptionItem label="Events" {...performance.events} />
          <CaptionItem label="Total Speakers" {...performance.totalSpeakers} />
          <CaptionItem
            label="U.S.: All Roles"
            percentage
            {...performance.uniqueAllRoles}
          />
          <CaptionItem
            label="U.S.: Key Personnel"
            percentage
            {...performance.uniqueKeyPersonnel}
          />
          <LimitedDataCaptionItem />
        </>
      </CaptionCard>
      <RepresentationOfPresentersTable
        data={data}
        performance={performance}
        sort={sort}
        setSort={setSort}
        sortingDirection={sortingDirection}
        setSortingDirection={setSortingDirection}
        numberOfPages={numberOfPages}
        currentPageIndex={currentPage}
        renderPageHref={renderPageHref}
      />
    </>
  );
};

const RepresentationOfPresenters: FC<RepresentationOfPresentersProps> = ({
  setSort,
  sort,
  tags,
  timeRange,
}) => {
  const { search } = useLocation();
  return (
    <Suspense key={search} fallback={<LoadingContentBodyTable />}>
      <RepresentationOfPresentersContent
        setSort={setSort}
        sort={sort}
        tags={tags}
        timeRange={timeRange}
      />
    </Suspense>
  );
};

export default RepresentationOfPresenters;
