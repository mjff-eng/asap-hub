import { TextChildren } from '../text';
import { Paragraph } from '../atoms';
import { colour } from '../colors';
import { rem } from '../pixels';

interface ComingSoonProps {
  children: TextChildren;
}
const ComingSoon: React.FC<ComingSoonProps> = ({ children }) => (
  <section css={{ textAlign: 'center', padding: `${rem(24)} 0` }}>
    <Paragraph>
      <strong>More to come!</strong>
      <br />
      <span css={{ color: colour.foreground.tertiary }}>{children}</span>
    </Paragraph>
  </section>
);

export default ComingSoon;
