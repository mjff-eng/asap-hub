import {
  DiscussionCreateRequest,
  ManuscriptFileResponse,
  ManuscriptFileType,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '../atoms';
import {
  FormSection,
  LabeledFileField,
  LabeledTextEditor,
  LabeledTextField,
  Modal,
} from '../molecules';
import { rem } from '../pixels';
import { mediaFrom } from '../layout';

const buttonMediaQuery = mediaFrom.tablet;

const buttonContainerStyles = css({
  display: 'grid',
  rowGap: rem(24),
  gridTemplateRows: 'max-content max-content',
  [buttonMediaQuery]: {
    gridTemplateColumns: 'max-content max-content',
    justifyContent: 'flex-end',
    columnGap: rem(24),
  },
});

const confirmButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '1 / span 1',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
    gridColumn: '2',
  },
});
const dismissButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '2 / span 1',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
  },
});

const buttonOverrideStyles = css({
  padding: `${rem(15)} ${rem(33)}}`,
});

const contentStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const footerStyles = (isCancelling: boolean) =>
  css({
    display: 'flex',
    flexDirection: 'column',
    marginTop: rem(32),
    gap: `${isCancelling ? rem(24) : 0}`,
    [buttonMediaQuery]: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });

const cancelTextStyles = css({
  fontWeight: 'bold',
  [buttonMediaQuery]: {
    maxHeight: rem(60),
    maxWidth: rem(250),
  },
});

const MAX_FILE_SIZE = 100_000_000;

type DiscussionModalData = {
  title?: string;
  text: string;
  files?: ManuscriptFileResponse[];
};

type DiscussionModalProps = {
  type: 'start' | 'reply';
  onDismiss: () => void;
  onSave: (data: DiscussionCreateRequest) => Promise<void>;
  handleFileUpload: (
    file: File,
    fileType: ManuscriptFileType,
    handleError: (errorMessage: string) => void,
  ) => Promise<ManuscriptFileResponse | undefined>;
};

const DiscussionModal: React.FC<DiscussionModalProps> = ({
  type,
  onDismiss,
  onSave,
  handleFileUpload,
}) => {
  const methods = useForm<DiscussionModalData>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      text: '',
      files: [],
    },
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const modalTitle = type === 'start' ? 'Start Discussion' : 'Reply';

  const {
    control,
    formState: { isSubmitting, isValid },
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    getValues,
  } = methods;

  const onSubmit = async (data: DiscussionModalData) => {
    await onSave(data as DiscussionCreateRequest);
    onDismiss();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Modal padding={false}>
        <div css={contentStyles}>
          <FormSection title={modalTitle}>
            {type === 'start' && (
              <Controller
                name="title"
                control={control}
                rules={{
                  required: true,
                  maxLength: {
                    value: 100,
                    message: 'Title cannot exceed 100 characters.',
                  },
                }}
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <LabeledTextField
                    overrideStyles={css({
                      paddingBottom: rem(20),
                    })}
                    title="Title"
                    subtitle="(required)"
                    onChange={onChange}
                    customValidationMessage={error?.message}
                    required
                    value={value || ''}
                    enabled={!(isSubmitting || isCancelling)}
                  />
                )}
              />
            )}

            <Controller
              name="text"
              control={control}
              rules={{
                required: true,
              }}
              render={({
                field: { value, onChange },
                fieldState: { error },
              }) => (
                <LabeledTextEditor
                  title="Please write your message below."
                  subtitle="(required)"
                  onChange={onChange}
                  customValidationMessage={error?.message}
                  required
                  value={value || ''}
                  enabled={!(isSubmitting || isCancelling)}
                />
              )}
            />

            <Controller
              name="files"
              control={control}
              render={({ field: { value }, fieldState: { error } }) => (
                <LabeledFileField
                  buttonText="Add"
                  title="Attach files"
                  subtitle="(optional)"
                  description="Add any files related to this discussion. You can upload up to 5 files, each no larger than 100 MB."
                  placeholder="Attach File"
                  onRemove={(id?: string) => {
                    setValue('files', value?.filter((file) => file.id !== id));
                  }}
                  maxFiles={5}
                  handleFileUpload={async (file: File) => {
                    if (file.size > MAX_FILE_SIZE) {
                      setError('files', {
                        type: 'custom',
                        message:
                          'The file size exceeds the limit of 100 MB. Please upload a smaller file.',
                      });
                      return;
                    }

                    setIsUploadingFiles(true);
                    clearErrors('files');

                    const uploadedFile = await handleFileUpload(
                      file,
                      'Discussion Files',
                      (validationErrorMessage) => {
                        setError('files', {
                          type: 'custom',
                          message: validationErrorMessage,
                        });
                      },
                    );
                    setIsUploadingFiles(false);

                    if (!uploadedFile) return;

                    setValue(
                      'files',
                      [...(getValues('files') || []), uploadedFile],
                      {
                        shouldValidate: true,
                      },
                    );
                  }}
                  currentFiles={value}
                  customValidationMessage={error?.message}
                  enabled={!(isSubmitting || isCancelling) && !isUploadingFiles}
                />
              )}
            />
          </FormSection>
          <div css={footerStyles(isCancelling)}>
            <div css={cancelTextStyles}>
              {isCancelling && (
                <span>
                  Cancelling now will result in the loss of all entered data. Do
                  you want to continue?
                </span>
              )}
            </div>
            <div css={buttonContainerStyles}>
              <div css={dismissButtonStyles}>
                <Button
                  noMargin
                  enabled
                  overrideStyles={buttonOverrideStyles}
                  onClick={() => setIsCancelling(!isCancelling)}
                >
                  {isCancelling ? 'Keep Editing' : 'Cancel'}
                </Button>
              </div>
              <div css={confirmButtonStyles}>
                {isCancelling ? (
                  <Button
                    warning
                    noMargin
                    overrideStyles={buttonOverrideStyles}
                    enabled
                    onClick={onDismiss}
                  >
                    {type === 'start' ? 'Cancel Discussion' : 'Cancel Reply'}
                  </Button>
                ) : (
                  <Button
                    noMargin
                    primary
                    enabled={!isSubmitting && !isUploadingFiles && isValid}
                    overrideStyles={buttonOverrideStyles}
                    submit
                    preventDefault={false}
                    data-testid="discussion-modal-submit"
                  >
                    Send
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </form>
  );
};

export default DiscussionModal;
