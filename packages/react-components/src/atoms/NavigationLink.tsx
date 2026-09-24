/** @jsxImportSource @emotion/react */
import { css, keyframes, Theme } from '@emotion/react';
import { PropsWithChildren } from 'react';
import { NavLink, useLocation } from 'react-router';
import { activePrimaryStyles } from '../button';
import { colour } from '../colors';
import { crossQuery } from '../layout';
import { useBlockedClick } from '../navigation';
import { lineHeight, rem } from '../pixels';
import { useHasRouter } from '../routing';
import { isInternalLink } from '../utils';
import RailTooltip from './RailTooltip';

const styles = css({
  display: 'block',
  color: 'unset',
  cursor: 'pointer',
  padding: rem(16),
  stroke: colour.foreground.tertiary,
  svg: {
    stroke: colour.foreground.primary,
  },
  textDecoration: 'none',
  outline: 'none',
  borderRadius: rem(6),
  transition: 'background-color 100ms ease-in-out, color 100ms ease-in-out',
  ':hover, :focus': {
    backgroundColor: colour.background.tertiary,
  },
});

const textStyles = css({
  margin: 0,
  display: 'flex',
  alignItems: 'center',
});
const iconStyles = css({
  display: 'inline-block',
  width: rem(lineHeight),
  height: rem(lineHeight),
  // 16px gap between icon and label when expanded (per design).
  paddingRight: rem(16),
});
const collapsedIconStyles = css({
  [crossQuery]: {
    paddingRight: 0,
  },
});
// Suppresses the browser's native <title> tooltip so only the styled one shows.
const iconNoTitleStyles = css({
  [crossQuery]: {
    svg: { pointerEvents: 'none' },
  },
});

const collapsedLabelStyles = css({
  [crossQuery]: {
    display: 'none',
  },
});
const labelFadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const labelFadeInStyles = css({
  [crossQuery]: {
    animation: `${labelFadeIn} 150ms ease-in backwards`,
  },
});

const disableStyles = css({
  opacity: 0.3,
  pointerEvents: 'none',
});

const squareBorderStyles = css({
  borderRadius: 'unset',
});

type NavigationLinkProps = NavigationProps & {
  readonly icon?: JSX.Element;
  readonly collapsed?: boolean;
  // Hidden while collapsed or animating open, so it can't wrap in a narrow rail.
  readonly labelsHidden?: boolean;
  readonly fadeInLabel?: boolean;
} & PropsWithChildren;
const NavigationLink: React.FC<NavigationLinkProps> = ({
  icon,
  children,
  collapsed = false,
  labelsHidden = collapsed,
  fadeInLabel = false,
  ...props
}) =>
  labelsHidden ? (
    <Navigation {...props}>
      <RailTooltip label={children} enabled={collapsed}>
        <p css={textStyles}>
          {icon && (
            <span css={[iconStyles, collapsedIconStyles, iconNoTitleStyles]}>
              {icon}
            </span>
          )}
          <span css={collapsedLabelStyles}>{children}</span>
        </p>
      </RailTooltip>
    </Navigation>
  ) : (
    <Navigation {...props}>
      <p css={textStyles}>
        {icon && <span css={iconStyles}>{icon}</span>}
        {fadeInLabel ? (
          <span css={labelFadeInStyles}>{children}</span>
        ) : (
          children
        )}
      </p>
    </Navigation>
  );

interface NavigationProps {
  readonly href: string;
  readonly enabled?: boolean;
  readonly squareBorder?: boolean;
}
export const Navigation: React.FC<NavigationProps & PropsWithChildren> = ({
  href,
  children,
  enabled = true,
  squareBorder,
}) => {
  const blockedClick = useBlockedClick();
  const [internal, url] = isInternalLink(href);
  const location = useLocation();

  if (useHasRouter() && internal) {
    // Use prefix matching to highlight parent sections when viewing subsections
    // e.g., /network should be highlighted when at /network/interest-groups
    const linkPath = url.split('#')[0];
    const isActive =
      linkPath &&
      (location.pathname === linkPath ||
        location.pathname.startsWith(`${linkPath}/`));

    return (
      <NavLink
        to={url}
        style={{ textDecoration: 'none', color: 'unset' }}
        className={enabled && isActive ? 'active' : undefined}
        onClick={blockedClick}
      >
        <div
          css={({ colors, components }: Theme) => [
            styles,
            squareBorder && squareBorderStyles,
            enabled && isActive && activePrimaryStyles(colors),
            !enabled && disableStyles,
            components?.NavigationLink?.styles,
          ]}
        >
          {children}
        </div>
      </NavLink>
    );
  }
  const active =
    new URL(href, window.location.href).pathname === window.location.pathname;

  return (
    <a
      href={url}
      className={active ? 'active' : undefined}
      css={({ colors, components }: Theme) => [
        styles,
        squareBorder && squareBorderStyles,
        active && activePrimaryStyles(colors),
        !enabled && disableStyles,
        components?.NavigationLink?.styles,
      ]}
    >
      {children}
    </a>
  );
};

export default NavigationLink;
