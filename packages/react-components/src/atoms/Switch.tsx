import { css, Theme } from '@emotion/react';
import { error500, neutral800, colour, neutral500 } from '../colors';
import { noop } from '../utils';

const toggleStyles = (
  uncheckedColor: 'default' | 'error',
  { primary500 = colour.brand.crn[500] }: Theme['colors'] = {},
) =>
  css({
    position: 'relative',
    width: '40px',
    height: '20px',
    flexShrink: 0,
    appearance: 'none',
    backgroundColor: uncheckedColor === 'error' ? error500.rgb : neutral500.rgb,
    borderRadius: '10px',
    outline: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '::before': {
      content: '""',
      position: 'absolute',
      top: '2px',
      left: '2px',
      width: '16px',
      height: '16px',
      backgroundColor: '#fff',
      borderRadius: '50%',
      transition: 'transform 0.2s',
    },

    ':checked': {
      backgroundColor: primary500.rgba,
      '::before': {
        transform: 'translateX(20px)',
      },
    },

    ':disabled': {
      backgroundColor: neutral800.rgb,
      cursor: 'not-allowed',
      '::before': {
        backgroundColor: '#fff',
      },
    },
  });

export type SwitchProps = {
  readonly id?: string;
  readonly enabled?: boolean;
  readonly checked?: boolean;
  readonly onClick?: () => void;
  readonly ariaLabel?: string;
  readonly uncheckedColor?: 'default' | 'error';
};

const Switch: React.FC<SwitchProps> = ({
  id,
  enabled = true,
  checked = false,
  onClick = noop,
  ariaLabel = 'Toggle switch',
  uncheckedColor = 'default',
}) => (
  <input
    id={id}
    aria-checked={checked}
    aria-label={ariaLabel}
    type="checkbox"
    checked={checked}
    disabled={!enabled}
    onChange={onClick}
    css={({ colors }) => toggleStyles(uncheckedColor, colors)}
  />
);

export default Switch;
