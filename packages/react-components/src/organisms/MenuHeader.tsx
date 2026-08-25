import { css } from '@emotion/react';

import { neutral500 } from '../colors';
import { crossQuery } from '../layout';
import { Header, MenuButton } from '../molecules';
import { rem } from '../pixels';
import { noop } from '../utils';

const menuButtonWidth = 72;

export const styles = css({
  display: 'flex',
  // On desktop the logo sits at the left of the full-width top bar.
  [crossQuery]: {
    alignItems: 'center',
    // Override the Header's internal centering so the logo aligns left.
    '& header': {
      justifyContent: 'flex-start',
      flexGrow: 0,
      paddingLeft: rem(24),
    },
  },
});

export const menuButtonStyles = css({
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

interface MenuHeaderProps {
  enabled?: boolean;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
}
const MenuHeader: React.FC<MenuHeaderProps> = ({
  enabled = true,
  menuOpen = false,
  onToggleMenu = noop,
}) => (
  <div css={styles} data-testid="menu-header-testid">
    <div css={[menuButtonStyles]}>
      <MenuButton open={menuOpen} onClick={() => onToggleMenu()} />
    </div>
    <Header enabled={enabled} logoAlignment="center" />
  </div>
);
export default MenuHeader;
