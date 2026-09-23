import { css } from '@emotion/react';
import { CtaCard } from '../molecules';
import { Link, Paragraph } from '../atoms';
import { createMailTo, TECH_SUPPORT_EMAIL } from '../mail';
import { rem } from '../pixels';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
});

const EventSupport: React.FC = () => (
  <div css={containerStyles}>
    <CtaCard
      href={createMailTo(TECH_SUPPORT_EMAIL)}
      buttonText="Contact tech support"
      displayCopy
    >
      <strong>Having trouble accessing this event?</strong>
      <br /> The tech support team is here to help.
    </CtaCard>
    <Paragraph noMargin accent="neutral900">
      Having issues? Set up your calendar manually with these instructions for{' '}
      <Link href="https://support.apple.com/en-us/guide/calendar/icl1022/mac">
        Apple Calendar
      </Link>{' '}
      or{' '}
      <Link href="https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-cff1429c-5af6-41ec-a5b4-74f2c278e98c">
        Outlook
      </Link>
      .
    </Paragraph>
  </div>
);

export default EventSupport;
