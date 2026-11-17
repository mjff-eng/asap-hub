import { Global } from '@emotion/react';
import { FC } from 'react';

import { darkTokens, lightTokens } from './colors';
import { charcoal, fontStyles, pearl, rem } from './theme';

export { darkTokens, lightTokens };

const styles = {
  ':root': { ...lightTokens, colorScheme: 'light' },
  "[data-theme='light']": { ...lightTokens, colorScheme: 'light' },
  "[data-theme='dark']": { ...darkTokens, colorScheme: 'dark' },
  '@media (prefers-color-scheme: dark)': {
    ":root:not([data-theme='light'])": { ...darkTokens, colorScheme: 'dark' },
  },
  '*, *::before, *::after': {
    boxSizing: 'border-box' as const,
  },
  html: {
    ...fontStyles,
    backgroundColor: pearl.rgb,
    color: charcoal.rgb,
  },
  'html, body, #root': {
    width: '100%',
    margin: 0,
    minHeight: '100%',
  },
  'h1, h2, h3, h4, h5, h6, p': {
    margin: 0,
  },
  p: {
    letterSpacing: rem(0.1),
  },
};

const GlobalStyles: FC = () => <Global styles={styles} />;

export default GlobalStyles;
