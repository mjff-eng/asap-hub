import { asapFundingReasons } from '@asap-hub/model';
import { css } from '@emotion/react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button, Link, Paragraph } from '../atoms';
import { crossIcon } from '../icons';
import { createMailTo } from '../mail';
import {
  FormSection,
  LabeledCheckboxGroup,
  LabeledRadioButtonGroup,
  Modal,
} from '../molecules';
import { mobileScreen, rem } from '../pixels';

const buttonMediaQuery = `@media (min-width: ${mobileScreen.max - 100}px)`;

const buttonContainerStyles = css({
  marginTop: rem(32),
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

const contentStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

export const asapFunded = ['Yes', 'No'] as const;

export type ASAPFunded = (typeof asapFunded)[number];

type EligibilityModalProps = {
  onDismiss: () => void;
  onGoToManuscriptForm: () => void;
  setEligibilityReasons: (newEligibilityReason: Set<string>) => void;
};

type EligibilityModalData = {
  asapFunded: ASAPFunded;
  asapFundingReason: Set<string>;
};
const EligibilityModal: React.FC<EligibilityModalProps> = ({
  onDismiss,
  onGoToManuscriptForm,
  setEligibilityReasons,
}) => {
  const [isNotASAPFundedSelected, setIsNotASAPFundedSelected] =
    useState<boolean>(false);
  const methods = useForm<EligibilityModalData>({
    mode: 'onBlur',
    defaultValues: {
      asapFundingReason: new Set(),
    },
  });

  const {
    control,
    formState: { isSubmitting },
    watch,
    getValues,
    setValue,
  } = methods;

  const isContinueEnabled =
    watch('asapFunded') === 'No' ||
    (watch('asapFunded') === 'Yes' && watch('asapFundingReason').size > 0);

  const handleASAPFundingReasonSelection = (newValue: string) => {
    const fundingReasonSet = getValues('asapFundingReason');
    if (fundingReasonSet.has(newValue)) {
      fundingReasonSet.delete(newValue);
    } else {
      fundingReasonSet.add(newValue);
    }
    setValue('asapFundingReason', fundingReasonSet);
  };
  const title = isNotASAPFundedSelected
    ? 'Manuscript cannot be submitted for ASAP Compliance Review'
    : 'Do you need to submit a manuscript?';

  const handleDismiss = () => {
    if (isNotASAPFundedSelected) {
      setIsNotASAPFundedSelected(false);
    } else {
      onDismiss();
    }
  };

  const handleConfirm = () => {
    if (isNotASAPFundedSelected) {
      onDismiss();
    } else if (getValues('asapFunded') === 'No') {
      setIsNotASAPFundedSelected(true);
    } else {
      setEligibilityReasons(getValues('asapFundingReason'));
      onGoToManuscriptForm();
    }
  };

  return (
    <Modal padding={false}>
      <div css={contentStyles}>
        <form>
          <FormSection
            title={title}
            headerDecorator={
              <Button small onClick={onDismiss}>
                {crossIcon}
              </Button>
            }
          >
            <>
              {isNotASAPFundedSelected ? (
                <Paragraph accent="neutral900" noMargin>
                  The open science compliance review process is for manuscripts
                  that report on ASAP-funded work only. Since this manuscript
                  does not contain ASAP-funded work, it will not undergo a
                  compliance review. If you have any further inquiries, please
                  reach out to the Open Science Team at{' '}
                  <Link href={createMailTo('openaccess@parkinsonsroadmap.org')}>
                    openaccess@parkinsonsroadmap.org
                  </Link>
                  .
                </Paragraph>
              ) : (
                <Paragraph accent="neutral900" noMargin>
                  The ASAP Open Science Team only conducts compliance reviews on
                  ASAP-funded work. If your manuscript does not contain
                  ASAP-funded work, do NOT mention ASAP as a funder in the
                  acknowledgments, or as an affiliation.
                </Paragraph>
              )}
              {!isNotASAPFundedSelected && (
                <Controller
                  name="asapFunded"
                  control={control}
                  rules={{
                    required: 'Please select an option.',
                  }}
                  render={({
                    field: { value, onChange },
                    fieldState: { error },
                  }) => (
                    <LabeledRadioButtonGroup<ASAPFunded | ''>
                      title="Does this manuscript contain ASAP-funded work?"
                      subtitle="(required)"
                      options={[
                        {
                          value: 'Yes',
                          label: 'Yes',
                          disabled: isSubmitting,
                        },
                        {
                          value: 'No',
                          label: 'No',
                          disabled: isSubmitting,
                        },
                      ]}
                      value={value as ASAPFunded}
                      onChange={onChange}
                      validationMessage={error?.message ?? ''}
                    />
                  )}
                />
              )}
              {watch('asapFunded') === 'Yes' && (
                <Controller
                  name="asapFundingReason"
                  control={control}
                  rules={{
                    required: 'Please select an option.',
                  }}
                  render={({ field: { value }, fieldState: { error } }) => (
                    <LabeledCheckboxGroup
                      title="Select the option that describes why the submitted manuscript should be considered an ASAP-funded article:"
                      subtitle="(required)"
                      onChange={handleASAPFundingReasonSelection}
                      values={value}
                      validationMessage={error?.message ?? ''}
                      options={asapFundingReasons.map((item) => ({
                        value: item.field,
                        label: item.reason,
                        enabled: !isSubmitting,
                      }))}
                    />
                  )}
                />
              )}
            </>
          </FormSection>
        </form>
        <div css={buttonContainerStyles}>
          <div css={dismissButtonStyles}>
            <Button enabled onClick={handleDismiss} noMargin>
              {isNotASAPFundedSelected ? 'Go Back' : 'Cancel'}
            </Button>
          </div>
          <div css={confirmButtonStyles}>
            <Button
              primary
              enabled={isContinueEnabled}
              onClick={handleConfirm}
              noMargin
            >
              {isNotASAPFundedSelected ? 'Go to Team Page' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EligibilityModal;
