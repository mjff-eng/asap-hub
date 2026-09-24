import {
  CollaborationType,
  PerformanceMetrics,
  SortUserCollaboration,
  TeamRole,
  userCollaborationInitialSortingDirection,
  UserCollaborationSortingDirection,
} from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { CaptionCard, CaptionItem, PageControls } from '..';

import { Card, Link, Paragraph } from '../atoms';
import { borderRadius } from '../card';
import { neutral200, colour } from '../colors';
import {
  AlphabeticalSortingIcon,
  alumniBadgeIcon,
  InactiveBadgeIcon,
  NumericalSortingIcon,
} from '../icons';
import HoverTable from '../molecules/HoverTable';
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
    background: neutral200.rgb,
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: rem(15),
    borderRadius: rem(borderRadius),
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    columnGap: rem(15),
    paddingTop: 0,
    paddingBottom: 0,
    borderBottom: `1px solid ${colour.border.tertiary}`,
  },
});

const teamRowStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  justifyItems: 'left',
  textAlign: 'left',
  gridColumnGap: rem(24),
  maxWidth: rem(500),
});

const titleStyles = css({
  fontWeight: 'bold',
  color: colour.foreground.primary,
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

const iconStyles = css({
  display: 'flex',
  gap: rem(3),
  alignItems: 'center',
});

const pageControlsStyles = css({
  justifySelf: 'center',
  paddingTop: rem(36),
  paddingBottom: rem(36),
});

const rowValueStyles = css({
  display: 'flex',
  gap: rem(6),
  fontWeight: 400,
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

type Team = {
  team: string;
  id: string;
  role?: TeamRole;
  isTeamInactive: boolean;
  outputsCoAuthored: number;
};

export type UserCollaborationMetric = {
  id: string;
  isAlumni: boolean;
  name: string;
  teams: Team[];
};

const TeamsInfo: React.FC<{
  teams: Team[];
}> = ({ teams }) => (
  <HoverTable
    header={
      <div css={teamRowStyles}>
        <span>Team</span>
        <span>Role</span>
        <span>Values</span>
      </div>
    }
  >
    {teams.map((team, idx) => (
      <div key={`team-row-${idx}`} css={teamRowStyles}>
        <Paragraph noMargin>{displayTeams([team])}</Paragraph>
        <Paragraph noMargin>{displayRoles([team])}</Paragraph>
        <Paragraph noMargin>{team.outputsCoAuthored}</Paragraph>
      </div>
    ))}
  </HoverTable>
);

const displayTeams = (items: UserCollaborationMetric['teams']) => {
  const team = items[0];
  if (items.length <= 0 || !team) {
    return `No team`;
  }
  if (items.length === 1) {
    return items[0] && !items[0].isTeamInactive ? (
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
      Multiple teams <TeamsInfo teams={items} />
    </>
  );
};

const displayRoles = (items: UserCollaborationMetric['teams']) => {
  if (items.length === 0) {
    return `No role`;
  }
  if (items.length === 1) {
    return items[0]?.role ? items[0].role : 'No role';
  }
  return (
    <>
      Multiple roles <TeamsInfo teams={items} />
    </>
  );
};

const displayOutputsCount = (
  items: UserCollaborationMetric['teams'],
  performance: PerformanceMetrics,
) => {
  if (items.length <= 1) {
    const team = items[0];
    return (
      <span css={rowValueStyles}>
        {team?.outputsCoAuthored || 0}{' '}
        {getPerformanceIcon(team?.outputsCoAuthored || 0, performance)}
      </span>
    );
  }
  return (
    <>
      Multiple values <TeamsInfo teams={items} />
    </>
  );
};

type UserCollaborationTableProps = ComponentProps<typeof PageControls> & {
  data: UserCollaborationMetric[];
  performance: PerformanceMetrics;
  type: CollaborationType;
  sort: SortUserCollaboration;
  setSort: React.Dispatch<React.SetStateAction<SortUserCollaboration>>;
  sortingDirection: UserCollaborationSortingDirection;
  setSortingDirection: React.Dispatch<
    React.SetStateAction<UserCollaborationSortingDirection>
  >;
};

const UserCollaborationTable: React.FC<UserCollaborationTableProps> = ({
  data,
  performance,
  type,
  sort,
  setSort,
  sortingDirection,
  setSortingDirection,
  ...pageControlProps
}) => {
  const isUserSortActive = sort.includes('user');
  const isTeamSortActive = sort.includes('team');
  const isRoleSortActive = sort.includes('role');
  const isOutputsCoAuthoredSortActive = sort.includes('outputs_coauthored');
  const collaborationType = type === 'within-team' ? 'within' : 'across';

  return (
    <>
      <CaptionCard>
        <>
          <CaptionItem label="Outputs Co-Authored" {...performance} />
        </>
      </CaptionCard>

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
                    ...userCollaborationInitialSortingDirection,
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
                    ...userCollaborationInitialSortingDirection,
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
                    ...userCollaborationInitialSortingDirection,
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
              Outputs Co-Authored
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isOutputsCoAuthoredSortActive
                    ? sortingDirection.outputsCoAuthored === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(
                    `outputs_coauthored_${collaborationType}_${newDirection}`,
                  );
                  setSortingDirection({
                    ...userCollaborationInitialSortingDirection,
                    outputsCoAuthored: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isOutputsCoAuthoredSortActive}
                  ascending={sortingDirection.outputsCoAuthored === 'asc'}
                  description={'Outputs Co-Authored'}
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
              <span css={[titleStyles, rowTitleStyles]}>
                Outputs Co-Authored
              </span>
              <p>{displayOutputsCount(row.teams, performance)}</p>
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

export default UserCollaborationTable;
