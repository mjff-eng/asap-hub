import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useEffect, useState } from 'react';

import {
  Button,
  Card,
  GradientProgressBar,
  GradientProgressWheel,
  Headline3,
  Link,
  Paragraph,
} from '../atoms';
import { lead, neutral1000, steel } from '../colors';
import {
  chevronDownIcon,
  chevronUpIcon,
  ExportIcon,
  InactiveBadgeIcon,
  invalidTickIcon,
  PencilIcon,
  plusIcon,
  tickInCircleIcon,
} from '../icons';
import {
  metricBarStyles,
  metricContainerStyles,
  metricLabelStyles,
  metricProgressRowStyles,
  metricValueStyles,
  metricWheelStyles,
} from '../molecules/shared-metric-card-styles';
import SpeakerUserRow from '../molecules/SpeakerUserRow';
import { rem, tabletScreen } from '../pixels';
import { pluralizeTeams } from '../utils';

import { defaultVisibleTeams, teamIcon } from './shared-event-card';
import {
  actionsStyles,
  cellStyles,
  chevronButtonStyles,
  contentStyles,
  contentWithFooterStyles,
  editIconButtonStyles,
  emptyStateStyles,
  headerCellStyles,
  headerStyles,
  horizontalScrollGutter,
  iconButtonStyles,
  metricsStyles,
  statusCellStyles,
  statusIconStyles,
  tableWrapperStyles,
  teamInfoNoWrapStyles,
  teamInfoStyles,
  viewMoreStyles,
} from './shared-event-card-styles';
import {
  SpeakerExternalGroup,
  SpeakerGroup,
  SpeakerTeamGroup,
} from './speaker-group';

const mobileQuery = `@media (max-width: ${tabletScreen.min}px)`;

const speakerTableStyles = css({
  width: '100%',
  borderCollapse: 'collapse',
});

// width:1% shrinks the column to its header so the tick sits under the label.
const findingsColStyles = css({ width: '1%' });
const findingsHeaderCellStyles = css({ whiteSpace: 'nowrap' });
const chevronColStyles = css({ width: rem(40) });

// The compact "P. Findings" is only used on mobile while the table fits;
// horizontal overflow forces the full label at any width (handled in JS).
const fullFindingsLabel = css({ [mobileQuery]: { display: 'none' } });
const shortFindingsLabel = css({
  display: 'none',
  [mobileQuery]: { display: 'inline' },
});

const teamCellStyles = css({ paddingRight: rem(24) });

const teamGroupStyles = css({
  borderBottom: `1px solid ${steel.rgb}`,
  '&:last-of-type': {
    borderBottom: 'none',
  },
});

const chevronCellStyles = css({
  textAlign: 'right',
});

const membersCellStyles = css({
  padding: 0,
});

const leadTextStyles = css({
  color: lead.rgb,
});

const membersListStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: `0 0 ${rem(12 + 16)} ${rem(32)}`,
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  [mobileQuery]: {
    gap: rem(24),
    paddingLeft: rem(12),
  },
});

const MetricCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div css={metricContainerStyles}>{children}</div>
);

const SpeakerCountMetric: React.FC<{
  label: string;
  value: number;
  caption: string;
}> = ({ label, value, caption }) => (
  <MetricCard>
    <p css={metricLabelStyles}>{label}</p>
    <p css={metricValueStyles}>{value}</p>
    <p css={metricLabelStyles}>{caption}</p>
  </MetricCard>
);

const FindingsMetric: React.FC<{
  label: string;
  value: number;
  caption: string;
}> = ({ label, value, caption }) => (
  <MetricCard>
    <div css={metricProgressRowStyles}>
      <span css={metricWheelStyles}>
        <GradientProgressWheel percentage={value} label={label} />
      </span>
      <div>
        <p css={metricLabelStyles}>{label}</p>
        <p css={metricValueStyles}>{value}%</p>
        <p css={metricLabelStyles}>{caption}</p>
      </div>
    </div>
    <div css={metricBarStyles}>
      <GradientProgressBar percentage={value} label={label} />
    </div>
  </MetricCard>
);

type EventSpeakersProps = {
  // Shared with EditEventSpeakersModal: the same SpeakerGroup[] can feed both
  // this card and the modal, and the modal's onSave writes straight back.
  groups?: SpeakerGroup[];
  hasFinished?: boolean;
  onExport?: () => void;
  onEdit?: () => void;
  onAddSpeaker?: () => void;
};

const findingsIcon = (shared: boolean) => (
  <span
    css={statusIconStyles}
    role="img"
    aria-label={
      shared ? 'Shared preliminary findings' : 'No preliminary findings'
    }
  >
    {shared ? tickInCircleIcon : invalidTickIcon}
  </span>
);

