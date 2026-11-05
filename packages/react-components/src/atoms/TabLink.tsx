/** @jsxImportSource @emotion/react */
import { ComponentType, ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
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

// useLocation throws outside a router context (tests, Storybook).
const useCurrentPathname = (): string | null => {
  try {
    return useLocation().pathname;
  } catch {
    return null;
  }
};

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
const TabLink: React.FC<TabLinkProps> = ({ href, children, Icon }) => {
  const blockedClick = useBlockedClick();
  const routerPathname = useCurrentPathname();
  const hasRouter = routerPathname !== null;
  const active = isActivePath(href, routerPathname ?? window.location.pathname);

  const inner = (
    <span>
      {Icon && (
        <span css={iconStyles}>
          <Icon color={active ? colour.neutral[900] : colour.neutral[600]} />
        </span>
      )}
      {children}
    </span>
  );

  if (hasRouter) {
    return (
      <Link
        to={href}
        css={getStyles(active)}
        className={active ? 'active' : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={blockedClick}
      >
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={href}
      css={getStyles(active)}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
    >
      {inner}
    </a>
  );
};

export default TabLink;
