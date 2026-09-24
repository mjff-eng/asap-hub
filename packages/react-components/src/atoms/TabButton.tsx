import { ReactNode } from 'react';
import { css } from '@emotion/react';
import { layoutStyles } from '../text';
import { rem } from '../pixels';
import { charcoal, info500, colour, neutral900 } from '../colors';

const styles = css({
  display: 'inline-block',
  paddingTop: rem(12),
  paddingBottom: rem(12),

  color: neutral900.rgb,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
});

const activeStyles = css({
  paddingBottom: rem(12 - 4),
  borderBottom: `solid ${rem(4)} ${colour.brand.crn[500]}`,

  color: charcoal.rgb,
  cursor: 'default',
  fontWeight: 'bold',
  "[data-app='gp2'] &": {
    borderBottomColor: info500.rgb,
  },
});

const disabledStyles = css({
  cursor: 'unset',
});

const resetButtonStyles = css({
  appearance: 'none',
  border: 'none',
  background: 'none',

  padding: 0,
  margin: 0,
});
interface TabButtonProps {
  readonly children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}
const TabButton: React.FC<TabButtonProps> = ({
  children,
  active,
  disabled,
  onClick,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    css={[
      resetButtonStyles,
      styles,
      active && activeStyles,
      disabled && disabledStyles,
    ]}
  >
    <p css={layoutStyles}>{children}</p>
  </button>
);

export default TabButton;
