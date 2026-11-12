import { LabResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';

import { formatDateToTimezone, weekdayShortDateFormat } from '../date';
import { LabIcon, TeamIcon } from '../icons';
import {
  MembershipCard,
  MembershipName,
  ResponsiveTable,
  ResponsiveTableColumn,
} from '../molecules';
import { splitListBy } from '../utils';

/**
 * A lab the user belongs to. `team` and `inactiveSinceDate` are not on
 * `UserResponse.labs` yet; the card renders without them until the API
 * provides them.
 */
export type LabMembership = LabResponse & {
  readonly team?: { readonly id: string; readonly displayName: string };
  readonly inactiveSinceDate?: string;
};

const labColumn = (userId: string): ResponsiveTableColumn<LabMembership> => ({
  key: 'lab',
  title: 'Lab',
  render: ({ name, labPrincipalInvestigatorId }) => (
    <MembershipName
      icon={<LabIcon />}
      subtitle={
        labPrincipalInvestigatorId === userId
          ? 'Lead PI of this lab'
          : undefined
      }
    >
      {name}
    </MembershipName>
  ),
});

const teamColumn: ResponsiveTableColumn<LabMembership> = {
  key: 'team',
  title: 'Team',
  width: '30%',
  render: ({ team }) =>
    team ? (
      <MembershipName
        icon={<TeamIcon />}
        href={network({}).teams({}).team({ teamId: team.id }).$}
      >
        {team.displayName}
      </MembershipName>
    ) : null,
};

const dateLeftColumn: ResponsiveTableColumn<LabMembership> = {
  key: 'dateLeft',
  title: 'Date left',
  width: '30%',
  render: ({ inactiveSinceDate }) =>
    inactiveSinceDate
      ? formatDateToTimezone(inactiveSinceDate, weekdayShortDateFormat)
      : null,
};

type LabsMembershipCardProps = {
  readonly labs: ReadonlyArray<LabMembership>;
  readonly userId: string;
  readonly userAlumni: boolean;
};

const UserLabsMembershipCard: React.FC<LabsMembershipCardProps> = ({
  labs,
  userId,
  userAlumni,
}) => {
  const [former, current] = splitListBy(
    labs,
    (lab) => userAlumni || !!lab.inactiveSinceDate,
  );
  const currentColumns = [labColumn(userId), teamColumn];
  const formerColumns = [...currentColumns, dateLeftColumn];

  return (
    <MembershipCard
      title="Labs"
      description="View the labs this member belongs to and connect directly with their principal investigators."
      activeTabIndex={userAlumni ? 1 : 0}
      tabs={[
        {
          tabTitle: `Current (${current.length})`,
          items: current,
          empty: 'No current labs.',
        },
        {
          tabTitle: `Former (${former.length})`,
          items: former,
          empty: 'No former labs.',
        },
      ]}
    >
      {({ data, activeTabIndex }) => (
        <ResponsiveTable
          columns={activeTabIndex === 1 ? formerColumns : currentColumns}
          rows={data}
          getRowKey={(lab) => lab.id}
          testId="labs-membership-table"
        />
      )}
    </MembershipCard>
  );
};

export default UserLabsMembershipCard;
