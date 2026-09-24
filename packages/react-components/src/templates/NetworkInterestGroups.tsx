import { FC, Fragment, ComponentProps } from 'react';

import { ResultList, InterestGroupCard } from '../organisms';
import { InterestGroupsIcon } from '../icons';
import { colour } from '../colors';

type NetworkInterestGroupsProps = Omit<
  ComponentProps<typeof ResultList>,
  'children'
> & {
  readonly interestGroups: ReadonlyArray<
    { readonly id: string } & ComponentProps<typeof InterestGroupCard>
  >;
};

const NetworkInterestGroups: FC<NetworkInterestGroupsProps> = ({
  interestGroups,
  ...cardListProps
}) => (
  <ResultList
    icon={<InterestGroupsIcon color={colour.neutral[900]} />}
    {...cardListProps}
  >
    {interestGroups.map((group) => (
      <Fragment key={group.id}>
        <InterestGroupCard {...group} />
      </Fragment>
    ))}
  </ResultList>
);
export default NetworkInterestGroups;
