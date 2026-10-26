import { Card } from '@asap-hub/react-components';

import { select } from './knobs';

export default {
  title: 'Atoms / Card',
  component: Card,
};

export const Normal = () => (
  <Card
    accent={select(
      'Accent',
      ['default', 'red', 'green', 'placeholder', 'highlight'],
      'default',
    )}
  >
    Content
  </Card>
);

export const NoPadding = () => (
  <Card
    padding={false}
    accent={select(
      'Accent',
      ['default', 'red', 'green', 'placeholder', 'highlight'],
      'default',
    )}
  >
    Content
  </Card>
);
