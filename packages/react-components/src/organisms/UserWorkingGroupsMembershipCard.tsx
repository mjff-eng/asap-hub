import { WorkingGroupMembership } from '@asap-hub/model';
import { network } from '@asap-hub/routing';

import { WorkingGroupsIcon } from '../icons';
import {
  MembershipCard,
  MembershipName,
  MembershipTable,
  MembershipTableColumn,
} from '../molecules';
import { splitListBy } from '../utils';

const columns: ReadonlyArray<MembershipTableColumn<WorkingGroupMembership>> = [
  {
    key: 'name',
    title: 'Name',
    render: ({ id, name }) => (
      <MembershipName
        icon={<WorkingGroupsIcon />}
        href={
          network({}).workingGroups({}).workingGroup({ workingGroupId: id }).$
        }
      >
        {name}
      </MembershipName>
    ),
  },
  {
    key: 'role',
    title: 'Role',
    width: '30%',
    render: ({ role }) => role,
  },
];

type WorkingGroupsMembershipCardProps = {
  readonly workingGroups: ReadonlyArray<WorkingGroupMembership>;
  readonly userAlumni: boolean;
};

const UserWorkingGroupsMembershipCard: React.FC<
  WorkingGroupsMembershipCardProps
> = ({ workingGroups, userAlumni }) => {
  const [active, past] = splitListBy(
    workingGroups,
    (group) => !userAlumni && group.active,
  );

  return (
    <MembershipCard
      title="Working Groups"
      description="Working groups allow CRN members to work together to solve problems. Find out the membership status of this member."
      activeTabIndex={userAlumni ? 1 : 0}
      tabs={[
        {
          tabTitle: `Active (${active.length})`,
          items: active,
          empty: 'No active memberships.',
        },
        {
          tabTitle: `Past (${past.length})`,
          items: past,
          empty: 'No past memberships.',
        },
      ]}
    >
      {({ data }) => (
        <MembershipTable
          columns={columns}
          rows={data}
          getRowKey={(group) => group.id}
          testId="working-groups-membership-table"
        />
      )}
    </MembershipCard>
  );
};

export default UserWorkingGroupsMembershipCard;
