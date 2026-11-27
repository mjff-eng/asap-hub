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

import { casSidenav } from '../cas-layout';
import { rem, remUnit, lineHeight } from '../pixels';
import { NavigationLink } from '../atoms';
import RailTooltip from '../atoms/RailTooltip';
import { colour } from '../colors';
import { mediaFrom, menuTransitionMs } from '../layout';
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

const railPadding = 16;
const railItemPadding = 12;
const railItemGap = 8;
const collapsedRailPadding =
  (casSidenav.closed - railItemPadding * 2 - lineHeight) / 2;
const collapsedItemWidth = casSidenav.closed - collapsedRailPadding * 2;
const railPaddingTransition = `padding ${menuTransitionMs}ms ease`;

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  boxSizing: 'border-box',
  padding: rem(16),
  li: {
    marginBottom: '3px',
  },
  [mediaFrom.laptop]: {
    paddingTop: remUnit(railPadding),
    paddingLeft: remUnit(railPadding),
    paddingRight: remUnit(railPadding),
    transition: railPaddingTransition,
    li: {
      marginBottom: remUnit(railItemGap),
    },
    'li > a > div': {
      padding: remUnit(railItemPadding),
    },
  },
});
const collapsedRailPaddingStyles = css({
  [mediaFrom.laptop]: {
    paddingLeft: remUnit(collapsedRailPadding),
    paddingRight: remUnit(collapsedRailPadding),
  },
});
// Fixed width so the item doesn't stretch when the rail widens for a scrollbar.
const collapsedListStyles = css({
  [mediaFrom.laptop]: {
    'li > a': {
      display: 'block',
      width: remUnit(collapsedItemWidth),
    },
  },
});

const toggleContainerStyles = css({
  display: 'none',
  [mediaFrom.laptop]: {
    display: 'block',
    padding: `0 ${remUnit(railPadding)}`,
    transition: railPaddingTransition,
  },
});
const dividerStyles = css({
  border: 'none',
  borderTop: `1px solid ${colour.border.tertiary}`,
  width: rem(225),
  maxWidth: '100%',
  margin: `${rem(12)} auto`,
});
// Aligned under the icons rather than centred.
const collapsedDividerStyles = css({
  width: rem(24),
  marginLeft: remUnit(railItemPadding),
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
  [mediaFrom.laptop]: {
    padding: remUnit(railItemPadding),
  },
});
const collapsedToggleButtonStyles = css({
  [mediaFrom.laptop]: {
    width: remUnit(collapsedItemWidth),
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
  [mediaFrom.laptop]: {
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
  [mediaFrom.laptop]: {
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
      <ul
        css={[
          listStyles,
          collapsed && collapsedRailPaddingStyles,
          railSettled && collapsedListStyles,
        ]}
      >
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
        <div
          css={[toggleContainerStyles, collapsed && collapsedRailPaddingStyles]}
        >
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
