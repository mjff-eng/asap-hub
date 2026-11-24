import { gp2 } from '@asap-hub/model';
import { mediaFrom, pixels } from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import {
  UserBiography,
  UserContactInformation,
  UserContributingCohorts,
  UserFundingStreams,
  UserTags,
  UserProjects,
  UserQuestions,
  UserWorkingGroups,
} from '../organisms';

type UserOverviewProps = Pick<
  gp2.UserResponse,
  | 'id'
  | 'email'
  | 'alternativeEmail'
  | 'biography'
  | 'tags'
  | 'fundingStreams'
  | 'projects'
  | 'workingGroups'
  | 'contributingCohorts'
> &
  ComponentProps<typeof UserQuestions> & {
    editBiographyHref?: string;
    editContactInfoHref?: string;
    editContributingCohortsHref?: string;
    editFundingStreamsHref?: string;
    editTagsHref?: string;
    editQuestionsHref?: string;
    children?: React.ReactNode;
  };

const { rem } = pixels;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
  padding: `0 0 ${rem(48)}`,
});

const columnStyles = css({
  display: 'grid',
  gap: rem(32),
  [mediaFrom.laptop]: {
    gridTemplateColumns: '1fr 1fr',
    rowGap: rem(32),
  },
});
const UserOverview: React.FC<UserOverviewProps> = ({
  id,
  biography,
  email,
  alternativeEmail,
  tags,
  fundingStreams,
  questions,
  projects,
  workingGroups,
  contributingCohorts,
  editBiographyHref,
  editContactInfoHref,
  editContributingCohortsHref,
  editFundingStreamsHref,
  editTagsHref,
  editQuestionsHref,
}) => (
  <div css={containerStyles}>
    <div css={[columnStyles]}>
      <UserContactInformation
        alternativeEmail={alternativeEmail}
        email={email}
        editHref={editContactInfoHref}
      />
      <UserTags tags={tags} editHref={editTagsHref} />
    </div>
    <UserBiography biography={biography} editHref={editBiographyHref} />
    {projects.length > 0 && <UserProjects projects={projects} id={id} />}
    {workingGroups.length > 0 && (
      <UserWorkingGroups workingGroups={workingGroups} id={id} />
    )}
    {(editQuestionsHref || questions.length > 0) && (
      <UserQuestions questions={questions} editHref={editQuestionsHref} />
    )}
    {(editFundingStreamsHref || fundingStreams) && (
      <UserFundingStreams
        fundingStreams={fundingStreams}
        editHref={editFundingStreamsHref}
      />
    )}
    {(editContributingCohortsHref || contributingCohorts.length > 0) && (
      <UserContributingCohorts
        contributingCohorts={contributingCohorts}
        editHref={editContributingCohortsHref}
      />
    )}
  </div>
);

export default UserOverview;
