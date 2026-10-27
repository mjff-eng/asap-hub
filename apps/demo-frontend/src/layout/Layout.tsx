/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';
import { Outlet, useLocation } from 'react-router';

import { pearl, rem } from '../ui/theme';
import Breadcrumb from './Breadcrumb';
import Header from './Header';

const shellStyles = css({
  minHeight: '100vh',
  backgroundColor: pearl.rgb,
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
});

// the editor is a workspace, not a document: it takes the whole window and
// scrolls its own panels rather than the page
const fullBleedShellStyles = css({
  height: '100vh',
  minHeight: 0,
  overflow: 'hidden',
});

const mainStyles = css({
  width: '100%',
  maxWidth: rem(1120),
  margin: '0 auto',
  padding: `${rem(24)} ${rem(24)} ${rem(64)}`,
  boxSizing: 'border-box',
});

const fullBleedMainStyles = css({
  maxWidth: 'none',
  padding: 0,
  minHeight: 0,
  // a grid child defaults to min-width auto, which lets a wide timeline push
  // the whole page sideways
  minWidth: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

export const isFullBleedPath = (pathname: string): boolean =>
  pathname.startsWith('/studio/projects/');

const Layout: FC = () => {
  const fullBleed = isFullBleedPath(useLocation().pathname);

  return (
    <div css={[shellStyles, fullBleed && fullBleedShellStyles]}>
      <Header />
      <main css={[mainStyles, fullBleed && fullBleedMainStyles]}>
        {fullBleed ? null : <Breadcrumb />}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
