import { Display, Paragraph, Link } from '../atoms';
import { mailToSupport } from '../mail';
import ButtonLink from './ButtonLink';

type WelcomeProps = {
  readonly firstName: string;
  readonly link: string;
};

const Welcome: React.FC<WelcomeProps> = ({ firstName, link }) => (
  <section>
    <Display styleAsHeading={3}>Dear {firstName}</Display>
    <Paragraph>Thank you for starting this journey with us!</Paragraph>
    <Paragraph>
      You’re one step closer to joining the ASAP Hub - the virtual home of the
      Collaborative Research Network (CRN), where you can connect with your
      team, join events and access research.
    </Paragraph>
    <Paragraph>
      Before you can explore the Hub you’ll need to complete your profile.
      You'll be asked to add:
    </Paragraph>
    <ul>
      <li>your role on the project</li>
      <li>your expertise</li>
      <li>research questions you're working on</li>
      <li>biography</li>
    </ul>
    <Paragraph>
      Click ‘Create Account’ below to get started - we look forward to seeing
      you there!
    </Paragraph>
    <ButtonLink href={link}>Create account</ButtonLink>
    <Paragraph>
      As with every new path, you may come across some questions and{' '}
      <Link href={mailToSupport()}>our team</Link> would be delighted to answer
      them.
    </Paragraph>
    <Paragraph>
      Reminder: ASAP Hub is a closed platform to foster trust, candor and
      connection among grantees. In line with your team’s grant agreement, you
      are expected to comply with confidentiality guidelines.
    </Paragraph>
  </section>
);

export default Welcome;
