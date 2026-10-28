import {
  APCRequestedOption,
  PartialManuscriptResponse,
  ApcCoverageRequestStatus,
} from '@asap-hub/model';
import { amountExpression } from '@asap-hub/validation';
import { css } from '@emotion/react';
import { Controller, useForm } from 'react-hook-form';
import { LabeledRadioButtonGroup, LabeledTextField } from '..';
import { Button, Headline3 } from '../atoms';
import { paddingStyles } from '../card';
import { crossIcon, MoneyIcon } from '../icons';
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

const contentContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(48),
  marginTop: rem(32),
  marginBottom: rem(14),
});

const labeledTextFieldContainerStyles = css({
  'label > p': {
    marginTop: 0,
  },
});

const modalContentStyles = css([paddingStyles, css({ paddingTop: 0 })]);

const modalStyles = css({
  maxWidth: `minmax(60%, ${rem(1000)})`,
  width: '100%',
});

export type APCCoverageFormData = {
  apcRequested?: APCRequestedOption;
  apcAmountRequested?: string;
  apcCoverageRequestStatus?: ApcCoverageRequestStatus;
  apcAmountPaid?: string;
  declinedReason?: string;
};

type APCCoverageModalProps = Pick<
  PartialManuscriptResponse,
  | 'apcRequested'
  | 'apcAmountRequested'
  | 'apcCoverageRequestStatus'
  | 'apcAmountPaid'
  | 'declinedReason'
> & {
  onDismiss: () => void;
  onConfirm: (data: APCCoverageFormData) => Promise<void>;
};

const clearData = (
  apcRequested?: APCRequestedOption,
  apcCoverageRequestStatus?: ApcCoverageRequestStatus,
) => {
  if (apcRequested === 'Not Requested') {
    return {
      apcAmountRequested: undefined,
      apcCoverageRequestStatus: undefined,
      apcAmountPaid: undefined,
      declinedReason: undefined,
    };
  }
  switch (apcCoverageRequestStatus) {
    case 'declined':
      return {
        apcAmountPaid: undefined,
      };
    case 'paid':
      return {
        declinedReason: undefined,
      };
    case 'notPaid':
    default:
      return {
        apcAmountPaid: undefined,
        declinedReason: undefined,
      };
  }
};

