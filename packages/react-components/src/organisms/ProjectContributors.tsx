import { CollaboratingTeam, FundedTeam, ProjectMember } from '@asap-hub/model';
import { css } from '@emotion/react';
import { useState } from 'react';

import { Card, Headline3, Paragraph, Pill, TabButton } from '../atoms';
import { neutral900, neutral500 } from '../colors';
import {
  TabNav,
  ProjectMembers,
  LinkHeadline,
  CollaboratingTeams,
} from '../molecules';
import { rem } from '../pixels';

const cardContentStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const subtitleStyles = css({
  marginTop: rem(24),
  marginBottom: rem(12),
});

const tabsContainerStyles = css({
  display: 'flex',
  borderBottom: `1px solid ${neutral500.rgb}`,
  marginTop: rem(8),
});

const tabContentStyles = css({
  paddingTop: rem(32),
});

const membersContentStyles = css({
  paddingTop: rem(20),
});

const teamSectionStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const teamHeaderStyles = css({
  display: 'flex',
  gap: rem(12),
  flexWrap: 'wrap',
});

const teamDescriptionStyles = css({
  color: neutral900.rgb,
  fontSize: rem(17),
  lineHeight: rem(24),
  margin: 0,
});

type ProjectContributorsProps =
  | {
      fundedTeam: FundedTeam;
      collaboratingTeams?: ReadonlyArray<CollaboratingTeam>;
      projectMembers?: never;
    }
  | {
      fundedTeam?: never;
      collaboratingTeams?: never;
      projectMembers: ReadonlyArray<ProjectMember>;
    };

export const tabs = ['Funded Team', 'Collaborators'] as const;

export type Tabs = (typeof tabs)[number];

const ProjectContributors: React.FC<ProjectContributorsProps> = ({
  fundedTeam,
  collaboratingTeams,
  projectMembers,
}) => {
  const [activeTab, setActiveTab] = useState<Tabs>('Funded Team');

  if (projectMembers) {
    return (
      <Card padding={false}>
        <div css={cardContentStyles}>
          <Headline3 noMargin>Contributors</Headline3>
          <Paragraph noMargin accent="neutral900" styles={subtitleStyles}>
            View the people contributing to this project.
          </Paragraph>
          <div css={membersContentStyles}>
            <ProjectMembers members={projectMembers} />
          </div>
        </div>
      </Card>
    );
  }

  if (!fundedTeam) {
    return null;
  }

  const collaboratorsCount = collaboratingTeams?.length ?? 0;

  return (
    <Card padding={false}>
      <div css={cardContentStyles}>
        <Headline3 noMargin>Contributors</Headline3>
        <Paragraph noMargin accent="neutral900" styles={subtitleStyles}>
          View the funded team leading this project and the teams that have
          collaborated on its articles.
        </Paragraph>

        <div css={tabsContainerStyles}>
          <TabNav>
            <TabButton
              active={activeTab === 'Funded Team'}
              onClick={() => setActiveTab('Funded Team')}
            >
              Funded Team
            </TabButton>
            <TabButton
              active={activeTab === 'Collaborators'}
              onClick={() => setActiveTab('Collaborators')}
            >
              Collaborators ({collaboratorsCount})
            </TabButton>
          </TabNav>
        </div>
        <div css={tabContentStyles}>
          {activeTab === 'Funded Team' ? (
            <div css={teamSectionStyles}>
              <div css={teamHeaderStyles}>
                <Pill noMargin>{fundedTeam.teamType}</Pill>
                {fundedTeam.researchTheme && (
                  <Pill noMargin>{fundedTeam.researchTheme}</Pill>
                )}
              </div>
              <LinkHeadline
                href={`/network/teams/${fundedTeam.id}`}
                level={3}
                styleAsHeading={4}
                noMargin
              >
                {fundedTeam.displayName}
              </LinkHeadline>
              <p css={teamDescriptionStyles}>{fundedTeam.teamDescription}</p>
            </div>
          ) : (
            <CollaboratingTeams collaboratingTeams={collaboratingTeams} />
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProjectContributors;
