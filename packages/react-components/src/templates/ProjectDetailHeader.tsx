import {
  groupTraineeProjectMembers,
  ProjectDetail,
  ProjectMember,
} from '@asap-hub/model';
import {
  dashboard,
  projectListRouteByType,
  projectRouteByType,
} from '@asap-hub/routing';
import { css } from '@emotion/react';
import { Display, Pill, Link, CopyButton, TabLink } from '../atoms';
import { colour } from '../colors';
import {
  googleDriveIcon,
  DiscoveryTeamIcon,
  ResourceTeamIcon,
  ResourceMemberIcon,
  MemberIcon,
  TraineeIcon,
  plusIcon,
  article,
  bioinformatics,
  crnReportIcon,
  dataset,
  labMaterial,
  protocol,
} from '../icons';
import { createMailTo } from '../mail';
import {
  Breadcrumbs,
  UsersList,
  TabNav,
  ProjectDuration,
  DropdownButton,
} from '../molecules';
import { rem, tabletScreen } from '../pixels';
import { getStatusPillAccent } from '../organisms/ProjectCard';
import { withMemberHref } from '../utils';
import PageInfoContainer from './PageInfoContainer';
import Toast from '../organisms/Toast';

const headerStyles = css({
  display: 'flex',
  gap: rem(8),
  marginBottom: rem(24),
  flexWrap: 'wrap',
});

const titleStyles = css({
  marginBottom: rem(24),
});

const actionsContainerStyles = css({
  display: 'flex',
  gap: rem(12),
  marginBottom: rem(24),
  flexWrap: 'wrap',
  alignItems: 'center',
});

const contactButtonStyles = css({
  display: 'flex',
  gap: rem(8),
  alignItems: 'center',
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    width: '100%',
  },
});

const driveButtonStyles = css({
  width: 'fit-content',
  paddingBottom: rem(24),
});

const buttonStyles = css({
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'flex',
    flexGrow: 1,
  },
});

const metadataStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  marginBottom: rem(12),
});

const metadataRowStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
  fontSize: rem(17),
  color: colour.foreground.tertiary,
});
const iconContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

const iconStyles = css({
  display: 'inline-flex',
  width: rem(24),
  height: rem(24),
  flexShrink: 0,
  '& svg': {
    width: '100%',
    height: '100%',
  },
});

const teamLinkStyles = css({
  color: '#00A650',
  fontWeight: 500,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
});

const discoveryProjectDurationStyles = css({
  marginLeft: rem(16),
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    marginLeft: 0,
    width: '100%',
  },
});

const discoveryDurationMediaStyles = css({
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    marginLeft: 0,
    flexDirection: 'column',
    gap: rem(16),
  },
});

const toastContainerStyles = css({
  marginBottom: rem(24),
});

const dropdownButtonStyling = css({
  display: 'flex',
  columnGap: rem(8),
});

type ProjectDetailHeaderProps = ProjectDetail & {
  readonly pointOfContactEmail?: string;
  readonly aboutHref: string;
  readonly workspaceHref?: string;
  readonly milestonesHref: string;
  readonly complianceHref?: string;
  readonly outputsHref?: string;
  readonly draftOutputsHref?: string;
  readonly manuscriptsCount?: number;
  readonly outputsCount?: number;
  readonly draftOutputsCount?: number;
  readonly canShareOutput?: boolean;
};

export const getTeamIcon = (project: ProjectDetail) => {
  if (project.projectType === 'Discovery Project') {
    return <DiscoveryTeamIcon />;
  }
  if (project.projectType === 'Resource Project' && project.isTeamBased) {
    return <ResourceTeamIcon />;
  }
  if (project.projectType === 'Resource Project' && !project.isTeamBased) {
    return <ResourceMemberIcon />;
  }
  if (project.projectType === 'Trainee Project') {
    return <TraineeIcon />;
  }
  return null;
};

