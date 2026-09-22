import { css } from '@emotion/react';

import { Button } from '../atoms';
import { error100, success100 } from '../colors';
import {
  circleFilledCheckIcon,
  circleFilledCrossIcon,
  crossIcon,
} from '../icons';
import { mobileScreen, rem } from '../pixels';

// Figma's toast draws these three detached from the palette, so they have no
// token to import. Promote them to colors.ts once design names them.
const toastText = '#1C1F21';
const toastRule = '#A6AEB4';

const toastStyles = (accent: 'success' | 'error', hasUndo: boolean) =>
  css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: rem(12),
    padding: rem(16),
    borderRadius: rem(8),
    backgroundColor: (accent === 'success' ? success100 : error100).rgb,
    color: toastText,
    fontSize: rem(17),
    lineHeight: 24 / 17,
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      fontSize: rem(14),
      lineHeight: 16 / 14,
      // Undo needs a row of its own on a narrow screen, and a two-row grid
      // rather than flex-wrap keeps the icon on the message's first line
      // however far the message wraps. Without Undo the close button fits
      // beside the message, so the row stands.
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

// The 22px glyph sits in the 24px slot every other row icon uses.
const iconStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: rem(24),
  height: rem(24),
});

const messageStyles = css({
  flexGrow: 1,
  minWidth: 0,
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
});

const ruleStyles = css({
  flexShrink: 0,
  width: rem(1),
  height: rem(16),
  backgroundColor: toastRule,
});

const dismissStyles = css({
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
  'svg path': { stroke: toastText },
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexGrow: 0,
    minWidth: rem(24),
  },
});

type SpeakerToastProps = {
  readonly accent?: 'success' | 'error';
  readonly message: string;
  readonly onUndo?: () => void;
  readonly onDismiss: () => void;
  readonly enabled?: boolean;
};

const SpeakerToast: React.FC<SpeakerToastProps> = ({
  accent = 'success',
  message,
  onUndo,
  onDismiss,
  enabled = true,
}) => (
  <div css={toastStyles(accent, !!onUndo)} role="status">
    <span css={iconStyles}>
      {accent === 'success' ? circleFilledCheckIcon : circleFilledCrossIcon}
    </span>
    <span css={messageStyles}>{message}</span>
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
        overrideStyles={dismissStyles}
      >
        {crossIcon}
      </Button>
    </span>
  </div>
);

export default SpeakerToast;
