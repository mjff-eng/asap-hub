import { css, CSSObject } from '@emotion/react';
import { ReactNode } from 'react';

import { Button } from '../atoms';
import { colour } from '../colors';
import {
  circleFilledCheckIcon,
  circleFilledCrossIcon,
  CircleInfoIcon,
  crossIcon,
} from '../icons';
import { mobileScreen, rem } from '../pixels';

// Not in the palette: the toast is drawn with detached values.
const toastText = colour.foreground.primary;
const toastRule = colour.neutral[300];

type Accent = 'success' | 'error' | 'neutral';

type AccentStyles = {
  readonly background: string;
  readonly text: string;
  readonly icon: ReactNode;
  readonly radius: number;
  readonly message?: CSSObject;
};

const accents: Record<Accent, AccentStyles> = {
  success: {
    background: colour.background.success,
    text: toastText,
    icon: circleFilledCheckIcon,
    radius: 8,
  },
  error: {
    background: colour.background.error,
    text: toastText,
    icon: circleFilledCrossIcon,
    radius: 8,
  },
  neutral: {
    background: colour.background.neutral,
    text: colour.foreground.neutral,
    icon: <CircleInfoIcon size={24} color={colour.neutral[700]} />,
    radius: 4,
    message: { fontSize: rem(16), lineHeight: 24 / 16, fontWeight: 500 },
  },
};

const toastStyles = (accent: Accent, hasUndo: boolean) =>
  css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: rem(12),
    padding: rem(16),
    borderRadius: rem(accents[accent].radius),
    backgroundColor: accents[accent].background,
    color: accents[accent].text,
    fontSize: rem(17),
    lineHeight: 24 / 17,
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      // A grid, not flex-wrap: the icon has to stay on the message's first
      // line however far the message wraps.
      ...(hasUndo
        ? {
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: rem(12),
            '> :last-child': { gridRow: 2, gridColumn: '1 / 3' },
          }
        : {}),
    },
  });

const iconStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: rem(24),
  height: rem(24),
});

const mobileTextStyles = {
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontSize: rem(14),
    lineHeight: 16 / 14,
  },
};

// The size goes on the message, not the toast: rem() emits em, so a smaller
// toast font would also shrink its padding and gap.
const messageStyles = (accent: Accent) =>
  css({
    flexGrow: 1,
    minWidth: 0,
    ...accents[accent].message,
    ...mobileTextStyles,
  });

const actionsStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  gap: rem(24),
});

const undoStyles = css({
  flexGrow: 1,
  textAlign: 'right',
  fontSize: 'inherit',
  lineHeight: 'inherit',
  color: toastText,
  ...mobileTextStyles,
});

const ruleStyles = css({
  flexShrink: 0,
  width: rem(1),
  height: rem(16),
  backgroundColor: toastRule,
});

const dismissStyles = (accent: Accent) =>
  css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: rem(24),
    height: rem(24),
    minWidth: rem(24),
    maxWidth: rem(24),
    margin: 0,
    padding: 0,
    border: 'none',
    backgroundColor: 'transparent',
    '> svg': { width: rem(20), height: rem(20) },
    'svg path': { stroke: accents[accent].text },
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      flexGrow: 0,
      minWidth: rem(24),
    },
  });

type InlineToastProps = {
  readonly accent?: Accent;
  readonly message: string;
  readonly onUndo?: () => void;
  readonly onDismiss: () => void;
  readonly enabled?: boolean;
};

const InlineToast: React.FC<InlineToastProps> = ({
  accent = 'success',
  message,
  onUndo,
  onDismiss,
  enabled = true,
}) => (
  <div css={toastStyles(accent, !!onUndo)} role="status">
    <span css={iconStyles}>{accents[accent].icon}</span>
    <span css={messageStyles(accent)}>{message}</span>
    <span css={actionsStyles}>
      {onUndo && (
        <>
          <Button
            linkStyle
            enabled={enabled}
            onClick={onUndo}
            overrideStyles={undoStyles}
          >
            Undo
          </Button>
          <span css={ruleStyles} />
        </>
      )}
      <Button
        noMargin
        small
        enabled={enabled}
        aria-label="Dismiss message"
        onClick={onDismiss}
        overrideStyles={dismissStyles(accent)}
      >
        {crossIcon}
      </Button>
    </span>
  </div>
);

export default InlineToast;
