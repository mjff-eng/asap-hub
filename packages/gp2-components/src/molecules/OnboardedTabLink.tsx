import { pixels, useBlockedClick, colour } from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { onboardingCompletedIcon, onboardingDisabledIcon } from '../icons';

import { mobileQuery } from '../layout';

const { rem } = pixels;

const styles = css({
  display: 'inline-block',
  color: colour.foreground.tertiary,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
});

const disabledStyles = css({
  color: colour.foreground.disabled,
});
const textStyles = css({ margin: 0, display: 'inline-flex', gap: rem(8) });
const activeStyles = css({
  paddingBottom: rem(16),
  borderBottom: `solid ${rem(4)} ${colour.foreground.brand}`,
  color: colour.foreground.primary,
  fontWeight: 'bold',
  [mobileQuery]: {
    paddingBottom: rem(8),
    display: 'unset',
  },
  svg: {
    display: 'none',
  },
  span: { display: 'inline-block' },
});

const mobileStyle = css({
  [mobileQuery]: {
    display: 'none',
  },
});

type OnboardedTabLinkProps = {
  readonly href: string;
  readonly completed?: boolean;
  readonly disabled?: boolean;
  readonly index: number;
  readonly children: ReactNode;
};

const OnboardedTabLink: React.FC<OnboardedTabLinkProps> = ({
  href,
  children,
  disabled = false,
  index,
}) => {
  const blockedClick = useBlockedClick();

  if (disabled) {
    return (
      <div css={[styles, mobileStyle, disabledStyles]}>
        <p css={textStyles}>
          {onboardingDisabledIcon}
          {children}
        </p>
      </div>
    );
  }

  return (
    <NavLink
      to={href}
      end
      style={{ textDecoration: 'none', color: 'unset' }}
      onClick={blockedClick}
    >
      {({ isActive }) => (
        <div css={[styles, mobileStyle, isActive && activeStyles]}>
          <p css={textStyles}>
            <span
              css={css({
                display: 'none',
                width: rem(24),
                height: rem(24),
                borderRadius: rem(12),
                backgroundColor: colour.brand.gp2[500],
                color: colour.neutral[0],
                textAlign: 'center',
              })}
            >
              {index}
            </span>
            {onboardingCompletedIcon}
            {children}
          </p>
        </div>
      )}
    </NavLink>
  );
};

export default OnboardedTabLink;