const APCCoverageModal: React.FC<APCCoverageModalProps> = ({
  onDismiss,
  onConfirm,
  apcRequested,
  apcAmountRequested,
  apcCoverageRequestStatus,
  apcAmountPaid,
  declinedReason,
}) => {
  const {
    watch,
    handleSubmit,
    control,
    formState: { isSubmitting, isValid },
  } = useForm<APCCoverageFormData>({
    mode: 'all',
    defaultValues: {
      apcRequested:
        apcRequested !== undefined
          ? apcRequested
            ? 'Requested'
            : 'Not Requested'
          : undefined,
      apcAmountRequested: apcAmountRequested
        ? apcAmountRequested.toString()
        : '',
      apcCoverageRequestStatus,
      apcAmountPaid: apcAmountPaid ? apcAmountPaid.toString() : '',
      declinedReason,
    },
  });

  const handleConfirm = async (data: APCCoverageFormData) => {
    const payload = {
      ...data,
      ...clearData(data.apcRequested, data.apcCoverageRequestStatus),
    };

    await onConfirm(payload);
  };

  const watchAPCRequested = watch('apcRequested');
  const watchAPCCoverageRequestStatus = watch('apcCoverageRequestStatus');

  return (
    <form>
      <Modal padding={false} overrideModalStyles={modalStyles}>
        <header css={headerStyles}>
          <div css={controlsContainerStyles}>
            <Button small onClick={onDismiss} enabled={!isSubmitting}>
              {crossIcon}
            </Button>
          </div>
          <Headline3 styleAsHeading={5}>APC Coverage</Headline3>
        </header>

        <div css={modalContentStyles}>
          <div css={contentContainerStyles}>
            <Controller
              name="apcRequested"
              control={control}
              rules={{
                required: 'Please select an option.',
              }}
              render={({
                field: { value, onChange },
                fieldState: { error },
              }) => (
                <LabeledRadioButtonGroup<APCRequestedOption | ''>
                  title="Has the APC Coverage been requested?"
                  subtitle="(required)"
                  options={[
                    {
                      value: 'Requested',
                      label: 'Requested',
                      disabled: isSubmitting,
                    },
                    {
                      value: 'Not Requested',
                      label: 'Not Requested',
                      disabled: isSubmitting,
                    },
                  ]}
                  value={value as APCRequestedOption}
                  onChange={onChange}
                  validationMessage={error?.message ?? ''}
                />
              )}
            />
            {watchAPCRequested === 'Requested' && (
              <>
                <Controller
                  name="apcAmountRequested"
                  control={control}
                  rules={{
                    pattern: {
                      value: new RegExp(amountExpression),
                      message: 'Please enter a valid amount.',
                    },
                    required: 'Please enter an amount.',
                  }}
                  disabled={watchAPCRequested !== 'Requested'}
                  render={({
                    field: { value, onChange, onBlur },
                    fieldState: { error },
                  }) => (
                    <div css={labeledTextFieldContainerStyles}>
                      <LabeledTextField
                        title="Coverage amount requested"
                        subtitle="(required)"
                        customValidationMessage={error?.message}
                        labelIndicator={
                          <MoneyIcon
                            {...(error?.message ? { color: 'white' } : {})}
                          />
                        }
                        type={'number'}
                        step={'any'}
                        value={value || ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        enabled={!isSubmitting}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="apcCoverageRequestStatus"
                  control={control}
                  rules={{
                    required: 'Please select an option.',
                  }}
                  render={({
                    field: { value, onChange },
                    fieldState: { error },
                  }) => (
                    <LabeledRadioButtonGroup<ApcCoverageRequestStatus | ''>
                      title="What is the current status of the requested APC coverage?"
                      subtitle="(required)"
                      options={[
                        {
                          value: 'notPaid',
                          label: 'Not Paid',
                          disabled: isSubmitting,
                        },
                        {
                          value: 'paid',
                          label: 'Paid',
                          disabled: isSubmitting,
                        },
                        {
                          value: 'declined',
                          label: 'Declined',
                          disabled: isSubmitting,
                        },
                      ]}
                      value={value as ApcCoverageRequestStatus}
                      onChange={onChange}
                      validationMessage={error?.message ?? ''}
                    />
                  )}
                />
                {watchAPCCoverageRequestStatus === 'paid' && (
                  <Controller
                    name="apcAmountPaid"
                    control={control}
                    rules={{
                      pattern: {
                        value: new RegExp(amountExpression),
                        message: 'Please enter a valid amount.',
                      },
                      required: 'Please enter an amount.',
                    }}
                    render={({
                      field: { value, onChange, onBlur },
                      fieldState: { error },
                    }) => (
                      <div css={labeledTextFieldContainerStyles}>
                        <LabeledTextField
                          title="Coverage amount paid"
                          subtitle="(required)"
                          customValidationMessage={error?.message}
                          labelIndicator={
                            <MoneyIcon
                              {...(error?.message ? { color: 'white' } : {})}
                            />
                          }
                          type={'number'}
                          value={value || ''}
                          onChange={onChange}
                          onBlur={onBlur}
                          enabled={!isSubmitting}
                        />
                      </div>
                    )}
                  />
                )}
                {watchAPCCoverageRequestStatus === 'declined' && (
                  <Controller
                    name="declinedReason"
                    control={control}
                    rules={{
                      required: 'Please enter a reason.',
                    }}
                    render={({
                      field: { value, onChange, onBlur },
                      fieldState: { error },
                    }) => (
                      <LabeledTextField
                        title="Reason for declining"
                        subtitle="(required)"
                        customValidationMessage={error?.message}
                        value={value || ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        enabled={!isSubmitting}
                      />
                    )}
                  />
                )}
              </>
            )}
          </div>

          <div css={buttonContainerStyles}>
            <div css={dismissButtonStyles}>
              <Button enabled={!isSubmitting} onClick={onDismiss}>
                Cancel
              </Button>
            </div>
            <div css={confirmButtonStyles}>
              <Button
                primary
                enabled={isValid && !isSubmitting}
                onClick={handleSubmit(handleConfirm)}
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </form>
  );
};

export default APCCoverageModal;
