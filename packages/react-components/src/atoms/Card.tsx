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
    borderColor: colors.neutral500.rgb,
    boxShadow: `0px 2px 4px ${colors.neutral500.rgb}`,
  },
  red: {
    backgroundColor: colors.error100.rgb,
    color: colors.error500.rgb,
    borderColor: colors.error500.rgb,
  },
  green: {
    backgroundColor: colors.success100.rgb,
    color: colors.colour.brand.crn[800].rgb,
    borderColor: colors.colour.brand.crn[800].rgb,
  },
  placeholder: {
    backgroundColor: 'transparent',
    color: colors.charcoal.rgb,
    border: `2px dotted ${colors.neutral700.rgb}`,
    borderRadius: 0,
  },
  neutral200: {
    backgroundColor: colors.neutral200.rgb,
    borderColor: colors.neutral500.rgb,
    boxShadow: `0px 2px 4px ${colors.neutral500.rgb}`,
  },
  warning: {
    backgroundColor: colors.warning100.rgb,
    color: colors.warning500.rgb,
    borderColor: colors.warning900.rgb,
  },
  information: {
    backgroundColor: colors.information100.rgb,
    color: colors.information900.rgb,
    borderColor: colors.information500.rgb,
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
  strokeColor = colors.cerulean.rgb,
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
