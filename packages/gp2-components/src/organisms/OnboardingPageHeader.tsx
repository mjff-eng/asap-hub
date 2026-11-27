import { css } from '@emotion/react';
import { mobileQuery, removeLayoutPaddingStyles } from '../layout';
import OnboardedTabLink from '../molecules/OnboardedTabLink';
import PageBanner from './PageBanner';

type OnboardingStep = {
  href: string;
  name: string;
  disabled: boolean;
  completed: boolean;
};

type OnboardingPageHeaderProps = {
  steps: OnboardingStep[];
};

const containerStyles = css(removeLayoutPaddingStyles);

const navStyles = css({
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',

  [mobileQuery]: {
    justifyContent: 'center',
    marginBottom: 0,
  },
});

const OnboardingPageHeader: React.FC<OnboardingPageHeaderProps> = ({
  steps,
}) => (
  <div css={containerStyles}>
    <PageBanner title={'Registration'} noMarginBottom noBorderTop>
      <nav css={navStyles}>
        {steps.map(({ disabled, href, name, completed }, index) => (
          <OnboardedTabLink
            key={name}
            disabled={disabled}
            href={href}
            index={index + 1}
            completed={completed}
          >
            {name}
          </OnboardedTabLink>
        ))}
      </nav>
    </PageBanner>
  </div>
);
export default OnboardingPageHeader;
