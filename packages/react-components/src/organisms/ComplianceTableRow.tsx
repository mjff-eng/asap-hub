import {
  ApcCoverageRequestStatus,
  ManuscriptStatus,
  manuscriptStatus,
  PartialManuscriptResponse,
  statusButtonOptions,
} from '@asap-hub/model';
import { network, projectRouteByType } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React, { ComponentProps } from 'react';
import {
  addUserIcon,
  AssignedUsersAvatarList,
  AuthorSelect,
  PencilIcon,
  plusIcon,
  StatusButton,
  colour,
} from '..';
import { Anchor, Button, Link, Pill } from '../atoms';
import { borderRadius } from '../card';
import { formatDateToTimezone } from '../date';
import { rem } from '../pixels';
import { getProjectConfig, getReviewerStatusType } from '../utils';

const rowStyles = css({
  padding: `${rem(20)} ${rem(24)} 0`,
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':first-of-type': {
    borderBottom: 'none',
  },
  ':nth-of-type(even) td': {
    background: colour.neutral[50],
  },
  ':nth-of-type(odd) td': {
    background: '#fff',
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    borderRadius: rem(borderRadius),
    td: {
      paddingBottom: rem(16),
    },
  },
  paddingTop: 0,
  paddingBottom: 0,
});

const apcCoverageStyles = (italicize: boolean) =>
  css({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: rem(14),
    color: colour.foreground.tertiary,
    maxWidth: rem(72),
    ...(italicize ? { fontStyle: 'italic' } : {}),
  });

const assignedUsersContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  width: '100%',
  maxWidth: rem(170),
  alignItems: 'center',
});

const assignedUsersInnerContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  gap: rem(8),
});

const noUsersStyles = css({
  display: 'flex',
  fontStyle: 'italic',
  fontSize: rem(14),
  color: colour.foreground.tertiary,
  width: '100%',
  whiteSpace: 'nowrap',
  alignItems: 'anchor-center',
});

const assignUsersButtonStyles = css({
  display: 'flex',
  alignSelf: 'center',
  flexGrow: 0,
  height: rem(40),
  width: rem(40),
});

const editUsersButtonStyles = css({
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
});

const pillIdStyles = css({
  marginLeft: '7px',
  display: 'block',
});

const statusButtonContainerStyles = css({
  margin: `${rem(17)} 0`,
  fontSize: rem(14),
});

const entityLinkStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(3),
});

const projectEntityStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(3),
  width: rem(180),
  maxWidth: rem(180),
  minWidth: 0,
});

const projectIconStyles = css({
  display: 'inline-flex',
  flexShrink: 0,
});