type MemberWithHref = ProjectMember & { href: string };

const ProjectDetailHeader = (project: ProjectDetailHeaderProps) => {
  const {
    pointOfContactEmail,
    aboutHref,
    workspaceHref,
    milestonesHref,
    complianceHref,
    outputsHref,
    draftOutputsHref,
    manuscriptsCount,
    outputsCount,
    draftOutputsCount,
    canShareOutput = false,
  } = project;

  const route = projectRouteByType[project.projectType](project.id);

  const projectListHref = projectListRouteByType[project.projectType]().$;

  const membersWithHref =
    'members' in project ? project.members?.map(withMemberHref) : undefined;

  return (
    <>
      {/* Closed Project Banner */}
      {project.status === 'Closed' && (
        <div css={toastContainerStyles}>
          <Toast accent="warning">
            This project concluded earlier than expected and some milestones are
            incomplete.
          </Toast>
        </div>
      )}
      <header>
        <PageInfoContainer
          breadcrumbs={
            <Breadcrumbs
              homeHref={dashboard({}).$}
              items={[
                { label: `${project.projectType}s`, href: projectListHref },
                { label: project.title },
              ]}
            />
          }
          nav={
            <TabNav>
              <TabLink href={aboutHref}>About</TabLink>
              <TabLink href={milestonesHref}>Milestones</TabLink>
              {workspaceHref ? (
                <TabLink href={workspaceHref}>Workspace</TabLink>
              ) : null}
              {complianceHref ? (
                <TabLink href={complianceHref}>
                  Compliance
                  {manuscriptsCount !== undefined && ` (${manuscriptsCount})`}
                </TabLink>
              ) : null}
              {outputsHref ? (
                <TabLink href={outputsHref}>
                  Outputs
                  {outputsCount !== undefined && ` (${outputsCount})`}
                </TabLink>
              ) : null}
              {draftOutputsHref ? (
                <TabLink href={draftOutputsHref}>
                  Draft Outputs
                  {draftOutputsCount !== undefined && ` (${draftOutputsCount})`}
                </TabLink>
              ) : null}
            </TabNav>
          }
        >
          {/* Status and Type Pills */}
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
            <Display styleAsHeading={2}>{project.title}</Display>
          </div>

          {/* Action Buttons */}
          {project.status === 'Active' && (
            <div css={actionsContainerStyles}>
              {pointOfContactEmail && (
                <div css={contactButtonStyles}>
                  <span css={buttonStyles}>
                    <Link
                      buttonStyle
                      small
                      primary
                      href={createMailTo(pointOfContactEmail)}
                      noMargin
                    >
                      Contact
                    </Link>
                  </span>
                  <CopyButton
                    hoverTooltipText="Copy Email"
                    clickTooltipText="Email Copied"
                    onClick={() =>
                      navigator.clipboard.writeText(pointOfContactEmail)
                    }
                  />
                </div>
              )}

              {canShareOutput && (
                <div css={css({ marginLeft: 'auto' })}>
                  <DropdownButton
                    noMargin
                    buttonChildren={() => (
                      <span css={dropdownButtonStyling}>
                        {plusIcon}
                        Share an Output
                      </span>
                    )}
                    primary
                  >
                    {{
                      item: <>{article} Article</>,
                      href: route.createOutput({
                        outputDocumentType: 'article',
                      }).$,
                    }}
                    {{
                      item: <>{bioinformatics} Bioinformatics</>,
                      href: route.createOutput({
                        outputDocumentType: 'bioinformatics',
                      }).$,
                    }}
                    {{
                      item: <>{crnReportIcon} CRN Report</>,
                      href: route.createOutput({
                        outputDocumentType: 'report',
                      }).$,
                    }}
                    {{
                      item: <>{dataset} Dataset</>,
                      href: route.createOutput({
                        outputDocumentType: 'dataset',
                      }).$,
                    }}
                    {{
                      item: <>{labMaterial} Lab Material</>,
                      href: route.createOutput({
                        outputDocumentType: 'lab-material',
                      }).$,
                    }}
                    {{
                      item: <>{protocol} Protocol</>,
                      href: route.createOutput({
                        outputDocumentType: 'protocol',
                      }).$,
                    }}
                  </DropdownButton>
                </div>
              )}
            </div>
          )}

          {/* Access Drive for Resource projects */}
          {project.projectType === 'Resource Project' &&
            project.googleDriveLink && (
              <div css={driveButtonStyles}>
                <Link href={project.googleDriveLink} buttonStyle small noMargin>
                  {googleDriveIcon} Access Drive
                </Link>
              </div>
            )}
          {/* Metadata Section */}
          <div css={metadataStyles}>
            {/* Team/Members Info */}
            {project.projectType === 'Discovery Project' && (
              <div css={[metadataRowStyles, discoveryDurationMediaStyles]}>
                <div css={iconContainerStyles}>
                  <span css={iconStyles}>{getTeamIcon(project)}</span>
                  {project.teamId ? (
                    <Link href={`/network/teams/${project.teamId}`}>
                      <span css={teamLinkStyles}>{project.teamName}</span>
                    </Link>
                  ) : (
                    <span css={teamLinkStyles}>{project.teamName}</span>
                  )}
                </div>
                <div css={discoveryProjectDurationStyles}>
                  <ProjectDuration
                    startDate={project.startDate}
                    endDate={project.endDate}
                    projectStatus={project.status}
                  />
                </div>
              </div>
            )}

            {project.projectType === 'Resource Project' &&
              project.isTeamBased &&
              project.teamName && (
                <div css={metadataRowStyles}>
                  <span css={iconStyles}>{getTeamIcon(project)}</span>
                  {project.teamId ? (
                    <Link href={`/network/teams/${project.teamId}`}>
                      <span css={teamLinkStyles}>{project.teamName}</span>
                    </Link>
                  ) : (
                    <span css={teamLinkStyles}>{project.teamName}</span>
                  )}
                  {project.isTeamBased && (
                    <div css={discoveryProjectDurationStyles}>
                      <ProjectDuration
                        startDate={project.startDate}
                        endDate={project.endDate}
                        projectStatus={project.status}
                      />
                    </div>
                  )}
                </div>
              )}

            {project.projectType === 'Resource Project' &&
              !project.isTeamBased &&
              membersWithHref && (
                <div css={metadataRowStyles}>
                  <span css={iconStyles}>{getTeamIcon(project)}</span>
                  <UsersList users={membersWithHref} separator="•" noMargin />
                </div>
              )}

            {project.projectType === 'Trainee Project' &&
              membersWithHref &&
              (() => {
                const { trainees, mentors } =
                  groupTraineeProjectMembers<MemberWithHref>(membersWithHref);

                return (
                  <>
                    {/* First row: Trainees */}
                    {trainees.length > 0 && (
                      <div css={metadataRowStyles}>
                        <span css={iconStyles}>
                          <TraineeIcon />
                        </span>
                        <UsersList users={trainees} separator="•" noMargin />
                      </div>
                    )}
                    {/* Second row: Mentors */}
                    {mentors.length > 0 && (
                      <div css={metadataRowStyles}>
                        <span css={iconStyles}>
                          <MemberIcon />
                        </span>
                        <UsersList users={mentors} separator="•" noMargin />
                      </div>
                    )}
                  </>
                );
              })()}

            {/* Duration */}
            {(project.projectType === 'Trainee Project' ||
              (project.projectType === 'Resource Project' &&
                !project.isTeamBased)) && (
              <ProjectDuration
                startDate={project.startDate}
                endDate={project.endDate}
                projectStatus={project.status}
              />
            )}
          </div>
        </PageInfoContainer>
      </header>
    </>
  );
};

export default ProjectDetailHeader;
