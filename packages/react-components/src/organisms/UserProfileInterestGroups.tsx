import { FC } from 'react';
import { UserResponse, InterestGroupResponse } from '@asap-hub/model';

import { Card, Headline2, Paragraph } from '../atoms';
import InterestGroupList from './InterestGroupList';

type UserProfileInterestGroupsProps = Pick<UserResponse, 'firstName' | 'id'> & {
  readonly interestGroups: ReadonlyArray<InterestGroupResponse>;
};
const UserProfileInterestGroups: FC<UserProfileInterestGroupsProps> = ({
  firstName,
  id,
  interestGroups,
}) => (
  <Card>
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Headline2 styleAsHeading={3}>{firstName}’s Groups</Headline2>
      <Paragraph accent="neutral900">
        {firstName}’s team is collaborating with other teams via groups, which
        meet frequently
      </Paragraph>
      <InterestGroupList interestGroups={interestGroups} id={id} />
    </div>
  </Card>
);
export default UserProfileInterestGroups;
