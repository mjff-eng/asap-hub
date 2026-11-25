import { FC } from 'react';
import { AboutWhosInvolved } from '@asap-hub/react-components';
import { useDiscoverState } from './state';

const WhosInvolved: FC<Record<string, never>> = () => {
  const { asapAreas, scientificAdvisoryBoard, cnsQuestMembers } =
    useDiscoverState();

  return (
    <AboutWhosInvolved
      asapAreas={asapAreas}
      scientificAdvisoryBoard={scientificAdvisoryBoard}
      cnsQuestMembers={cnsQuestMembers}
    />
  );
};

export default WhosInvolved;
