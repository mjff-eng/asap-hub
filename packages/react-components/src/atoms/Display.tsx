import { layoutStyles, headlineStyles, AllowedChildren } from '../text';

interface DisplayProps {
  readonly children: AllowedChildren;
  readonly id?: string;
  readonly styleAsHeading?: keyof typeof headlineStyles;
}
const Display: React.FC<DisplayProps> = ({
  children,
  styleAsHeading = 2,
  id,
}) => (
  <h1 css={[layoutStyles, headlineStyles[styleAsHeading]]} id={id}>
    {children}
  </h1>
);

export default Display;
