import { UserResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { ReactNode } from 'react';
import { rem } from '../pixels';
import { mediaBelow } from '../layout';
import { noop } from '../utils';
import { Button, Link } from '../atoms';
import EditModal from './EditModal';
import { FormSection } from '../molecules';

const mobileQuery = mediaBelow.tablet;
const buttonStyles = css({
  width: 'fit-content',
  [mobileQuery]: {
    width: '100%',
  },
});

const footerStyles = css({
  marginTop: rem(32),
  display: 'flex',
  gap: rem(24),
  justifyContent: 'flex-end',
  [mobileQuery]: {
    display: 'flex',
    flexDirection: 'column-reverse',
  },
});

type EditUserModalProps = Partial<UserResponse> & {
  title: string;
  description?: string;
  dirty: boolean;
  backHref: string;
  onSave?: () => void | Promise<void>;
  validate?: () => boolean;
  children?: (
    state: { isSaving: boolean },
    asyncWrapper: (cb: () => void | Promise<void>) => void,
  ) => ReactNode;
  buttonText?: string;
};

const EditUserModal: React.FC<EditUserModalProps> = ({
  children,
  title,
  description,
  backHref,
  dirty,
  onSave = noop,
  buttonText = 'Save',
  validate = () => true,
}) => (
  <EditModal
    title={title}
    description={description}
    backHref={backHref}
    dirty={dirty}
    onSave={onSave}
    validate={validate}
  >
    {({ isSaving }, asyncWrapper) => (
      <>
        <FormSection>
          {children ? children({ isSaving }, asyncWrapper) : null}
        </FormSection>
        <footer css={[footerStyles]}>
          <div css={buttonStyles}>
            <Link href={backHref} buttonStyle fullWidth noMargin>
              Cancel
            </Link>
          </div>
          <div css={buttonStyles}>
            <Button
              primary
              fullWidth
              onClick={() => asyncWrapper(onSave)}
              enabled={!isSaving}
              loading={isSaving}
              noMargin
            >
              {buttonText}
            </Button>
          </div>
        </footer>
      </>
    )}
  </EditModal>
);
export default EditUserModal;
