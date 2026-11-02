import { ComponentProps } from 'react';
import { EventInfo } from '@asap-hub/react-components';
import { createEventResponse } from '@asap-hub/fixtures';

import { text, boolean } from './knobs';
import { CenterDecorator } from './layout';

export default {
  title: 'Molecules / Events / Info',
  component: EventInfo,
  decorators: [CenterDecorator],
};

const props = (): ComponentProps<typeof EventInfo> => ({
  ...createEventResponse(),
  tags: [],
  title: text('Title', 'GBA/LRRK2 Convergence workshops'),
  titleLimit: boolean('Title unlimited', false) ? null : undefined,
  eventOwner: <div>ASAP Team</div>,
});

export const Normal = () => <EventInfo {...props()} />;
