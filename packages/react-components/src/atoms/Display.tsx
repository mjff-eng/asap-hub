import { layoutStyles, headlineStyles, AllowedChildren } from '../text';

interface DisplayProps {
  readonly children: AllowedChildren;
  readonly id?: string;
  readonly styleAsHeading?: keyof typeof headlineStyles;
  readonly noMargin?: boolean;
}
const Display: React.FC<DisplayProps> = ({
  children,
  styleAsHeading = 1,
  id,
  noMargin = false,
}) => (
  <h1
    css={[
      layoutStyles,
      headlineStyles[styleAsHeading],
      noMargin && { margin: 0 },
    ]}
    id={id}
  >
    {children}
  </h1>
);

export default Display;
