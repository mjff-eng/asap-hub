import { css } from '@emotion/react';

import { Header } from '../molecules';
import { neutral500 } from '../colors';

const styles = css({
  height: '100%',

  display: 'grid',
  gridTemplateRows: 'max-content auto',
  justifyItems: 'start',
});
const contentStyles = css({
  justifySelf: 'stretch',

  borderTop: `1px solid ${neutral500.rgb}`,

  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  overflowY: 'auto',
});

interface BasicLayoutProps {
  children: React.ReactNode;
  logoHref?: string;
}
const BasicLayout: React.FC<BasicLayoutProps> = ({ children, logoHref }) => (
  <article css={styles}>
    <Header logoHref={logoHref} logoAlignment="left" />
    <main css={contentStyles}>{children}</main>
  </article>
);

export default BasicLayout;
