import {
  engagementInitialSortingDirection,
  EngagementPerformance,
  EngagementResponse,
  EngagementSortingDirection,
  SortEngagement,
} from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import {
  AlphabeticalSortingIcon,
  HashtagIcon,
  InactiveBadgeIcon,
  NumericalSortingIcon,
  PageControls,
  PercentageIcon,
} from '..';
import { Card, Link } from '../atoms';
import { borderRadius } from '../card';
import { colour } from '../colors';
import { rem, tabletScreen } from '../pixels';
import { getPerformanceIcon } from '../utils';
import EngagementSort from './EngagementSort';

const container = css({
  display: 'grid',
  paddingTop: rem(32),
});

const gridTitleStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'inherit',
    paddingBottom: rem(16),
  },
});

const rowTitleStyles = css({
  paddingTop: rem(32),
  paddingBottom: rem(16),
  ':first-of-type': { paddingTop: 0 },
  [`@media (min-width: ${tabletScreen.min}px)`]: { display: 'none' },
});

const rowStyles = css({
  display: 'grid',
  padding: `${rem(20)} ${rem(24)} 0`,
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':first-of-type': {
    borderBottom: 'none',
  },
  ':nth-of-type(2n+3)': {
    background: colour.background.secondary,
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: rem(15),
    borderRadius: rem(borderRadius),
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
    columnGap: rem(15),
    paddingTop: 0,
    paddingBottom: 0,
    borderBottom: `1px solid ${colour.border.tertiary}`,
  },
});

const titleStyles = css({
  display: 'flex',
  alignItems: 'center',
  fontWeight: 'bold',
  color: colour.foreground.primary,
  gap: rem(8),
});

const rowValueStyles = css({
  display: 'flex',
  gap: rem(6),
  fontWeight: 400,
});

const iconStyles = css({
  display: 'flex',
  gap: rem(3),
});

const buttonStyles = css({
  width: rem(24),
  margin: 0,
  padding: 0,
  border: 'none',
  backgroundColor: 'unset',
  cursor: 'pointer',
  alignSelf: 'center',
});

const pageControlsStyles = css({
  justifySelf: 'center',
  paddingTop: rem(36),
  paddingBottom: rem(36),
});

type RepresentationOfPresentersTableProps = ComponentProps<
  typeof PageControls
> & {
  data: EngagementResponse[];
  performance: EngagementPerformance;
  sort: SortEngagement;
  setSort: React.Dispatch<React.SetStateAction<SortEngagement>>;
  sortingDirection: EngagementSortingDirection;
  setSortingDirection: React.Dispatch<
    React.SetStateAction<EngagementSortingDirection>
  >;
};

const RepresentationOfPresentersTable: React.FC<
  RepresentationOfPresentersTableProps
