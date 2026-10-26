import { Tooltip } from '@asap-hub/react-components';

import { text, boolean } from './knobs';
import { CenterDecorator } from './layout';

export default {
  title: 'Atoms / Tooltip',
  component: Tooltip,
  decorators: [CenterDecorator],
};

export const Normal = () => (
  // The bubble renders above its anchor, so leave room for it at the top.
  <div style={{ paddingTop: 64 }}>
    <Tooltip shown={boolean('Shown', true)}>
      {text('Tooltip text', 'Tooltip text')}
    </Tooltip>
    Target element
  </div>
);

export const Bottom = () => (
  // The bubble renders below its anchor, so leave room for it at the bottom.
  <div style={{ paddingBottom: 64 }}>
    Target element
    <Tooltip shown={boolean('Shown', true)} position="bottom">
      {text('Tooltip text', 'Tooltip text')}
    </Tooltip>
  </div>
);
