import { css } from '@emotion/react';
import { Aim, GrantType, MilestoneCreateRequest } from '@asap-hub/model';
import { ComponentProps, useState } from 'react';
import { useScrollToTop } from '@asap-hub/react-context';

import { Button, Headline3, Link, Paragraph } from '../atoms';
import { formatDateToTimezone } from '../date';
import { LabeledDropdown, LabeledMultiSelect } from '../molecules';
import { rem, mobileScreen } from '../pixels';
import { neutral900 } from '../colors';
import MilestonesMobilePage from './MilestonesMobilePage';
import { plusIcon } from '../icons';
import CreateMilestoneModal from './CreateMilestoneModal';
import { ResearchOutputOption } from '../utils';

const containerStyles = css({
  display: 'grid',
  rowGap: rem(32),
});

const headerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
});

const createMilestoneButtonStyles = css({
  flexGrow: 0,
  alignSelf: 'center',
  gap: rem(8),
});

const descriptionSectionStyles = css({
  display: 'block',
  marginTop: rem(24),
  '& > * + *': {
    marginTop: rem(16),
  },
});

const aimsLinkTextStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: 0,
  '&:hover': {
    textDecoration: 'underline',
  },
});

const lastUpdatedBarStyles = css({
  display: 'flex',
  alignItems: 'center',
  color: neutral900.rgb,
});

const pageMobileStyles = css({
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});

const pageDesktopStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});

type ProjectDetailMilestonesProps = {
  readonly seeAimsHref?: string;
  readonly isLead: boolean;
  readonly selectedGrantType: GrantType;
  readonly onGrantTypeChange: (grantType: GrantType) => void;
  readonly children: React.ReactNode;
  readonly hasSupplementGrant: boolean;
  readonly milestonesLastUpdated?: Partial<Record<GrantType, string>>;
  readonly aims: ReadonlyArray<Aim>;
  readonly loadArticleOptions: NonNullable<
    ComponentProps<
      typeof LabeledMultiSelect<ResearchOutputOption>
    >['loadOptions']
  >;
  readonly onSuccess: () => void;
  readonly onError: () => void;
  readonly onCreateProjectMilestone: (
    data: MilestoneCreateRequest,
  ) => Promise<string | void>;
};

const ProjectDetailMilestones: React.FC<ProjectDetailMilestonesProps> = ({
  seeAimsHref,
  isLead,
  selectedGrantType,
  onGrantTypeChange,
  hasSupplementGrant,
  aims,
  loadArticleOptions,
  onCreateProjectMilestone,
  onError,
  onSuccess,
  children,
  milestonesLastUpdated,
}) => {
  const lastUpdated = milestonesLastUpdated?.[selectedGrantType];
  const grantLabel =
    selectedGrantType === 'supplement' ? 'Supplement' : 'Original';

  const canCreateMilestone =
    isLead &&
    (selectedGrantType === 'supplement' ||
      (selectedGrantType === 'original' && !hasSupplementGrant)) &&
    aims.length > 0;

  const [displayCreateMilestoneModal, setDisplayCreateMilestoneModal] =
    useState(false);

  const { scrollToTop } = useScrollToTop();

  const handleAddNewMilestone = () => {
    setDisplayCreateMilestoneModal(true);
  };

  const onSubmitMilestoneForm = async (data: MilestoneCreateRequest) => {
    try {
      await onCreateProjectMilestone(data);
      onSuccess();
    } catch {
      onError();
    } finally {
      setDisplayCreateMilestoneModal(false);
      scrollToTop();
    }
  };

  return (
    <>
      {displayCreateMilestoneModal && (
        <CreateMilestoneModal
          grantType={selectedGrantType}
          aims={aims}
          onCancel={() => setDisplayCreateMilestoneModal(false)}
          onSubmit={onSubmitMilestoneForm}
          getArticleSuggestions={loadArticleOptions}
        />
      )}
      <div css={pageDesktopStyles}>
        <div css={containerStyles}>
          <LabeledDropdown<GrantType>
            title="Grant Type"
            enabled={hasSupplementGrant}
            value={selectedGrantType}
            options={[
              {
                label: 'Original',
                value: 'original',
              },
              {
                label: 'Supplement',
                value: 'supplement',
              },
            ]}
            onChange={onGrantTypeChange}
            required={true}
          />

          <div css={descriptionSectionStyles}>
            <div css={headerStyles}>
              <Headline3 noMargin>Milestones</Headline3>
              {canCreateMilestone && (
                <div css={createMilestoneButtonStyles}>
                  <Button onClick={handleAddNewMilestone} noMargin small>
                    {plusIcon} Add New Milestone
                  </Button>
                </div>
              )}
            </div>
            <Paragraph accent="neutral900">
              These milestones track progress toward the objectives of the{' '}
              {grantLabel} Grant through defined deliverables and timelines.
              Each milestone supports one or more related aims.
            </Paragraph>
            <Paragraph accent="neutral900">
              Articles associated with a milestone may be added at any status.
              When a milestone is marked as complete, the resulting article(s)
              are expected to be included. These articles are linked to their
              corresponding aims and are displayed in the Aims section.
            </Paragraph>
            <Link href={seeAimsHref ?? '#'} underlined>
              <span css={aimsLinkTextStyles}>See Aims</span>
            </Link>
            {lastUpdated && (
              <div css={lastUpdatedBarStyles}>
                <span>
                  Last Update:{' '}
                  {formatDateToTimezone(
                    lastUpdated,
                    'do MMMM yyyy, h:mm aaa (z)',
                  )}
                </span>
              </div>
            )}
          </div>
          {children}
        </div>
      </div>
      <div css={pageMobileStyles}>
        <MilestonesMobilePage />
      </div>
    </>
  );
};

export default ProjectDetailMilestones;
