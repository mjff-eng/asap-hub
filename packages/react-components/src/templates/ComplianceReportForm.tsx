import {
  ComplianceReportFormData,
  ComplianceReportPostRequest,
  ComplianceReportResponse,
  ManuscriptDataObject,
  ManuscriptStatus,
  ManuscriptType,
  complianceReportUrlRequiredManuscriptTypes,
  statusButtonOptions,
} from '@asap-hub/model';

import { urlExpression } from '@asap-hub/validation';
import { css } from '@emotion/react';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button, Card, Paragraph } from '../atoms';
import { GlobeIcon } from '../icons';
import {
  mediaBelow,
  defaultContentTopPadding,
  contentWidthStyles,
  pageMarginStyles,
} from '../layout';
import {
  LabeledDropdown,
  LabeledTextEditor,
  LabeledTextField,
  StatusBadge,
} from '../molecules';
import { ConfirmModal } from '../organisms';
import { rem } from '../pixels';
import { Option } from '../select';

const mainStyles = css(pageMarginStyles.crn, {
  display: 'flex',
  justifyContent: 'center',
  paddingTop: defaultContentTopPadding,
  paddingBottom: defaultContentTopPadding,
});

const cardStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const contentStyles = css(contentWidthStyles, {
  display: 'grid',
  gridTemplateColumns: '1fr',
  justifyContent: 'center',
  gridAutoFlow: 'row',
  rowGap: rem(36),
});

const buttonsOuterContainerStyles = css({
  display: 'flex',
  justifyContent: 'end',
  [mediaBelow.tablet]: {
    width: '100%',
  },
});

const buttonsInnerContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  gap: rem(24),
  [mediaBelow.tablet]: {
    flexDirection: 'column-reverse',
    width: '100%',
  },
});

type ComplianceReportFormProps = {
  manuscriptTitle: string;
  manuscriptVersionId: string;
  manuscriptType: ManuscriptType;
  url?: string;
  description?: string | '';
  manuscriptId: string;
  onSave: (
    output: ComplianceReportPostRequest,
  ) => Promise<ComplianceReportResponse | void>;
  onSuccess: () => void;
  setManuscript: React.Dispatch<
    React.SetStateAction<ManuscriptDataObject | undefined>
  >;
};

type FormAction =
  | 'cancel'
  | 'confirm'
  | 'confirmClosedStatus'
  | 'confirmCompliantStatus'
  | '';

const manuscriptStatusOptions: ReadonlyArray<Option<ManuscriptStatus>> =
  statusButtonOptions.map((status) => ({
    label: status,
    value: status,
  }));

const getModalContent = (
  formAction: FormAction,
): {
  title: string;
  content: string;
  confirmButtonText: string;
  confirmButtonStyle: 'primary' | 'warning';
} =>
  ({
    confirm: {
      title: 'Share compliance report?',
      content:
        'If you elect to share the compliance report, all associated team members (First Author(s), PM, PIs, Corresponding Author and Additional Authors) will receive a reminder on the CRN Hub and an email to notify them that this report is now available.',
      confirmButtonText: 'Share Compliance Report',
      confirmButtonStyle: 'primary' as const,
    },
    confirmCompliantStatus: {
      title:
        'Share compliance report and set status to compliant? This action is irreversible.',
      content:
        'After you update the status to compliant, this change will be permanent and cannot be altered. If you need to make changes in the future, please reach out to Tech Support. Additionally, setting the status to compliant will end all discussions, meaning no further replies will be possible. Also the correspondent members will receive a reminder on the CRN Hub and/or an email with the latest updates.',
      confirmButtonText: 'Confirm and Share',
      confirmButtonStyle: 'primary' as const,
    },
    confirmClosedStatus: {
      title:
        'Share compliance report and set status to closed (other)? This action is irreversible.',
      content:
        'After you update the status to closed (other), this change will be permanent and cannot be altered. If you need to make changes in the future, please reach out to Tech Support. Additionally, setting the status to closed (other) will end all discussions, meaning no further replies will be possible. Also the correspondent members will receive a reminder on the CRN Hub and/or an email with the latest updates.',
      confirmButtonText: 'Confirm and Share',
      confirmButtonStyle: 'primary' as const,
    },
    cancel: {
      title: 'Cancel sharing of compliance report?',
      content:
        'Cancelling now will result in the loss of all entered data and will exit you from the sharing compliance report form.',
      confirmButtonText: 'Cancel Compliance Report Sharing',
      confirmButtonStyle: 'warning' as const,
    },
  })[formAction !== '' ? formAction : 'cancel'];

