import {
  ceruleanFernGradientStyles,
  drawerQuery,
  pixels,
  colour,
} from '@asap-hub/react-components';

import { css } from '@emotion/react';
import { layoutContentStyles } from '../layout';

import HeaderLogo from '../molecules/HeaderLogo';

const { rem } = pixels;

const logoStyles = css({ padding: `0 ${rem(24)}` });
const desktopNavigationStyles = css({
  [drawerQuery]: {
    display: 'none',
  },
});

const bottomBorderStyles = css({
  height: rem(4),
  width: '100%',
  ...ceruleanFernGradientStyles,
});

type BasicLayoutProps = {
  children: React.ReactNode;
  logoHref?: string;
};
const BasicLayout: React.FC<BasicLayoutProps> = ({ children, logoHref }) => (
  <article>
    <header
      css={css({
        width: '100%',
        borderBottom: `1px solid ${colour.border.tertiary}`,
      })}
    >
      <div css={logoStyles}>
        <HeaderLogo logoHref={logoHref} />
      </div>
      <div css={[bottomBorderStyles, desktopNavigationStyles]} />
    </header>
    <main css={layoutContentStyles}>{children}</main>
  </article>
);

export default BasicLayout;
