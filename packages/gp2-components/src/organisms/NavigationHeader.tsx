import {
  ceruleanFernGradientStyles,
  crossQuery,
  drawerQuery,
  MenuButton,
  pixels,
  noop,
  NavigationLink,
  tagSearchIcon,
  neutral500,
} from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { HeaderLogo } from '../molecules';
import MainNavigation from './MainNavigation';
import UserNavigation from './UserNavigation';

const { rem } = pixels;
const menuButtonWidth = 72;

const mainContainerStyles = css({
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
  [drawerQuery]: {
    margin: 0,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: rem(24),
    borderBottom: `1px solid ${neutral500.rgb}`,
  },
});

const menuButtonStyles = css({
  [crossQuery]: {
    display: 'none',
  },

  width: `${menuButtonWidth}px`,
  boxSizing: 'content-box',
  borderRight: `1px solid ${neutral500.rgb}`,

  display: 'flex',
  justifyContent: 'stretch',
  alignItems: 'stretch',
});

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

const searchButtonAreaStyles = css({
  gridArea: 'search-button',
  boxSizing: 'border-box',
  borderBottom: `1px solid ${neutral500.rgb}`,
  borderLeft: `1px solid ${neutral500.rgb}`,
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
      <div css={searchButtonAreaStyles}>
        <NavigationLink squareBorder href={gp2Routing.tags({}).$}>
          <span css={searchIconStyles}>{tagSearchIcon}</span>
        </NavigationLink>
      </div>
    </div>
    <div css={[bottomBorderStyles, desktopNavigationStyles]} />
  </header>
);
export default NavigationHeader;
