import { css, SerializedStyles } from '@emotion/react';
import { colour } from '../colors';
import { rem } from '../pixels';
import { AccentColorName, layoutStyles } from '../text';

const primaryStyles = css({
  fontSize: rem(17),
  lineHeight: `${24 / 17}em`,
});

type ParagraphProps = {
  readonly children: React.ReactNode;
  readonly primary?: boolean;
  readonly accent?: AccentColorName;
  readonly noMargin?: boolean;
  readonly styles?: SerializedStyles;
};

const Paragraph: React.FC<ParagraphProps> = ({
  children,
  accent,
  noMargin = false,
  styles,
}) => (
  <p
    css={[
      noMargin ? { margin: 0 } : layoutStyles,
      primaryStyles,
      accent ? { color: colour.foreground[accent] } : null,
      styles,
    ]}
  >
    {children}
  </p>
);

export default Paragraph;
