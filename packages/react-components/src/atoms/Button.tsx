/** @jsxImportSource @emotion/react */
import { css, SerializedStyles } from '@emotion/react';
import { InputHTMLAttributes } from 'react';

import {
  buttonLoadingContentStyles,
  getButtonChildren,
  getButtonStyles,
} from '../button';
import { neutral500 } from '../colors';
import { defaultThemeVariant, ThemeVariant } from '../theme';
import { noop } from '../utils';
import { getLinkColors, styles as linkStyles } from './Link';
import Spinner from './Spinner';

const buttonAsLinkStyles = css({
  display: 'inline',
  '> svg': {
    minHeight: '1em',
    height: '100%',
  },

  padding: 0,
  border: 'none',
  outline: 'none',
  cursor: 'pointer',
  color: 'unset',
  backgroundColor: 'unset',
});

interface NormalButtonProps {
  readonly enabled?: boolean;
  readonly primary?: boolean;
  readonly warning?: boolean;
  readonly active?: boolean;
  readonly small?: boolean;
  readonly linkStyle?: undefined;
  readonly theme?: undefined;
  readonly noMargin?: boolean;
  readonly fullWidth?: boolean;
}
interface LinkStyleButtonProps {
  readonly linkStyle: true;
  // Only the link colours are unaffected by `enabled` — the button itself is
  // still rendered `disabled`, which link-styled actions inside a disabled
  // surface need.
  readonly enabled?: boolean;
  readonly primary?: undefined;
  readonly warning?: boolean;
  readonly active?: undefined;
  readonly small?: undefined;
  readonly theme?: ThemeVariant;
  readonly noMargin?: undefined;
  readonly fullWidth?: undefined;
}
type ButtonProps = (NormalButtonProps | LinkStyleButtonProps) & {
  readonly preventDefault?: boolean;
  readonly submit?: boolean;
  readonly loading?: boolean;
  readonly children?: React.ReactNode;
  readonly overrideStyles?: SerializedStyles;
  readonly onClick?: () => void;
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'id'>;
const Button: React.FC<ButtonProps> = ({
  enabled = true,
  primary = false,
  warning = false,
  small = false,
  linkStyle = false,
  active = false,
  fullWidth = false,
  preventDefault = true,
  noMargin,
  theme = defaultThemeVariant,
  submit = primary,
  loading = false,
  id,
  children,
  onClick = noop,
  overrideStyles,
  ...props
}) => (
  <button
    id={id}
    type={submit ? 'submit' : 'button'}
    disabled={!enabled}
    onClick={(event) => {
      onClick();
      if (preventDefault) {
        event.preventDefault();
      }
    }}
    css={({ colors }) => [
      linkStyle
        ? [linkStyles, buttonAsLinkStyles, getLinkColors(colors, theme)]
        : getButtonStyles({
            primary,
            warning,
            small,
            enabled,
            active,
            children,
            noMargin,
            colors,
            fullWidth,
          }),
      overrideStyles,
    ]}
    {...props}
  >
    {loading ? (
      <span css={buttonLoadingContentStyles}>
        <Spinner
          size={small ? 18 : 24}
          thickness={2}
          color="currentColor"
          trackColor={neutral500.rgb}
        />
        {getButtonChildren(children)}
      </span>
    ) : (
      getButtonChildren(children)
    )}
  </button>
);

export default Button;
