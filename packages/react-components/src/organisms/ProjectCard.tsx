import { FC } from 'react';
import { css } from '@emotion/react';
import {
  DiscoveryProject,
  groupTraineeProjectMembers,
  ResourceProject,
  TraineeProject,
  ProjectStatus,
} from '@asap-hub/model';

import { Card, Pill, Link } from '../atoms';
import {
  TagList,
  LinkHeadline,
  UsersList,
  ProjectDuration,
} from '../molecules';
import { rem } from '../pixels';
import {
  googleDriveIcon,
  DiscoveryTeamIcon,
  ResourceTeamIcon,
  ResourceMemberIcon,
  MemberIcon,
  InactiveBadgeIcon,
  TraineeIcon,
} from '../icons';
import { colour, neutral900 } from '../colors';

const cardStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const headerStyles = css({
  display: 'flex',
  gap: rem(12),
  marginBottom: rem(15),
});

const titleStyles = css({
  '& h3': {
    lineHeight: rem(16),
  },
});

const metadataStyles = css({
  display: 'flex',
  flexDirection: 'column',
  marginTop: rem(15),
  rowGap: rem(15),
});

const traineeMetadataWrapperStyles = css({
  display: 'flex',
  flexDirection: 'column',
  rowGap: rem(15),
});

const metadataRowStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
  fontSize: rem(17),
  color: neutral900.rgb,
});

const iconStyles = css({
  display: 'inline-flex',
  width: rem(24),
  height: rem(24),
  flexShrink: 0, // Prevent icon from shrinking
  '& svg': {
    width: '100%',
    height: '100%',
  },
});

const teamNameStyles = css({
  color: colour.brand.crn[500],
  fontWeight: 500,
});

const tagsContainerStyles = css({
  marginTop: rem(24),
});

const driveButtonStyles = css({
  width: 'fit-content',
  marginTop: rem(12),
});

type ProjectCardProps =
  | Omit<DiscoveryProject, 'statusRank'>
  | Omit<ResourceProject, 'statusRank'>
  | Omit<TraineeProject, 'statusRank'>;

export const getStatusPillAccent = (
  status: ProjectStatus,
): 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'Active':
      return 'info';
    case 'Completed':
      return 'success';
    case 'Closed':
      return 'warning';
    default:
      return 'info';
  }
};

export const getCardAccentByStatus = (
  status: ProjectStatus,
): 'default' | 'neutral200' => {
  switch (status) {
    case 'Completed':
      return 'neutral200';
    case 'Closed':
      return 'neutral200';
    default:
      return 'default';
  }
};

const ProjectCard: FC<ProjectCardProps> = (project) => {
  const getHref = () =>
    `/projects/${project.projectType
      .replace(/\s+Project$/, '')
      .toLowerCase()}/${project.id}/about`;

  return (
    <Card accent={getCardAccentByStatus(project.status)} padding={false}>
      <div css={cardStyles} data-testid="project-card-id">
        {/* Header with Pills */}
        <div css={headerStyles}>
          <Pill accent={getStatusPillAccent(project.status)} noMargin>
            {project.status}
          </Pill>
          <Pill noMargin>{project.projectType}</Pill>
          {project.projectType === 'Discovery Project' && (
            <Pill noMargin>{project.researchTheme}</Pill>
          )}
          {project.projectType === 'Resource Project' && (
            <Pill noMargin>{project.resourceType}</Pill>
          )}
        </div>

        {/* Title */}

        <div css={titleStyles}>
          <LinkHeadline level={3} styleAsHeading={4} href={getHref()} noMargin>
            {project.title}
          </LinkHeadline>
        </div>

        {/* Google Drive Link for Resource Projects */}
        {project.projectType === 'Resource Project' &&
          project.googleDriveLink && (
            <div css={driveButtonStyles}>
              <Link href={project.googleDriveLink} buttonStyle small noMargin>
                {googleDriveIcon} Access Drive
              </Link>
            </div>
          )}

        {/* Metadata Container */}
        <div css={metadataStyles}>
          {/* Team Name for Discovery Projects */}
          {project.projectType === 'Discovery Project' && (
            <div css={metadataRowStyles}>
              <span css={iconStyles}>
                <DiscoveryTeamIcon />
              </span>
              {project.teamId ? (
                <Link href={`/network/teams/${project.teamId}`}>
                  <span css={teamNameStyles}>{project.teamName}</span>
                </Link>
              ) : (
                <span css={teamNameStyles}>{project.teamName}</span>
              )}
              {project.inactiveSinceDate && <InactiveBadgeIcon />}
            </div>
          )}

          {/* Team Name for Resource Projects (if team-based) */}
          {project.projectType === 'Resource Project' &&
            project.isTeamBased &&
            project.teamName && (
              <div css={metadataRowStyles}>
                <span css={iconStyles}>
                  <ResourceTeamIcon />
                </span>
                {project.teamId ? (
                  <Link href={`/network/teams/${project.teamId}`}>
                    <span css={teamNameStyles}>{project.teamName}</span>
                  </Link>
                ) : (
                  <span css={teamNameStyles}>{project.teamName}</span>
                )}
              </div>
            )}

          {/* Members for Resource Projects (if not team-based) */}
          {project.projectType === 'Resource Project' &&
            !project.isTeamBased &&
            project.members &&
            project.members.length > 0 && (
              <div css={metadataRowStyles}>
                <span css={iconStyles}>
                  <ResourceMemberIcon />
                </span>
                <UsersList
                  label="Members"
                  users={project.members}
                  separator="•"
                  noMargin
                  max={3}
                />
              </div>
            )}

          {/* Members for Trainee Projects */}
          {project.projectType === 'Trainee Project' &&
            (() => {
              const { trainees, mentors } = groupTraineeProjectMembers(
                project.members,
              );

              return (
                <div css={traineeMetadataWrapperStyles}>
                  {/* First row: Trainees */}
                  {trainees.length > 0 && (
                    <div css={metadataRowStyles}>
                      <span css={iconStyles}>
                        <TraineeIcon />
                      </span>
                      <UsersList
                        label="Members"
                        users={trainees}
                        separator="•"
                        noMargin
                        max={3}
                      />
                    </div>
                  )}
                  {/* Second row: Mentors */}
                  {mentors.length > 0 && (
                    <div css={metadataRowStyles}>
                      <span css={iconStyles}>
                        <MemberIcon />
                      </span>
                      <UsersList
                        label="Members"
                        users={mentors}
                        separator="•"
                        noMargin
                        max={3}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Duration */}
          <ProjectDuration
            startDate={project.startDate}
            endDate={project.endDate}
            projectStatus={project.status}
          />
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div css={tagsContainerStyles}>
            <TagList tags={project.tags} max={3} noMargin />
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProjectCard;
