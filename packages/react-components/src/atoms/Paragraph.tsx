import { css, SerializedStyles } from '@emotion/react';
import { colour } from '../colors';
import { casTextStyles } from '../cas-tokens.generated';
import { rem } from '../pixels';
import { AccentColorName, layoutStyles } from '../text';

const { fontSize, lineHeight } = casTextStyles.body.regular;
const primaryStyles = css({
  fontSize: rem(fontSize),
  lineHeight: `${lineHeight / fontSize}em`,
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
