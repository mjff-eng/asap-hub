import { TeamMember } from '@asap-hub/model';
import { css } from '@emotion/react';
import React, { ComponentProps, useMemo } from 'react';
import { rem, tabletScreen } from '../pixels';
import { LabsList, MembersList, RolesList, TabbedCard } from '../molecules';
import { colour } from '../colors';
import { getTeamMembersByStatus, GroupedTeamMember } from '../utils';
import { Paragraph } from '../atoms';

const containerStyles = css({
  listStyle: 'none',
  margin: 0,
  paddingTop: `${rem(32)}`,
  display: 'grid',
  rowGap: rem(24),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    columnGap: rem(15),
  },
});

const nameStyles = css({
  color: colour.brand.crn[500].rgb,
  fontWeight: 'normal',
});

type TeamMembersTabbedCardProps = Pick<
  ComponentProps<typeof TabbedCard>,
  'title' | 'description'
> & {
  readonly members: ReadonlyArray<TeamMember>;
  readonly isTeamInactive: boolean;
};

const TeamMembersTabbedCard: React.FC<TeamMembersTabbedCardProps> = ({
  title,
  description,
  members,
  isTeamInactive,
}) => {
  const { activeMembers, pastMembers } = useMemo(
    () => getTeamMembersByStatus(members, isTeamInactive),
    [members, isTeamInactive],
  );

  return (
    <TabbedCard
      title={title}
      description={description}
      activeTabIndex={isTeamInactive ? 1 : 0}
      tabs={[
        {
          tabTitle: `Active Team Members (${activeMembers.length})`,
          items: activeMembers,
          truncateFrom: 8,
          disabled: isTeamInactive,
          empty: (
            <Paragraph accent="lead">
              There are no active team members.
            </Paragraph>
          ),
        },
        {
          tabTitle: `Past Team Members (${pastMembers.length})`,
          items: pastMembers,
          truncateFrom: 8,
          disabled: pastMembers.length === 0,
          empty: (
            <Paragraph accent="lead">There are no past team members.</Paragraph>
          ),
        },
      ]}
      getShowMoreText={(showMore) =>
        `View ${showMore ? 'Less' : 'More'} Members`
      }
    >
      {({ data }: { data: GroupedTeamMember[] }) => (
        <div css={containerStyles}>
          <MembersList
            members={data.map(
              ({
                displayName,
                roles,
                labs = [],
                avatarUrl,
                firstName,
                lastName,
                id,
                alumniSinceDate,
                latestAward,
              }) => ({
                firstLine: displayName,
                secondLine: <RolesList roles={roles} maxVisible={2} />,
                thirdLine:
                  labs.length > 0 ? (
                    <LabsList labs={labs} maxVisible={2} />
                  ) : undefined,
                avatarUrl,
                firstName,
                lastName,
                id,
                alumniSinceDate,
                latestAward,
              }),
            )}
            overrideNameStyles={nameStyles}
          />
        </div>
      )}
    </TabbedCard>
  );
};

export default TeamMembersTabbedCard;