const SpeakerRow: React.FC<{
  info: React.ReactNode;
  sharedPreliminaryFindings: boolean;
  showFindings: boolean;
  hasFindings?: boolean;
  expanded: boolean;
  onToggle: () => void;
  label: string;
  collapsedBottomPadding?: string | number;
  children?: React.ReactNode;
}> = ({
  info,
  sharedPreliminaryFindings,
  showFindings,
  hasFindings = true,
  expanded,
  onToggle,
  label,
  collapsedBottomPadding,
  children,
}) => {
  const collapsedBottom =
    !expanded && collapsedBottomPadding !== undefined
      ? { paddingBottom: collapsedBottomPadding }
      : undefined;
  return (
    <tbody css={teamGroupStyles}>
      <tr>
        <td css={[cellStyles, teamCellStyles, collapsedBottom]}>
          <span css={[teamInfoStyles, teamInfoNoWrapStyles]}>{info}</span>
        </td>
        {showFindings && (
          <td css={[statusCellStyles, collapsedBottom]}>
            {hasFindings ? findingsIcon(sharedPreliminaryFindings) : null}
          </td>
        )}
        <td css={[statusCellStyles, chevronCellStyles, collapsedBottom]}>
          <button
            type="button"
            css={chevronButtonStyles}
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          >
            {expanded ? chevronUpIcon : chevronDownIcon}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={showFindings ? 3 : 2} css={membersCellStyles}>
            {children}
          </td>
        </tr>
      )}
    </tbody>
  );
};

const useHorizontalOverflow = () => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    if (!element) {
      return undefined;
    }
    const measure = () =>
      setOverflowing(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, overflowing] as const;
};

const editorEmptyMessage = (hasFinished: boolean): string =>
  hasFinished
    ? 'Add the people who presented at this event, then mark who shared preliminary findings.'
    : 'Add the speakers for this event. Marking who shared preliminary findings becomes available after the event.';

