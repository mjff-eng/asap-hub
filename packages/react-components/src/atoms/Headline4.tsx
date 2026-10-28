import { AllowedChildren, layoutStyles, headlineStyles } from '../text';

interface Headline4Props {
  readonly children: AllowedChildren;
  readonly id?: string;
  readonly styleAsHeading?: keyof typeof headlineStyles;
  readonly noMargin?: boolean;
}
const Headline4: React.FC<Headline4Props> = ({
  children,
  styleAsHeading = 6,
  id,
  noMargin = false,
}) => (
  <h4
    css={[
      layoutStyles,
      headlineStyles[styleAsHeading],
      noMargin && { margin: 0 },
    ]}
    id={id}
  >
    {children}
  </h4>
);

export default Headline4;
