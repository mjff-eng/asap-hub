import { ReactNode } from 'react';
import { css } from '@emotion/react';
import { rem, lineHeight } from '../pixels';
import { tabStyles, tabActiveStyles } from './tab-styles';

const styles = css({
  appearance: 'none',
  border: 'none',
  background: 'none',
  margin: 0,
  font: 'inherit',
  lineHeight: rem(lineHeight),

  cursor: 'pointer',
});

const activeStyles = css({
  cursor: 'default',
});

const disabledStyles = css({
  cursor: 'unset',
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
    type="button"
    onClick={onClick}
    disabled={disabled}
    css={[
      styles,
      tabStyles,
      active && tabActiveStyles,
      active && activeStyles,
      disabled && disabledStyles,
    ]}
  >
    <span>{children}</span>
  </button>
);

export default TabButton;
