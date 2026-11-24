import {
  casHeader,
  mediaFrom,
  ceruleanFernGradientStyles,
  mediaBelow,
  MenuButton,
  pixels,
  noop,
  NavigationLink,
  tagSearchIcon,
  colour,
} from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { HeaderLogo } from '../molecules';
import { headerLinkStyles } from '../layout';
import MainNavigation from './MainNavigation';
import UserNavigation from './UserNavigation';

const { rem, remUnit } = pixels;
const menuButtonWidth = 72;

const mainContainerStyles = css({
  boxSizing: 'border-box',
  height: remUnit(casHeader.gp2.height),
  padding: 0,
  display: 'flex',
  flexDirection: 'row',
});

const navigationHeaderStyles = css({
  padding: 0,
  display: 'flex',
  flexGrow: 1,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: rem(72),
  margin: `0 ${rem(24)}`,
  [mediaBelow.laptop]: {
    margin: 0,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: rem(24),
  },
  // Mobile only: from tablet up the gradient bar is the line under the header.
  [mediaBelow.tablet]: {
    borderBottom: `1px solid ${colour.border.tertiary}`,
  },
});

const menuButtonStyles = css({
  [mediaFrom.laptop]: {
    display: 'none',
  },

  width: `${menuButtonWidth}px`,
  boxSizing: 'content-box',
  borderRight: `1px solid ${colour.border.tertiary}`,

  display: 'flex',
  justifyContent: 'stretch',
  alignItems: 'stretch',
});

const desktopNavigationStyles = css({
  [mediaBelow.laptop]: {
    display: 'none',
  },
});

// Shown from tablet up; the mobile frame has no gradient bar.
const bottomBorderStyles = css({
  display: 'none',
  height: remUnit(casHeader.gp2.accentBar),
  width: '100%',
  ...ceruleanFernGradientStyles,
  [mediaFrom.tablet]: {
    display: 'block',
  },
});

const searchButtonAreaStyles = css({
  gridArea: 'search-button',
  boxSizing: 'border-box',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  borderLeft: `1px solid ${colour.border.tertiary}`,
  display: 'flex',
  alignItems: 'center',
});
const searchIconStyles = css({
  width: rem(48),
  padding: `${rem(14)} 0`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
});

type NavigationHeaderProps = {
  menuShown: boolean;
  onToggleMenu: (menuOpen: boolean) => void;
} & ComponentProps<typeof UserNavigation>;
const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  menuShown,
  onToggleMenu = noop,
  ...userNavigationProps
}) => (
  <header>
    <div css={[mainContainerStyles]}>
      <div css={[navigationHeaderStyles]}>
        <div css={[menuButtonStyles]}>
          <MenuButton
            open={menuShown}
            onClick={() => onToggleMenu(!menuShown)}
          />
        </div>
        <HeaderLogo />
        <div css={desktopNavigationStyles}>
          <MainNavigation />
        </div>

        <div css={desktopNavigationStyles}>
          <UserNavigation {...userNavigationProps} />
        </div>
      </div>
      <div
        css={[
          searchButtonAreaStyles,
          headerLinkStyles,
          desktopNavigationStyles,
        ]}
      >
        <NavigationLink squareBorder href={gp2Routing.tags({}).$}>
          <span css={searchIconStyles}>{tagSearchIcon}</span>
        </NavigationLink>
      </div>
    </div>
    <div css={bottomBorderStyles} />
  </header>
);
export default NavigationHeader;
