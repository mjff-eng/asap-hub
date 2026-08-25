import { css } from '@emotion/react';
import { useState } from 'react';
import useIsMounted from 'ismounted';

import { Modal } from '../molecules';
import { noop } from '../utils';
import { mobileScreen, rem } from '../pixels';
import { crossIcon } from '../icons';
import { Button, Headline3, Link, Paragraph } from '../atoms';
import { paddingStyles } from '../card';
import { Toast } from '.';
import { usePushFromHere } from '../routing';

const headerStyles = css(paddingStyles, {
  paddingBottom: 0,
  display: 'flex',
  flexDirection: 'row-reverse',
  justifyContent: 'space-between',
});

const controlsContainerStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
});

const buttonMediaQuery = `@media (min-width: ${mobileScreen.max - 100}px)`;

const buttonContainerStyles = css({
  display: 'grid',
  columnGap: rem(30),
  gridTemplateRows: 'max-content 12px max-content',
  [buttonMediaQuery]: {
    gridTemplateColumns: 'max-content max-content',
    gridTemplateRows: 'auto',
    justifyContent: 'flex-end',
  },
});

const saveStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '1 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
    gridColumn: '2',
  },
});
const backStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '2 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
  },
});

type ConfirmModalProps = {
  readonly error?: string;
  readonly title: string;
  readonly description?: string | React.ReactNode;
  readonly confirmText?: string;
  readonly cancelText?: string;
  readonly confirmButtonStyle?: 'primary' | 'warning';

  readonly successHref?: string;
  readonly successState?: unknown;
  readonly onSave?: () => void | Promise<void>;
} & (
  | {
      readonly backHref?: undefined;
      readonly onCancel: () => void;
    }
  | {
      readonly backHref: string;
      readonly onCancel?: undefined;
    }
);
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  error = 'There was an error',
  backHref,
  successHref,
  successState,
  confirmButtonStyle = 'primary',
  onCancel = noop,
  onSave = noop,
}) => {
  const [status, setStatus] = useState<
    'initial' | 'isSaving' | 'hasError' | 'hasSaved'
  >('initial');
  const historyPush = usePushFromHere();
  const mounted = useIsMounted();
  return (
    <Modal padding={false}>
      {status === 'hasError' && <Toast>{error}</Toast>}
      <header css={headerStyles}>
        <div css={controlsContainerStyles}>
          {backHref ? (
            <Link small buttonStyle href={backHref}>
              {crossIcon}
            </Link>
          ) : (
            <Button small onClick={onCancel}>
              {crossIcon}
            </Button>
          )}
        </div>
        <Headline3>{title}</Headline3>
      </header>
      <div css={[paddingStyles, { paddingTop: 0 }]}>
        <Paragraph accent="neutral900">{description}</Paragraph>
        <div css={buttonContainerStyles}>
          <div css={backStyles}>
            {backHref ? (
              <Link buttonStyle enabled={status !== 'isSaving'} href={backHref}>
                {cancelText}
              </Link>
            ) : (
              <Button enabled={status !== 'isSaving'} onClick={onCancel}>
                {cancelText}
              </Button>
            )}
          </div>
          <div css={saveStyles}>
            <Button
              {...(confirmButtonStyle === 'primary'
                ? { primary: true }
                : { warning: true })}
              enabled={status !== 'isSaving'}
              loading={status === 'isSaving'}
              onClick={async () => {
                setStatus('isSaving');
                try {
                  await onSave();
                  if (!mounted.current) return;
                  setStatus('hasSaved');
                  const redirect = successHref ?? backHref;
                  if (redirect) {
                    void historyPush(redirect, { state: successState });
                  }
                } catch (e) {
                  setStatus('hasError');
                }
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
