import { colour } from '../colors';
import { layoutStyles, AccentColorName, captionStyles } from '../text';

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
    bold ? captionStyles.bold : captionStyles.regular,
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
