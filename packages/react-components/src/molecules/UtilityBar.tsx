import { FC, ReactNode } from 'react';
import { css } from '@emotion/react';

import { Link, Paragraph } from '../atoms';
import {
  largeDesktopScreen,
  mobileScreen,
  rem,
  vminLinearCalcClamped,
} from '../pixels';
import { asapLogo, gp2Logo } from '../icons';
import { color, colour } from '../colors';

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: color(3, 92, 129).rgb,
  gap: rem(24),
  color: colour.neutral[0],
  padding: `${rem(6)} ${vminLinearCalcClamped(
    mobileScreen,
    24,
    largeDesktopScreen,
    36,
    'px',
  )}`,
  justifyContent: 'right',
  [`@media (max-width: ${largeDesktopScreen.min}px)`]: {
    justifyContent: 'left',
  },
});

const logoStyles = css({ display: 'flex', alignContent: 'center' });

const hoverStyles = css({
  '#solid': {
    transition: 'opacity .3s ease',
  },
  ':hover #solid': {
    opacity: 0,
  },
});

const UtilityBar: FC<{ children?: ReactNode }> = ({ children }) => (
  <div css={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div css={headerStyles}>
      <Paragraph>
        <b>Visit our sites:</b>
      </Paragraph>
      <div css={hoverStyles}>
        <Link href="https://parkinsonsroadmap.org/">
          <span css={logoStyles}>{asapLogo}</span>
        </Link>
      </div>
      <div css={hoverStyles}>
        <Link href="http://gp2.org/">
          <span css={logoStyles}>{gp2Logo}</span>
        </Link>
      </div>
    </div>
    {children}
  </div>
);

export default UtilityBar;
