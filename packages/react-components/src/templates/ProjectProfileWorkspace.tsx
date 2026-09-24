import { TeamTool, WorkspaceManuscript } from '@asap-hub/model';
import { useCurrentUserCRN } from '@asap-hub/react-context';
import { css } from '@emotion/react';
import { ComponentProps, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  Button,
  Caption,
  Card,
  Display,
  Headline2,
  Headline3,
  Link,
  Paragraph,
  Subtitle,
} from '../atoms';
import { formatDateAndTime } from '../date';
import { deskTopIcon, plusIcon } from '../icons';
import { createMailTo, mailToSupport } from '../mail';
import { EligibilityModal, ToolCard } from '../organisms';
import type DiscussionCard from '../organisms/DiscussionCard';
import ManuscriptCard from '../organisms/ManuscriptCard';
import { mobileScreen, rem } from '../pixels';

const containerStyles = css({
  display: 'grid',
  gridRowGap: rem(36),
});

const desktopOnlyStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});

const mobileOnlyStyles = css({
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});

const mobileContainerStyles = css({
  padding: rem(18),
  textAlign: 'center',
  display: 'flex',
});

const newToolStyles = css({
  display: 'flex',
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    display: 'block',
  },
});

const complianceContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
});

const complianceHeaderStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
});

const manuscriptButtonStyles = css({
  flexGrow: 0,
  alignSelf: 'center',
  gap: rem(8),
});

const complianceCardContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
});

const manuscriptsGroupStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
});

const toolContainerStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: `${rem(24)} 0`,

  display: 'grid',
  gridRowGap: rem(24),
});

const projectMemberCopy = {
  manuscriptSubmissions:
    'The following manuscripts were submitted by your team for a compliance review.',
  manuscriptCollaborations:
    'The following manuscripts were submitted by another project for compliance review. Your team has been listed as a contributor to the manuscript.',
  noManuscriptSubmissions:
    'Your team has not submitted a manuscript for compliance review.',
  noManuscriptCollaborations:
    'Your team has not been listed as a contributor on manuscripts that were submitted for compliance review by other projects.',
};

const hubStaffCopy = {
  manuscriptSubmissions:
    'The following manuscripts were submitted by this team for a compliance review.',
  manuscriptCollaborations:
    'The following manuscripts were submitted by another project for compliance review. This team has been listed as a contributor to the manuscript.',
  noManuscriptSubmissions:
    'This team has not submitted a manuscript for compliance review.',
  noManuscriptCollaborations:
    'This team has not been listed as a contributor on manuscripts that were submitted for compliance review by other projects.',
};

type ProjectProfileWorkspaceProps = Pick<
  ComponentProps<typeof ManuscriptCard>,
  | 'onUpdateManuscript'
  | 'isComplianceReviewer'
  | 'createDiscussion'
  | 'handleFileUpload'
  | 'useManuscriptById'
> &
  Pick<
    ComponentProps<typeof DiscussionCard>,
    'onReplyToDiscussion' | 'onMarkDiscussionAsRead'
  > & {
    readonly id: string;
    readonly isProjectMember: boolean;
    readonly isTeamBased: boolean;
    readonly manuscripts: ReadonlyArray<WorkspaceManuscript>;
    readonly collaborationManuscripts?: ReadonlyArray<WorkspaceManuscript>;
    readonly tools: ReadonlyArray<TeamTool>;
    readonly lastModifiedDate: string;
    readonly lastModifiedBy?: string;
    readonly lastModifiedByHref?: string;
    readonly contactEmail?: string;
    readonly contactName?: string;
    readonly onDeleteTool?: (toolIndex: number) => Promise<void>;
    readonly toolsHref: string;
    readonly editToolHref: (toolIndex: number) => string;
    readonly isActiveProject?: boolean;
    readonly targetManuscriptId?: string;
    readonly setEligibilityReasons?: (
      newEligibilityReason: Set<string>,
    ) => void;
    readonly createManuscriptHref?: string;
    readonly getEditManuscriptHref?: (manuscriptId: string) => string;
    readonly getResubmitManuscriptHref?: (manuscriptId: string) => string;
    readonly getCreateComplianceReportHref?: (manuscriptId: string) => string;
  };

