import { css } from '@emotion/react';
import { useNavigate } from 'react-router';
import { Button, crossIcon, Headline3, Modal, Paragraph } from '..';
import { mobileScreen, rem } from '../pixels';

type modal = 'submit' | 'cancel' | null;

const headerStyles = css({
  padding: 0,
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
  columnGap: rem(24),
  gridTemplateRows: 'max-content 12px max-content',
  [buttonMediaQuery]: {
    gridTemplateColumns: 'max-content max-content',
    gridTemplateRows: 'auto',
    justifyContent: 'flex-end',
  },
});

const confirmStyles = css({
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

type ManuscriptFormModalsProps = {
  modal: modal;
  setModal: (modal: modal) => void;
  handleSubmit: () => void;
  isEditMode?: boolean;
  isSubmitting: boolean;
};

const ManuscriptFormModals: React.FC<ManuscriptFormModalsProps> = ({
  modal,
  setModal,
  handleSubmit,
  isEditMode = false,
  isSubmitting,
}) => {
  const navigate = useNavigate();
  const clearModal = () => setModal(null);

  const handleCancelManuscriptSubmission = () => {
    clearModal();
    void navigate(-1);
  };

  return modal ? (
    <Modal>
      {modal === 'submit' && (
        <>
          <header css={headerStyles}>
            <div css={controlsContainerStyles}>
              <Button small onClick={clearModal}>
                {crossIcon}
              </Button>
            </div>
            <Headline3 styleAsHeading={5}>Submit manuscript?</Headline3>
          </header>

          <Paragraph>
            Only the title, description, and contributor fields are editable
            after you click submit. If you need to edit another field, please
            email tech support. After the ASAP Open Science team sends you a
            compliance report, you can submit an updated version of your
            manuscript for compliance review.
          </Paragraph>
          <div css={buttonContainerStyles}>
            <div css={backStyles}>
              <Button onClick={clearModal}>Keep Editing</Button>
            </div>
            <div css={confirmStyles}>
              <Button
                primary
                enabled={!isSubmitting}
                loading={isSubmitting}
                preventDefault
                onClick={handleSubmit}
              >
                Submit Manuscript
              </Button>
            </div>
          </div>
        </>
      )}
      {modal === 'cancel' && (
        <>
          <header css={headerStyles}>
            <div css={controlsContainerStyles}>
              <Button small onClick={clearModal}>
                {crossIcon}
              </Button>
            </div>
            <Headline3 styleAsHeading={5}>
              Cancel manuscript {isEditMode ? 'edits' : 'submission'}?
            </Headline3>
          </header>

          <Paragraph>
            {isEditMode
              ? 'Cancelling now will result in the loss of all edited data and will exit you from the editing process.'
              : 'Cancelling now will result in the loss of all entered data and will exit you from the submission process.'}
          </Paragraph>
          <div css={buttonContainerStyles}>
            <div css={backStyles}>
              <Button onClick={clearModal}>Keep Editing</Button>
            </div>
            <div css={confirmStyles}>
              <Button warning onClick={handleCancelManuscriptSubmission}>
                {isEditMode
                  ? 'Cancel Manuscript Edits'
                  : 'Cancel Manuscript Submission'}
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  ) : (
    <></>
  );
};
export default ManuscriptFormModals;
