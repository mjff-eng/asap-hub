import { css } from '@emotion/react';
import { colour } from '../colors';
import { noop } from '../utils';

const toggleStyles = (uncheckedColor: 'default' | 'error') =>
  css({
    position: 'relative',
    width: '40px',
    height: '20px',
    flexShrink: 0,
    appearance: 'none',
    backgroundColor:
      uncheckedColor === 'error'
        ? colour.background['error-inverse']
        : colour.neutral[100],
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
      backgroundColor: colour.background['brand-inverse'],
      '::before': {
        transform: 'translateX(20px)',
      },
    },

    ':disabled': {
      backgroundColor: colour.neutral[400],
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
    css={toggleStyles(uncheckedColor)}
  />
);

export default Switch;
