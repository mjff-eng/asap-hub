import { InterestGroupResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';

import { InterestGroupsIcon } from '../icons';
import {
  MembershipCard,
  MembershipName,
  ResponsiveTable,
  ResponsiveTableColumn,
} from '../molecules';
import { splitListBy } from '../utils';

const userRole = (group: InterestGroupResponse, userId: string) =>
  group.leaders.find((leader) => leader.user.id === userId)?.role ?? 'Member';

const columns = (
  userId: string,
): ReadonlyArray<ResponsiveTableColumn<InterestGroupResponse>> => [
  {
    key: 'name',
    title: 'Name',
    render: ({ id, name }) => (
      <MembershipName
        icon={<InterestGroupsIcon />}
        href={
          network({}).interestGroups({}).interestGroup({ interestGroupId: id })
            .$
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
    render: (group) => userRole(group, userId),
  },
];

type InterestGroupsMembershipCardProps = {
  readonly interestGroups: ReadonlyArray<InterestGroupResponse>;
  readonly userId: string;
  readonly userAlumni: boolean;
};

const UserInterestGroupsMembershipCard: React.FC<
  InterestGroupsMembershipCardProps
> = ({ interestGroups, userId, userAlumni }) => {
  const [active, past] = splitListBy(interestGroups, (group) => {
    if (userAlumni || !group.active) return false;
    const leader = group.leaders.find(({ user }) => user.id === userId);
    return !leader?.inactiveSinceDate;
  });

  return (
    <MembershipCard
      title="Interest Groups"
      description="Interest groups allow teams to share findings with other teams about topics of interest. Find out the membership status of this member."
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
        <ResponsiveTable
          columns={columns(userId)}
          rows={data}
          getRowKey={(group) => group.id}
          testId="interest-groups-membership-table"
        />
      )}
    </MembershipCard>
  );
};

export default UserInterestGroupsMembershipCard;