> = ({
  data,
  performance,
  sort,
  setSort,
  sortingDirection,
  setSortingDirection,
  ...pageControlProps
}) => {
  const isTeamSortActive = sort.includes('team');
  const isMembersSortActive = sort.includes('members');
  const isEventsSortActive = sort.includes('events');
  const isTotalSpeakersSortActive = sort.includes('total_speakers');
  const isUniqueSpeakersAllRolesSortActive = sort.includes(
    'unique_speakers_all_roles',
  );
  const isUniqueSpeakersKeyPersonnelSortActive = sort.includes(
    'unique_speakers_key_personnel',
  );

  const onEventsSortClick = () => {
    const newDirection = isEventsSortActive
      ? sortingDirection.events === 'asc'
        ? 'desc'
        : 'asc'
      : 'desc';

    setSort(`events_${newDirection}`);
    setSortingDirection({
      ...engagementInitialSortingDirection,
      events: newDirection,
    });
  };

  const onTotalSpeakersSortClick = () => {
    const newDirection = isTotalSpeakersSortActive
      ? sortingDirection.totalSpeakers === 'asc'
        ? 'desc'
        : 'asc'
      : 'desc';

    setSort(`total_speakers_${newDirection}`);
    setSortingDirection({
      ...engagementInitialSortingDirection,
      totalSpeakers: newDirection,
    });
  };

  const onUniqueSpeakersSortClick = () => {
    const newDirection = isUniqueSpeakersAllRolesSortActive
      ? sortingDirection.uniqueSpeakersAllRoles === 'asc'
        ? 'desc'
        : 'asc'
      : 'desc';

    setSort(`unique_speakers_all_roles_${newDirection}`);
    setSortingDirection({
      ...engagementInitialSortingDirection,
      uniqueSpeakersAllRoles: newDirection,
    });
  };

  const onUniqueSpeakersPercentageSortClick = () => {
    const newDirection = isUniqueSpeakersAllRolesSortActive
      ? sortingDirection.uniqueSpeakersAllRolesPercentage === 'asc'
        ? 'desc'
        : 'asc'
      : 'desc';

    setSort(`unique_speakers_all_roles_percentage_${newDirection}`);
    setSortingDirection({
      ...engagementInitialSortingDirection,
      uniqueSpeakersAllRolesPercentage: newDirection,
    });
  };

  const onUniqueSpeakersKeyPersonnelSortClick = () => {
    const newDirection = isUniqueSpeakersKeyPersonnelSortActive
      ? sortingDirection.uniqueSpeakersKeyPersonnel === 'asc'
        ? 'desc'
        : 'asc'
      : 'desc';

    setSort(`unique_speakers_key_personnel_${newDirection}`);
    setSortingDirection({
      ...engagementInitialSortingDirection,
      uniqueSpeakersKeyPersonnel: newDirection,
    });
  };

  const onUniqueSpeakersKeyPersonnelPercentageSortClick = () => {
    const newDirection = isUniqueSpeakersKeyPersonnelSortActive
      ? sortingDirection.uniqueSpeakersKeyPersonnelPercentage === 'asc'
        ? 'desc'
        : 'asc'
      : 'desc';

    setSort(`unique_speakers_key_personnel_percentage_${newDirection}`);
    setSortingDirection({
      ...engagementInitialSortingDirection,
      uniqueSpeakersKeyPersonnelPercentage: newDirection,
    });
  };

  return (
    <>
      <Card padding={false}>
        <div css={container}>
          <div css={[rowStyles, gridTitleStyles]}>
            <span css={titleStyles}>
              Team
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isTeamSortActive
                    ? sortingDirection.team === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'asc';

                  setSort(`team_${newDirection}`);
                  setSortingDirection({
                    ...engagementInitialSortingDirection,
                    team: newDirection,
                  });
                }}
              >
                <AlphabeticalSortingIcon
                  active={isTeamSortActive}
                  ascending={sortingDirection.team === 'asc'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Members
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isMembersSortActive
                    ? sortingDirection.members === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`members_${newDirection}`);
                  setSortingDirection({
                    ...engagementInitialSortingDirection,
                    members: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isMembersSortActive}
                  ascending={sortingDirection.members === 'asc'}
                  description={'Members'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Events
              <EngagementSort
                isActive={isEventsSortActive}
                description="Events"
                sortingOptions={[
                  {
                    key: 'eventsDesc',
                    label: 'Sort highest to lowest',
                    Icon: HashtagIcon,
                    iconTitle: 'Events Numerical Descending Sort Icon',
                    onClick: onEventsSortClick,
                  },
                  {
                    key: 'eventsAsc',
                    label: 'Sort lowest to highest',
                    Icon: HashtagIcon,
                    iconTitle: 'Events Numerical Ascending Sort Icon',
                    onClick: onEventsSortClick,
                  },
                ]}
              />
            </span>
            <span css={titleStyles}>
              Total Speakers
              <EngagementSort
                isActive={isTotalSpeakersSortActive}
                description="Total Speakers"
                sortingOptions={[
                  {
                    key: 'totalSpeakersDesc',
                    label: 'Sort highest to lowest',
                    Icon: HashtagIcon,
                    iconTitle: 'Total Speakers Numerical Descending Sort Icon',
                    onClick: onTotalSpeakersSortClick,
                  },
                  {
                    key: 'totalSpeakersAsc',
                    label: 'Sort lowest to highest',
                    Icon: HashtagIcon,
                    iconTitle: 'Total Speakers Numerical Ascending Sort Icon',
                    onClick: onTotalSpeakersSortClick,
                  },
                ]}
              />
            </span>
            <span css={titleStyles}>
              Unique Speakers: All Roles
              <EngagementSort
                isActive={isUniqueSpeakersAllRolesSortActive}
                description="Unique Speakers"
                sortingOptions={[
                  {
                    key: 'uniqueSpeakersDesc',
                    label: 'Sort highest to lowest',
                    Icon: HashtagIcon,
                    iconTitle: 'Unique Speakers Numerical Descending Sort Icon',
                    onClick: onUniqueSpeakersSortClick,
                  },
                  {
                    key: 'uniqueSpeakersAsc',
                    label: 'Sort lowest to highest',
                    Icon: HashtagIcon,
                    iconTitle: 'Unique Speakers Numerical Ascending Sort Icon',
                    onClick: onUniqueSpeakersSortClick,
                  },
                  {
                    key: 'uniqueSpeakersPercentageDesc',
                    label: 'Sort highest to lowest',
                    Icon: PercentageIcon,
                    iconTitle:
                      'Unique Speakers Percentage Numerical Descending Sort Icon',
                    onClick: onUniqueSpeakersPercentageSortClick,
                  },
                  {
                    key: 'uniqueSpeakersPercentageAsc',
                    label: 'Sort lowest to highest',
                    Icon: PercentageIcon,
                    iconTitle:
                      'Unique Speakers Percentage Numerical Ascending Sort Icon',
                    onClick: onUniqueSpeakersPercentageSortClick,
                  },
                ]}
              />
            </span>
            <span css={titleStyles}>
              Unique Speakers: Key Personnel
              <EngagementSort
                isActive={isUniqueSpeakersKeyPersonnelSortActive}
                description="Unique Speakers Key Personnel"
                sortingOptions={[
                  {
                    key: 'uniqueSpeakersKeyPersonnelDesc',
                    label: 'Sort highest to lowest',
                    Icon: HashtagIcon,
                    iconTitle:
                      'Unique Speakers Key Personnel Numerical Descending Sort Icon',
                    onClick: onUniqueSpeakersKeyPersonnelSortClick,
                  },
                  {
                    key: 'uniqueSpeakersKeyPersonnelAsc',
                    label: 'Sort lowest to highest',
                    Icon: HashtagIcon,
                    iconTitle:
                      'Unique Speakers Key Personnel Numerical Ascending Sort Icon',
                    onClick: onUniqueSpeakersKeyPersonnelSortClick,
                  },
                  {
                    key: 'uniqueSpeakersKeyPersonnelPercentageDesc',
                    label: 'Sort highest to lowest',
                    Icon: PercentageIcon,
                    iconTitle:
                      'Unique Speakers Key Personnel Percentage Numerical Descending Sort Icon',
                    onClick: onUniqueSpeakersKeyPersonnelPercentageSortClick,
                  },
                  {
                    key: 'uniqueSpeakersKeyPersonnelPercentageAsc',
                    label: 'Sort lowest to highest',
                    Icon: PercentageIcon,
                    iconTitle:
                      'Unique Speakers Key Personnel Percentage Numerical Ascending Sort Icon',
                    onClick: onUniqueSpeakersKeyPersonnelPercentageSortClick,
                  },
                ]}
              />
            </span>
          </div>
          {data.map((row) => (
            <div key={row.id} css={[rowStyles]}>
              <span css={[titleStyles, rowTitleStyles]}>Team</span>
              <p css={iconStyles}>
                <Link href={network({}).teams({}).team({ teamId: row.id }).$}>
                  {row.name}
                </Link>

                {row.inactiveSince && <InactiveBadgeIcon />}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>Members</span>
              <p css={rowValueStyles}>{row.memberCount} </p>
              <span css={[titleStyles, rowTitleStyles]}>Events</span>
              <p css={rowValueStyles}>
                {row.eventCount}{' '}
                {getPerformanceIcon(row.eventCount, performance.events)}
              </p>

              <span css={[titleStyles, rowTitleStyles]}>Total Speakers</span>
              <p css={rowValueStyles}>
                {row.totalSpeakerCount}{' '}
                {getPerformanceIcon(
                  row.totalSpeakerCount,
                  performance.totalSpeakers,
                )}
              </p>

              <span css={[titleStyles, rowTitleStyles]}>
                Unique Speakers: All Roles
              </span>
              <p css={rowValueStyles}>
                {`${row.uniqueAllRolesCount} (${row.uniqueAllRolesCountPercentage}%)`}{' '}
                {getPerformanceIcon(
                  row.uniqueAllRolesCountPercentage,
                  performance.uniqueAllRoles,
                )}
              </p>

              <span css={[titleStyles, rowTitleStyles]}>
                Unique Speakers: Key Personnel
              </span>
              <p css={rowValueStyles}>
                {`${row.uniqueKeyPersonnelCount} (${row.uniqueKeyPersonnelCountPercentage}%)`}{' '}
                {getPerformanceIcon(
                  row.uniqueKeyPersonnelCountPercentage,
                  performance.uniqueKeyPersonnel,
                )}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <section css={pageControlsStyles}>
        <PageControls {...pageControlProps} />
      </section>
    </>
  );
};

export default RepresentationOfPresentersTable;
