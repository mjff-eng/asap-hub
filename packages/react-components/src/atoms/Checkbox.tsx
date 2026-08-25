import { css, Theme } from '@emotion/react';
import { renderToStaticMarkup } from 'react-dom/server';

import { rem } from '../pixels';
import { colour, neutral900, neutral500 } from '../colors';
import { noop } from '../utils';
import { tickIcon } from '../icons';

const checkboxStyles = ({
  primary500 = colour.brand.crn[500],
  primary900 = colour.brand.crn[800],
}: Theme['colors'] = {}) =>
  css({
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
    borderColor: neutral500.rgb,

    ':enabled:hover, :enabled:focus': {
      borderColor: neutral900.rgb,
    },

    ':checked': {
      borderColor: primary500.rgba,
      backgroundColor: primary500.rgba,
      '::before': {
        content: `url(data:image/svg+xml;utf8,${encodeURIComponent(
          renderToStaticMarkup(tickIcon),
        )})`,
        display: 'flex',
        justifyContent: 'center',
        lineHeight: rem(24),
      },

      ':disabled': {
        borderColor: neutral500.rgba,
        backgroundColor: neutral500.rgba,
      },
      ':hover, :focus': {
        borderColor: primary900.rgba,
        backgroundColor: primary900.rgba,

        ':disabled': {
          borderColor: neutral500.rgba,
          backgroundColor: neutral500.rgba,
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
    css={({ colors }) => checkboxStyles(colors)}
    type="checkbox"
  />
);

export default Checkbox;
