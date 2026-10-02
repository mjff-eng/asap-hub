import {
  MeetingRepAttendanceResponse,
  MeetingRepAttendanceSortingDirection,
  SortMeetingRepAttendance,
} from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { PageControls } from '..';

import { Card, Link } from '../atoms';
import { borderRadius } from '../card';
import { colour } from '../colors';
import {
  AlphabeticalSortingIcon,
  InactiveBadgeIcon,
  NumericalSortingIcon,
} from '../icons';
import { rem } from '../pixels';
import { getPerformanceMoodIcon } from '../utils';
import StaticPerformanceCard from './StaticPerformanceCard';

const container = css({
  overflowX: 'auto',
  borderRadius: rem(borderRadius),
  'th, td': {
    textAlign: 'left',
    paddingRight: rem(24),
    paddingLeft: rem(24),
  },
  'th.team, td.team': {
    borderRight: `1px solid ${colour.border.tertiary}`,
  },
});

const titleStyles = css({
  alignItems: 'center',
  fontWeight: 'bold',
  color: colour.foreground.primary,
  background: colour.background.primary,
  verticalAlign: 'top',
  paddingTop: rem(32),
  overflowWrap: 'break-word',
});

const headerStyles = css({
  display: 'flex',
  columnGap: rem(8),
  alignItems: 'start',
  '&:hover': {
    opacity: 0.7,
  },
  '& svg': {
    flexShrink: 0,
    width: '24px',
    height: '24px',
  },
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

const rowStyles = css({
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':nth-of-type(even)': {
    background: colour.neutral[50],
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: rem(15),
    borderRadius: rem(borderRadius),
  },
});

const iconStyles = css({
  display: 'flex',
  gap: rem(3),
});

const valueStyles = css({
  fontWeight: 400,
  fontSize: rem(17),
  textWrap: 'nowrap',
  color: colour.foreground.tertiary,
  width: rem(45),
});

const pageControlsStyles = css({
  justifySelf: 'center',
  paddingTop: rem(36),
  paddingBottom: rem(36),
});

type MeetingRepAttendanceTableProps = ComponentProps<typeof PageControls> & {
  data: MeetingRepAttendanceResponse[];
  setSort: React.Dispatch<React.SetStateAction<SortMeetingRepAttendance>>;
  sort: SortMeetingRepAttendance;
  sortingDirection: MeetingRepAttendanceSortingDirection;
};

const MeetingRepAttendanceTable: React.FC<MeetingRepAttendanceTableProps> = ({
  data,
  sort,
  setSort,
  sortingDirection,
  ...pageControlProps
}) => {
  const isTeamSortActive = sort.includes('team');
  const isAttendanceSortActive = sort.includes('attendance_percentage');

  const getNewSortDirection = (
    isActive: boolean,
    currentDirection: 'asc' | 'desc',
    defaultDirection: 'asc' | 'desc',
  ): 'asc' | 'desc' => {
    if (!isActive) return defaultDirection;
    return currentDirection === 'asc' ? 'desc' : 'asc';
  };

  const handleTeamSort = () => {
    const newDirection = getNewSortDirection(
      isTeamSortActive,
      sortingDirection.team,
      'asc',
    );
    setSort(`team_${newDirection}`);
  };

  const handleAttendanceSort = () => {
    const newDirection = getNewSortDirection(
      isAttendanceSortActive,
      sortingDirection.attendancePercentage,
      'desc',
    );
    setSort(`attendance_percentage_${newDirection}`);
  };

  return (
    <>
      <StaticPerformanceCard />
      <Card padding={false}>
        <div css={container}>
          <table
            css={{
              width: '100%',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
            }}
          >
            <colgroup>
              <col css={{ width: '50%' }} />
              <col css={{ width: '50%' }} />
            </colgroup>
            <thead>
              <tr>
                <th css={titleStyles} className={'team'} scope="col">
                  <span css={headerStyles}>
                    Team
                    <button
                      type="button"
                      css={buttonStyles}
                      onClick={handleTeamSort}
                    >
                      <AlphabeticalSortingIcon
                        active={isTeamSortActive}
                        ascending={sortingDirection.team === 'asc'}
                      />
                    </button>
                  </span>
                </th>
                <th css={titleStyles} scope="col">
                  <span css={headerStyles}>
                    <span>Attendance</span>
                    <button
                      type="button"
                      css={buttonStyles}
                      onClick={handleAttendanceSort}
                    >
                      <NumericalSortingIcon
                        active={isAttendanceSortActive}
                        ascending={
                          sortingDirection.attendancePercentage === 'asc'
                        }
                        description="Attendance"
                      />
                    </button>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.teamId} css={rowStyles}>
                  <td className={'team'}>
                    <p css={iconStyles}>
                      <span>
                        <Link
                          href={
                            network({}).teams({}).team({ teamId: row.teamId }).$
                          }
                        >
                          {row.teamName}
                        </Link>
                      </span>
                      {row.isTeamInactive && <InactiveBadgeIcon />}
                    </p>
                  </td>
                  <td>
                    <p css={iconStyles}>
                      <span css={valueStyles}>
                        {row.attendancePercentage === null || row.limitedData
                          ? 'N/A'
                          : `${row.attendancePercentage}%`}
                      </span>
                      {getPerformanceMoodIcon(
                        row.attendancePercentage,
                        row.limitedData,
                      )}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <section css={pageControlsStyles}>
        <PageControls {...pageControlProps} />
      </section>
    </>
  );
};

export default MeetingRepAttendanceTable;
