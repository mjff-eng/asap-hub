import { Global } from '@emotion/react';
import { FC } from 'react';
import emotionNormalize from 'emotion-normalize';

import { fontStyles } from '../text';
import { Product, themes, themeVariables } from '../theme';
import { rem } from '../pixels';
import { colour } from '../colors';

const styles = {
  html: {
    ...fontStyles,
    ...themes.light,
  },
  'html, body, #root': {
    boxSizing: 'border-box',
    width: '100%',
  },
  p: {
    letterSpacing: rem(0.1),
  },

  // WebKit/Chromium...
  '*::-webkit-scrollbar': {
    width: rem(8),
    height: rem(8),
  },
  '*::-webkit-scrollbar-track': {
    background: colour.background.tertiary,
    borderRadius: rem(4),
  },
  '*::-webkit-scrollbar-thumb': {
    background: colour.neutral[200],
    borderRadius: rem(4),
    innerWidth: 8,
    outerWidth: 8,
  },
  '*::-webkit-scrollbar-thumb:hover': {
    background: colour.neutral[400],
  },
} as const;
type GlobalStylesProps = {
  readonly product?: Product;
};
const GlobalStyles: FC<GlobalStylesProps> = ({ product = 'crn' }) => (
  <>
    <Global styles={emotionNormalize} />
    <Global
      styles={{
        ':root': themeVariables(product),
        '[data-app="gp2"]': themeVariables('gp2'),
      }}
    />
    <Global styles={styles} />
  </>
);

export default GlobalStyles;
