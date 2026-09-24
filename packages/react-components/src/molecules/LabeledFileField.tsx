import { css } from '@emotion/react';
import { ComponentProps, useId, useRef, useState } from 'react';
import { Button, Label, Paragraph, Tag } from '../atoms';
import { colour } from '../colors';
import { validationMessageStyles } from '../form';
import { plusIcon } from '../icons';
import { rem } from '../pixels';

const descriptionStyles = css({
  color: colour.foreground.tertiary,
});

const descriptionContainerStyles = css({
  flexBasis: '100%',
  paddingBottom: rem(12),
});

const hintStyles = css({
  ':empty': {
    display: 'none',
  },
  paddingTop: rem(6),

  color: colour.foreground.tertiary,
});

const subtitleStyles = css({
  paddingLeft: rem(6),
});

const iconStyles = css({
  display: 'flex',
  marginRight: rem(8),
});

const uploadedButtonTagStyles = css({
  display: 'flex',
});

const fileSelectionContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(16),
});

const currentFilesContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
  ':empty': {
    display: 'none',
  },
});

type FileUploadResponse = { id: string; url: string; filename: string };

type LabeledFileFieldProps = {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly hint?: React.ReactNode;
  readonly placeholder?: string;
  readonly maxFiles?: number;
  readonly currentFiles?: FileUploadResponse[];
  readonly onRemove?: (id?: string) => void;
  readonly customValidationMessage?: string;
  readonly customValidation?: (file: File) => boolean;
  readonly handleFileUpload: (file: File) => Promise<void>;
  readonly accept?: string;
  readonly tagEnabled?: boolean;
  readonly buttonText?: string;
} & Pick<ComponentProps<typeof Button>, 'enabled'>;

const LabeledFileField: React.FC<LabeledFileFieldProps> = ({
  title,
  subtitle,
  description,
  hint,
  placeholder,
  maxFiles = 1,
  currentFiles,
  accept,
  onRemove,
  enabled,
  customValidationMessage,
  handleFileUpload,
  tagEnabled = true,
  buttonText = 'Add File',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsSubmitting(true);
      await handleFileUpload(file);
      setIsSubmitting(false);
    }
  };
  const handleRemove = (id?: string) => {
    if (onRemove) {
      onRemove(id);
    }
  };
  const canUploadFile = !currentFiles || currentFiles.length < maxFiles;

  return (
    <div>
      <input
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
        aria-label={placeholder}
        accept={accept}
        value=""
        hidden
      />
      <Label
        forContent={(id) => (
          <>
            <div style={{ width: '100%' }} />
            {description ? (
              <div id={descriptionId} css={descriptionContainerStyles}>
                <Paragraph noMargin>
                  <span css={descriptionStyles}>{description}</span>
                </Paragraph>
              </div>
            ) : null}
            <div css={fileSelectionContainerStyles}>
              {currentFiles && (
                <div css={currentFilesContainerStyles}>
                  {currentFiles.map((file) => (
                    <div css={uploadedButtonTagStyles} key={file.id}>
                      <Tag
                        onRemove={
                          tagEnabled ? () => handleRemove(file.id) : undefined
                        }
                        enabled={tagEnabled}
                      >
                        {file.filename}
                      </Tag>
                    </div>
                  ))}
                </div>
              )}
              <Button
                submit={false}
                primary
                small
                enabled={!!enabled && canUploadFile}
                loading={isSubmitting}
                noMargin
                id={id}
                aria-describedby={description ? descriptionId : undefined}
                preventDefault={false}
                onClick={() => canUploadFile && fileInputRef.current?.click()}
              >
                {!isSubmitting && <div css={iconStyles}>{plusIcon}</div>}
                {buttonText}
              </Button>
            </div>
          </>
        )}
      >
        <Paragraph noMargin>
          <strong>{title}</strong>
          <span css={subtitleStyles}>{subtitle}</span>
        </Paragraph>
      </Label>
      {customValidationMessage && (
        <div css={validationMessageStyles}>{customValidationMessage}</div>
      )}
      <div css={hintStyles}>{hint}</div>
    </div>
  );
};

export default LabeledFileField;
