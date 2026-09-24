import { text as componentText } from '@asap-hub/react-components';

import { select } from './knobs';

export const accentColor = () =>
  select<componentText.AccentColorName | undefined>(
    'Accent Color',
    {
      None: undefined,
      'foreground/primary': 'primary',
      'foreground/secondary': 'secondary',
      'foreground/tertiary': 'tertiary',
      'foreground/quaternary': 'quaternary',
      'foreground/brand': 'brand',
      'foreground/error': 'error',
      'foreground/warning': 'warning',
      'foreground/success': 'success',
      'foreground/info': 'info',
      'foreground/disabled': 'disabled',
    },
    undefined,
  );
