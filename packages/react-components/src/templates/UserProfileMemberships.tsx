import { UserResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { ReactNode } from 'react';

import {
  UserProjectsMembershipCard,
  UserTeamsMembershipCard,
  UserWorkingGroupsMembershipCard,
} from '../organisms';
import { rem } from '../pixels';

const containerStyles = css({
  display: 'grid',
  rowGap: rem(40),
});

type UserProfileMembershipsProps = Pick<
  UserResponse,
  'alumniSinceDate' | 'projects' | 'teams' | 'workingGroups'
> & {
  /** Rendered in place; interest groups are fetched separately by the app. */
  readonly interestGroupsCard?: ReactNode;
};

const UserProfileMemberships: React.FC<UserProfileMembershipsProps> = ({
  alumniSinceDate,
  projects,
  teams,
  workingGroups,
  interestGroupsCard,
}) => {
  const userAlumni = !!alumniSinceDate;
  return (
    <div css={containerStyles}>
      <UserProjectsMembershipCard projects={projects} />
      <UserTeamsMembershipCard teams={teams} userAlumni={userAlumni} />
      {interestGroupsCard}
      <UserWorkingGroupsMembershipCard
        workingGroups={workingGroups}
        userAlumni={userAlumni}
      />
    </div>
  );
};

export default UserProfileMemberships;
