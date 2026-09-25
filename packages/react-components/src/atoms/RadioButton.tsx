import { css } from '@emotion/react';

import { rem } from '../pixels';
import { colour } from '../colors';
import { noop } from '../utils';

const styles = css({
  boxSizing: 'border-box',
  width: rem(24),
  height: rem(24),
  marginRight: rem(12),

  appearance: 'none',
  outline: 'none',
  // outer ring
  borderRadius: '12px',
  borderStyle: 'solid',
  borderWidth: rem(1),
  borderColor: colour.border.tertiary,
  // inner circle
  padding: rem(6),
  backgroundClip: 'content-box',
  backgroundColor: colour.background.primary,

  ':disabled': {
    borderColor: colour.border.disabled,
    backgroundColor: colour.background.disabled,
    ':hover, :focus': {
      borderColor: colour.border.disabled,
    },
  },

  ':hover, :focus': {
    borderColor: colour.border.brand,
  },
  ':checked': {
    borderColor: colour.background['brand-inverse'],
    backgroundColor: colour.background['brand-inverse'],

    ':hover, :focus': {
      borderColor: colour.background['hover-brand-inverse'],
      backgroundColor: colour.background['hover-brand-inverse'],
    },
  },
});

interface RadioButtonProps {
  readonly id?: string;
  readonly groupName: string;

  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
}
const RadioButton: React.FC<RadioButtonProps> = ({
  id,
  groupName,

  checked = false,
  disabled = false,
  onSelect = noop,
}) => (
  <input
    type="radio"
    id={id}
    name={groupName}
    checked={checked}
    onChange={() => !disabled && onSelect()}
    css={styles}
    disabled={disabled}
  />
);

export default RadioButton;
