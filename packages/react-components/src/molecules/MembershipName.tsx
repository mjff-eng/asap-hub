import { css } from '@emotion/react';
import { ReactNode } from 'react';

import { Link } from '../atoms';
import { colour } from '../colors';
import { rem, tabletScreen } from '../pixels';
import { captionRegularStyles } from '../text';

const mobileQuery = `@media (max-width: ${tabletScreen.min - 1}px)`;

const nameStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
  color: colour.foreground.primary,
});

const nameIconStyles = css({
  flexShrink: 0,
  display: 'flex',
  width: rem(24),
  height: rem(24),
  [mobileQuery]: { display: 'none' },
});

const nameTextStyles = css({
  minWidth: 0,
  overflowWrap: 'anywhere',
});

const nameBadgeStyles = css({
  display: 'inline-flex',
  verticalAlign: 'top',
  marginLeft: rem(8),
  lineHeight: 0,
});

const subtitleStyles = css(captionRegularStyles, {
  color: colour.foreground.secondary,
});

type MembershipNameProps = {
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly href?: string;
  readonly badge?: ReactNode;
  readonly subtitle?: ReactNode;
};

const MembershipName: React.FC<MembershipNameProps> = ({
  icon,
  children,
  href,
  badge,
  subtitle,
}) => (
  <div>
    <div css={nameStyles}>
      <span css={nameIconStyles} aria-hidden="true">
        {icon}
      </span>
      <div css={nameTextStyles}>
        {href ? <Link href={href}>{children}</Link> : children}
        {badge && <span css={nameBadgeStyles}>{badge}</span>}
      </div>
    </div>
    {subtitle && <div css={subtitleStyles}>{subtitle}</div>}
  </div>
);

export default MembershipName;
