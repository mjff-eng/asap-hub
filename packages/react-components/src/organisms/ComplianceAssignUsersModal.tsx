import { css } from '@emotion/react';
import { ComponentProps, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthorSelect, OptionsType } from '..';
import { Button, Headline3, Paragraph, Subtitle } from '../atoms';
import { paddingStyles } from '../card';
import { crossIcon } from '../icons';
import { Modal } from '../molecules';
import { mobileScreen, rem } from '../pixels';
import { AuthorOption } from './AuthorSelect';
import ComplianceTableRow from './ComplianceTableRow';

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

const informationRowStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
});

const contentContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(48),
  marginTop: rem(32),
});

const modalContentStyles = css([paddingStyles, css({ paddingTop: 0 })]);

const modalStyles = css({
  maxWidth: `minmax(60%, ${rem(1000)})`,
  width: '100%',
});

const InformationRow: React.FC<{
  title: string;
  value?: string;
  children?: React.ReactNode;
}> = ({ title, value, children }) => (
  <div css={informationRowStyles}>
    <Subtitle noMargin>{title}</Subtitle>
    {value && (
      <Paragraph noMargin accent="neutral900">
        {value}
      </Paragraph>
    )}
    {children}
  </div>
);

export type AssignedUsersFormData = {
  assignedUsers: OptionsType<AuthorOption>;
};

type ComplianceAssignUsersModalProps = Pick<
  ComponentProps<typeof ComplianceTableRow>,
  'getAssignedUsersSuggestions'
> & {
  onDismiss: () => void;
  onConfirm: (data: AssignedUsersFormData) => Promise<void>;
  PillId: React.FC;
  teams: string;
  manuscriptTitle: string;
  assignedUsers: OptionsType<AuthorOption>;
  projectName?: string;
  isUserBasedProject?: boolean;
};

const ComplianceAssignUsersModal: React.FC<ComplianceAssignUsersModalProps> = ({
  onDismiss,
  onConfirm,
  PillId,
  teams,
  manuscriptTitle,
  getAssignedUsersSuggestions,
  assignedUsers,
  projectName,
  isUserBasedProject,
}) => {
  const bottomDivRef = useRef<HTMLDivElement>(null);
  const { setValue, watch, handleSubmit } = useForm<AssignedUsersFormData>({
    mode: 'onBlur',
    defaultValues: {
      assignedUsers,
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async (data: AssignedUsersFormData) => {
    setIsSubmitting(true);
    await onConfirm(data);
    setIsSubmitting(false);
  };

  const watchedAssignedUsers = watch('assignedUsers');
  const isEditing = assignedUsers.length > 0;

  const isButtonEnabled = !isSubmitting && watchedAssignedUsers.length > 0;

  return (
    <form>
      <Modal padding={false} overrideModalStyles={modalStyles}>
        <header css={headerStyles}>
          <div css={controlsContainerStyles}>
            <Button small onClick={onDismiss} enabled={!isSubmitting}>
              {crossIcon}
            </Button>
          </div>
          <Headline3>Assign User</Headline3>
        </header>

        <div css={modalContentStyles}>
          <div css={contentContainerStyles}>
            <InformationRow title="Manuscript Title" value={manuscriptTitle} />
            <InformationRow title="ID">
              <PillId />
            </InformationRow>
            {projectName && (
              <InformationRow title="Project" value={projectName} />
            )}
            {!isUserBasedProject && (
              <InformationRow title="Team(s)" value={teams} />
            )}

            <AuthorSelect
              maxMenuHeight={170}
              onFocus={() => {
                if (bottomDivRef.current) {
                  bottomDivRef.current.scrollIntoView({
                    behavior: 'smooth',
                  });
                }
              }}
              isMulti
              creatable={false}
              title="Assign User"
              subtitle="(required)"
              placeholder="Start typing..."
              loadOptions={getAssignedUsersSuggestions}
              onChange={(
                newAuthors: OptionsType<AuthorOption> | AuthorOption | null,
              ) => {
                if (newAuthors && Array.isArray(newAuthors)) {
                  setValue('assignedUsers', newAuthors);
                }
              }}
              values={watchedAssignedUsers}
            />
          </div>

          <div css={buttonContainerStyles} ref={bottomDivRef}>
            <div css={dismissButtonStyles}>
              <Button enabled={!isSubmitting} onClick={onDismiss}>
                Cancel
              </Button>
            </div>
            <div css={confirmButtonStyles}>
              <Button
                primary
                enabled={isButtonEnabled}
                onClick={handleSubmit(handleConfirm)}
              >
                {isEditing ? 'Update' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </form>
  );
};

export default ComplianceAssignUsersModal;
