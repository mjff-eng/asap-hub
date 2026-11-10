/** @jsxImportSource @emotion/react */
import { ComponentType, ReactNode } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router';
import { css, Theme } from '@emotion/react';

import { useBlockedClick } from '../navigation';
import { rem } from '../pixels';
import { colour } from '../colors';
import IconProps from '../icons/props';
import { tabStyles, tabActiveStyles } from './tab-styles';

const iconStyles = css({
  display: 'inline-grid',
  verticalAlign: 'middle',
  paddingRight: rem(6),
});

const getStyles = (active: boolean) => (theme: Theme) => [
  tabStyles,
  theme.components?.TabLink?.styles,
  active && tabActiveStyles,
];

// Prefix match, so /analytics/productivity also matches /analytics/productivity/user.
const isActivePath = (href: string, pathname: string): boolean => {
  const linkPath = new URL(href, window.location.href).pathname;
  return pathname === linkPath || pathname.startsWith(`${linkPath}/`);
};

interface TabLinkProps {
  readonly href: string;
  readonly Icon?: ComponentType<IconProps>;
  readonly children: ReactNode;
}

const TabLinkContent: React.FC<
  Pick<TabLinkProps, 'Icon' | 'children'> & { active: boolean }
> = ({ active, Icon, children }) => (
  <span>
    {Icon && (
      <span css={iconStyles}>
        <Icon color={active ? colour.neutral[900] : colour.neutral[600]} />
      </span>
    )}
    {children}
  </span>
);

const RouterTabLink: React.FC<TabLinkProps> = ({ href, children, Icon }) => {
  const blockedClick = useBlockedClick();
  const active = isActivePath(href, useLocation().pathname);
  return (
    <Link
      to={href}
      css={getStyles(active)}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={blockedClick}
    >
      <TabLinkContent active={active} Icon={Icon}>
        {children}
      </TabLinkContent>
    </Link>
  );
};

const PlainTabLink: React.FC<TabLinkProps> = ({ href, children, Icon }) => {
  const active = isActivePath(href, window.location.pathname);
  return (
    <a
      href={href}
      css={getStyles(active)}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
    >
      <TabLinkContent active={active} Icon={Icon}>
        {children}
      </TabLinkContent>
    </a>
  );
};

const TabLink: React.FC<TabLinkProps> = (props) =>
  useInRouterContext() ? (
    <RouterTabLink {...props} />
  ) : (
    <PlainTabLink {...props} />
  );

export default TabLink;
