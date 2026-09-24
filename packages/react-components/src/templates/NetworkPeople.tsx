import { ComponentProps, FC } from 'react';
import AlgoliaHit from '../atoms/AlgoliaHit';

import { ResultList, PeopleCard } from '../organisms';
import { UserIcon } from '../icons';
import { colour } from '../colors';

type NetworkPeopleProps = Omit<
  ComponentProps<typeof ResultList>,
  'children'
> & {
  readonly people: ReadonlyArray<
    { readonly id: string } & ComponentProps<typeof PeopleCard>
  >;
} & Pick<ComponentProps<typeof AlgoliaHit>, 'algoliaQueryId'>;

const NetworkPeople: FC<NetworkPeopleProps> = ({
  people,
  algoliaQueryId,
  ...cardListProps
}) => (
  <ResultList
    icon={<UserIcon color={colour.neutral[900]} />}
    {...cardListProps}
  >
    {people.map((person, index) => (
      <AlgoliaHit
        key={person.id}
        algoliaQueryId={algoliaQueryId}
        objectId={person.id}
        index={index}
      >
        <PeopleCard {...person} />
      </AlgoliaHit>
    ))}
  </ResultList>
);
export default NetworkPeople;
