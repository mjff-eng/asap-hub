import { AllowedChildren, layoutStyles, headlineStyles } from '../text';

interface Headline5Props {
  readonly children: AllowedChildren;
  readonly id?: string;
  readonly styleAsHeading?: keyof typeof headlineStyles;
  readonly noMargin?: boolean;
}
const Headline5: React.FC<Headline5Props> = ({
  children,
  styleAsHeading = 'body/bold',
  id,
  noMargin = false,
}) => (
  <h5
    css={[
      layoutStyles,
      headlineStyles[styleAsHeading],
      noMargin && { margin: 0 },
    ]}
    id={id}
  >
    {children}
  </h5>
);

export default Headline5;
