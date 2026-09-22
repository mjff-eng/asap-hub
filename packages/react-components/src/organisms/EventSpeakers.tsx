import { css } from '@emotion/react';
import { useState } from 'react';

import { Button, Card, Headline3, Paragraph } from '../atoms';
import { neutral1000 } from '../colors';
import { ExportIcon, PencilIcon, plusIcon } from '../icons';
import SpeakerTeamRow from '../molecules/SpeakerTeamRow';
import SpeakerUserRow, {
  chevronSpacerStyles,
  findingsColumnStyles,
  trailingColumnsStyles,
} from '../molecules/SpeakerUserRow';
import { rem, tabletScreen } from '../pixels';
import { pluralize } from '../utils';

import {
  actionsStyles,
  contentStyles,
  editIconButtonStyles,
  emptyStateStyles,
  headerStyles,
  iconButtonStyles,
  metricsStyles,
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
import {
  tileBarFillStyles,
  tileBarTrackStyles,
  tileBreakdownStyles,
  tileBreakdownValueStyles,
  tileCaptionCountStyles,
  tileCaptionStyles,
  tileDividerStyles,
  tileHeaderStyles,
  tileRuleStyles,
  tileStyles,
  tileValueStyles,
} from './speaker-metric-styles';

const mobileQuery = `@media (max-width: ${tabletScreen.min}px)`;

// A long team or project name scrolls the card rather than wrapping, matching
// the edit modal.
const cardHeaderStyles = css({ gap: rem(12) });

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
  color: neutral1000.rgb,
});

const fullFindingsLabel = css({ [mobileQuery]: { display: 'none' } });
const shortFindingsLabel = css({
  display: 'none',
  [mobileQuery]: { display: 'inline' },
});

const SpeakerCountMetric: React.FC<{
  label: string;
  value: number;
  breakdown: ReadonlyArray<{ label: string; value: number }>;
}> = ({ label, value, breakdown }) => (
  <div css={tileStyles}>
    <div css={tileHeaderStyles}>
      <p css={tileValueStyles}>{value}</p>
      <p css={tileCaptionCountStyles}>{label}</p>
    </div>
    <hr css={tileDividerStyles} />
    <div css={tileBreakdownStyles}>
      {breakdown.flatMap((row) => [
        <p key={`${row.label}-label`}>{row.label}</p>,
        <p key={`${row.label}-value`} css={tileBreakdownValueStyles}>
          {row.value}
        </p>,
      ])}
    </div>
  </div>
);

const FindingsMetric: React.FC<{
  label: string;
  value: number;
  shared: number;
  total: number;
}> = ({ label, value, shared, total }) => (
  <div css={tileStyles}>
    <div css={tileHeaderStyles}>
      <p css={tileValueStyles}>{value}%</p>
      <span css={tileRuleStyles} />
      <div>
        <p css={tileCaptionCountStyles}>{`${shared} of ${pluralize(
          total,
          'speaker',
        )}`}</p>
        <p css={tileCaptionStyles}>shared preliminary findings</p>
      </div>
    </div>
    <div
      css={tileBarTrackStyles}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div css={tileBarFillStyles} style={{ width: `${value}%` }} />
    </div>
  </div>
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
  const findingsPercentage =
    totalSpeakers > 0 ? Math.round((sharedSpeakers / totalSpeakers) * 100) : 0;

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
        <div css={[headerStyles, cardHeaderStyles]}>
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
            label="total speakers"
            value={totalSpeakers}
            breakdown={[
              { label: 'From Teams', value: teamSpeakers },
              { label: 'From Individual Projects', value: projectSpeakers },
              { label: 'External', value: externalUsers.length },
            ]}
          />
          {showFindings && (
            <FindingsMetric
              label="Preliminary findings"
              value={findingsPercentage}
              shared={sharedSpeakers}
              total={totalSpeakers}
            />
          )}
        </div>

        <div css={rowsWrapperStyles}>
          <div css={columnHeaderStyles}>
            <span>Speakers</span>
            {showFindings && (
              <span css={trailingColumnsStyles}>
                <span css={findingsColumnStyles}>
                  <span css={fullFindingsLabel}>Preliminary Findings</span>
                  <span css={shortFindingsLabel}>P. Findings</span>
                </span>
                <span css={chevronSpacerStyles} />
              </span>
            )}
          </div>
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
