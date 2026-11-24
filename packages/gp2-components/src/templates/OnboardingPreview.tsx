import { mediaFrom, Paragraph, pixels } from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { ContactSupport } from '../molecules';
import {
  UserBiography,
  UserContactInformation,
  UserContributingCohorts,
  UserDetailHeaderCard,
  UserFundingStreams,
  UserTags,
  UserProjects,
  UserQuestions,
  UserWorkingGroups,
} from '../organisms';
import OnboardingAdditionalDetails from './OnboardingAdditionalDetails';
import OnboardingBackground from './OnboardingBackground';
import OnboardingCoreDetails from './OnboardingCoreDetails';
import OnboardingGroups from './OnboardingGroups';

const { onboarding } = gp2Routing;
const { rem } = pixels;

const columnStyles = css({
  display: 'grid',
  gap: rem(32),
  [mediaFrom.laptop]: {
    gridTemplateColumns: '1fr 1fr',
    rowGap: rem(32),
  },
});

type OnboardingPreviewProps = ComponentProps<typeof OnboardingCoreDetails> &
  ComponentProps<typeof OnboardingBackground> &
  ComponentProps<typeof OnboardingGroups> &
  ComponentProps<typeof OnboardingAdditionalDetails> & {
    editKeyInfoHref: string;
    editContactInfoHref: string;
  };

const OnboardingPreview: React.FC<OnboardingPreviewProps> = ({
  biography,
  tags,
  email,
  alternativeEmail,
  projects,
  workingGroups,
  questions,
  fundingStreams,
  contributingCohorts,
  editBiographyHref,
  editContactInfoHref,
  editKeyInfoHref,
  editTagsHref,
  editQuestionsHref,
  editFundingStreamsHref,
  editContributingCohortsHref,
  ...headerProps
}) => (
  <>
    <Paragraph noMargin>
      It’s time to preview what your profile will look like to others on the
      network once published. Once you’re happy with what others will see, click
      “Publish” to begin exploring.
    </Paragraph>
    <UserDetailHeaderCard
      {...headerProps}
      editHref={onboarding({}).preview({}).editKeyInfo({}).$}
    />
    <div css={[columnStyles]}>
      <UserContactInformation
        editHref={editContactInfoHref}
        alternativeEmail={alternativeEmail}
        email={email}
      />
      <UserTags tags={tags} editHref={editTagsHref} />
    </div>
    <UserBiography biography={biography} editHref={editBiographyHref} />
    {projects && (
      <UserProjects
        id={headerProps.id}
        noLinks
        projects={projects}
        subtitle={<ContactSupport />}
        isOnboarding
      />
    )}
    {workingGroups && (
      <UserWorkingGroups
        id={headerProps.id}
        noLinks
        workingGroups={workingGroups}
        subtitle={<ContactSupport />}
        isOnboarding
      />
    )}
    <UserQuestions questions={questions} editHref={editQuestionsHref} />
    <UserFundingStreams
      fundingStreams={fundingStreams}
      editHref={editFundingStreamsHref}
    />
    <UserContributingCohorts
      contributingCohorts={contributingCohorts}
      editHref={editContributingCohortsHref}
    />
  </>
);

export default OnboardingPreview;