const EventSpeakers: React.FC<EventSpeakersProps> = ({
  groups = [],
  hasFinished = false,
  onExport,
  onEdit,
  onAddSpeaker,
}) => {
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [showAll, setShowAll] = useState(false);
  const [tableRef, findingsOverflowing] = useHorizontalOverflow();

  const showFindings = hasFinished;

  const teamGroups = groups.filter(
    (group): group is SpeakerTeamGroup =>
      group.variant === 'team' && group.users.length > 0,
  );
  const externalGroup = groups.find(
    (group): group is SpeakerExternalGroup =>
      group.variant === 'external' && group.users.length > 0,
  );

  const externalCount = externalGroup?.users.length ?? 0;
  const hasExternal = externalCount > 0;

  if (teamGroups.length === 0 && !hasExternal) {
    return (
      <Card>
        <div css={emptyStateStyles}>
          <Headline3 noMargin>Speakers</Headline3>
          {onAddSpeaker ? (
            <>
              <Paragraph noMargin accent="lead">
                {editorEmptyMessage(hasFinished)}
              </Paragraph>
              <Button primary small noMargin onClick={onAddSpeaker}>
                {plusIcon} Add Speakers
              </Button>
            </>
          ) : (
            <Paragraph noMargin accent="lead">
              No speakers have been added for this event yet.
            </Paragraph>
          )}
        </div>
      </Card>
    );
  }

  const toggleRow = (key: string) =>
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const teamMemberCount = teamGroups.reduce(
    (total, group) => total + group.users.length,
    0,
  );
  const teamsShared = teamGroups.filter(
    (group) => group.preliminaryFindingsShared,
  ).length;
  const totalSpeakers = teamMemberCount + externalCount;
  const teamsTotal = teamGroups.length;
  const findingsPercentage =
    teamsTotal > 0 ? Math.round((teamsShared / teamsTotal) * 100) : 0;

  const totalRows = teamsTotal + (hasExternal ? 1 : 0);
  const hasMoreRows = totalRows > defaultVisibleTeams;
  const visibleTeams = showAll
    ? teamGroups
    : teamGroups.slice(0, defaultVisibleTeams - (hasExternal ? 1 : 0));
  const showExternalRow = hasExternal && (showAll || !hasMoreRows);

  const lastRowBottomPadding = hasMoreRows ? rem(32) : 0;
  const lastRowPadding = (isLastTeam: boolean): string | number | undefined =>
    isLastTeam && !showExternalRow ? lastRowBottomPadding : undefined;

  return (
    <Card padding={false}>
      <div css={[contentStyles, hasMoreRows && contentWithFooterStyles]}>
        <div css={headerStyles}>
          <Headline3 noMargin>Speakers</Headline3>
          <div css={actionsStyles}>
            {onExport && (
              <Button
                small
                noMargin
                aria-label="Download speakers"
                onClick={onExport}
                overrideStyles={iconButtonStyles}
              >
                {ExportIcon}
              </Button>
            )}
            {onEdit && (
              <Button
                small
                noMargin
                aria-label="Edit speakers"
                onClick={onEdit}
                overrideStyles={editIconButtonStyles}
              >
                <PencilIcon color={neutral1000.rgb} />
              </Button>
            )}
          </div>
        </div>

        <div css={metricsStyles}>
          <SpeakerCountMetric
            label="Speakers"
            value={totalSpeakers}
            caption={`${teamMemberCount} from teams • ${externalCount} non-CRN`}
          />
          {showFindings && (
            <FindingsMetric
              label="Preliminary findings"
              value={findingsPercentage}
              caption={`${teamsShared} of ${pluralizeTeams(teamsTotal)}`}
            />
          )}
        </div>

        <div
          css={[
            tableWrapperStyles,
            findingsOverflowing && horizontalScrollGutter,
          ]}
          ref={tableRef}
        >
          <table css={speakerTableStyles}>
            <colgroup>
              <col />
              {showFindings && <col css={findingsColStyles} />}
              <col css={chevronColStyles} />
            </colgroup>
            {showFindings && (
              <thead>
                <tr>
                  <th css={headerCellStyles} scope="col">
                    Speakers
                  </th>
                  <th
                    css={[headerCellStyles, findingsHeaderCellStyles]}
                    scope="col"
                  >
                    {findingsOverflowing ? (
                      'Preliminary Findings'
                    ) : (
                      <>
                        <span css={fullFindingsLabel}>
                          Preliminary Findings
                        </span>
                        <span css={shortFindingsLabel}>P. Findings</span>
                      </>
                    )}
                  </th>
                  <th css={headerCellStyles} />
                </tr>
              </thead>
            )}

            {visibleTeams.map((group, index) => {
              const bottomOverride = lastRowPadding(
                index === visibleTeams.length - 1,
              );
              return (
                <SpeakerRow
                  key={group.id}
                  label={group.teamName}
                  sharedPreliminaryFindings={group.preliminaryFindingsShared}
                  showFindings={showFindings}
                  expanded={expandedRows.has(group.id)}
                  onToggle={() => toggleRow(group.id)}
                  collapsedBottomPadding={bottomOverride}
                  info={
                    <>
                      {teamIcon(group.teamType)}
                      <Link
                        href={
                          network({}).teams({}).team({ teamId: group.id }).$
                        }
                      >
                        {group.teamName}
                      </Link>
                      {group.isTeamInactive && <InactiveBadgeIcon />}
                      <span css={leadTextStyles}>({group.users.length})</span>
                    </>
                  }
                >
                  <div
                    role="list"
                    css={[
                      membersListStyles,
                      bottomOverride !== undefined && {
                        paddingBottom: bottomOverride,
                      },
                    ]}
                  >
                    {group.users.map((member) => (
                      <SpeakerUserRow
                        key={member.id}
                        displayName={member.displayName}
                        avatarUrl={member.avatarUrl}
                        userId={member.id}
                        roles={member.roles}
                        isAlumni={member.isAlumni}
                      />
                    ))}
                  </div>
                </SpeakerRow>
              );
            })}

            {showExternalRow && externalGroup && (
              <SpeakerRow
                label="External Users"
                sharedPreliminaryFindings={
                  externalGroup.preliminaryFindingsShared
                }
                showFindings={showFindings}
                hasFindings={false}
                expanded={expandedRows.has('external')}
                onToggle={() => toggleRow('external')}
                collapsedBottomPadding={lastRowBottomPadding}
                info={
                  <>
                    <span css={leadTextStyles}>External Users</span>
                    <span css={leadTextStyles}>({externalCount})</span>
                  </>
                }
              >
                <div
                  role="list"
                  css={[
                    membersListStyles,
                    { paddingBottom: lastRowBottomPadding },
                  ]}
                >
                  {externalGroup.users.map((member) => (
                    <SpeakerUserRow
                      key={member.id}
                      displayName={member.displayName}
                      isExternal
                    />
                  ))}
                </div>
              </SpeakerRow>
            )}
          </table>
        </div>
      </div>

      {hasMoreRows && (
        <div css={viewMoreStyles}>
          <Button linkStyle onClick={() => setShowAll((current) => !current)}>
            {showAll ? 'View Less Speakers' : 'View More Speakers'}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default EventSpeakers;
