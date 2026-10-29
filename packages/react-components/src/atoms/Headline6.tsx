import { AllowedChildren, layoutStyles, headlineStyles } from '../text';

interface Headline6Props {
  readonly children: AllowedChildren;
  readonly id?: string;
  readonly styleAsHeading?: keyof typeof headlineStyles;
  readonly noMargin?: boolean;
}
const Headline6: React.FC<Headline6Props> = ({
  children,
  styleAsHeading = 'body/regular',
  id,
  noMargin = false,
}) => (
  <h6
    css={[
      layoutStyles,
      headlineStyles[styleAsHeading],
      noMargin && { margin: 0 },
    ]}
    id={id}
  >
    {children}
  </h6>
);

export default Headline6;
