import { css, CSSObject, SerializedStyles } from '@emotion/react';
import { borderRadius } from '../card';
import { colour } from '../colors';
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
    borderColor: colour.border.card.default,
    boxShadow: `0px 2px 4px ${colour.neutral[100]}`,
  },
  red: {
    backgroundColor: colour.background.error,
    color: colour.foreground.error,
    borderColor: colour.border.error,
  },
  green: {
    backgroundColor: colour.background.success,
    color: colour.foreground.success,
    borderColor: colour.border.success,
  },
  placeholder: {
    backgroundColor: 'transparent',
    color: colour.foreground.primary,
    border: `2px dotted ${colour.border.secondary}`,
    borderRadius: 0,
  },
  neutral200: {
    backgroundColor: colour.background.secondary,
    borderColor: colour.border.card.default,
    boxShadow: `0px 2px 4px ${colour.neutral[100]}`,
  },
  warning: {
    backgroundColor: colour.background.warning,
    color: colour.foreground.warning,
    borderColor: colour.utilitarian.orange[700],
  },
  information: {
    backgroundColor: colour.background.info,
    color: colour.foreground.info,
    borderColor: colour.border.info,
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
  strokeColor = colour.brand.gp2[500],
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
