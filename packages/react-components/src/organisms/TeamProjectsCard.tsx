import React from 'react';
import { css } from '@emotion/react';
import { TeamResponse, ProjectStatus } from '@asap-hub/model';

import { Paragraph, Pill } from '../atoms';
import { LinkHeadline, TabbedCard } from '../molecules';
import { getStatusPillAccent } from './ProjectCard';
import { rem } from '../pixels';
import { getProjectRoute } from '../utils';

const projectHeaderStyles = css({
  display: 'flex',
  gap: rem(12),
  flexWrap: 'wrap',
  marginBottom: rem(16),
});

const titleStyles = css({
  marginBottom: rem(16),
});

const descriptionStyles = css({
  marginTop: 0,
});

const headerParagraphStyles = css({
  marginBottom: rem(8),
});

const cardContentStyles = css({
  paddingBlock: rem(32),
});

type ProjectData = {
  teamType: TeamResponse['teamType'];
  projectTitle: string;
  projectSummary?: string;
  linkedProjectId: string;
  projectStatus?: TeamResponse['projectStatus'];
  supplementGrant?: TeamResponse['supplementGrant'];
  researchTheme?: string;
  resourceType?: string;
  projectType?: TeamResponse['projectType'];
};

type TeamProjectsCardProps = Pick<
  TeamResponse,
  | 'teamType'
  | 'projectTitle'
  | 'projectSummary'
  | 'linkedProjectId'
  | 'projectStatus'
  | 'supplementGrant'
  | 'researchTheme'
  | 'resourceType'
  | 'projectType'
>;

const TeamProjectsCard: React.FC<TeamProjectsCardProps> = ({
  teamType,
  projectTitle,
  projectSummary,
  linkedProjectId,
  projectStatus,
  supplementGrant,
  researchTheme,
  resourceType,
  projectType,
}) => {
  if (!projectTitle || !linkedProjectId) {
    return null;
  }

  const projectData: ProjectData = {
    teamType,
    projectTitle,
    projectSummary,
    linkedProjectId,
    projectStatus,
    supplementGrant,
    researchTheme,
    resourceType,
    projectType,
  };

  return (
    <TabbedCard
      title="Projects"
      description={
        <Paragraph accent="neutral900" noMargin styles={headerParagraphStyles}>
          Explore projects where a team has received funding.
        </Paragraph>
      }
      tabs={[
        {
          tabTitle: 'Funded',
          items: [projectData],
          truncateFrom: undefined,
          disabled: false,
          empty: (
            <Paragraph accent="neutral900">
              There are no funded projects.
            </Paragraph>
          ),
        },
      ]}
    >
      {({ data }) => {
        const project = data[0];
        if (!project) return null;

        // If supplement grant exists, only display its description
        // Otherwise, display the original grant description (projectSummary maps to originalGrant)
        const description = project.supplementGrant
          ? project.supplementGrant.description ?? ''
          : project.projectSummary ?? '';

        const projectRoute = project.projectType
          ? getProjectRoute({
              projectId: project.linkedProjectId,
              projectType: project.projectType,
            })
          : undefined;

        return (
          <div css={cardContentStyles}>
            <div css={projectHeaderStyles}>
              {project.projectStatus && (
                <Pill
                  accent={getStatusPillAccent(
                    project.projectStatus as ProjectStatus,
                  )}
                  noMargin
                >
                  {project.projectStatus}
                </Pill>
              )}
              <Pill noMargin>{project.projectType}</Pill>
              {project.projectType === 'Discovery Project' &&
                project.researchTheme && (
                  <Pill noMargin>{project.researchTheme}</Pill>
                )}
              {project.projectType === 'Resource Project' &&
                project.resourceType && (
                  <Pill noMargin>{project.resourceType}</Pill>
                )}
            </div>

            <div css={titleStyles}>
              <LinkHeadline href={projectRoute} level={4} noMargin>
                {project.projectTitle}
              </LinkHeadline>
            </div>

            {description && (
              <div css={descriptionStyles}>
                <Paragraph noMargin accent="neutral900">
                  {description}
                </Paragraph>
              </div>
            )}
          </div>
        );
      }}
    </TabbedCard>
  );
};

export default TeamProjectsCard;
