import { css } from '@emotion/react';

import { Button } from '../atoms';
import { colour } from '../colors';
import { mobileScreen, rem } from '../pixels';

const footerStyles = (isConfirming: boolean) =>
  css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: isConfirming ? 'space-between' : 'flex-end',
    gap: rem(24),
    padding: `${rem(48)} ${rem(24)} ${rem(32)}`,
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      flexDirection: 'column',
      alignItems: 'stretch',
      paddingTop: rem(56),
    },
  });

const actionsStyles = css({
  display: 'flex',
  gap: rem(24),
  flexShrink: 0,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column-reverse',
  },
});

const buttonStyles = css({
  width: 'fit-content',
  flexShrink: 0,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    width: '100%',
  },
});

const buttonTextStyles = css({
  fontSize: rem(17),
  fontWeight: 700,
  lineHeight: rem(24),
  whiteSpace: 'nowrap',
});

const warningStyles = css({
  fontWeight: 'bold',
  color: colour.foreground.primary,
});

type ConfirmableModalFooterProps = {
  isConfirming: boolean;
  confirmationMessage: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  cancelEnabled?: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  confirmEnabled?: boolean;
  confirmLoading?: boolean;
};

const ConfirmableModalFooter: React.FC<ConfirmableModalFooterProps> = ({
  isConfirming,
  confirmationMessage,
  onKeepEditing,
  onDiscard,
  onCancel,
  cancelEnabled = true,
  confirmLabel,
  onConfirm,
  confirmEnabled = true,
  confirmLoading = false,
}) => (
  <footer css={footerStyles(isConfirming)}>
    {isConfirming && <span css={warningStyles}>{confirmationMessage}</span>}
    <div css={actionsStyles}>
      {isConfirming ? (
        <>
          <div css={buttonStyles}>
            <Button
              fullWidth
              noMargin
              overrideStyles={buttonTextStyles}
              onClick={onKeepEditing}
            >
              Keep Editing
            </Button>
          </div>
          <div css={buttonStyles}>
            <Button
              warning
              fullWidth
              noMargin
              overrideStyles={buttonTextStyles}
              onClick={onDiscard}
            >
              Discard changes
            </Button>
          </div>
        </>
      ) : (
        <>
          <div css={buttonStyles}>
            <Button
              fullWidth
              noMargin
              enabled={cancelEnabled}
              overrideStyles={buttonTextStyles}
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
          <div css={buttonStyles}>
            <Button
              primary
              fullWidth
              noMargin
              enabled={confirmEnabled}
              loading={confirmLoading}
              overrideStyles={buttonTextStyles}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  </footer>
);

export default ConfirmableModalFooter;