const ComplianceReportForm: React.FC<ComplianceReportFormProps> = ({
  onSave,
  onSuccess,
  setManuscript,
  manuscriptTitle,
  manuscriptVersionId,
  manuscriptType,
  url,
  description,
  manuscriptId,
}) => {
  const navigate = useNavigate();

  const isURLRequired =
    complianceReportUrlRequiredManuscriptTypes.includes(manuscriptType);

  const methods = useForm<ComplianceReportFormData>({
    mode: 'onBlur',
    defaultValues: {
      url: url || '',
      description: description || '',
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, isValid },
    watch,
    trigger,
  } = methods;

  const selectedStatus = watch('status');

  const onSubmit = async (data: ComplianceReportFormData) => {
    const response = await onSave({
      ...data,
      url: data.url || undefined,
      manuscriptVersionId,
      manuscriptId,
    });
    if (!response) return;

    const { status, complianceReport } = response;

    if (complianceReport) {
      setManuscript(
        (manuscript) =>
          manuscript && {
            ...manuscript,
            status,
            versions: [
              {
                // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
                ...manuscript.versions[0]!,
                complianceReport,
              },
              ...manuscript.versions.slice(1),
            ],
          },
      );
    }
    onSuccess();
  };

  const [complianceReportFormAction, setComplianceReportFormAction] = useState<
    'confirm' | 'cancel' | 'confirmClosedStatus' | 'confirmCompliantStatus' | ''
  >('');

  const { title, confirmButtonText, confirmButtonStyle, content } =
    getModalContent(complianceReportFormAction);

  const editorRef = useRef<HTMLDivElement>(null);

  return (
    <form>
      <main css={mainStyles}>
        {complianceReportFormAction && (
          <ConfirmModal
            title={title}
            description={content}
            cancelText="Keep Editing"
            confirmText={confirmButtonText}
            confirmButtonStyle={confirmButtonStyle}
            onSave={
              complianceReportFormAction.includes('confirm')
                ? () => handleSubmit(onSubmit)()
                : () => navigate(-1)
            }
            onCancel={() => setComplianceReportFormAction('')}
          />
        )}
        <div css={contentStyles}>
          <Card overrideStyles={cardStyles}>
            <Paragraph noMargin>
              <strong>Title of Manuscript</strong>
            </Paragraph>
            <Paragraph>{manuscriptTitle}</Paragraph>
            <Controller
              name="url"
              control={control}
              rules={{
                pattern: {
                  value: new RegExp(urlExpression),
                  message:
                    'Please enter a valid URL, starting with http:// or https://',
                },
                required: isURLRequired ? 'Please enter a url.' : false,
              }}
              render={({
                field: { value, onBlur, onChange },
                fieldState: { error },
              }) => (
                <div
                  css={css({
                    marginTop: rem(48),
                  })}
                >
                  <LabeledTextField
                    title="URL"
                    subtitle={isURLRequired ? '(required)' : '(optional)'}
                    onChange={onChange}
                    onBlur={onBlur}
                    customValidationMessage={error?.message}
                    value={value || ''}
                    enabled={!isSubmitting}
                    labelIndicator={<GlobeIcon />}
                    placeholder="https://example.com"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Tab' && !e.shiftKey && editorRef.current) {
                        e.preventDefault(); // Stop default tab behavior
                        editorRef.current.focus();
                      }
                    }}
                  />
                </div>
              )}
            />

            <Controller
              name="description"
              control={control}
              rules={{
                required: 'Please enter a description.',
              }}
              render={({
                field: { value, onBlur, onChange },
                fieldState: { error },
              }) => (
                <div
                  css={css({
                    marginBlock: rem(48),
                  })}
                >
                  <LabeledTextEditor
                    ref={editorRef}
                    title="Compliance Report Description"
                    subtitle="(required)"
                    tip={
                      <span>
                        Add a description to the compliance report. You can
                        format your text by using markup language.
                      </span>
                    }
                    customValidationMessage={error?.message}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    required
                    enabled={!isSubmitting}
                    editorStyles={css({
                      marginBlock: 0,
                    })}
                    hasError={Boolean(error)}
                    autofocus={false}
                  />
                </div>
              )}
            />

            <Controller
              name="status"
              control={control}
              rules={{
                required: 'Please select an option.',
              }}
              render={({ field: { value, onChange, onBlur } }) => (
                <LabeledDropdown
                  name="Status"
                  title="Status"
                  subtitle="(required)"
                  description="Select the status that will be shown after sharing the compliance report."
                  options={manuscriptStatusOptions}
                  required
                  enabled={true}
                  placeholder="Choose an option"
                  value={value ?? ''}
                  onChange={async (e) => {
                    onChange(e);
                    await trigger('status');
                  }}
                  onBlur={onBlur}
                  renderValue={(val: ManuscriptStatus) =>
                    val && <StatusBadge status={val} />
                  }
                />
              )}
            />
          </Card>
          <div css={buttonsOuterContainerStyles}>
            <div css={buttonsInnerContainerStyles}>
              <Button
                noMargin
                enabled={!isSubmitting}
                onClick={() => setComplianceReportFormAction('cancel')}
              >
                Cancel
              </Button>
              <Button
                primary
                noMargin
                enabled={!isSubmitting && isValid}
                onClick={() =>
                  setComplianceReportFormAction(
                    selectedStatus && selectedStatus.includes('Compliant')
                      ? 'confirmCompliantStatus'
                      : selectedStatus &&
                          selectedStatus.includes('Closed (other)')
                        ? 'confirmClosedStatus'
                        : 'confirm',
                  )
                }
              >
                Share
              </Button>
            </div>
          </div>
        </div>
      </main>
    </form>
  );
};

export default ComplianceReportForm;
