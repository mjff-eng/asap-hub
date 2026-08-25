import {
  SharingPrelimFindingsResponse,
  SharingPrelimFindingsSortingDirection,
  SortSharingPrelimFindings,
} from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { PageControls } from '..';

import { Card, Link } from '../atoms';
import { borderRadius } from '../card';
import { charcoal, neutral200, neutral900, neutral500 } from '../colors';
import {
  AlphabeticalSortingIcon,
  InactiveBadgeIcon,
  NumericalSortingIcon,
} from '../icons';
import { rem } from '../pixels';
import StaticPerformanceCard from './StaticPerformanceCard';
import { getPerformanceMoodIcon } from '../utils';

const container = css({
  overflowX: 'auto',
  borderRadius: rem(borderRadius),
  'th, td': {
    textAlign: 'left',
    paddingRight: rem(24),
    paddingLeft: rem(24),
  },
  'th.team, td.team': {
    borderRight: `1px solid ${neutral500.rgb}`,
  },
});

const titleStyles = css({
  alignItems: 'center',
  fontWeight: 'bold',
  color: charcoal.rgb,
  background: '#fff',
  verticalAlign: 'top',
  paddingTop: rem(32),
  overflowWrap: 'break-word',
});

const headerStyles = css({
  display: 'flex',
  columnGap: rem(8),
  alignItems: 'start',
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
  borderBottom: `1px solid ${neutral500.rgb}`,
  ':nth-of-type(even)': {
    background: neutral200.rgb,
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
  color: neutral900.rgb,
  width: rem(45),
});

const pageControlsStyles = css({
  justifySelf: 'center',
  paddingTop: rem(36),
  paddingBottom: rem(36),
});

type SharingPrelimFindingsTableProps = ComponentProps<typeof PageControls> & {
  data: SharingPrelimFindingsResponse[];
  setSort: React.Dispatch<React.SetStateAction<SortSharingPrelimFindings>>;
  sort: SortSharingPrelimFindings;
  sortingDirection: SharingPrelimFindingsSortingDirection;
};

const SharingPrelimFindingsTable: React.FC<SharingPrelimFindingsTableProps> = ({
  data,
  sort,
  setSort,
  sortingDirection,
  ...pageControlProps
}) => {
  const isTeamSortActive = sort.startsWith('team_');
  const isPercentSharedSortActive = sort.startsWith('percent_shared_');

  const createSortHandler =
    (
      sortKeyFragment: 'team' | 'percent_shared',
      directionKey: keyof SharingPrelimFindingsSortingDirection,
      defaultDirection: 'asc' | 'desc',
    ) =>
    () => {
      const isActive = sort.startsWith(`${sortKeyFragment}_`);
      const newDirection =
        isActive && sortingDirection[directionKey] === 'asc' ? 'desc' : 'asc';

      const direction = isActive ? newDirection : defaultDirection;

      setSort(`${sortKeyFragment}_${direction}` as SortSharingPrelimFindings);
    };

  const handleTeamSort = createSortHandler('team', 'team', 'asc');
  const handlePercentSharedSort = createSortHandler(
    'percent_shared',
    'percentShared',
    'desc',
  );

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
                <th css={titleStyles} className={'team'}>
                  <span css={headerStyles}>
                    <span>Team</span>
                    <button
                      css={buttonStyles}
                      type="button"
                      onClick={handleTeamSort}
                      aria-label="Sort by team"
                    >
                      <AlphabeticalSortingIcon
                        active={isTeamSortActive}
                        ascending={sortingDirection.team === 'asc'}
                      />
                    </button>
                  </span>
                </th>
                <th css={titleStyles}>
                  <span css={headerStyles}>
                    <span>Percent Shared</span>
                    <button
                      css={buttonStyles}
                      type="button"
                      onClick={handlePercentSharedSort}
                      aria-label="Sort by percent shared"
                    >
                      <NumericalSortingIcon
                        active={isPercentSharedSortActive}
                        ascending={sortingDirection.percentShared === 'asc'}
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
                        {row.teamPercentShared === null || row.limitedData
                          ? 'N/A'
                          : `${row.teamPercentShared}%`}
                      </span>
                      {getPerformanceMoodIcon(
                        row.teamPercentShared,
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

export default SharingPrelimFindingsTable;
