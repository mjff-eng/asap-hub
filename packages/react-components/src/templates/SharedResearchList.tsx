import { ComponentProps } from 'react';
import AlgoliaHit from '../atoms/AlgoliaHit';

import {
  ResultList,
  SharedResearchCard,
  SharedResearchListCard,
} from '../organisms';
import { LibraryIcon } from '../icons';
import { colour } from '../colors';

type SharedResearchListProps = Omit<
  ComponentProps<typeof ResultList>,
  'children'
> & {
  readonly researchOutputs: ReadonlyArray<
    Omit<
      ComponentProps<typeof SharedResearchCard>,
      'workingGroupAssociation'
    > & { id: string }
  >;
  readonly listViewHref: string;
  readonly cardViewHref: string;
  showTags?: boolean;
} & Pick<ComponentProps<typeof AlgoliaHit>, 'algoliaQueryId'>;

const SharedResearchList: React.FC<SharedResearchListProps> = ({
  researchOutputs,
  algoliaQueryId,
  showTags = false,
  ...cardListProps
}) => (
  <ResultList
    icon={<LibraryIcon color={colour.neutral[900]} />}
    {...cardListProps}
  >
    {cardListProps.isListView ? (
      <SharedResearchListCard
        algoliaQueryId={algoliaQueryId}
        researchOutputs={researchOutputs}
      />
    ) : (
      researchOutputs.map((output, index) => (
        <AlgoliaHit
          key={output.id}
          index={index}
          algoliaQueryId={algoliaQueryId}
          objectId={output.id}
        >
          <SharedResearchCard {...output} showTags={showTags} />
        </AlgoliaHit>
      ))
    )}
  </ResultList>
);
export default SharedResearchList;
