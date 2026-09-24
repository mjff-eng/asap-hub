import { User } from '@asap-hub/auth';
import {
  ManuscriptDataObject,
  ManuscriptPutRequest,
  ManuscriptResponse,
  ManuscriptStatus,
  manuscriptStatus,
  ManuscriptFileResponse,
  statusButtonOptions,
  WorkspaceManuscript,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { ComponentProps, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Button,
  colors,
  Loading,
  minusRectIcon,
  Pill,
  plusRectIcon,
  StatusButton,
  Subtitle,
} from '..';
import { mobileScreen, rem } from '../pixels';
import { getReviewerStatusType } from '../utils';
import ConfirmStatusChangeModal from './ConfirmStatusChangeModal';
import DiscussionCard from './DiscussionCard';
import DiscussionModal from './DiscussionModal';
import ManuscriptCardDetail from './ManuscriptCardDetail';

type ManuscriptCardProps = Pick<
  ComponentProps<typeof DiscussionCard>,
  'onReplyToDiscussion' | 'onMarkDiscussionAsRead'
> & {
  manuscript: WorkspaceManuscript;
  user: User | null;
  isComplianceReviewer: boolean;
  isActiveTeam: boolean;
  onUpdateManuscript: (
    manuscriptId: string,
    payload: ManuscriptPutRequest,
  ) => Promise<ManuscriptResponse>;
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
  readonly isTargetManuscript?: boolean;
  readonly showTeamName?: boolean;
  readonly getEditManuscriptHref?: (manuscriptId: string) => string;
  readonly getResubmitManuscriptHref?: (manuscriptId: string) => string;
  readonly getCreateComplianceReportHref?: (manuscriptId: string) => string;
};

const manuscriptContainerStyles = css({
  marginTop: rem(12),
  border: `1px solid ${colors.colour.border.tertiary}`,
  borderRadius: `${rem(8)}`,
  boxSizing: 'border-box',
  width: '100%',
  borderWidth: 1,
  borderStyle: 'solid',
  display: 'block',
  backgroundColor: colors.colour.background.secondary,
});

const toastStyles = css({
  display: 'flex',
  padding: rem(16),
  borderRadius: `${rem(8)} ${rem(8)} 0 0`,
  alignItems: 'flex-start',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});

const iconStyles = css({
  display: 'inline-block',
  width: rem(24),
  height: rem(24),
  paddingRight: rem(12),
  marginTop: rem(1),
});

const toastHeaderStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  gap: rem(32),
  alignItems: 'flex-start',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    alignItems: 'flex-start',
  },
});

const detailLoadingStyles = css({
  padding: `0 ${rem(16)} ${rem(16)}`,
});

const closedManuscriptStatuses = ['Closed (other)', 'Compliant'];

