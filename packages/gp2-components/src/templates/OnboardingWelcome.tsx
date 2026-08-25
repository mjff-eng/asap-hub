import {
  Caption,
  Divider,
  Headline2,
  Link,
  Paragraph,
  pixels,
  Subtitle,
} from '@asap-hub/react-components';
import { gp2, logout } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { mobileQuery, nonMobileQuery } from '../layout';
import CardWithOffsetBackground from '../molecules/CardWithOffsetBackground';

const { onboarding } = gp2;
const { rem } = pixels;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'left',
});

const footerStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  flexDirection: 'column-reverse',
  gap: rem(24),
  [nonMobileQuery]: {
    display: 'flex',
    flexDirection: 'row',
  },
});
const buttonWrapperStyle = css({
  width: 'fit-content',
  [mobileQuery]: {
    width: '100%',
  },
});

const OnboardingWelcome: React.FC<Record<string, never>> = () => (
  <div css={containerStyles}>
    <header>
      <Headline2 noMargin>Welcome to the GP2 Hub</Headline2>
      <Subtitle accent="neutral900">
        The internal platform for those within the Global Parkinson's Genetics
        Program
      </Subtitle>
    </header>
    <CardWithOffsetBackground>
      <Paragraph noMargin>
        As a member of GP2, you have been invited to this platform to:
      </Paragraph>
      <ul>
        <li>
          <em>Connect</em> with like-minded members
        </li>
        <li>
          <em>Stay informed and up to date</em> with what's happening within GP2
        </li>
        <li>
          <em>Learn</em> about opportunities and other ways to get involved
        </li>
      </ul>
      <Divider />
      <Paragraph noMargin>
        Before you can begin exploring, you will need to fill out a profile so
        that others can learn about who you are and what you do
      </Paragraph>
    </CardWithOffsetBackground>
    <Caption accent="neutral900">
      <strong>Please note —</strong> all information provided can only be viewed
      by other GP2 members who have also registered.
    </Caption>
    <footer css={footerStyles}>
      <div css={buttonWrapperStyle}>
        <Link fullWidth noMargin buttonStyle href={logout({}).$}>
          Sign Out
        </Link>
      </div>
      <div css={buttonWrapperStyle}>
        <Link
          fullWidth
          noMargin
          buttonStyle
          primary
          href={onboarding({}).coreDetails({}).$}
        >
          Get Started
        </Link>
      </div>
    </footer>
  </div>
);

export default OnboardingWelcome;
