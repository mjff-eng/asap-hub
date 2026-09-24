import { css, CSSObject, SerializedStyles } from '@emotion/react';
import { borderRadius } from '../card';
import * as colors from '../colors';
import { rem } from '../pixels';
import { themes } from '../theme';

const containerStyles = css({
  boxSizing: 'border-box',
  width: '100%',
  borderWidth: 1,
  borderStyle: 'solid',
  borderRadius: `${rem(borderRadius)}`,
});

export type AccentVariant =
  | 'default'
  | 'red'
  | 'green'
  | 'placeholder'
  | 'neutral200'
  | 'warning'
  | 'information';

export const accents: Record<AccentVariant, CSSObject> = {
  default: {
    borderColor: colors.colour.border.card.default,
    boxShadow: `0px 2px 4px ${colors.colour.neutral[100]}`,
  },
  red: {
    backgroundColor: colors.colour.background.error,
    color: colors.colour.foreground.error,
    borderColor: colors.colour.border.error,
  },
  green: {
    backgroundColor: colors.colour.background.success,
    color: colors.colour.foreground.success,
    borderColor: colors.colour.border.success,
  },
  placeholder: {
    backgroundColor: 'transparent',
    color: colors.colour.foreground.primary,
    border: `2px dotted ${colors.colour.border.secondary}`,
    borderRadius: 0,
  },
  neutral200: {
    backgroundColor: colors.colour.background.secondary,
    borderColor: colors.colour.border.card.default,
    boxShadow: `0px 2px 4px ${colors.colour.neutral[100]}`,
  },
  warning: {
    backgroundColor: colors.colour.background.warning,
    color: colors.colour.foreground.warning,
    borderColor: colors.colour.utilitarian.orange[700],
  },
  information: {
    backgroundColor: colors.colour.background.info,
    color: colors.colour.foreground.info,
    borderColor: colors.colour.border.info,
  },
};

const strokeStyles = (color: string, strokeSize: number) =>
  css({
    background: `linear-gradient(${color}, ${color}) no-repeat left/${strokeSize}px 100%`,
  });

const cardPaddingStyles = css({
  paddingTop: rem(32),
  paddingBottom: rem(32),
  paddingLeft: rem(24),
  paddingRight: rem(24),
});

interface CardProps {
  readonly accent?: AccentVariant;
  readonly padding?: boolean;
  readonly stroke?: boolean;
  readonly shadow?: boolean;
  readonly strokeColor?: string;
  readonly strokeSize?: number;
  readonly title?: string;
  readonly overrideStyles?: SerializedStyles;

  readonly children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  children,
  accent = 'default',
  padding = true,
  stroke = false,
  shadow = true,
  strokeColor = colors.colour.brand.gp2[500],
  strokeSize = borderRadius,
  overrideStyles,
  title,
}) => (
  <section
    aria-label={title}
    css={[
      themes.light,
      containerStyles,
      stroke && strokeStyles(strokeColor, strokeSize),
      padding && cardPaddingStyles,
      accents[accent],
      !shadow && { boxShadow: 'none' },
      overrideStyles,
    ]}
  >
    {children}
  </section>
);

export default Card;