const ProjectProfileWorkspace: React.FC<ProjectProfileWorkspaceProps> = ({
  isProjectMember,
  isTeamBased,
  manuscripts,
  collaborationManuscripts,
  tools,
  lastModifiedDate,
  lastModifiedBy,
  lastModifiedByHref,
  contactEmail,
  contactName,
  onDeleteTool,
  toolsHref,
  editToolHref,
  onUpdateManuscript,
  isComplianceReviewer,
  createDiscussion,
  handleFileUpload,
  useManuscriptById,
  onReplyToDiscussion,
  onMarkDiscussionAsRead,
  isActiveProject = true,
  targetManuscriptId,
  setEligibilityReasons,
  createManuscriptHref,
  getEditManuscriptHref,
  getResubmitManuscriptHref,
  getCreateComplianceReportHref,
}) => {
  const [displayEligibilityModal, setDisplayEligibilityModal] = useState(false);
  const navigate = useNavigate();
  const user = useCurrentUserCRN();

  const handleShareManuscript = () => {
    setDisplayEligibilityModal(true);
  };

  const handleGoToManuscriptForm = () => {
    if (createManuscriptHref) {
      void navigate(createManuscriptHref);
    }
  };

  const {
    manuscriptSubmissions,
    manuscriptCollaborations,
    noManuscriptSubmissions,
    noManuscriptCollaborations,
  } = isProjectMember ? projectMemberCopy : hubStaffCopy;

  return (
    <div css={containerStyles}>
      {displayEligibilityModal && setEligibilityReasons && (
        <EligibilityModal
          onDismiss={() => setDisplayEligibilityModal(false)}
          onGoToManuscriptForm={handleGoToManuscriptForm}
          setEligibilityReasons={setEligibilityReasons}
        />
      )}
      <div css={mobileOnlyStyles}>
        <Card>
          <header css={mobileContainerStyles}>
            <div>{deskTopIcon}</div>
            <Headline3>
              <span>
                Compliance area is only available on the desktop version.
              </span>
            </Headline3>
            <Paragraph accent="neutral900">
              To access all compliance features, please use the desktop version.
              We apologize for any inconvenience this may cause.
            </Paragraph>
          </header>
        </Card>
      </div>
      <div css={desktopOnlyStyles}>
        <Card overrideStyles={complianceCardContainerStyles}>
          <div css={complianceContainerStyles}>
            <div css={complianceHeaderStyles}>
              <Display styleAsHeading={3}>Compliance Review</Display>
              {isActiveProject && isProjectMember && (
                <div css={css(manuscriptButtonStyles)}>
                  <Button
                    onClick={handleShareManuscript}
                    primary
                    noMargin
                    small
                  >
                    {plusIcon} Submit Manuscript
                  </Button>
                </div>
              )}
            </div>
            <Paragraph noMargin accent="neutral900">
              {manuscripts.length > 0 || !!collaborationManuscripts?.length
                ? 'This directory contains all manuscripts with their compliance reports.'
                : "Submit your manuscript to receive a report outlining where your work meets ASAP's Open Science Policy and where changes are needed for your work to be compliant."}
            </Paragraph>
          </div>
          {isTeamBased &&
          (manuscripts.length > 0 || !!collaborationManuscripts?.length) ? (
            <>
              <div data-testid="team-manuscripts" css={manuscriptsGroupStyles}>
                <Subtitle noMargin>Team Submission</Subtitle>
                {manuscripts.length ? (
                  <>
                    <Paragraph noMargin accent="neutral900">
                      {manuscriptSubmissions}
                    </Paragraph>
                    <div>
                      {manuscripts.map((manuscript) => (
                        <div key={manuscript.id}>
                          <ManuscriptCard
                            manuscript={manuscript}
                            user={user}
                            isComplianceReviewer={isComplianceReviewer}
                            onUpdateManuscript={onUpdateManuscript}
                            isActiveTeam={isActiveProject}
                            createDiscussion={createDiscussion}
                            handleFileUpload={handleFileUpload}
                            useManuscriptById={useManuscriptById}
                            onReplyToDiscussion={onReplyToDiscussion}
                            onMarkDiscussionAsRead={onMarkDiscussionAsRead}
                            showTeamName={false}
                            getEditManuscriptHref={getEditManuscriptHref}
                            getResubmitManuscriptHref={
                              getResubmitManuscriptHref
                            }
                            getCreateComplianceReportHref={
                              getCreateComplianceReportHref
                            }
                            {...(manuscript.id === targetManuscriptId
                              ? { isTargetManuscript: true }
                              : {})}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Paragraph noMargin accent="neutral900">
                    {noManuscriptSubmissions}
                  </Paragraph>
                )}
              </div>
              <div
                data-testid="collaboration-manuscripts"
                css={manuscriptsGroupStyles}
              >
                <Subtitle noMargin>Collaborator Submission</Subtitle>
                {collaborationManuscripts?.length ? (
                  <>
                    <Paragraph noMargin accent="neutral900">
                      {manuscriptCollaborations}
                    </Paragraph>
                    <div>
                      {collaborationManuscripts.map((manuscript) => (
                        <div key={manuscript.id}>
                          <ManuscriptCard
                            manuscript={manuscript}
                            user={user}
                            isComplianceReviewer={isComplianceReviewer}
                            isActiveTeam={isActiveProject}
                            onUpdateManuscript={onUpdateManuscript}
                            createDiscussion={createDiscussion}
                            handleFileUpload={handleFileUpload}
                            useManuscriptById={useManuscriptById}
                            onReplyToDiscussion={onReplyToDiscussion}
                            onMarkDiscussionAsRead={onMarkDiscussionAsRead}
                            showTeamName={false}
                            getEditManuscriptHref={getEditManuscriptHref}
                            getResubmitManuscriptHref={
                              getResubmitManuscriptHref
                            }
                            getCreateComplianceReportHref={
                              getCreateComplianceReportHref
                            }
                            {...(manuscript.id === targetManuscriptId
                              ? { isTargetManuscript: true }
                              : {})}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Paragraph noMargin accent="neutral900">
                    {noManuscriptCollaborations}
                  </Paragraph>
                )}
              </div>
            </>
          ) : !isTeamBased && manuscripts.length > 0 ? (
            <div data-testid="project-manuscripts" css={manuscriptsGroupStyles}>
              {manuscripts.map((manuscript) => (
                <div key={manuscript.id}>
                  <ManuscriptCard
                    manuscript={manuscript}
                    user={user}
                    isComplianceReviewer={isComplianceReviewer}
                    onUpdateManuscript={onUpdateManuscript}
                    isActiveTeam={isActiveProject}
                    createDiscussion={createDiscussion}
                    handleFileUpload={handleFileUpload}
                    useManuscriptById={useManuscriptById}
                    onReplyToDiscussion={onReplyToDiscussion}
                    onMarkDiscussionAsRead={onMarkDiscussionAsRead}
                    showTeamName={false}
                    getEditManuscriptHref={getEditManuscriptHref}
                    getResubmitManuscriptHref={getResubmitManuscriptHref}
                    getCreateComplianceReportHref={
                      getCreateComplianceReportHref
                    }
                    {...(manuscript.id === targetManuscriptId
                      ? { isTargetManuscript: true }
                      : {})}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>

      {isProjectMember && (
        <div id="collaboration-tools">
          <Card>
            <Display styleAsHeading={3}>
              Collaboration Tools (Project Only)
            </Display>
            <Paragraph accent="neutral900">
              This directory contains the most important links for your
              project&apos;s internally shared resources and what each link is
              used for.
            </Paragraph>
            {!!tools.length && (
              <ul css={toolContainerStyles}>
                {tools.map((tool, index) => (
                  <li key={`tool-${index}`}>
                    <ToolCard
                      {...tool}
                      editHref={editToolHref(index)}
                      onDelete={onDeleteTool && (() => onDeleteTool(index))}
                    />
                  </li>
                ))}
              </ul>
            )}
            <div css={newToolStyles}>
              <Link href={toolsHref} buttonStyle>
                <span>Add Collaboration Tools</span>
              </Link>
            </div>
            <Caption accent="neutral900" asParagraph>
              Last edited
              {lastModifiedBy && (
                <>
                  {' by '}
                  {lastModifiedByHref ? (
                    <Link href={lastModifiedByHref}>{lastModifiedBy}</Link>
                  ) : (
                    lastModifiedBy
                  )}
                </>
              )}{' '}
              on {formatDateAndTime(new Date(lastModifiedDate))}
            </Caption>
          </Card>
        </div>
      )}

      {isProjectMember && contactEmail && (
        <Card>
          <Headline2 styleAsHeading={3}>Project Contact Email</Headline2>
          <Paragraph accent="neutral900">
            Members across the Hub can reach your project through the designated
            contact email,{' '}
            <Link href={createMailTo(contactEmail)}>
              {contactName || contactEmail}
            </Link>
            . To assign a different member as the project contact, please{' '}
            <Link href={mailToSupport()}>contact ASAP support</Link>.
          </Paragraph>
        </Card>
      )}
    </div>
  );
};

export default ProjectProfileWorkspace;
