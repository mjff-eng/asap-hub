import { css } from '@emotion/react';
import { useState } from 'react';

import { Button, Card, Headline3, Paragraph } from '../atoms';
import { colour } from '../colors';
import { ExportIcon, PencilIcon, plusIcon } from '../icons';
import EventAttendanceMetric, {
  containerStyles as metricContainerStyles,
  valueStyles,
} from '../molecules/EventAttendanceMetric';
import SpeakerTeamRow from '../molecules/SpeakerTeamRow';
import SpeakerUserRow, {
  chevronSpacerStyles,
  findingsColumnStyles,
  trailingColumnsStyles,
} from '../molecules/SpeakerUserRow';
import { mobileScreen, rem, tabletScreen } from '../pixels';
import { pluralize } from '../utils';

import {
  actionsStyles,
  contentStyles,
  editIconButtonStyles,
  emptyStateStyles,
  headerStyles,
  iconButtonStyles,
} from './shared-event-card-styles';
import {
  groupFindings,
  groupLabel,
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
} from './speaker-group';
import SpeakerSection from './speaker-section';

const mobileQuery = `@media (max-width: ${tabletScreen.min}px)`;

const rowsWrapperStyles = css({
  marginTop: rem(32),
  overflowX: 'auto',
});

const columnHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(24),
  fontSize: rem(17),
  fontWeight: 'bold',
  lineHeight: rem(24),
  letterSpacing: rem(0.1),
  color: colour.foreground.primary,
});

const fullFindingsLabel = css({ [mobileQuery]: { display: 'none' } });
const shortFindingsLabel = css({
  display: 'none',
  [mobileQuery]: { display: 'inline' },
});

const breakdownDividerStyles = css({
  alignSelf: 'stretch',
  height: rem(1),
  border: 0,
  margin: 0,
  backgroundColor: colour.border.tertiary,
});

// The findings tile moves to its own line rather than wrap its caption.
const speakerMetricsStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(24),
  marginTop: rem(24),
  '> *': { flex: `1 1 ${rem(264)}` },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    '> *:first-of-type': { maxWidth: rem(264) },
  },
  '> *:nth-of-type(2)': { flex: `1 1 ${rem(380)}`, maxWidth: rem(413) },
});

const countHeadlineStyles = css({
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  columnGap: rem(8),
});

// The total keeps its desktop size on mobile, unlike the findings tile.
const countValueStyles = css([
  valueStyles,
  {
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      fontSize: rem(32),
      lineHeight: 40 / 32,
    },
  },
]);
const countLabelStyles = css({
  margin: 0,
  fontSize: rem(20),
  fontWeight: 'bold',
  lineHeight: 28 / 20,
  color: colour.foreground.primary,
});

const breakdownStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  columnGap: rem(16),
  rowGap: rem(8),
  color: colour.foreground.tertiary,
});

const breakdownLabelStyles = css({
  margin: 0,
  fontSize: rem(16),
  fontWeight: 500,
  lineHeight: 24 / 16,
  [`@media (max-width: ${mobileScreen.max}px)`]: { fontWeight: 400 },
});

const breakdownValueStyles = css({
  margin: 0,
  textAlign: 'right',
  fontSize: rem(16),
  fontWeight: 'bold',
  lineHeight: 24 / 16,
});

const SpeakerCountMetric: React.FC<{
  label: string;
  value: number;
  breakdown: ReadonlyArray<{ label: string; value: number }>;
}> = ({ label, value, breakdown }) => (
  <div css={metricContainerStyles}>
    <div css={countHeadlineStyles}>
      <p css={countValueStyles}>{value}</p>
      <p css={countLabelStyles}>{label}</p>
    </div>
    <hr css={breakdownDividerStyles} />
    <div css={breakdownStyles}>
      {breakdown.flatMap((row) => [
        <p key={`${row.label}-label`} css={breakdownLabelStyles}>
          {row.label}
        </p>,
        <p key={`${row.label}-value`} css={breakdownValueStyles}>
          {row.value}
        </p>,
      ])}
    </div>
  </div>
);

