import { WorkingGroupResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { Card, Headline3, Paragraph } from '../atoms';
import { colour } from '../colors';
import { createMailTo } from '../mail';
import { Collapsible, CtaCard, CtaContactSection, TagList } from '../molecules';
import { DeliverablesCard, WorkingGroupMembers, RichText } from '../organisms';
import { rem } from '../pixels';

type WorkingGroupAboutProps = {
  readonly showCollaborationCard: boolean;
  readonly membersListElementId: string;
} & Pick<
  WorkingGroupResponse,
  | 'description'
  | 'deliverables'
  | 'pointOfContact'
  | 'members'
  | 'leaders'
  | 'complete'
  | 'tags'
>;
const containerStyles = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(33),
});

const tagListStyle = css({
  marginTop: rem(12),
  marginBottom: rem(24),
});

const WorkingGroupAbout: React.FC<WorkingGroupAboutProps> = ({
  showCollaborationCard,
  membersListElementId,
  description,
  deliverables,
  pointOfContact,
  members,
  leaders,
  complete,
  tags,
}) => (
  <div css={containerStyles}>
    <Card>
      <Headline3 styleAsHeading={5}>Working Group Description</Headline3>
      <Collapsible>
        <RichText text={description} />
      </Collapsible>
    </Card>
    <DeliverablesCard deliverables={deliverables} />
    {!!tags.length && (
      <Card>
        <Headline3 styleAsHeading={5}>Tags</Headline3>
        <div css={tagListStyle}>
          <Paragraph accent="tertiary">
            Explore keywords related to skills, techniques, resources, and
            tools.
          </Paragraph>
        </div>
        <TagList tags={tags} />
      </Card>
    )}
    {showCollaborationCard && (
      <Card accent="green">
        <Headline3 styleAsHeading={5}>
          <span css={{ color: colour.foreground.primary }}>
            Would you like to collaborate with this Working Group?
          </span>
        </Headline3>
        <Paragraph accent="tertiary">
          We are always looking for new people to collaborate with our working
          group to find the best solutions for our goals.
        </Paragraph>
        {pointOfContact && (
          <CtaContactSection
            href={createMailTo(pointOfContact.user.email)}
            buttonText={'Contact'}
            displayCopy
          />
        )}
      </Card>
    )}
    <section id={membersListElementId}>
      <WorkingGroupMembers
        leaders={leaders}
        members={members}
        isComplete={complete}
      />
    </section>
    {!complete && pointOfContact && (
      <CtaCard
        href={createMailTo(pointOfContact.user.email)}
        buttonText="Contact"
        displayCopy
      >
        <strong>Have additional questions?</strong>
        <br /> Members are here to help.
      </CtaCard>
    )}
  </div>
);

export default WorkingGroupAbout;
