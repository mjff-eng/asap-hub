/** @jsxImportSource @emotion/react */
import { css, CSSObject } from '@emotion/react';
import { Ellipsis } from '.';
import { colour } from '../colors';
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
    borderColor: colour.border.tertiary,
    color: colour.foreground.tertiary,
  },
  green: {
    backgroundColor: colour.background.success,
    color: colour.foreground.success,
    borderColor: colour.border.success,
  },
  warning: {
    backgroundColor: colour.background.warning,
    color: colour.foreground.warning,
    borderColor: colour.border.warning,
  },
  info: {
    backgroundColor: colour.background.info,
    color: colour.foreground.info,
    borderColor: colour.border.info,
  },
  neutral: {
    backgroundColor: colour.background.tertiary,
    color: colour.foreground.quaternary,
    borderColor: colour.neutral[400],
  },
  error: {
    backgroundColor: colour.background.error,
    color: colour.foreground.error,
    borderColor: colour.border.error,
  },
  success: {
    backgroundColor: colour.background.success,
    color: colour.foreground.success,
    borderColor: colour.border.success,
  },
  gray: {
    color: colour.foreground.tertiary,
    backgroundColor: colour.background.tertiary,
    border: 'transparent',
  },
  blue: {
    color: colour.foreground.info,
    backgroundColor: colour.background.info,
    border: 'transparent',
    ...(isLink
      ? {
          ':hover': {
            color: colour.utilitarian.blue[700],
            backgroundColor: colour.utilitarian.blue[200],
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
