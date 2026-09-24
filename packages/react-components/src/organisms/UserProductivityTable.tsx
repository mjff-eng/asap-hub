import {
  SortUserProductivity,
  userProductivityInitialSortingDirection,
  UserProductivityPerformance,
  UserProductivityResponse,
  UserProductivitySortingDirection,
} from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { PageControls, PerformanceCard } from '..';

import { Card, Link } from '../atoms';
import { borderRadius } from '../card';
import { colour } from '../colors';
import {
  AlphabeticalSortingIcon,
  alumniBadgeIcon,
  InactiveBadgeIcon,
  NumericalSortingIcon,
} from '../icons';
import { rem, tabletScreen } from '../pixels';
import { getPerformanceIcon } from '../utils';

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
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1.1fr 0.5fr',
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

const counterStyle = css({
  display: 'inline-flex',
  color: colour.foreground.tertiary,
  marginLeft: rem(9),
  textAlign: 'center',
  minWidth: rem(24),
  border: `1px solid ${colour.border.tertiary}`,
  borderRadius: '100%',
  fontSize: '14px',
  fontWeight: 'bold',

  justifyContent: 'center',
  alignItems: 'center',
  width: rem(24),
  height: rem(24),
});

const iconStyles = css({
  display: 'flex',
  gap: rem(3),
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

const displayTeams = (items: UserProductivityResponse['teams']) => {
  const team = items[0];
  if (items.length <= 0 || !team) {
    return 'No team';
  }
  if (items.length === 1) {
    return team && !team.isTeamInactive ? (
      <Link href={network({}).teams({}).team({ teamId: team.id }).$}>
        {team.team}
      </Link>
    ) : (
      <span css={iconStyles}>
        <Link href={network({}).teams({}).team({ teamId: team.id }).$}>
          {team.team}
        </Link>
        <InactiveBadgeIcon />
      </span>
    );
  }
  return (
    <>
      Multiple teams<span css={counterStyle}>{items.length}</span>
    </>
  );
};

const displayRoles = (items: UserProductivityResponse['teams']) => {
  if (items.length === 0) {
    return `No role`;
  }
  if (items.length === 1) {
    return items[0]?.role ? items[0].role : 'No role';
  }
  return (
    <>
      Multiple roles<span css={counterStyle}>{items.length}</span>
    </>
  );
};

type UserProductivityTableProps = ComponentProps<typeof PageControls> & {
  data: UserProductivityResponse[];
  performance: UserProductivityPerformance;
  sort: SortUserProductivity;
  setSort: React.Dispatch<React.SetStateAction<SortUserProductivity>>;
  sortingDirection: UserProductivitySortingDirection;
  setSortingDirection: React.Dispatch<
    React.SetStateAction<UserProductivitySortingDirection>
  >;
};

const UserProductivityTable: React.FC<UserProductivityTableProps> = ({
  data,
  performance,
  sort,
  setSort,
  sortingDirection,
  setSortingDirection,
  ...pageControlProps
}) => {
  const isUserSortActive = sort.includes('user');
  const isTeamSortActive = sort.includes('team');
  const isRoleSortActive = sort.includes('role');
  const isAsapOutputSortActive = sort.includes('asap_output');
  const isAsapPublicOutputSortActive = sort.includes('asap_public_output');
  const isRatioSortActive = sort.includes('ratio');

  return (
    <>
      <PerformanceCard performance={performance} type="by-output" />
      <Card padding={false}>
        <div css={container}>
          <div css={[rowStyles, gridTitleStyles]}>
            <span css={titleStyles}>
              User
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isUserSortActive
                    ? sortingDirection.user === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'asc';

                  setSort(`user_${newDirection}`);
                  setSortingDirection({
                    ...userProductivityInitialSortingDirection,
                    user: newDirection,
                  });
                }}
              >
                <AlphabeticalSortingIcon
                  active={isUserSortActive}
                  ascending={sortingDirection.user === 'asc'}
                  description={'User'}
                />
              </button>
            </span>
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
                    ...userProductivityInitialSortingDirection,
                    team: newDirection,
                  });
                }}
              >
                <AlphabeticalSortingIcon
                  active={isTeamSortActive}
                  ascending={sortingDirection.team === 'asc'}
                  description={'Team'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Role
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isRoleSortActive
                    ? sortingDirection.role === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'asc';

                  setSort(`role_${newDirection}`);
                  setSortingDirection({
                    ...userProductivityInitialSortingDirection,
                    role: newDirection,
                  });
                }}
              >
                <AlphabeticalSortingIcon
                  active={isRoleSortActive}
                  ascending={sortingDirection.role === 'asc'}
                  description={'Role'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              ASAP Output
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isAsapOutputSortActive
                    ? sortingDirection.asapOutput === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`asap_output_${newDirection}`);
                  setSortingDirection({
                    ...userProductivityInitialSortingDirection,
                    asapOutput: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isAsapOutputSortActive}
                  ascending={sortingDirection.asapOutput === 'asc'}
                  description={'ASAP Output'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              ASAP Public Output
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isAsapPublicOutputSortActive
                    ? sortingDirection.asapPublicOutput === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`asap_public_output_${newDirection}`);
                  setSortingDirection({
                    ...userProductivityInitialSortingDirection,
                    asapPublicOutput: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isAsapPublicOutputSortActive}
                  ascending={sortingDirection.asapPublicOutput === 'asc'}
                  description={'ASAP Public Output'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Ratio
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isRatioSortActive
                    ? sortingDirection.ratio === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`ratio_${newDirection}`);
                  setSortingDirection({
                    ...userProductivityInitialSortingDirection,
                    ratio: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isRatioSortActive}
                  ascending={sortingDirection.ratio === 'asc'}
                  description={'Ratio'}
                />
              </button>
            </span>
          </div>
          {data.map((row) => (
            <div key={row.id} css={[rowStyles]}>
              <span css={[titleStyles, rowTitleStyles]}>User</span>
              <p css={iconStyles}>
                <Link href={network({}).users({}).user({ userId: row.id }).$}>
                  {row.name}
                </Link>
                {row.isAlumni && alumniBadgeIcon}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>Team</span>
              <p>{displayTeams(row.teams)}</p>
              <span css={[titleStyles, rowTitleStyles]}>Role</span>
              <p>{displayRoles(row.teams)}</p>
              <span css={[titleStyles, rowTitleStyles]}>ASAP Output</span>
              <p css={rowValueStyles}>
                {row.asapOutput}{' '}
                {getPerformanceIcon(row.asapOutput, performance.asapOutput)}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>
                ASAP Public Output
              </span>
              <p css={rowValueStyles}>
                {row.asapPublicOutput}{' '}
                {getPerformanceIcon(
                  row.asapPublicOutput,
                  performance.asapPublicOutput,
                )}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>Ratio</span>
              <p css={rowValueStyles}>
                {row.ratio.toFixed(2)}{' '}
                {getPerformanceIcon(row.ratio, performance.ratio)}
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

export default UserProductivityTable;
