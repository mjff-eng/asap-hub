import { gp2 as gp2Routing } from '@asap-hub/routing';
import {
  Card,
  MembersList,
  Paragraph,
  TabbedContent,
  pixels,
  utils,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';

type Member = {
  userId: string;
  role: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  alumniSinceDate?: string;
  inactiveSinceDate?: string;
};

type MembersTabbedCardProps = {
  title: string;
  leaders: Member[];
  members: Member[];
  isComplete: boolean;
};

const { rem } = pixels;

const cardStyles = css({ padding: rem(24) });
const memberListStyles = css({ paddingTop: rem(32) });
const tabDescriptionStyles = css({ fontWeight: 'bold', margin: `${rem(8)} 0` });
const emptyLeaderStyles = css({ marginTop: rem(-1), marginBottom: rem(44) });
const emptyMemberStyles = css({ marginTop: rem(-1), marginBottom: rem(12) });
const nameStyles = css({ overflowWrap: 'anywhere' });

const mapMember = ({
  role,
  firstName,
  lastName,
  displayName,
  avatarUrl,
  alumniSinceDate,
  userId: id,
}: Member) => ({
  firstLine: displayName,
  secondLine: role,
  avatarUrl,
  firstName,
  lastName,
  alumniSinceDate,
  id,
});

const isActiveMember =
  (isComplete: boolean) =>
  (member: Member): boolean =>
    !isComplete && !member.alumniSinceDate && !member.inactiveSinceDate;

const MembersTabbedCard: React.FC<MembersTabbedCardProps> = ({
  title,
  leaders,
  members,
  isComplete,
}) => {
  const activeTabIndex = isComplete ? 1 : 0;
  const predicate = isActiveMember(isComplete);

  const [activeLeaders, pastLeaders] = utils.splitListBy(leaders, predicate);
  const [activeMembers, pastMembers] = utils.splitListBy(members, predicate);

  const renderList = (data: Member[]) => (
    <div css={memberListStyles}>
      <MembersList
        members={data.map(mapMember)}
        userRoute={gp2Routing.users({}).user}
        overrideNameStyles={nameStyles}
      />
    </div>
  );

  return (
    <Card overrideStyles={cardStyles}>
      <TabbedContent
        title={title}
        description={
          <Paragraph noMargin styles={tabDescriptionStyles}>
            Leaders
          </Paragraph>
        }
        activeTabIndex={activeTabIndex}
        tabs={[
          {
            tabTitle: `Active Leaders (${activeLeaders.length})`,
            items: activeLeaders,
            empty: (
              <div css={emptyLeaderStyles}>
                <Paragraph accent="tertiary" noMargin>
                  There are no active leaders.
                </Paragraph>
              </div>
            ),
          },
          {
            tabTitle: `Past Leaders (${pastLeaders.length})`,
            items: pastLeaders,
            empty: (
              <div css={emptyLeaderStyles}>
                <Paragraph accent="tertiary" noMargin>
                  There are no past leaders.
                </Paragraph>
              </div>
            ),
          },
        ]}
      >
        {({ data }) => renderList(data)}
      </TabbedContent>
      <div css={{ marginTop: rem(-24) }}>
        <TabbedContent
          description={
            <Paragraph noMargin styles={tabDescriptionStyles}>
              Members
            </Paragraph>
          }
          activeTabIndex={activeTabIndex}
          tabs={[
            {
              tabTitle: `Active Members (${activeMembers.length})`,
              items: activeMembers,
              truncateFrom: 8,
              empty: (
                <div css={emptyMemberStyles}>
                  <Paragraph accent="tertiary" noMargin>
                    There are no active members.
                  </Paragraph>
                </div>
              ),
            },
            {
              tabTitle: `Past Members (${pastMembers.length})`,
              items: pastMembers,
              truncateFrom: 8,
              empty: (
                <div css={emptyMemberStyles}>
                  <Paragraph accent="tertiary" noMargin>
                    There are no past members.
                  </Paragraph>
                </div>
              ),
            },
          ]}
          getShowMoreText={(showMore) =>
            `View ${showMore ? 'Less' : 'More'} Members`
          }
        >
          {({ data }) => renderList(data)}
        </TabbedContent>
      </div>
    </Card>
  );
};

export default MembersTabbedCard;
