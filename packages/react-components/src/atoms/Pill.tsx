/** @jsxImportSource @emotion/react */
import { css, CSSObject } from '@emotion/react';
import { Ellipsis } from '.';
import * as colors from '../colors';
import { lineHeight, rem } from '../pixels';

const borderWidth = 1;
const styles = css({
  display: 'flex',
  alignItems: 'center',
  width: 'fit-content',
  boxSizing: 'border-box',
  height: lineHeight,
  margin: `${rem(12)} 0`,
  padding: `0 ${rem(8)}`,
  borderStyle: 'solid',
  borderWidth: `${borderWidth}px`,
  borderRadius: rem(6),
});

const modernStyles = css({
  borderRadius: rem(24),
  height: 'fit-content',
  margin: 0,
});

export type AccentVariant =
  | 'default'
  | 'error'
  | 'green'
  | 'info'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'gray'
  | 'blue';

export const accents = (isLink: boolean): Record<AccentVariant, CSSObject> => ({
  default: {
    backgroundColor: 'transparent',
    borderColor: colors.colour.border.tertiary,
    color: colors.colour.foreground.tertiary,
  },
  green: {
    backgroundColor: colors.colour.background.success,
    color: colors.colour.foreground.success,
    borderColor: colors.colour.border.success,
  },
  warning: {
    backgroundColor: colors.colour.background.warning,
    color: colors.colour.foreground.warning,
    borderColor: colors.colour.border.warning,
  },
  info: {
    backgroundColor: colors.colour.background.info,
    color: colors.colour.foreground.info,
    borderColor: colors.colour.border.info,
  },
  neutral: {
    backgroundColor: colors.colour.background.tertiary,
    color: colors.colour.foreground.quaternary,
    borderColor: colors.colour.neutral[400],
  },
  error: {
    backgroundColor: colors.colour.background.error,
    color: colors.colour.foreground.error,
    borderColor: colors.colour.border.error,
  },
  success: {
    backgroundColor: colors.colour.background.success,
    color: colors.colour.foreground.success,
    borderColor: colors.colour.border.success,
  },
  gray: {
    color: colors.colour.foreground.tertiary,
    backgroundColor: colors.colour.background.tertiary,
    border: 'transparent',
  },
  blue: {
    color: colors.colour.foreground.info,
    backgroundColor: colors.colour.background.info,
    border: 'transparent',
    ...(isLink
      ? {
          ':hover': {
            color: colors.colour.utilitarian.blue[700],
            backgroundColor: colors.colour.utilitarian.blue[200],
          },
        }
      : {}),
  },
});

type PillProps = {
  readonly children?: React.ReactNode;
  readonly small?: boolean;
  readonly accent?: AccentVariant;
  readonly numberOfLines?: number;
  readonly isLink?: boolean;
  readonly noMargin?: boolean;
};

const Pill: React.FC<PillProps> = ({
  children,
  small = true,
  accent = 'default',
  numberOfLines = 1,
  isLink = false,
  noMargin = false,
}) => (
  <span
    css={({ components }) => [
      styles,
      components?.Pill?.styles,
      accents(isLink)[accent],
      ...(accent === 'gray' || accent === 'blue' ? [modernStyles] : []),
      noMargin ? { margin: 0 } : {},
    ]}
  >
    <Ellipsis numberOfLines={numberOfLines}>
      {small ? <small>{children}</small> : children}
    </Ellipsis>
  </span>
);

export default Pill;
