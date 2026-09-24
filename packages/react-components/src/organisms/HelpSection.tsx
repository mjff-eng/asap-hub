import { css } from '@emotion/react';

import { rem } from '../pixels';
import { Paragraph, Link } from '../atoms';
import { CtaCard } from '../molecules';
import { mailToGrants, mailToSupport } from '../mail';

const bottomStyles = css({
  display: 'grid',
  gridRowGap: rem(12),
});

type HelpSectionProps = {
  hideTechSupportText?: boolean;
};
const HelpSection: React.FC<HelpSectionProps> = ({
  hideTechSupportText = false,
}) => (
  <section css={bottomStyles}>
    <CtaCard href={mailToGrants()} buttonText="Contact grants team" displayCopy>
      <strong>Need help with a grant-related matter?</strong>
      <br /> The grants team is here to help.
    </CtaCard>
    {!hideTechSupportText && (
      <Paragraph accent="tertiary">
        If you're facing a technical issue with the Hub, our team is happy to
        help! <Link href={mailToSupport()}>Contact tech support</Link>.
      </Paragraph>
    )}
  </section>
);

export default HelpSection;