const projectTitleStyles = css({
  minWidth: 0,
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '& > a': {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

const apcCoverageContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(16),
  justifyContent: 'space-between',
  maxWidth: rem(120),
});

type ComplianceTableRowProps = {
  isComplianceReviewer: boolean;
  data: PartialManuscriptResponse;
  getAssignedUsersSuggestions: NonNullable<
    ComponentProps<typeof AuthorSelect>['loadOptions']
  >;
  handleStatusClick: (
    statusItem: ManuscriptStatus,
    manuscript: PartialManuscriptResponse,
  ) => void;
  handleAssignUsersClick: (manuscript: PartialManuscriptResponse) => void;
  handleUpdateAPCDetailsClick: (manuscript: PartialManuscriptResponse) => void;
};

const completeStatuses = ['Closed (other)', 'Compliant'];
export const apcCoverableStatuses = ['Compliant', 'Submit Final Publication'];

const getTeamHref = (teamId: string) =>
  teamId ? network({}).teams({}).team({ teamId }).about({}).$ : undefined;

const getAPCStatusLabel = (
  apcRequested?: boolean,
  apcCoverageRequestStatus?: ApcCoverageRequestStatus,
): string => {
  if (apcRequested !== undefined) {
    if (apcRequested === true) {
      switch (apcCoverageRequestStatus) {
        case 'declined':
          return 'Declined';
        case 'paid':
          return 'Paid';
        case 'notPaid':
        default:
          return 'Requested';
      }
    } else {
      return 'Not requested';
    }
  } else {
    return 'Information needed';
  }
};

type APCCoverageProps = {
  apcRequested?: boolean;
  apcCoverageRequestStatus?: ApcCoverageRequestStatus;
  isComplianceReviewer: boolean;
  status: ManuscriptStatus;
  handleUpdateAPCDetailsClick: () => void;
};

const APCCoverage: React.FC<APCCoverageProps> = ({
  apcRequested,
  apcCoverageRequestStatus,
  isComplianceReviewer,
  handleUpdateAPCDetailsClick,
  status,
}) => {
  const isAPCCoverable = apcCoverableStatuses.includes(status ?? '');

  if (!isAPCCoverable) {
    return (
      <p
        data-testid="apc-coverage"
        css={css([apcCoverageStyles(false), { justifyContent: 'flex-start' }])}
      >
        —
      </p>
    );
  }

  const apcCoverageLabel = getAPCStatusLabel(
    apcRequested,
    apcCoverageRequestStatus,
  );
  return (
    <div data-testid="apc-coverage" css={apcCoverageContainerStyles}>
      <p css={apcCoverageStyles(apcCoverageLabel === 'Information needed')}>
        {apcCoverageLabel}
      </p>
      {isComplianceReviewer ? (
        apcRequested === undefined ? (
          <Button
            aria-label="Add APC Coverage Details"
            noMargin
            overrideStyles={css([
              assignUsersButtonStyles,
              editUsersButtonStyles,
            ])}
            onClick={handleUpdateAPCDetailsClick}
          >
            {plusIcon}
          </Button>
        ) : (
          <Button
            aria-label="Edit APC Coverage Details"
            noMargin
            overrideStyles={css([
              assignUsersButtonStyles,
              editUsersButtonStyles,
            ])}
            onClick={handleUpdateAPCDetailsClick}
          >
            <PencilIcon />
          </Button>
        )
      ) : null}
    </div>
  );
};

const ComplianceTableRow: React.FC<ComplianceTableRowProps> = ({
  isComplianceReviewer,
  data,
  handleAssignUsersClick,
  handleUpdateAPCDetailsClick,
  handleStatusClick,
}) => {
  const {
    id,
    team,
    manuscriptId,
    lastUpdated,
    project,
    status,
    assignedUsers,
    apcRequested,
    apcCoverageRequestStatus,
  } = data;

  const canEditAssignedUsers =
    !completeStatuses.includes(status ?? '') && isComplianceReviewer;
  const teamHref = getTeamHref(team.id);
  const projectWorkspaceHref =
    project?.projectType && project.id
      ? projectRouteByType[project.projectType](project.id).workspace({}).$
      : undefined;
  const manuscriptHref = projectWorkspaceHref
    ? `${projectWorkspaceHref}#${id}`
    : undefined;
  const projectConfig = project?.projectType
    ? getProjectConfig({
        projectId: project.id,
        projectType: project.projectType,
      })
    : undefined;
  const isUserBasedProject = project?.isTeamBased === false;

  return (
    <>
      <tr
        key={manuscriptId}
        css={[rowStyles]}
        data-testid="compliance-table-row"
      >
        <td className={'sticky'}>
          <Pill
            accent="blue"
            numberOfLines={1}
            isLink={Boolean(manuscriptHref)}
          >
            <span css={pillIdStyles}>
              {manuscriptHref ? (
                <Anchor href={manuscriptHref}>{manuscriptId}</Anchor>
              ) : (
                manuscriptId
              )}
            </span>
          </Pill>
        </td>
        <td>
          {project?.title ? (
            <p css={projectEntityStyles}>
              <span css={projectIconStyles}>{projectConfig?.icon}</span>
              <span css={projectTitleStyles} title={project.title}>
                {projectConfig?.href ? (
                  <Link href={projectConfig.href}>{project.title}</Link>
                ) : (
                  project.title
                )}
              </span>
            </p>
          ) : (
            '—'
          )}
        </td>
        <td>
          {isUserBasedProject ? (
            '—'
          ) : team.displayName && teamHref ? (
            <p css={entityLinkStyles}>
              <Link href={teamHref}>{team.displayName}</Link>
            </p>
          ) : (
            team.displayName || '—'
          )}
        </td>
        <td>
          {lastUpdated &&
            formatDateToTimezone(lastUpdated, 'E, d MMM y').toUpperCase()}
        </td>
        <td css={statusButtonContainerStyles}>
          <StatusButton
            buttonChildren={() => <span>{status}</span>}
            canEdit={canEditAssignedUsers}
            selectedStatusType={getReviewerStatusType(
              status as (typeof manuscriptStatus)[number],
            )}
            wrap
          >
            {statusButtonOptions.map((statusItem) => ({
              item: statusItem,
              type: getReviewerStatusType(statusItem),
              onClick: () => {
                handleStatusClick(statusItem, data);
              },
            }))}
          </StatusButton>
        </td>
        <td>
          <APCCoverage
            apcRequested={apcRequested}
            apcCoverageRequestStatus={apcCoverageRequestStatus}
            isComplianceReviewer={isComplianceReviewer}
            handleUpdateAPCDetailsClick={() =>
              handleUpdateAPCDetailsClick(data)
            }
            status={status as ManuscriptStatus}
          />
        </td>
        <td>
          <div css={assignedUsersContainerStyles}>
            {assignedUsers?.length ? (
              <div css={assignedUsersInnerContainerStyles}>
                <AssignedUsersAvatarList members={assignedUsers} />
                {canEditAssignedUsers ? (
                  <Button
                    aria-label="Edit Assigned Users"
                    noMargin
                    onClick={() => handleAssignUsersClick(data)}
                    overrideStyles={css([
                      assignUsersButtonStyles,
                      editUsersButtonStyles,
                    ])}
                  >
                    <PencilIcon />
                  </Button>
                ) : null}
              </div>
            ) : (
              <div css={assignedUsersInnerContainerStyles}>
                <span css={noUsersStyles}>No users assigned</span>
                {canEditAssignedUsers ? (
                  <Button
                    aria-label="Assign Users"
                    noMargin
                    small
                    overrideStyles={assignUsersButtonStyles}
                    onClick={() => handleAssignUsersClick(data)}
                  >
                    {addUserIcon}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </td>
      </tr>
    </>
  );
};

export default ComplianceTableRow;
