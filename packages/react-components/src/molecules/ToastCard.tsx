import { ComponentProps, ReactNode } from 'react';
import { css } from '@emotion/react';

import { rem, mobileScreen } from '../pixels';
import { Card } from '../atoms';
import {
  info500,
  info100,
  colour,
  neutral900,
  neutral300,
  warning100,
  warning500,
  success100,
  neutral700,
} from '../colors';
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
    stroke: neutral700.rgb,
  },
});

const alertStyles = css({
  backgroundColor: warning100.rgb,
  color: warning500.rgb,
  fill: warning500.rgb,
});

const infoStyles = css({
  backgroundColor: info100.rgb,
  color: info500.rgb,
  fill: info500.rgb,
});

const liveStyles = css({
  backgroundColor: success100.rgb,
  color: colour.brand.crn[800].rgb,
  fill: colour.brand.crn[800].rgb,
});

const leadStyles = css({
  backgroundColor: neutral300.rgb,
  color: neutral900.rgb,
  fill: neutral900.rgb,
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
  alert: <WarningIcon color={warning500.rgb} />,
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