type EventSpeakersProps = {
  groups?: SpeakerGroup[];
  hasFinished?: boolean;
  onExport?: () => void;
  onEdit?: () => void;
  onAddSpeaker?: () => void;
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
  const teamGroups = groups.filter(
    (group): group is SpeakerTeamGroup =>
      group.variant === 'team' && group.users.length > 0,
  );
  const projectGroups = groups.filter(
    (group): group is SpeakerProjectGroup =>
      group.variant === 'project' && group.users.length > 0,
  );
  const externalUsers = groups.reduce<SpeakerGroupExternalUser[]>(
    (users, group) =>
      group.variant === 'external' ? [...users, ...group.users] : users,
    [],
  );

  const firstGroupId = [...teamGroups, ...projectGroups][0]?.id;
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () =>
      new Set(hasFinished || firstGroupId === undefined ? [] : [firstGroupId]),
  );
  const [expandedSections, setExpandedSections] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const toggleSection = (variant: string) =>
    setExpandedSections((current) => {
      const next = new Set(current);
      if (!next.delete(variant)) {
        next.add(variant);
      }
      return next;
    });

  const showFindings = hasFinished;

  if (
    teamGroups.length === 0 &&
    projectGroups.length === 0 &&
    externalUsers.length === 0
  ) {
    return (
      <Card>
        <div css={emptyStateStyles}>
          <Headline3 noMargin>Speakers</Headline3>
          {onAddSpeaker ? (
            <>
              <Paragraph noMargin accent="tertiary">
                {editorEmptyMessage(hasFinished)}
              </Paragraph>
              <Button primary small noMargin onClick={onAddSpeaker}>
                {plusIcon} Add Speakers
              </Button>
            </>
          ) : (
            <Paragraph noMargin accent="tertiary">
              No speakers have been added for this event yet.
            </Paragraph>
          )}
        </div>
      </Card>
    );
  }

  const toggleGroup = (id: string) =>
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  const teamSpeakers = teamGroups.reduce(
    (total, group) => total + group.users.length,
    0,
  );
  const projectSpeakers = projectGroups.reduce(
    (total, group) => total + group.users.length,
    0,
  );
  const totalSpeakers = teamSpeakers + projectSpeakers + externalUsers.length;
  const sharedSpeakers = [
    ...teamGroups,
    ...projectGroups,
    { users: externalUsers },
  ].reduce((total, group) => total + groupFindings(group).shared, 0);
  const findingsPercentage = Math.round((sharedSpeakers / totalSpeakers) * 100);

  const renderGroupRow = (group: SpeakerTeamGroup | SpeakerProjectGroup) => (
    <SpeakerTeamRow
      key={group.id}
      variant={group.variant}
      teamId={group.variant === 'team' ? group.id : undefined}
      teamType={group.variant === 'team' ? group.teamType : undefined}
      isTeamInactive={
        group.variant === 'team' ? group.isTeamInactive : undefined
      }
      projectId={group.variant === 'project' ? group.id : undefined}
      projectType={group.variant === 'project' ? group.projectType : undefined}
      label={groupLabel(group)}
      users={group.users}
      showShared={showFindings}
      expanded={expandedGroups.has(group.id)}
      onToggleExpanded={() => toggleGroup(group.id)}
    />
  );

  return (
    <Card padding={false}>
      <div css={contentStyles}>
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
                <PencilIcon color={colour.foreground.primary} />
              </Button>
            )}
          </div>
        </div>

        <div css={speakerMetricsStyles}>
          <SpeakerCountMetric
            label="total speakers"
            value={totalSpeakers}
            breakdown={[
              { label: 'From Teams', value: teamSpeakers },
              { label: 'From Individual Projects', value: projectSpeakers },
              { label: 'External', value: externalUsers.length },
            ]}
          />
          {showFindings && (
            <EventAttendanceMetric
              label="Preliminary findings"
              value={findingsPercentage}
              caption={`${sharedSpeakers} of ${pluralize(
                totalSpeakers,
                'speaker',
              )}`}
              captionDetail="shared preliminary findings"
            />
          )}
        </div>

        <div css={rowsWrapperStyles}>
          {showFindings && (
            <div css={columnHeaderStyles}>
              <span>Speakers</span>
              <span css={trailingColumnsStyles}>
                <span css={findingsColumnStyles}>
                  <span css={fullFindingsLabel}>Preliminary Findings</span>
                  <span css={shortFindingsLabel}>P. Findings</span>
                </span>
                <span css={chevronSpacerStyles} />
              </span>
            </div>
          )}
          {(['team', 'project'] as const).map((variant) => (
            <SpeakerSection
              key={variant}
              variant={variant}
              rows={(variant === 'team' ? teamGroups : projectGroups).map(
                renderGroupRow,
              )}
              expanded={expandedSections.has(variant)}
              onToggle={() => toggleSection(variant)}
            />
          ))}
          <SpeakerSection
            variant="external"
            rows={externalUsers.map((user) => (
              <SpeakerUserRow
                key={user.id}
                displayName={user.displayName}
                isExternal
                preliminaryFindingsShared={user.preliminaryFindingsShared}
                showShared={showFindings}
              />
            ))}
            expanded={expandedSections.has('external')}
            onToggle={() => toggleSection('external')}
          />
        </div>
      </div>
    </Card>
  );
};

export default EventSpeakers;
