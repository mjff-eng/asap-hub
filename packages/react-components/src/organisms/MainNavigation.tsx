import { css, keyframes } from '@emotion/react';
import {
  about,
  discover,
  network,
  projects,
  sharedResearch,
  news,
  events,
  analytics,
} from '@asap-hub/routing';

import {
  rem,
  vminLinearCalc,
  largeDesktopScreen,
  mobileScreen,
  lineHeight,
} from '../pixels';
import { NavigationLink } from '../atoms';
import RailTooltip from '../atoms/RailTooltip';
import { colour } from '../colors';
import { crossQuery, menuTransitionMs } from '../layout';
import {
  networkIcon,
  discoverIcon,
  aboutIcon,
  analyticsIcon,
  LibraryIcon,
  newsIcon,
  calendarIcon,
  ProjectIcon,
  collapseMenuIcon,
} from '../icons';

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  boxSizing: 'border-box',
  padding: rem(12),
  paddingTop: `max(${rem(12)}, ${vminLinearCalc(
    mobileScreen,
    18,
    largeDesktopScreen,
    12,
    'px',
  )})`,
  // 8px horizontal on desktop keeps the icon at a constant 8 + 16 = 24px from
  // the rail edge in every state, and makes each collapsed item a 56px box.
  [crossQuery]: {
    paddingLeft: rem(8),
    paddingRight: rem(8),
  },
  li: {
    marginBottom: '3px',
  },
});
// Fixed 56px so the item doesn't stretch when the rail widens for a scrollbar.
const collapsedListStyles = css({
  [crossQuery]: {
    'li > a': {
      display: 'block',
      width: rem(56),
    },
  },
});

