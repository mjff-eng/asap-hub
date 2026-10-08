import { colour } from '../colors';
import {
  AccentColorName,
  headlineStyles,
  layoutStyles,
  TextChildren,
} from '../text';

interface SubtitleProps {
  readonly children: TextChildren;
  readonly id?: string;
  readonly styleAsHeading?: keyof typeof headlineStyles;
  readonly bold?: boolean;
  readonly accent?: AccentColorName;
  readonly noMargin?: boolean;
}
const Subtitle: React.FC<SubtitleProps> = ({
  children,
  styleAsHeading = 5,
  bold,
  id,
  accent,
  noMargin = false,
  ...props
}) => (
  <h5
    css={[
      noMargin ? { margin: 0 } : layoutStyles,
      headlineStyles[styleAsHeading],
      bold ? { fontWeight: 'bold' } : null,
      accent ? { color: colour.foreground[accent] } : null,
    ]}
    id={id}
    {...props}
  >
    {children}
  </h5>
);

export default Subtitle;
