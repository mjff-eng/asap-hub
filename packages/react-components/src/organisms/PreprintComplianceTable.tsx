import {
  PreprintComplianceResponse,
  PreprintComplianceSortingDirection,
  SortPreprintCompliance,
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
  'th.preprints, td.preprints': {
    borderRight: `1px solid ${colour.border.tertiary}`,
  },
});

const titleStyles = css({
  alignItems: 'center',
  fontWeight: 'bold',
  color: colour.foreground.primary,
  background: '#fff',
  verticalAlign: 'top',
  paddingTop: rem(32),
  overflowWrap: 'break-word',
});

const headerStyles = css({
  display: 'flex',
  columnGap: rem(8),
  alignItems: 'start',
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.7,
  },
  '& svg': {
    flexShrink: 0,
    width: '24px',
    height: '24px',
  },
});

const rowStyles = css({
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':nth-of-type(even)': {
    background: colour.background.secondary,
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
  width: rem(60),
});

const pageControlsStyles = css({
  justifySelf: 'center',
  paddingTop: rem(36),
  paddingBottom: rem(36),
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

type PreprintComplianceTableProps = ComponentProps<typeof PageControls> & {
  data: PreprintComplianceResponse[];
  setSort: React.Dispatch<React.SetStateAction<SortPreprintCompliance>>;
  sort: SortPreprintCompliance;
  sortingDirection: PreprintComplianceSortingDirection;
};

const PreprintComplianceTable: React.FC<PreprintComplianceTableProps> = ({
  data,
  sort,
  setSort,
  sortingDirection,
  ...pageControlProps
}) => {
  const isTeamSortActive = sort.includes('team');
  const isPreprintsSortActive = sort.includes('number_of_preprints');
  const isPostedPriorSortActive = sort.includes('posted_prior');

  const createSortHandler =
    (
      sortKeyFragment: string,
      directionKey: keyof PreprintComplianceSortingDirection,
      defaultDirection: 'asc' | 'desc',
    ) =>
    () => {
      const isActive = sort.includes(sortKeyFragment);
      const newDirection = isActive
        ? sortingDirection[directionKey] === 'asc'
          ? 'desc'
          : 'asc'
        : defaultDirection;
      setSort(`${sortKeyFragment}_${newDirection}` as SortPreprintCompliance);
    };

  const handleTeamSort = createSortHandler('team', 'team', 'asc');
  const handleNumberOfPreprintsSort = createSortHandler(
    'number_of_preprints',
    'numberOfPreprints',
    'desc',
  );
  const handlePostedPriorSort = createSortHandler(
    'posted_prior',
    'postedPriorPercentage',
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
              <col css={{ width: '33.33%' }} />
              <col css={{ width: '33.33%' }} />
              <col css={{ width: '33.33%' }} />
            </colgroup>
            <thead>
              <tr>
                <th css={titleStyles} className={'team'}>
                  <span css={headerStyles}>
                    Team
                    <button css={buttonStyles} onClick={handleTeamSort}>
                      <AlphabeticalSortingIcon
                        active={isTeamSortActive}
                        ascending={sortingDirection.team === 'asc'}
                      />
                    </button>
                  </span>
                </th>
                <th css={titleStyles} className={'preprints'}>
                  <span css={headerStyles}>
                    Number of Preprints
                    <button
                      css={buttonStyles}
                      onClick={handleNumberOfPreprintsSort}
                    >
                      <NumericalSortingIcon
                        active={isPreprintsSortActive}
                        ascending={sortingDirection.numberOfPreprints === 'asc'}
                        description={'Number of Preprints'}
                      />
                    </button>
                  </span>
                </th>
                <th css={titleStyles}>
                  <span css={headerStyles}>
                    Posted Prior to Journal Submission
                    <button css={buttonStyles} onClick={handlePostedPriorSort}>
                      <NumericalSortingIcon
                        active={isPostedPriorSortActive}
                        ascending={
                          sortingDirection.postedPriorPercentage === 'asc'
                        }
                        description={'Posted Prior to Journal Submission'}
                      />
                    </button>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={row.teamId || `${row.teamName}-${index}`}
                  css={rowStyles}
                >
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
                  <td className={'preprints'}>
                    <p>
                      {row.numberOfPreprints === null
                        ? 'N/A'
                        : row.numberOfPreprints}
                    </p>
                  </td>
                  <td>
                    <p css={iconStyles}>
                      <span css={valueStyles}>
                        {row.postedPriorPercentage === null
                          ? 'N/A'
                          : `${row.postedPriorPercentage}%`}
                      </span>
                      {getPerformanceMoodIcon(
                        row.postedPriorPercentage,
                        row.postedPriorPercentage === null,
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

export default PreprintComplianceTable;
