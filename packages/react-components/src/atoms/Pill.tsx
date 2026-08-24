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
    borderColor: colors.steel.rgb,
    color: colors.lead.rgb,
  },
  green: {
    backgroundColor: colors.mint.rgb,
    color: colors.colour.brand.crn[800].rgb,
    borderColor: colors.colour.brand.crn[800].rgb,
  },
  warning: {
    backgroundColor: colors.warning100.rgb,
    color: colors.warning500.rgb,
    borderColor: colors.warning500.rgb,
  },
  info: {
    backgroundColor: colors.info100.rgb,
    color: colors.info500.rgb,
    borderColor: colors.info500.rgb,
  },
  neutral: {
    backgroundColor: colors.neutral300.rgb,
    color: colors.neutral800.rgb,
    borderColor: colors.neutral800.rgb,
  },
  error: {
    backgroundColor: colors.error100.rgb,
    color: colors.error500.rgb,
    borderColor: colors.error500.rgb,
  },
  success: {
    backgroundColor: colors.success100.rgb,
    color: colors.success500.rgb,
    borderColor: colors.success500.rgb,
  },
  gray: {
    color: colors.lead.rgb,
    backgroundColor: colors.silver.rgb,
    border: 'transparent',
  },
  blue: {
    color: colors.info500.rgb,
    backgroundColor: colors.info100.rgb,
    border: 'transparent',
    ...(isLink
      ? {
          ':hover': {
            color: colors.info900.rgb,
            backgroundColor: 'rgba(207, 237, 251, 1)',
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
