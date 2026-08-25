import { css } from '@emotion/react';
import { TeamResponse } from '@asap-hub/model';
import React from 'react';
import { Headline2, Paragraph, Card } from '../atoms';
import { ExpandableText, TeamProfileTags } from '../molecules';
import { rem } from '../pixels';

const cardStyles = {
  padding: `${rem(32)} ${rem(24)}`,
};

type TeamProfileOverviewProps = Pick<TeamResponse, 'tags' | 'teamDescription'> &
  Partial<Pick<TeamResponse, 'teamType' | 'researchTheme' | 'resourceType'>>;

type TeamProfileOverviewContentProps = {
  description: TeamResponse['teamDescription'];
  teamType?: TeamResponse['teamType'];
  researchTheme?: TeamResponse['researchTheme'];
  resourceType?: TeamResponse['resourceType'];
};

const overviewStyles = {
  display: 'flex',
  flexFlow: 'column',
  gap: rem(24),
};

const TeamProfileOverviewContent: React.FC<TeamProfileOverviewContentProps> = ({
  description,
}) => (
  <div css={overviewStyles}>
    <Headline2 styleAsHeading={3} noMargin>
      Team Description
    </Headline2>
    <ExpandableText variant="arrow">
      <Paragraph accent="neutral900" noMargin>
        {description}
      </Paragraph>
    </ExpandableText>
  </div>
);

const TeamProfileOverview: React.FC<TeamProfileOverviewProps> = ({
  tags,
  teamDescription,
  teamType,
  researchTheme,
  resourceType,
}) => (
  <Card overrideStyles={css(cardStyles)}>
    <TeamProfileOverviewContent
      description={teamDescription}
      teamType={teamType}
      researchTheme={researchTheme}
      resourceType={resourceType}
    />
    {tags && tags.length ? <TeamProfileTags tags={tags} /> : null}
  </Card>
);

export default TeamProfileOverview;
