import {
  CopyButton,
  Link,
  mail,
  pixels,
  Subtitle,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';

type EmailSectionProps = {
  readonly contactEmails: {
    email?: string;
    contact: string;
  }[];
};

const { createMailTo } = mail;
const { rem } = pixels;

const containerStyles = css({
  display: 'flex',
  gap: rem(24),
  flexDirection: 'column',
});

const itemStyles = css({
  display: 'grid',
  columnGap: rem(16),
  gridTemplateColumns: `1fr ${rem(38)} 1fr`,
  alignItems: 'center',
});

const EmailItem: React.FC<{ email: string; contact: string }> = ({
  email,
  contact,
}) => (
  <div
    css={css({
      display: 'flex',
      gap: rem(8),
      flexDirection: 'column',
    })}
  >
    <Subtitle noMargin accent="neutral900">
      {contact}
    </Subtitle>
    <div css={itemStyles} key={contact}>
      <Link href={createMailTo(email)}>{email}</Link>
      <CopyButton
        hoverTooltipText="Copy Email"
        clickTooltipText="Email Copied"
        onClick={() => navigator.clipboard.writeText(email)}
      />
    </div>
  </div>
);

const EmailSection: React.FC<EmailSectionProps> = ({ contactEmails }) => (
  <div css={containerStyles}>
    {contactEmails.map(
      ({ email, contact }) =>
        email && <EmailItem email={email} contact={contact} key={email} />,
    )}
  </div>
);

export default EmailSection;
