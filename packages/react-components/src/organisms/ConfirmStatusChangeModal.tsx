import { ManuscriptStatus } from '@asap-hub/model';
import { css } from '@emotion/react';
import { useState } from 'react';

import { Button, Headline3, Paragraph } from '../atoms';
import { paddingStyles } from '../card';
import { crossIcon } from '../icons';
import { Modal } from '../molecules';
import { mobileScreen, rem } from '../pixels';

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

const confirmButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '1 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
    gridColumn: '2',
  },
});
const dismissButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '2 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
  },
});

type ConfirmStatusChangeModalProps = {
  onDismiss: () => void;
  onConfirm: () => Promise<void>;
  newStatus: ManuscriptStatus;
};

const ConfirmStatusChangeModal: React.FC<ConfirmStatusChangeModalProps> = ({
  onDismiss,
  newStatus,
  onConfirm,
}) => {
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const isClosedOrCompliant = ['Closed (other)', 'Compliant'].includes(
    newStatus,
  );
  const title = isClosedOrCompliant
    ? `Set status to ${newStatus.toLowerCase()}? This action is irreversible.`
    : 'Update status and notify?';

  const content = isClosedOrCompliant
    ? `After you update the status to ${newStatus.toLowerCase()}, this change will be permanent and cannot be altered. If you need to make changes in the future, please reach out to Tech Support. Additionally, setting the status to ${newStatus.toLowerCase()} will end all discussions, meaning no further replies will be possible. Also the correspondent members will receive a reminder on the CRN Hub and/or an email with the latest updates.`
    : 'By updating the compliance status, the correspondent members on teams and labs will receive a reminder on the CRN Hub and/or an email with the latest updates.';

  const confirmButtonText = isClosedOrCompliant
    ? `Set to ${newStatus} and Notify`
    : 'Update Status and Notify';

  const handleConfirm = async () => {
    setIsRequestInProgress(true);
    await onConfirm();
    setIsRequestInProgress(false);
    onDismiss();
  };

  return (
    <Modal padding={false}>
      <header css={headerStyles}>
        <div css={controlsContainerStyles}>
          <Button small onClick={onDismiss} enabled={!isRequestInProgress}>
            {crossIcon}
          </Button>
        </div>
        <Headline3>{title}</Headline3>
      </header>
      <div css={[paddingStyles, { paddingTop: 0 }]}>
        <Paragraph accent="tertiary">{content}</Paragraph>

        <div css={buttonContainerStyles}>
          <div css={dismissButtonStyles}>
            <Button enabled={!isRequestInProgress} onClick={onDismiss}>
              Cancel
            </Button>
          </div>
          <div css={confirmButtonStyles}>
            <Button
              primary
              enabled={!isRequestInProgress}
              loading={isRequestInProgress}
              onClick={handleConfirm}
            >
              {confirmButtonText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmStatusChangeModal;
