import { gp2 } from '@asap-hub/model';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import {
  Card,
  crossQuery,
  ExpandableText,
  Headline3,
  MembersList,
  Paragraph,
  pixels,
  TagList,
} from '@asap-hub/react-components';
import { useFlags } from '@asap-hub/react-context';
import { css } from '@emotion/react';
import { MembersTabbedCard, Milestones } from '../organisms';
import EmailSection from '../organisms/EmailSection';
import Events from '../organisms/Events';

type ProjectOverviewProps = Pick<
  gp2.ProjectResponse,
  | 'status'
  | 'pmEmail'
  | 'leadEmail'
  | 'description'
  | 'milestones'
  | 'members'
  | 'calendar'
  | 'tags'
> & {
  children?: React.ReactNode;
};

const { rem } = pixels;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
  padding: `0 0 ${rem(48)}`,
});

const contentStyles = css({
  paddingTop: rem(20),
});

const columnStyles = css({
  display: 'grid',
  columnGap: rem(32),
  gridRowGap: rem(32),
  [crossQuery]: {
    gridTemplateColumns: '1fr 1fr',
    rowGap: rem(32),
  },
});
const cardStyles = css({
  padding: rem(24),
});

const LEADER_ROLES: ReadonlySet<gp2.ProjectMemberRole> = new Set([
  'Project co-lead',
  'Project lead',
  'Project manager',
]);

const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  status,
  description,
  pmEmail,
  leadEmail,
  tags,
  milestones,
  members,
  calendar,
}) => {
  const { isEnabled } = useFlags();
  const isStagingMode = isEnabled('STAGING_MODE');

  const leaders = members.filter(({ role }) => LEADER_ROLES.has(role));
  const regularMembers = members.filter(({ role }) => !LEADER_ROLES.has(role));

  return (
    <div css={containerStyles}>
      {!!description && (
        <Card overrideStyles={cardStyles}>
          <Headline3 noMargin>Description</Headline3>
          <div css={contentStyles}>
            <ExpandableText>{description}</ExpandableText>
          </div>
        </Card>
      )}
      <div css={columnStyles}>
        <Card overrideStyles={cardStyles}>
          <Headline3 noMargin>Contact Details</Headline3>
          <div css={contentStyles}>
            <EmailSection
              contactEmails={[
                { email: pmEmail, contact: 'PM Email' },
                { email: leadEmail, contact: 'Lead Email' },
              ]}
            />
          </div>
        </Card>
        {calendar && status !== 'Completed' ? (
          <Card overrideStyles={cardStyles}>
            <Headline3 noMargin>Events</Headline3>
            <Events
              calendarId={calendar.id}
              paragraph={
                'Subscribe this project calendar to stay always updated with the latest events.'
              }
            />
          </Card>
        ) : undefined}
      </div>

      {tags.length ? (
        <Card overrideStyles={cardStyles}>
          <Headline3 noMargin>Tags</Headline3>
          <Paragraph accent="tertiary">
            Explore keywords related to skills, techniques, resources, and
            tools.
          </Paragraph>
          <div css={contentStyles}>
            <TagList tags={tags.map(({ name }) => name)} />
          </div>
        </Card>
      ) : null}
      {isStagingMode ? (
        <MembersTabbedCard
          title={`Project Members (${members.length})`}
          leaders={leaders}
          members={regularMembers}
          isComplete={status === 'Completed'}
        />
      ) : (
        <Card>
          <Headline3
            noMargin
          >{`Project Members (${members.length})`}</Headline3>
          <div css={contentStyles}>
            <MembersList
              members={members.map(
                ({
                  role,
                  firstName,
                  lastName,
                  displayName,
                  avatarUrl,
                  alumniSinceDate,
                  userId: id,
                }) => ({
                  firstLine: displayName,
                  secondLine: role,
                  avatarUrl,
                  firstName,
                  lastName,
                  alumniSinceDate,
                  id,
                }),
              )}
              userRoute={gp2Routing.users({}).user}
              overrideNameStyles={css({ overflowWrap: 'anywhere' })}
            />
          </div>
        </Card>
      )}
      <Card padding={false} overrideStyles={cardStyles}>
        <Milestones
          milestones={milestones}
          title="Project Milestones"
          description=""
        />
      </Card>
    </div>
  );
};

export default ProjectOverview;
