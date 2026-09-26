import { css } from '@emotion/react';
import { renderToStaticMarkup } from 'react-dom/server';

import { rem } from '../pixels';
import { colour } from '../colors';
import { noop } from '../utils';
import { tickIcon } from '../icons';

const checkboxStyles = css({
  flexShrink: 0,
  boxSizing: 'border-box',
  width: rem(24),
  height: rem(24),
  marginRight: rem(12),
  marginTop: rem(12),
  marginBottom: rem(12),

  appearance: 'none',
  outline: 'none',
  borderRadius: 0,
  borderStyle: 'solid',
  borderWidth: rem(1),
  borderColor: colour.border.tertiary,

  ':enabled:hover, :enabled:focus': {
    borderColor: colour.neutral[600],
  },

  ':checked': {
    borderColor: colour.background['brand-inverse'],
    backgroundColor: colour.background['brand-inverse'],
    '::before': {
      content: `url(data:image/svg+xml;utf8,${encodeURIComponent(
        renderToStaticMarkup(tickIcon),
      )})`,
      display: 'flex',
      justifyContent: 'center',
      lineHeight: rem(24),
    },

    ':disabled': {
      borderColor: colour.border.disabled,
      backgroundColor: colour.background.disabled,
    },
    ':hover, :focus': {
      borderColor: colour.background['hover-brand-inverse'],
      backgroundColor: colour.background['hover-brand-inverse'],

      ':disabled': {
        borderColor: colour.border.disabled,
        backgroundColor: colour.background.disabled,
      },
    },
  },
});

interface CheckboxProps {
  readonly id?: string;
  readonly groupName: string;
  readonly enabled?: boolean;
  readonly checked?: boolean;
  readonly onSelect?: () => void;
}
const Checkbox: React.FC<CheckboxProps> = ({
  id,
  groupName,
  enabled = true,
  checked = false,
  onSelect = noop,
}) => (
  <input
    id={id}
    name={groupName}
    checked={checked}
    disabled={!enabled}
    onChange={() => onSelect()}
    css={checkboxStyles}
    type="checkbox"
  />
);

export default Checkbox;