const ManuscriptCard: React.FC<ManuscriptCardProps> = ({
  manuscript,
  isComplianceReviewer,
  isActiveTeam,
  onUpdateManuscript,
  user,
  createDiscussion,
  handleFileUpload,
  useManuscriptById,
  onReplyToDiscussion,
  onMarkDiscussionAsRead,
  isTargetManuscript = false,
  showTeamName,
  getEditManuscriptHref,
  getResubmitManuscriptHref,
  getCreateComplianceReportHref,
}) => {
  const { id, title, status, versionUID } = manuscript;

  const { pathname, search, hash } = useLocation();
  const targetTabFromUrl =
    new URLSearchParams(search).get('tab') === 'discussions'
      ? 'discussions'
      : 'manuscripts-and-reports';
  const [activeTab, setInternalActiveTab] = useState<
    'manuscripts-and-reports' | 'discussions'
  >(isTargetManuscript ? targetTabFromUrl : 'manuscripts-and-reports');

  const [displayConfirmStatusChangeModal, setDisplayConfirmStatusChangeModal] =
    useState(false);
  const [expandedState, setExpandedState] = useState(isTargetManuscript);

  useEffect(() => {
    if (isTargetManuscript) {
      setExpandedState(true);
      setInternalActiveTab(targetTabFromUrl);
    }
  }, [isTargetManuscript, targetTabFromUrl]);

  const [newSelectedStatus, setNewSelectedStatus] =
    useState<ManuscriptStatus>();
  const navigate = useNavigate();

  // keep URL in sync so the user can copy/share the open state
  const syncUrl = (
    nextExpanded: boolean,
    nextTab: 'manuscripts-and-reports' | 'discussions',
  ) => {
    if (!nextExpanded) {
      // only clear the URL if it currently points at this card; otherwise
      // another card on the page owns it and we shouldn't stomp on its state.
      if (hash === `#${id}`) {
        void navigate(pathname, { replace: true });
      }
      return;
    }
    const tabQuery = nextTab === 'discussions' ? '?tab=discussions' : '';
    void navigate(`${pathname}${tabQuery}#${id}`, { replace: true });
  };

  const setExpanded = (next: boolean) => {
    setExpandedState(next);
    syncUrl(next, activeTab);
  };

  const setActiveTab = (next: 'manuscripts-and-reports' | 'discussions') => {
    setInternalActiveTab(next);
    if (expandedState) syncUrl(true, next);
  };

  const handleStatusClick = (statusItem: ManuscriptStatus) => {
    if (statusItem !== status) {
      setNewSelectedStatus(statusItem);
      setDisplayConfirmStatusChangeModal(true);
    }
  };

  const isActiveManuscript =
    !closedManuscriptStatuses.includes(status ?? '') && isActiveTeam;

  const handleStatusChange = async () => {
    if (newSelectedStatus) {
      // the mutation writes both the workspace list and the manuscript detail
      // caches, so the header and any mounted detail re-render from there
      await onUpdateManuscript(id, {
        status: newSelectedStatus,
      });
    }
  };

  return (
    <>
      {displayConfirmStatusChangeModal && newSelectedStatus && (
        <ConfirmStatusChangeModal
          onDismiss={() => setDisplayConfirmStatusChangeModal(false)}
          onConfirm={handleStatusChange}
          newStatus={newSelectedStatus}
        />
      )}
      {/* the DOM id makes the card a real #<manuscriptId> anchor target;
          useScrollToHash (mounted in Layout) owns scrolling to it */}
      <div id={id} css={manuscriptContainerStyles}>
        <div css={[toastStyles]}>
          <span css={[iconStyles]}>
            <Button
              data-testid="collapsible-button"
              linkStyle
              onClick={() => setExpanded(!expandedState)}
            >
              <span>{expandedState ? minusRectIcon : plusRectIcon}</span>
            </Button>
          </span>
          <span css={{ width: '100%' }}>
            <span css={toastHeaderStyles}>
              <Subtitle noMargin>{title}</Subtitle>
              <span
                css={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  flexShrink: 0,
                  gap: rem(12),
                }}
              >
                <StatusButton
                  buttonChildren={() => <span>{status}</span>}
                  canEdit={isComplianceReviewer && isActiveManuscript}
                  selectedStatusType={getReviewerStatusType(
                    status as (typeof manuscriptStatus)[number],
                  )}
                >
                  {statusButtonOptions.map((statusItem) => ({
                    item: statusItem,
                    type: getReviewerStatusType(statusItem),
                    onClick: () => {
                      handleStatusClick(statusItem);
                    },
                  }))}
                </StatusButton>
                {versionUID && <Pill accent="blue">{versionUID}</Pill>}
              </span>
            </span>
          </span>
        </div>

        {expandedState && (
          <Suspense
            fallback={
              <div css={detailLoadingStyles}>
                <Loading />
              </div>
            }
          >
            <ManuscriptCardDetail
              id={id}
              user={user}
              isComplianceReviewer={isComplianceReviewer}
              isActiveManuscript={isActiveManuscript}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              createDiscussion={createDiscussion}
              handleFileUpload={handleFileUpload}
              useManuscriptById={useManuscriptById}
              onReplyToDiscussion={onReplyToDiscussion}
              onMarkDiscussionAsRead={onMarkDiscussionAsRead}
              showTeamName={showTeamName}
              getEditManuscriptHref={getEditManuscriptHref}
              getResubmitManuscriptHref={getResubmitManuscriptHref}
              getCreateComplianceReportHref={getCreateComplianceReportHref}
            />
          </Suspense>
        )}
      </div>
    </>
  );
};

export default ManuscriptCard;
