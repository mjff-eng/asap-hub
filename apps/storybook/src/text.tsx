import { text as componentText } from '@asap-hub/react-components';

import { select } from './knobs';

export const accentColor = () =>
  select<componentText.AccentColorName | undefined>(
    'Accent Color',
    {
      None: undefined,
      Neutral900: 'neutral900',
      Error500: 'error500',
      Warning500: 'warning500',
      Cerulean: 'cerulean',
      Space: 'space',
      Berry: 'berry',
      Magenta: 'magenta',
      Iris: 'iris',
      Mauve: 'mauve',
    },
    undefined,
  );
