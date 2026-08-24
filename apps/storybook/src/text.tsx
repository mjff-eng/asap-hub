import { text as componentText } from '@asap-hub/react-components';

import { select } from './knobs';

export const accentColor = () =>
  select<componentText.AccentColorName | undefined>(
    'Accent Color',
    {
      None: undefined,
      Lead: 'lead',
      Ember: 'ember',
      Pepper: 'pepper',
      Sandstone: 'sandstone',
      Clay: 'clay',
      Cerulean: 'cerulean',
      Prussian: 'prussian',
      Space: 'space',
      Berry: 'berry',
      Magenta: 'magenta',
      Iris: 'iris',
      Mauve: 'mauve',
    },
    undefined,
  );
