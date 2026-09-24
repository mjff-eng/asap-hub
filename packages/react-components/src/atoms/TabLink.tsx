/** @jsxImportSource @emotion/react */
import { ComponentType, ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { css, Theme } from '@emotion/react';

import { layoutStyles } from '../text';
import { useBlockedClick } from '../navigation';
import { rem } from '../pixels';
import { colour, colorFromHex } from '../colors';
import { useHasRouter } from '../routing';
import IconProps from '../icons/props';

const borderBottomWidth = 4;

const styles = css({
  display: 'inline-block',
  paddingBottom: rem(16 + borderBottomWidth),

  color: colour.foreground.tertiary,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
});
const activeStyles = ({
  colors: { primary500 = colorFromHex(colour.brand.crn[500]) } = {},
}: Theme) =>
  css({
    paddingBottom: rem(16 + borderBottomWidth),
    borderBottom: `solid ${rem(borderBottomWidth)} ${primary500.rgba}`,

    color: colour.foreground.primary,
    fontWeight: 'bold',
  });

const iconStyles = css({
  display: 'inline-grid',
  verticalAlign: 'middle',
  paddingRight: rem(6),
});

/**
 * Check if the current path matches the link path using prefix matching.
 * e.g., /analytics/productivity matches /analytics/productivity/user
 * Returns null when there's no router context.
 */
const useIsActivePrefix = (href: string): boolean | null => {
  const hasRouter = useHasRouter();

  // useLocation is called unconditionally to satisfy rules of hooks.
  // When there's no router context, it throws an error which we catch.
  // This pattern is safe because hooks are always called in the same order.
  let locationPathname: string | null = null;
  try {
    const location = useLocation();
    locationPathname = location.pathname;
  } catch {
    // No router context available - fallback handled below
  }

  if (!hasRouter || locationPathname === null) {
    return null;
  }

  const linkPath = new URL(href, window.location.href).pathname;
  return (
    locationPathname === linkPath || locationPathname.startsWith(`${linkPath}/`)
  );
};

interface TabLinkProps {
  readonly href: string;
  readonly Icon?: ComponentType<IconProps>;
  readonly children: ReactNode;
}
const TabLink: React.FC<TabLinkProps> = ({ href, children, Icon }) => {
  const blockedClick = useBlockedClick();
  const isActivePrefix = useIsActivePrefix(href);

  // Determine if we have a router context based on whether the hook returned a result
  const hasRouter = isActivePrefix !== null;

  // Fallback for non-router context: exact match only
  const active = hasRouter
    ? isActivePrefix
    : new URL(href, window.location.href).pathname === window.location.pathname;

  // Create inner content with properly colored icon
  const createInner = (isActive: boolean) => (
    <p
      css={({ components }: Theme) => [
        layoutStyles,
        css({ margin: 0 }),
        components?.TabLink?.layoutStyles,
      ]}
    >
      {Icon && (
        <span css={iconStyles}>
          <Icon color={isActive ? colour.neutral[900] : colour.neutral[600]} />
        </span>
      )}
      {children}
    </p>
  );

  if (hasRouter) {
    // Use Link instead of NavLink to have full control over active state with prefix matching
    return (
      <Link
        to={href}
        style={{ textDecoration: 'none', color: 'unset' }}
        className={active ? 'active' : undefined}
        onClick={blockedClick}
      >
        <div
          css={(theme: Theme) => [
            styles,
            theme.components?.TabLink?.styles,
            active && activeStyles(theme),
          ]}
        >
          {createInner(active)}
        </div>
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={active ? 'active' : undefined}
      css={(theme: Theme) => [
        styles,
        theme.components?.TabLink?.styles,
        active && activeStyles(theme),
      ]}
    >
      {createInner(active)}
    </a>
  );
};

export default TabLink;
