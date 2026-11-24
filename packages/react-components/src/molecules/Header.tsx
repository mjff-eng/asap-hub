import { css } from '@emotion/react';

import { Link } from '../atoms';
import { colour } from '../colors';
import { crnLogoFull, crnLogoFullWhite, crnLogoMobile } from '../icons';
import { pageMarginStyles } from '../layout';
import { casHeader } from '../cas-layout';
import { mobileScreen, remUnit } from '../pixels';

const height = remUnit(casHeader.crn.height);

const containerStyles = (logoAlignment: 'center' | 'left') =>
  css(logoAlignment === 'left' && pageMarginStyles.crn, {
    height,
    flexGrow: 1,
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: logoAlignment === 'center' ? 'center' : 'flex-start',
  });
const containerOpaqueStyles = css({
  backgroundColor: colour.background.primary,
});

const logoStyles = css({
  height,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  svg: {
    height: '32px',
  },
});

const logoMobileStyles = css({
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});
const logoDesktopStyles = css({
  display: 'none',
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    display: 'inherit',
  },
});

type HeaderProps = {
  readonly enabled?: boolean;
  readonly transparent?: boolean;
  readonly logoHref?: string;
  readonly logoAlignment?: 'center' | 'left';
};

const Header: React.FC<HeaderProps> = ({
  enabled = true,
  transparent = false,
  logoHref = '/',
  logoAlignment = 'center',
}) => (
  <header
    css={[containerStyles(logoAlignment), transparent || containerOpaqueStyles]}
  >
    <Link href={enabled ? logoHref : undefined}>
      <div css={logoDesktopStyles}>
        <span css={logoStyles}>
          {transparent ? crnLogoFullWhite : crnLogoFull}
        </span>
      </div>
      <div css={logoMobileStyles}>
        <span css={logoStyles}>{crnLogoMobile}</span>
      </div>
    </Link>
  </header>
);

export default Header;