const toggleContainerStyles = css({
  display: 'none',
  [crossQuery]: {
    display: 'block',
    padding: `0 ${rem(8)}`,
  },
});
const dividerStyles = css({
  border: 'none',
  borderTop: `1px solid ${colour.border.tertiary}`,
  width: rem(225),
  maxWidth: '100%',
  margin: `${rem(12)} auto`,
});
// 16px left aligns it under the left-anchored icons rather than centring.
const collapsedDividerStyles = css({
  width: rem(24),
  marginLeft: rem(16),
  marginRight: 'auto',
});
const toggleButtonStyles = css({
  boxSizing: 'border-box',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: rem(16),
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: colour.foreground.primary,
  font: 'inherit',
  textAlign: 'left',
  borderRadius: rem(6),
  transition: 'background-color 100ms ease-in-out',
  // :focus-visible, not :focus, so a click doesn't leave the background stuck.
  ':hover, :focus-visible': {
    backgroundColor: colour.background.tertiary,
  },
});
const collapsedToggleButtonStyles = css({
  [crossQuery]: {
    width: rem(56),
  },
});
const toggleButtonDisabledStyles = css({
  opacity: 0.3,
  pointerEvents: 'none',
});
const toggleIconStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(lineHeight),
  height: rem(lineHeight),
  paddingRight: rem(16),
  svg: {
    transition: `transform ${menuTransitionMs}ms ease`,
  },
});
const collapsedToggleIconStyles = css({
  paddingRight: 0,
});
// The expand icon is the collapse icon rotated 180 degrees.
const rotatedToggleIconStyles = css({
  svg: {
    transform: 'rotate(180deg)',
  },
});
// Suppresses the browser's native <title> tooltip so only the styled one shows.
const toggleIconNoTitleStyles = css({
  [crossQuery]: {
    svg: { pointerEvents: 'none' },
  },
});
const labelStyles = css({
  whiteSpace: 'nowrap',
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

export interface MainNavigationProps {
  readonly userOnboarded: boolean;
  readonly canViewAnalytics?: boolean;
  readonly collapsed?: boolean;
  readonly animating?: boolean;
  readonly onToggleCollapse?: () => void;
}

const MainNavigation: React.FC<MainNavigationProps> = ({
  userOnboarded,
  canViewAnalytics = false,
  collapsed = false,
  animating = false,
  onToggleCollapse,
}) => {
  const labelsHidden = collapsed || animating;
  const fadeInLabel = !collapsed && !animating;
  // The tooltip only arms in the steady collapsed rail, not mid-animation.
  const railSettled = collapsed && !animating;
  return (
    <nav>
      <ul css={[listStyles, railSettled && collapsedListStyles]}>
        <li>
          <NavigationLink
            href={network({}).$}
            icon={networkIcon}
            enabled={userOnboarded}
            collapsed={railSettled}
            labelsHidden={labelsHidden}
            fadeInLabel={fadeInLabel}
          >
            Network
          </NavigationLink>
        </li>
        <li>
          <NavigationLink
            href={projects({}).$}
            icon={<ProjectIcon />}
            enabled={userOnboarded}
            collapsed={railSettled}
            labelsHidden={labelsHidden}
            fadeInLabel={fadeInLabel}
          >
            Projects
          </NavigationLink>
        </li>
        <li>
          <NavigationLink
            href={sharedResearch({}).$}
            icon={<LibraryIcon />}
            enabled={userOnboarded}
            collapsed={railSettled}
            labelsHidden={labelsHidden}
            fadeInLabel={fadeInLabel}
          >
            Shared Research
          </NavigationLink>
        </li>
        <li>
          <NavigationLink
            href={events({}).$}
            icon={calendarIcon}
            enabled={userOnboarded}
            collapsed={railSettled}
            labelsHidden={labelsHidden}
            fadeInLabel={fadeInLabel}
          >
            Calendar &amp; Events
          </NavigationLink>
        </li>
        <li>
          <NavigationLink
            href={news({}).$}
            icon={newsIcon}
            enabled={userOnboarded}
            collapsed={railSettled}
            labelsHidden={labelsHidden}
            fadeInLabel={fadeInLabel}
          >
            News
          </NavigationLink>
        </li>
        <li>
          <NavigationLink
            href={discover({}).$}
            icon={discoverIcon}
            enabled={userOnboarded}
            collapsed={railSettled}
            labelsHidden={labelsHidden}
            fadeInLabel={fadeInLabel}
          >
            Guides &amp; Tutorials
          </NavigationLink>
        </li>
        <li>
          <NavigationLink
            href={about({}).$}
            icon={aboutIcon}
            enabled={userOnboarded}
            collapsed={railSettled}
            labelsHidden={labelsHidden}
            fadeInLabel={fadeInLabel}
          >
            About ASAP
          </NavigationLink>
        </li>
        {canViewAnalytics && (
          <li>
            <NavigationLink
              href={analytics({}).$}
              icon={analyticsIcon}
              enabled={userOnboarded}
              collapsed={railSettled}
              labelsHidden={labelsHidden}
              fadeInLabel={fadeInLabel}
            >
              Analytics
            </NavigationLink>
          </li>
        )}
      </ul>
      {onToggleCollapse && (
        <div css={toggleContainerStyles}>
          <hr css={[dividerStyles, collapsed && collapsedDividerStyles]} />
          <button
            type="button"
            css={[
              toggleButtonStyles,
              railSettled && collapsedToggleButtonStyles,
              !userOnboarded && toggleButtonDisabledStyles,
            ]}
            onClick={onToggleCollapse}
            disabled={!userOnboarded}
            aria-label={collapsed ? 'Expand' : 'Collapse Menu'}
            aria-expanded={!collapsed}
          >
            <RailTooltip label="Expand" enabled={railSettled}>
              <span
                css={[
                  toggleIconStyles,
                  labelsHidden && collapsedToggleIconStyles,
                  collapsed && rotatedToggleIconStyles,
                  toggleIconNoTitleStyles,
                ]}
              >
                {collapseMenuIcon}
              </span>
              {!labelsHidden && (
                <span css={[labelStyles, fadeInLabel && labelFadeInStyles]}>
                  Collapse Menu
                </span>
              )}
            </RailTooltip>
          </button>
        </div>
      )}
    </nav>
  );
};

export default MainNavigation;
