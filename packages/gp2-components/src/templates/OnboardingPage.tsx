import { mediaFrom, pixels } from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { layoutContentStyles } from '../layout';

import { OnboardingPageHeader, OnboardingPageFooter } from '../organisms';

const { rem } = pixels;

type OnboardingPageProps = ComponentProps<typeof OnboardingPageHeader> &
  ComponentProps<typeof OnboardingPageFooter> & {
    children?: React.ReactNode;
  };

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
  padding: `${rem(32)} 0`,
  [mediaFrom.tablet]: {
    gap: rem(32),
    padding: `${rem(48)} 0`,
  },
});

const OnboardingPage: React.FC<OnboardingPageProps> = ({
  children,
  steps,
  ...footerProps
}) => (
  <article css={layoutContentStyles}>
    <OnboardingPageHeader steps={steps} />
    <main css={containerStyles}>{children}</main>
    <OnboardingPageFooter {...footerProps} />
  </article>
);

export default OnboardingPage;
