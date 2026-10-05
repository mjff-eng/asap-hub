import React, { ComponentProps, ReactNode } from 'react';
import { getUserAwards, UserResponse } from '@asap-hub/model';

import {
  ProfileExpertiseAndResources,
  QuestionsSection,
  ProfileCardList,
  HelpSection,
  UserProfileBadges,
} from '../organisms';
import { CtaCard } from '../molecules';
import { createMailTo } from '../mail';
import UserProfileRole from '../organisms/UserProfileRole';

type UserProfileResearchProps = ComponentProps<typeof QuestionsSection> &
  ComponentProps<typeof ProfileExpertiseAndResources> &
  Pick<
    UserResponse,
    'email' | 'contactEmail' | 'displayName' | 'alumniSinceDate'
  > &
  ComponentProps<typeof UserProfileRole> & {
    teams?: UserResponse['teams'];
    userProfileGroupsCard?: ReactNode;
    userProfileProjectsCard?: ReactNode;
    userProfileWorkingGroupsCard?: ReactNode;
    userProfileTeamsCard?: ReactNode;
    editExpertiseAndResourcesHref?: string;
    editQuestionsHref?: string;
    editRoleHref?: string;
    isOwnProfile?: boolean;
  };

const UserProfileResearch: React.FC<UserProfileResearchProps> = ({
  firstName,
  email,
  contactEmail,
  alumniSinceDate,
  expertiseAndResourceDescription,
  questions,
  isOwnProfile,
  displayName,
  userProfileGroupsCard,
  userProfileProjectsCard,
  userProfileWorkingGroupsCard,
  userProfileTeamsCard,
  editExpertiseAndResourcesHref,
  editQuestionsHref,
  editRoleHref,
  role,
  tags,
  teams,
  ...roleProps
}) => {
  const badges = getUserAwards(teams);
  const badgesCard = badges.length > 0 && {
    card: <UserProfileBadges badges={badges} />,
  };
  const isRoleEmpty =
    !roleProps.researchInterests && !roleProps.responsibilities;
  const showRoleSection = isOwnProfile ? true : !isRoleEmpty;
  const roleSection = [
    showRoleSection && {
      card: (
        <UserProfileRole firstName={firstName} role={role} {...roleProps} />
      ),
      editLink:
        editRoleHref === undefined
          ? undefined
          : {
              href: editRoleHref,
              label: 'Edit team role',
            },
    },
  ];
  const staffCards = [
    badgesCard,
    userProfileWorkingGroupsCard !== undefined && {
      card: userProfileWorkingGroupsCard,
    },
    userProfileTeamsCard !== undefined && {
      card: userProfileTeamsCard,
    },
    !isOwnProfile && {
      card: <HelpSection />,
    },
  ];
  const defaultCards = [
    {
      card: <QuestionsSection questions={questions} />,
      editLink:
        editQuestionsHref === undefined
          ? undefined
          : {
              href: editQuestionsHref,
              label: 'Edit open questions',
            },
    },
    badgesCard,
    userProfileWorkingGroupsCard !== undefined && {
      card: userProfileWorkingGroupsCard,
    },
    userProfileGroupsCard !== undefined && {
      card: userProfileGroupsCard,
    },
    userProfileTeamsCard !== undefined && {
      card: userProfileTeamsCard,
    },
    !isOwnProfile &&
      !alumniSinceDate && {
        card: (
          <CtaCard
            href={createMailTo(contactEmail || email)}
            buttonText="Contact"
            displayCopy
          >
            <strong>Have additional questions?</strong> <br />
            {displayName} is available to help.
          </CtaCard>
        ),
      },
  ];
  return (
    <ProfileCardList>
      {[
        userProfileProjectsCard !== undefined && {
          card: userProfileProjectsCard,
        },
        ...roleSection,
        {
          card: (
            <ProfileExpertiseAndResources
              expertiseAndResourceDescription={expertiseAndResourceDescription}
              tags={tags}
            />
          ),

          editLink:
            editExpertiseAndResourcesHref === undefined
              ? undefined
              : {
                  href: editExpertiseAndResourcesHref,
                  label: 'Edit expertise and resources',
                },
        },
        ...(role === 'Staff' ? staffCards : defaultCards),
      ].filter(Boolean)}
    </ProfileCardList>
  );
};

export default UserProfileResearch;
