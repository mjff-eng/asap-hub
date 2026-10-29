import { AllowedChildren, layoutStyles, headlineStyles } from '../text';

interface Headline3Props {
  readonly children: AllowedChildren;
  readonly id?: string;
  readonly styleAsHeading?: keyof typeof headlineStyles;
  readonly noMargin?: boolean;
}
const Headline3: React.FC<Headline3Props> = ({
  children,
  styleAsHeading = 4,
  id,
  noMargin = false,
}) => (
  <h3
    css={[
      layoutStyles,
      headlineStyles[styleAsHeading],
      noMargin && { margin: 0 },
    ]}
    id={id}
  >
    {children}
  </h3>
);

export default Headline3;
