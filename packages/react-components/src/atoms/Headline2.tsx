import { SerializedStyles } from '@emotion/serialize';
import { AllowedChildren, layoutStyles, headlineStyles } from '../text';

interface Headline2Props {
  readonly children: AllowedChildren;
  readonly id?: string;
  readonly styleAsHeading?: keyof typeof headlineStyles;
  readonly noMargin?: boolean;
  readonly overrideStyles?: SerializedStyles;
}
const Headline2: React.FC<Headline2Props> = ({
  children,
  styleAsHeading = 3,
  id,
  noMargin = false,
  overrideStyles,
}) => (
  <h2
    css={[
      layoutStyles,
      headlineStyles[styleAsHeading],
      noMargin && { margin: 0 },
      overrideStyles,
    ]}
    id={id}
  >
    {children}
  </h2>
);

export default Headline2;
