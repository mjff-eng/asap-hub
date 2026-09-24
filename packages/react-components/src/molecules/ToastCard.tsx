import { ComponentProps, ReactNode } from 'react';
import { css } from '@emotion/react';

import { rem, mobileScreen } from '../pixels';
import { Card } from '../atoms';
import { colour } from '../colors';
import { WarningIcon, infoInfoIcon, liveIcon, paperClipIcon } from '../icons';
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
  color: colour.foreground.primary,
  fill: colour.foreground.warning,
});

const infoStyles = css({
  backgroundColor: colour.background.info,
  color: colour.foreground.primary,
  fill: colour.foreground.info,
});

const liveStyles = css({
  backgroundColor: colour.background.success,
  color: colour.foreground.primary,
  fill: colour.foreground.success,
});

const leadStyles = css({
  backgroundColor: colour.background.tertiary,
  color: colour.foreground.tertiary,
  fill: colour.foreground.tertiary,
});

const toastContentStyles = css({
  display: 'flex',
  alignItems: 'center',

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    alignItems: 'flex-start',
  },
});

type Type = 'alert' | 'attachment' | 'live' | 'info';

const iconMap: Record<Type, ReactNode> = {
  alert: <WarningIcon color={colour.utilitarian.orange[600]} />,
  attachment: paperClipIcon,
  live: liveIcon,
  info: infoInfoIcon,
};

const accentMap = {
  alert: alertStyles,
  info: infoStyles,
  attachment: leadStyles,
  live: liveStyles,
};

interface ToastCardProps {
  readonly children: ReactNode;
  readonly toastContent?: ReactNode;
  readonly toastAction?: ReactNode;
  readonly type?: Type;
  readonly accent?: ComponentProps<typeof Card>['accent'];
  readonly mutedIcon?: boolean;
}
const ToastCard: React.FC<ToastCardProps> = ({
  children,
  toastContent,
  toastAction,
  type = 'alert',
  accent,
  mutedIcon = false,
}) => (
  <Card padding={false} accent={accent}>
    {toastContent && (
      <>
        <span css={[toastStyles, accentMap[type]]}>
          <span css={toastContentStyles}>
            <span css={[iconStyles, mutedIcon && mutedIconStyles]}>
              {iconMap[type]}
            </span>
            {toastContent}
          </span>
          {toastAction}
        </span>
      </>
    )}
    <div className="children" css={[paddingStyles]}>
      {children}
    </div>
  </Card>
);

export default ToastCard;
