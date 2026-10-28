import { css } from '@emotion/react';

import { CasTextStyle, casTextStyles } from '../cas-tokens.generated';
import { colour } from '../colors';
import { rem } from '../pixels';
import { layoutStyles, AccentColorName } from '../text';

const captionStyle = ({ fontSize, lineHeight, fontWeight }: CasTextStyle) =>
  css({
    fontSize: rem(fontSize),
    lineHeight: `${lineHeight / fontSize}em`,
    fontWeight,
  });
const regularStyles = captionStyle(casTextStyles.caption.regular);
const boldStyles = captionStyle(casTextStyles.caption.bold);

interface CaptionProps {
  readonly children: React.ReactNode;
  readonly accent?: AccentColorName;
  readonly asParagraph?: boolean;
  readonly bold?: boolean;
  readonly noMargin?: boolean;
}
const Caption: React.FC<CaptionProps> = ({
  children,
  accent,
  asParagraph = false,
  bold,
  noMargin = false,
}) => {
  const styles = [
    layoutStyles,
    bold ? boldStyles : regularStyles,
    accent ? { color: colour.foreground[accent] } : null,
    noMargin ? { margin: 0 } : null,
  ];

  return asParagraph ? (
    <p css={styles}>{children}</p>
  ) : (
    <figcaption css={styles}>{children}</figcaption>
  );
};

export default Caption;
