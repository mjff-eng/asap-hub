import { ComponentProps } from 'react';
import { gp2 as gp2Model } from '@asap-hub/model';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { Link, Subtitle, utils } from '@asap-hub/react-components';

import { EditableCard, IconWithLabel } from '../molecules';
import { usersIcon } from '../icons';
import { CardTable } from '.';

const { getCounterString } = utils;

type UserWorkingGroupsProps = Pick<
  gp2Model.UserResponse,
  'id' | 'workingGroups'
> &
  Pick<ComponentProps<typeof EditableCard>, 'subtitle'> & {
    noLinks?: boolean;
    isOnboarding?: boolean;
  };

const UserWorkingGroups: React.FC<UserWorkingGroupsProps> = ({
  workingGroups,
  subtitle,
  id,
  noLinks = false,
  isOnboarding = false,
}) => {
  const getUserWorkingGroupRole = (
    userId: gp2Model.UserResponse['id'],
    members: gp2Model.UserWorkingGroupMember[],
  ): gp2Model.WorkingGroupMemberRole | null =>
    members.find((member) => member.userId === userId)?.role || null;

  return (
    <EditableCard
      title="Working Groups"
      subtitle={
        subtitle ||
        'This member is involved in the following GP2 working groups.'
      }
    >
      {workingGroups.length ? (
        <CardTable
          isOnboarding={isOnboarding}
          headings={
            isOnboarding ? ['Name', 'Members'] : ['Name', 'Role', 'Members']
          }
        >
          {workingGroups.map(({ title, members, id: workingGroupId }) => {
            const name = noLinks ? (
              title
            ) : (
              <Link
                underlined
                href={
                  gp2Routing.workingGroups({}).workingGroup({
                    workingGroupId,
                  }).$
                }
              >
                {title}
              </Link>
            );
            const role = getUserWorkingGroupRole(id, members) || '';
            const numberOfMembers = (
              <IconWithLabel noMargin icon={usersIcon}>
                {getCounterString(members.length, 'Member')}
              </IconWithLabel>
            );

            return {
              id: workingGroupId,
              values: isOnboarding
                ? [name, numberOfMembers]
                : [name, role, numberOfMembers],
            };
          })}
        </CardTable>
      ) : (
        <Subtitle accent="tertiary">
          You are not associated to any working groups.
        </Subtitle>
      )}
    </EditableCard>
  );
};

export default UserWorkingGroups;
