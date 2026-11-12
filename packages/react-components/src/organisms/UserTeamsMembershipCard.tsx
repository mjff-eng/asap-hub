import { UserTeam } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { formatDateToTimezone, weekdayShortDateFormat } from '../date';
import { InactiveBadgeIcon, TeamIcon } from '../icons';
import {
  MembershipCard,
  MembershipName,
  ResponsiveTable,
  ResponsiveTableColumn,
} from '../molecules';
import { rem } from '../pixels';
import {
  byTeamRolePriority,
  groupUserTeamsByTeamId,
  GroupedUserTeam,
  splitListBy,
} from '../utils';

const rolesStyles = css({
  display: 'grid',
  rowGap: rem(8),
});

const dateLeft = ({ inactiveSinceDate, teamInactiveSince }: GroupedUserTeam) =>
  inactiveSinceDate || teamInactiveSince;

const teamColumn: ResponsiveTableColumn<GroupedUserTeam> = {
  key: 'team',
  title: 'Team',
  render: ({ id, displayName, teamInactiveSince }) => (
    <MembershipName
      icon={<TeamIcon />}
      href={network({}).teams({}).team({ teamId: id }).$}
      badge={teamInactiveSince && <InactiveBadgeIcon />}
    >
      {displayName}
    </MembershipName>
  ),
};

const roleColumn: ResponsiveTableColumn<GroupedUserTeam> = {
  key: 'role',
  title: 'Role',
  width: '33%',
  render: ({ roles }) => (
    <div css={rolesStyles}>
      {roles.map((role) => (
        <div key={role}>{role}</div>
      ))}
    </div>
  ),
};

const dateLeftColumn: ResponsiveTableColumn<GroupedUserTeam> = {
  key: 'dateLeft',
  title: 'Date left',
  width: '33%',
  render: (team) => {
    const date = dateLeft(team);
    return date ? formatDateToTimezone(date, weekdayShortDateFormat) : null;
  },
};

const currentColumns = [teamColumn, roleColumn];
const formerColumns = [teamColumn, roleColumn, dateLeftColumn];

type TeamsMembershipCardProps = {
  readonly teams: ReadonlyArray<UserTeam>;
  readonly userAlumni: boolean;
};

const UserTeamsMembershipCard: React.FC<TeamsMembershipCardProps> = ({
  teams,
  userAlumni,
}) => {
  const [rawFormer, rawCurrent] = splitListBy(
    teams,
    (team) =>
      userAlumni || !!team.teamInactiveSince || !!team.inactiveSinceDate,
  );
  const current = groupUserTeamsByTeamId(rawCurrent).sort(byTeamRolePriority);
  const former = groupUserTeamsByTeamId(rawFormer).sort(byTeamRolePriority);

  return (
    <MembershipCard
      title="Teams and Roles"
      description="Teams are a constellation of labs focus on a specific grant proposal. Find out teams status and the member's current and past roles within them."
      activeTabIndex={userAlumni ? 1 : 0}
      tabs={[
        {
          tabTitle: `Current (${current.length})`,
          items: current,
          empty: 'No current teams.',
        },
        {
          tabTitle: `Former (${former.length})`,
          items: former,
          empty: 'No former teams.',
        },
      ]}
    >
      {({ data, activeTabIndex }) => (
        <ResponsiveTable
          columns={activeTabIndex === 1 ? formerColumns : currentColumns}
          rows={data}
          getRowKey={(team) => team.id}
          testId="teams-membership-table"
        />
      )}
    </MembershipCard>
  );
};

export default UserTeamsMembershipCard;
