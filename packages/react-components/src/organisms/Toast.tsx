import { ReactNode } from 'react';
import { css, CSSObject } from '@emotion/react';
import type { EmotionJSX } from '@emotion/react/types/jsx-namespace';

import { layoutStyles } from '../text';
import { Paragraph } from '../atoms';
import {
  crossIcon,
  errorIcon,
  infoCircleYellowIcon,
  informationIcon,
  successIcon,
  successLargeIcon,
} from '../icons';
import {
  rem,
  vminLinearCalcClamped,
  mobileScreen,
  largeDesktopScreen,
} from '../pixels';
import { colour } from '../colors';

const SIDE_PADDING = 24;

const buttonResetStyles = css({
  padding: 0,
  border: 'none',
  backgroundColor: 'unset',
});

const iconStyles = css({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
});
const alignIconWithParagraphStyles = css({
  marginTop: layoutStyles.marginTop,
});

const styles = css({
  boxSizing: 'border-box',
  width: '100%',
  padding: `${vminLinearCalcClamped(
    mobileScreen,
    12,
    largeDesktopScreen,
    6,
    'px',
  )} ${rem(SIDE_PADDING)}`,
  position: 'relative',
});

const crossIconStyles = css(iconStyles, alignIconWithParagraphStyles, {
  position: 'absolute',
  right: SIDE_PADDING, // right is from border box, not content box
  cursor: 'pointer',
});
const crossPlaceholderStyles = css(iconStyles, {
  display: 'inline-block',
  height: 0,
  paddingTop: 0,
  paddingBottom: 0,

  marginLeft: rem(12),
});

const wrapStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  flexFlow: 'row',
  gap: rem(50),
});

export type ToastAccents =
  | 'error'
  | 'info'
  | 'warning'
  | 'success'
  | 'successLarge';

const accentIcons: Record<ToastAccents, EmotionJSX.Element> = {
  error: errorIcon,
  info: informationIcon,
  warning: infoCircleYellowIcon,
  success: successIcon,
  successLarge: successLargeIcon,
};

const statusStyles = (
  status: 'error' | 'info' | 'warning' | 'success',
): CSSObject => ({
  backgroundColor: colour.background[status],
  borderColor: colour.border[status],
  color: colour.foreground.primary,
  svg: { stroke: colour.foreground[status] },
});

const accentStyles: Record<ToastAccents, CSSObject> = {
  error: statusStyles('error'),
  info: statusStyles('info'),
  warning: statusStyles('warning'),
  success: statusStyles('success'),
  successLarge: statusStyles('success'),
};

const roundedStyles = css({
  borderWidth: 1,
  borderRadius: 8,
  borderStyle: 'solid',
});

interface ToastProps {
  children: ReactNode;
  onClose?: () => void;
  accent?: ToastAccents;
  rounded?: boolean;
}
const Toast: React.FC<ToastProps> = ({
  children,
  onClose,
  accent = 'error',
  rounded,
}) => (
  <section css={[styles, accentStyles[accent], rounded && roundedStyles]}>
    {onClose && (
      <button
        aria-label="Close"
        onClick={onClose}
        css={[buttonResetStyles, crossIconStyles]}
      >
        {crossIcon}
      </button>
    )}
    <div
      css={[
        wrapStyles,
        css({ gap: rem(16), alignItems: 'flex-start', marginBlock: rem(12) }),
      ]}
    >
      <div css={[iconStyles]}>{accentIcons[accent]}</div>
      <div css={[wrapStyles, !onClose && { justifyContent: 'center' }]}>
        <Paragraph noMargin>{children}</Paragraph>
        {onClose && <span css={crossPlaceholderStyles}> </span>}
      </div>
    </div>
  </section>
);

export default Toast;
