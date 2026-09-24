import { User } from '@asap-hub/auth';
import {
  AuthorResponse,
  ManuscriptDataObject,
  ManuscriptFileResponse,
  ManuscriptVersion,
} from '@asap-hub/model';
import { projectRouteByType } from '@asap-hub/routing';
import { css, Theme } from '@emotion/react';
import { ComponentProps, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { DiscussionsTab } from '.';
import {
  Button,
  colors,
  complianceReportIcon,
  neutral900,
  NotificationDotIcon,
  resubmitManuscriptIcon,
  Tooltip,
  colour,
  colorFromHex,
} from '..';
import { rem, smallDesktopScreen } from '../pixels';
import DiscussionCard from './DiscussionCard';
import DiscussionModal from './DiscussionModal';
import ManuscriptVersionCard from './ManuscriptVersionCard';

const VERSION_LIMIT = 3;

type ManuscriptCardDetailProps = Pick<
  ComponentProps<typeof DiscussionCard>,
  'onReplyToDiscussion' | 'onMarkDiscussionAsRead'
> & {
  id: string;
  user: User | null;
  isComplianceReviewer: boolean;
  isActiveManuscript: boolean;
  activeTab: 'manuscripts-and-reports' | 'discussions';
  setActiveTab: (tab: 'manuscripts-and-reports' | 'discussions') => void;
  createDiscussion: (
    manuscriptId: string,
    title: string,
    message: string,
    files?: ManuscriptFileResponse[],
  ) => Promise<string | undefined>;
  handleFileUpload: ComponentProps<typeof DiscussionModal>['handleFileUpload'];
  useManuscriptById: (
    id: string,
  ) => [
    ManuscriptDataObject | undefined,
    React.Dispatch<React.SetStateAction<ManuscriptDataObject | undefined>>,
  ];
  readonly showTeamName?: boolean;
  readonly getEditManuscriptHref?: (manuscriptId: string) => string;
  readonly getResubmitManuscriptHref?: (manuscriptId: string) => string;
  readonly getCreateComplianceReportHref?: (manuscriptId: string) => string;
};

const buttonsContainerStyles = css({
  borderBottom: `1px solid ${colors.colour.border.tertiary}`,
});

const buttonsStyles = css({
  display: 'flex',
  padding: `${rem(24)} ${rem(16)}`,
  borderRadius: rem(8),
  gap: rem(16),
  [`@media (max-width: ${smallDesktopScreen.max}px)`]: {
    flexDirection: 'column',
  },
});

const buttonStyles = css({
  '> svg': { stroke: 'none' },
  height: rem(24),
  display: 'flex',
  gap: rem(8),
  borderRadius: rem(8),
  minHeight: 'fit-content',
});

const buttonTextStyles = css({
  minHeight: 'fit-content',
});

const notificationDotStyles = css({
  marginLeft: rem(8),
});

const manuscriptDetailsContainerStyles = css({
  margin: `0 ${rem(16)} ${rem(16)}`,
  border: `1px solid ${colors.colour.border.tertiary}`,
  borderRadius: `${rem(8)}`,
  boxSizing: 'border-box',
  borderWidth: 1,
  borderStyle: 'solid',
  backgroundColor: colors.colour.neutral[0],
});

const showMoreContainerStyles = css({
  padding: `${rem(16)} 0`,
  textAlign: 'center',
});

type VersionUserProps = {
  version:
    | Pick<
        ManuscriptVersion,
        | 'teams'
        | 'firstAuthors'
        | 'correspondingAuthor'
        | 'additionalAuthors'
        | 'labs'
      >
    | undefined;
  user: User | null;
};

const tabButtonStyles = ({
  colors: { primary500 = colorFromHex(colour.brand.crn[500]) } = {},
}: Theme) =>
  css({
    paddingLeft: rem(0),
    paddingRight: rem(0),
    paddingBottom: rem(20),
    color: neutral900.rgb,
    backgroundColor: 'transparent',
    border: 'none',
    '&.active': {
      paddingBottom: rem(16),
      color: colour.foreground.primary,
      fontWeight: 'bold',
      borderBottom: `${rem(4)} solid ${primary500.rgba}`,
    },
  });

const isManuscriptLead = ({ version, user }: VersionUserProps) =>
  user &&
  version &&
  user.teams.find((team) =>
    version.teams.find(
      (versionTeam) =>
        versionTeam.id === team.id &&
        team.roles.some(
          (r) => r === 'Lead PI (Core Leadership)' || r === 'Project Manager',
        ),
    ),
  );

const isManuscriptAuthor = ({
  authors,
  user,
}: {
  authors: AuthorResponse[];
  user: User | null;
}) => user && authors.find((author) => author.id === user.id);

const isManuscriptLabPi = ({
  labs,
  user,
}: {
  labs: ManuscriptVersion['labs'] | undefined;
  user: User | null;
}) => user && labs && labs.some((lab) => lab.labPi === user.id);

const canUpdateManuscript = ({ version, user }: VersionUserProps) =>
  user?.openScienceTeamMember ||
  !!isManuscriptLead({ version, user }) ||
  !!isManuscriptAuthor({
    authors: [
      ...(version?.firstAuthors || []),
      ...(version?.correspondingAuthor || []),
      ...(version?.additionalAuthors || []),
    ],
    user,
  }) ||
  !!isManuscriptLabPi({ labs: version?.labs, user });

const ManuscriptCardDetail: React.FC<ManuscriptCardDetailProps> = ({
  id,
  user,
  isComplianceReviewer,
  isActiveManuscript,
  activeTab,
  setActiveTab,
  createDiscussion,
  handleFileUpload,
  useManuscriptById,
  onReplyToDiscussion,
  onMarkDiscussionAsRead,
  showTeamName,
  getEditManuscriptHref,
  getResubmitManuscriptHref,
  getCreateComplianceReportHref,
}) => {
  const [tooltipHoverShown, setTooltipHoverShown] = useState<boolean>(false);
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();
  const discussionTabRef = useRef<HTMLButtonElement>(null);

  const [manuscript] = useManuscriptById(id);
  const versions = manuscript?.versions ?? [];
  const currentManuscriptVersion = versions[0];

  const projectWorkspaceRoute =
    manuscript?.projectId && manuscript.projectType
      ? projectRouteByType[manuscript.projectType](
          manuscript.projectId,
        ).workspace({})
      : undefined;

  const resolvedGetEditManuscriptHref = (
    manuscriptId: string,
  ): string | undefined =>
    projectWorkspaceRoute?.editManuscript({ manuscriptId }).$ ??
    getEditManuscriptHref?.(manuscriptId);

  const complianceReportRoute =
    projectWorkspaceRoute?.createComplianceReport({ manuscriptId: id }).$ ??
    getCreateComplianceReportHref?.(id);

  const resubmitManuscriptRoute =
    projectWorkspaceRoute?.resubmitManuscript({ manuscriptId: id }).$ ??
    getResubmitManuscriptHref?.(id);

  const handleShareComplianceReport = () => {
    if (complianceReportRoute) {
      void navigate(complianceReportRoute, { state: { fromButton: true } });
    }
  };

  const handleResubmitManuscript = () => {
    if (resubmitManuscriptRoute) {
      void navigate(resubmitManuscriptRoute);
    }
  };

  const canSubmitComplianceReport =
    isActiveManuscript && !currentManuscriptVersion?.complianceReport;

  const hasUpdateAccess = canUpdateManuscript({
    version: currentManuscriptVersion,
    user,
  });

  const hasUnreadDiscussions =
    (manuscript?.discussions || []).length > 0
      ? manuscript?.discussions.some((discussion) => !discussion.read)
      : false;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: rem(32),
          marginLeft: rem(55),
        }}
      >
        <button
          className={activeTab === 'manuscripts-and-reports' ? 'active' : ''}
          css={tabButtonStyles}
          onClick={() => setActiveTab('manuscripts-and-reports')}
        >
          Manuscripts and Reports
        </button>
        <button
          className={activeTab === 'discussions' ? 'active' : ''}
          css={tabButtonStyles}
          onClick={() => setActiveTab('discussions')}
          ref={discussionTabRef}
        >
          Discussions
          {hasUnreadDiscussions && (
            <span css={notificationDotStyles}>
              <NotificationDotIcon />
            </span>
          )}
        </button>
      </div>
      <div css={manuscriptDetailsContainerStyles}>
        {activeTab === 'manuscripts-and-reports' && (
          <>
            {isActiveManuscript && (
              <div css={buttonsContainerStyles}>
                <span css={buttonsStyles}>
                  {isComplianceReviewer && (
                    <span>
                      <Button
                        primary
                        small
                        noMargin
                        onClick={handleShareComplianceReport}
                        enabled={canSubmitComplianceReport}
                      >
                        <span css={buttonStyles}>
                          {complianceReportIcon}
                          <span css={buttonTextStyles}>
                            Share Compliance Report
                          </span>
                        </span>
                      </Button>
                    </span>
                  )}
                  {hasUpdateAccess && (
                    <span>
                      <Tooltip
                        bottom={rem(6)}
                        width={rem(296)}
                        shown={tooltipHoverShown}
                        textStyles={css({
                          textAlign: 'center',
                        })}
                      >
                        A compliance report must be shared by an Open Science
                        team member before submitting a new version of the
                        manuscript.
                      </Tooltip>

                      <Button
                        primary
                        small
                        noMargin
                        onClick={handleResubmitManuscript}
                        enabled={!!currentManuscriptVersion?.complianceReport}
                      >
                        <span
                          css={buttonStyles}
                          onMouseOver={() => {
                            if (!currentManuscriptVersion?.complianceReport) {
                              setTooltipHoverShown(true);
                            }
                          }}
                          onMouseOut={() => {
                            if (!currentManuscriptVersion?.complianceReport) {
                              setTooltipHoverShown(false);
                            }
                          }}
                        >
                          {resubmitManuscriptIcon}{' '}
                          <span css={buttonTextStyles}>
                            Submit Revised Manuscript
                          </span>
                        </span>
                      </Button>
                    </span>
                  )}
                </span>
              </div>
            )}
            {versions
              .slice(0, showMore ? undefined : VERSION_LIMIT)
              .map((version, index) => (
                <ManuscriptVersionCard
                  key={index}
                  version={version}
                  manuscriptId={id}
                  isActiveVersion={
                    isActiveManuscript &&
                    version.id === currentManuscriptVersion?.id
                  }
                  isManuscriptContributor={hasUpdateAccess}
                  openDiscussionTab={() => {
                    if (discussionTabRef.current) {
                      discussionTabRef.current.scrollIntoView({
                        behavior: 'smooth',
                      });
                      setActiveTab('discussions');
                    }
                  }}
                  categories={manuscript?.categories || []}
                  impact={manuscript?.impact}
                  showTeamName={showTeamName}
                  getEditManuscriptHref={resolvedGetEditManuscriptHref}
                />
              ))}
            {versions.length > VERSION_LIMIT && (
              <div css={showMoreContainerStyles}>
                <Button onClick={() => setShowMore(!showMore)} linkStyle>
                  {showMore ? `Show less ↑` : `Show more ↓`}
                </Button>
              </div>
            )}
          </>
        )}
        {activeTab === 'discussions' && (
          <DiscussionsTab
            discussions={manuscript?.discussions || []}
            manuscriptId={id}
            createDiscussion={createDiscussion}
            handleFileUpload={handleFileUpload}
            onReplyToDiscussion={onReplyToDiscussion}
            onMarkDiscussionAsRead={onMarkDiscussionAsRead}
            canParticipateInDiscussion={hasUpdateAccess || isComplianceReviewer}
            isActiveManuscript={isActiveManuscript}
            showTeamName={showTeamName}
          />
        )}
      </div>
    </div>
  );
};

export default ManuscriptCardDetail;
