import { ComponentProps, ReactNode } from 'react';
import { css } from '@emotion/react';

import { rem, mobileScreen } from '../pixels';
import { Card } from '../atoms';
import { colour } from '../colors';
import { WarningIcon, infoInfoIcon, LiveIcon, paperClipIcon } from '../icons';
import { borderRadius, paddingStyles } from '../card';

const toastStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${rem(15)} ${rem(24)}`,
  borderRadius: `${borderRadius - 1}px ${borderRadius - 1}px 0px 0px`,

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});

const plainCardStyles = css({
  borderStyle: 'none',
  boxShadow: 'none',
  background: 'transparent',
});

const plainToastStyles = css({
  borderRadius: `${borderRadius}px`,
  marginBottom: rem(16),
});

const iconStyles = css({
  display: 'inline-block',
  width: rem(24),
  height: rem(24),
  paddingRight: rem(8),
});

const mutedIconStyles = css({
  'svg path[stroke]': {
    stroke: colour.foreground.disabled,
  },
});

const alertStyles = css({
  backgroundColor: colour.background.warning,
  color: colour.foreground.warning,
});

const infoStyles = css({
  backgroundColor: colour.background.info,
  color: colour.foreground.info,
});

const liveStyles = css({
  backgroundColor: colour.background.brand,
  color: colour.foreground.brand,
});

const upcomingStyles = css({
  backgroundColor: colour.background.tertiary,
  color: colour.foreground.secondary,
});

const leadStyles = css({
  backgroundColor: colour.background.tertiary,
  color: colour.foreground.tertiary,
});

const toastContentStyles = css({
  display: 'flex',
  alignItems: 'center',
  fontSize: rem(16),

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    alignItems: 'flex-start',
  },
});

type Type = 'alert' | 'attachment' | 'live' | 'info' | 'upcoming';

const iconMap: Record<Type, ReactNode> = {
  alert: <WarningIcon color={colour.foreground.warning} />,
  attachment: paperClipIcon,
  live: <LiveIcon color={colour.utilitarian.red[600]} />,
  info: infoInfoIcon,
  upcoming: null,
};

const accentMap = {
  alert: alertStyles,
  info: infoStyles,
  attachment: leadStyles,
  live: liveStyles,
  upcoming: upcomingStyles,
};

const fullWidthToastStyles = css({
  borderRadius: 0,
});

type ToastBarProps = {
  readonly toastContent: ReactNode;
  readonly toastAction?: ReactNode;
  readonly type?: Type;
  readonly mutedIcon?: boolean;
  readonly variant?: 'card' | 'plain' | 'fullWidth';
};

export const ToastBar: React.FC<ToastBarProps> = ({
  toastContent,
  toastAction,
  type = 'alert',
  mutedIcon = false,
  variant = 'card',
}) => (
  <span
    css={[
      toastStyles,
      accentMap[type],
      variant === 'plain' && plainToastStyles,
      variant === 'fullWidth' && fullWidthToastStyles,
    ]}
  >
    <span css={toastContentStyles}>
      {iconMap[type] && (
        <span css={[iconStyles, mutedIcon && mutedIconStyles]}>
          {iconMap[type]}
        </span>
      )}
      {toastContent}
    </span>
    {toastAction}
  </span>
);

interface ToastCardProps extends Partial<Omit<ToastBarProps, 'variant'>> {
  readonly children: ReactNode;
  readonly accent?: ComponentProps<typeof Card>['accent'];
  readonly plain?: boolean;
}
const ToastCard: React.FC<ToastCardProps> = ({
  children,
  toastContent,
  toastAction,
  type = 'alert',
  accent,
  mutedIcon = false,
  plain = false,
}) => (
  <Card
    padding={false}
    accent={accent}
    overrideStyles={plain ? plainCardStyles : undefined}
  >
    {toastContent && (
      <ToastBar
        toastContent={toastContent}
        toastAction={toastAction}
        type={type}
        mutedIcon={mutedIcon}
        variant={plain ? 'plain' : 'card'}
      />
    )}
    <div className="children" css={[!plain && paddingStyles]}>
      {children}
    </div>
  </Card>
);

export default ToastCard;
