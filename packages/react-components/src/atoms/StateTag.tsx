import { css, CSSObject } from '@emotion/react';
import * as colors from '../colors';
import { lineHeight, rem } from '../pixels';

export type AccentVariant = 'default' | 'green' | 'blue';

export const accents: Record<AccentVariant, CSSObject> = {
  default: {
    backgroundColor: colors.warning100.rgb,
    color: colors.warning500.rgb,
  },
  green: {
    backgroundColor: colors.success100.rgb,
    color: colors.colour.brand.crn[500].rgb,
  },
  blue: {
    backgroundColor: colors.info100.rgb,
    color: colors.info500.rgb,
  },
};

const styles = css({
  display: 'inline-flex',
  boxSizing: 'border-box',
  padding: `${rem(3)} 0`,
  height: `calc(${lineHeight}px + ${rem(6)})`,
  backgroundColor: colors.warning100.rgb,
  color: colors.warning500.rgb,
  borderRadius: rem(18),
});

const iconStyles = css({
  display: 'inline-flex',
  alignSelf: 'center',
  marginLeft: rem(9),
  marginRight: rem(3),
});

const labelStyles = (withIcon: boolean) =>
  css({
    marginRight: rem(15),
    marginLeft: rem(withIcon ? 0 : 15),
  });

type StateTagProps = {
  label?: string;
  icon?: JSX.Element;
  accent?: AccentVariant;
};

const StateTag: React.FC<StateTagProps> = ({
  accent = 'default',
  label,
  icon,
}) => (
  <span css={[styles, accents[accent]]}>
    {icon && <span css={iconStyles}>{icon}</span>}
    {label && <span css={labelStyles(!!icon)}>{label}</span>}
  </span>
);

export default StateTag;
