import { FC } from 'react';
import { MeetAsapTeam } from '@asap-hub/react-components';
import { useDiscoverState } from './state';

const WhosInvolved: FC<Record<string, never>> = () => {
  const { asapAreas } = useDiscoverState();

  return <MeetAsapTeam areas={asapAreas} />;
};

export default WhosInvolved;
