import { css } from '@emotion/react';
import { ComponentProps, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Aim,
  GrantType,
  MilestoneCreateRequest,
  MilestoneStatus,
  milestoneStatuses,
} from '@asap-hub/model';

import {
  FormSection,
  LabeledDropdown,
  LabeledMultiSelect,
  LabeledPillSelector,
  LabeledTextArea,
  Modal,
} from '../molecules';
import { crossIcon } from '../icons';
import { Button, Paragraph, Pill, Subtitle } from '../atoms';
import { mobileScreen, rem } from '../pixels';
import { ResearchOutputOption, titleCase } from '../utils';
import { Option, OptionsType } from '../select';
import { ConfirmModal } from '../organisms';
import { getStatusAccent } from '../organisms/shared-aim-milestones-styles';
import { articleSelectComponents } from '../utils/article-select-components';

const widerModalStyles = css({
  width: '90%',
  maxWidth: rem(1060),
  boxSizing: 'content-box',
});

const buttonMediaQuery = `@media (min-width: ${mobileScreen.max - 100}px)`;

const buttonContainerStyles = (isDropdownOpen: boolean) =>
  css({
    display: 'grid',
    columnGap: rem(30),
    gridTemplateRows: 'max-content 12px max-content',
    [buttonMediaQuery]: {
      gridTemplateColumns: 'max-content max-content',
      gridTemplateRows: 'auto',
      justifyContent: 'flex-end',
    },
    paddingTop: isDropdownOpen ? rem(288) : rem(72),
    transition: 'padding-top 0.2s ease',
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

const cancelStyles = css({
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

const grantTypeStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
});

type CreateMilestoneFormData = {
  description: string;
  relatedAims: string[];
  relatedArticles?: OptionsType<ResearchOutputOption>;
  status: MilestoneStatus;
};

type CreateMilestoneModalProps = {
  readonly grantType: GrantType;
  readonly aims: ReadonlyArray<Aim>;
  readonly onCancel: () => void;
  readonly onSubmit: (output: MilestoneCreateRequest) => Promise<void>;
  readonly getArticleSuggestions: NonNullable<
    ComponentProps<
      typeof LabeledMultiSelect<ResearchOutputOption>
    >['loadOptions']
  >;
};

const CreateMilestoneModal: React.FC<CreateMilestoneModalProps> = ({
  aims,
  grantType,
  onCancel,
  onSubmit,
  getArticleSuggestions,
}) => {
  const {
    control,
    formState: { isSubmitting, isValid },
    handleSubmit,
  } = useForm<CreateMilestoneFormData>({
    mode: 'onChange',
    defaultValues: {
      description: '',
      relatedAims: [],
      relatedArticles: [],
      status: 'Pending',
    },
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const handleSubmitConfirmation = () => setShowConfirmModal(true);

  const onConfirm = async (data: CreateMilestoneFormData) => {
    await onSubmit({
      description: data.description,
      status: data.status,
      aimIds: data.relatedAims,
      relatedArticleIds:
        data.relatedArticles?.map((article) => article.value) || [],
      grantType,
    });
  };

  if (showConfirmModal) {
    return (
      <ConfirmModal
        title="Confirm Milestone Creation"
        description="After creation, milestones cannot be deleted. If a milestone is no longer applicable, it should be marked as Terminated. Once added, the milestone will appear in the appropriate location within the project's milestone table based on its related aims and will be visible to all CRN members. All project members will be notified when a milestone is created, and designated members will then be able to update its status. If you need further assistance, please contact your Project Manager or Technical Support."
        confirmText="Confirm and Notify"
        cancelText="Keep Editing"
        confirmButtonStyle="primary"
        onSave={handleSubmit(onConfirm)}
        onCancel={() => setShowConfirmModal(false)}
      />
    );
  }

  return (
    <Modal padding={false} overrideModalStyles={widerModalStyles}>
      <form
        onSubmit={handleSubmit(handleSubmitConfirmation)}
        css={contentStyles}
      >
        <FormSection
          title={'Add New Milestone'}
          headerDecorator={
            <Button small onClick={onCancel}>
              {crossIcon}
            </Button>
          }
        >
          <div css={grantTypeStyles}>
            <Subtitle noMargin>Grant Type</Subtitle>
            <Paragraph noMargin accent="neutral900">
              {titleCase(grantType)}
            </Paragraph>
          </div>
          <Controller
            name="description"
            control={control}
            rules={{
              required: 'Please enter a milestone description.',
            }}
            render={({
              field: { value, onChange, onBlur },
              fieldState: { error },
            }) => (
              <LabeledTextArea
                title="Milestone Description"
                subtitle="(required)"
                customValidationMessage={error?.message}
                value={value || ''}
                onChange={onChange}
                onBlur={onBlur}
                enabled={!isSubmitting}
              />
            )}
          />
          <Controller
            name="relatedAims"
            control={control}
            rules={{
              required: 'Please select aims for this milestone.',
            }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <LabeledPillSelector
                title="Related Aims"
                subtitle="(required)"
                description="Select the aim or aims that this milestone supports. Only aims defined for this project will be available below."
                validationMessage={error?.message}
                value={value}
                onChange={onChange}
                enabled={!isSubmitting}
                options={aims.map((aim) => ({
                  value: aim.id,
                  label: `#${aim.order}`,
                }))}
              />
            )}
          />
          <Controller
            name="relatedArticles"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <LabeledMultiSelect<ResearchOutputOption>
                title="Related Articles"
                description="Add the articles that resulted from completing this milestone or contributed to its progress. Only published articles on the CRN Hub will be available below. These articles will also be displayed in the corresponding Aim."
                subtitle="(optional)"
                enabled={!isSubmitting}
                placeholder="Start typing..."
                loadOptions={getArticleSuggestions}
                onChange={onChange}
                values={value}
                noOptionsMessage={({ inputValue }: { inputValue: string }) =>
                  `Sorry, no articles match ${inputValue}`
                }
                customValidationMessage={error?.message}
                components={articleSelectComponents}
              />
            )}
          />

          <Controller
            name="status"
            control={control}
            rules={{
              required: 'This field is required.',
            }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <LabeledDropdown<MilestoneStatus>
                title="Milestone status"
                subtitle="(required)"
                description="Select the status for this milestone from the options below. If the status is set to Complete or Terminated, it cannot be changed. Related articles may still be added later. If further updates are required, please contact Technical Support."
                options={milestoneStatuses.map((option) => ({
                  value: option,
                  label: option,
                }))}
                onChange={onChange}
                customValidationMessage={error?.message}
                value={value}
                enabled={!isSubmitting}
                noOptionsMessage={(option) =>
                  `Sorry, no status matches ${option.inputValue}`
                }
                onMenuOpen={() => setIsDropdownOpen(true)}
                onMenuClose={() => setIsDropdownOpen(false)}
                renderValue={(val: MilestoneStatus) =>
                  val && (
                    <Pill accent={getStatusAccent(val)} noMargin>
                      {val}
                    </Pill>
                  )
                }
                renderOption={(opt: Option<MilestoneStatus>) => (
                  <Pill
                    accent={getStatusAccent(opt.label as MilestoneStatus)}
                    noMargin
                  >
                    {opt.label}
                  </Pill>
                )}
              />
            )}
          />
        </FormSection>
        <div css={buttonContainerStyles(isDropdownOpen)}>
          <div css={cancelStyles}>
            <Button noMargin onClick={onCancel}>
              Cancel
            </Button>
          </div>
          <div css={confirmStyles}>
            <Button
              primary
              noMargin
              enabled={!isSubmitting && isValid}
              preventDefault={false}
            >
              Confirm
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CreateMilestoneModal;
