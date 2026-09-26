import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useMemo, useState } from 'react';
import {
  components,
  type MenuProps,
  type OptionProps,
  type PlaceholderProps,
} from 'react-select';

import {
  Button,
  Headline2,
  Link,
  MultiSelect,
  MultiSelectOptionsType,
  Paragraph,
  Switch,
} from '../atoms';
import { colour } from '../colors';
import {
  binIcon,
  InactiveBadgeIcon,
  crossIcon,
  InterestGroupsIcon,
  lockSmallIcon,
  searchIcon,
  TeamIcon,
  uploadIcon,
} from '../icons';
import { useSectionExpansion } from '../hooks';
import { ConfirmableModalFooter, Modal } from '../molecules';
import { mobileScreen, rem } from '../pixels';
import { pluralizeTeams } from '../utils';
import { EventAttendanceTeam } from './EventAttendance';
import { teamIcon } from './shared-event-card';
import {
  deleteButtonStyles,
  iconButtonStyles,
} from './shared-event-card-styles';
import SourceLists from './SourceLists';
import Toast from './Toast';
import UploadListModal, {
  UploadListResult,
  UploadListSourceFile,
} from './UploadListModal';

export type AttendanceSearchOption = MultiSelectOptionsType &
  (
    | {
        optionType: 'team';
        teamType?: EventAttendanceTeam['teamType'];
        isTeamInactive?: boolean;
      }
    | { optionType: 'interestGroup'; teams: EventAttendanceTeam[] }
  );

type EditEventAttendanceModalProps = {
  teams?: EventAttendanceTeam[];
  interestGroupName?: string;
  loadSearchOptions: (inputValue: string) => Promise<AttendanceSearchOption[]>;
  onUploadList?: (files: File[]) => Promise<UploadListResult>;
  sourceLists?: UploadListSourceFile[];
  onSave: (teams: EventAttendanceTeam[]) => void | Promise<void>;
  onDismiss: () => void;
};

const modalStyles = css({
  width: '100%',
});

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(15),
  padding: `${rem(32)} ${rem(24)} 0`,
});

const titleStyles = css({
  fontSize: rem(26),
  fontWeight: 700,
  lineHeight: 32 / 26,
  color: colour.foreground.primary,
});

const bodyStyles = css({
  display: 'flex',
  flexDirection: 'column',
  padding: `0 ${rem(24)}`,
});

const spacingLarge = css({ marginTop: rem(48) });

// The upload section is hidden on mobile, so the search field needs its own
// wider top/bottom spacing there (48 above, 56 below).
const searchSpacingStyles = css({
  marginTop: rem(32),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginTop: rem(48),
  },
});

const attendeesSpacingStyles = css({
  marginTop: rem(48),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginTop: rem(56),
  },
});

const uploadSectionStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(16),
});

const uploadTextStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

const sectionTitleStyles = css({
  margin: 0,
  fontSize: rem(17),
  fontWeight: 700,
  lineHeight: 24 / 17,
  color: colour.foreground.primary,
});

const optionalLabelStyles = css({ fontWeight: 400 });

const SectionTitle: React.FC<{
  children: React.ReactNode;
  optional?: boolean;
}> = ({ children, optional = false }) => (
  <h3 css={sectionTitleStyles}>
    {children}
    {optional && <span css={optionalLabelStyles}> (optional)</span>}
  </h3>
);

const buttonIconGapReset = { '> svg + span': { marginLeft: 0 } } as const;

const uploadButtonStyles = (enabled: boolean) =>
  css({
    alignSelf: 'flex-start',
    gap: rem(8),
    padding: `${rem(8)} ${rem(16)}`,
    border: `1px solid ${colour.border.tertiary}`,
    borderRadius: rem(4),
    color: enabled ? colour.foreground.primary : colour.foreground.tertiary,
    maxWidth: 'none',
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      flexGrow: 0,
      minWidth: 'auto',
    },
    '> svg': {
      width: rem(24),
      height: rem(24),
      stroke: enabled ? colour.foreground.primary : colour.foreground.tertiary,
      filter: 'none',
    },
    ...buttonIconGapReset,
  });

const attendeesHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: rem(12),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: rem(24),
  },
});

const attendeesStatsStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: rem(4),
  },
});

const statsGroupStyles = css({
  display: 'flex',
  alignItems: 'center',
});

const attendeesStatStyles = css({
  fontSize: rem(17),
  fontWeight: 400,
  color: colour.foreground.tertiary,
});

const separatorStyles = css([attendeesStatStyles, { padding: `0 ${rem(8)}` }]);

const hideOnMobileStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});

const hideOnDesktopStyles = css({
  [`@media (min-width: ${mobileScreen.max + 1}px)`]: {
    display: 'none',
  },
});

const attendeesSectionStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    gap: rem(24),
  },
});

const markAllButtonStyles = css({
  flexGrow: 0,
});

const emptyAttendeesStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: rem(8),
  textAlign: 'center',
  padding: `${rem(32)} ${rem(24)}`,
  border: `1px solid ${colour.border.tertiary}`,
  borderRadius: rem(8),
  backgroundColor: colour.background.secondary,
});

const attendeesCardStyles = (enabled: boolean) =>
  css({
    border: `1px solid ${colour.border.tertiary}`,
    borderRadius: rem(8),
    backgroundColor: enabled
      ? colour.background.secondary
      : colour.background.disabled,
    padding: rem(24),
    overflowX: 'auto',
  });

// Widths in pixels because `rem` here emits `em`, which would resolve against
// each element's own font size: the header's 14px against the rows' 17px.
const attendanceGridStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr 40px 24px',
  columnGap: '32px',
  alignItems: 'center',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    columnGap: '16px',
  },
});

const attendeesTableHeaderStyles = css({
  fontSize: rem(17),
  fontWeight: 'bold',
  lineHeight: 24 / 17,
  letterSpacing: rem(0.1),
  color: colour.foreground.primary,
  paddingBottom: rem(12),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontSize: rem(14),
    lineHeight: 16 / 14,
    letterSpacing: 'normal',
  },
});

const attendanceHeaderStyles = css({ gridColumn: '2 / -1' });

const attendeesRowsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const attendeesGroupsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(40),
});

const attendeesGroupStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const groupHeaderStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(4),
});

// A ratio, not `rem`: line-height in `em` resolves against the element's own
// font size, so `rem(16)` here would render 16/17 x 14px.
const groupLineStyles = css({
  margin: 0,
  fontSize: rem(14),
  lineHeight: 16 / 14,
});

const groupTitleStyles = css([
  groupLineStyles,
  { fontWeight: 700, color: colour.foreground.primary },
]);

const groupHelperStyles = css([
  groupLineStyles,
  { fontWeight: 400, color: colour.foreground.quaternary },
]);

const lockStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(24),
  height: rem(24),
  flexShrink: 0,
});

const rowDividerStyles = css({
  paddingBottom: rem(16),
  borderBottom: `1px solid ${colour.border.tertiary}`,
});

const teamCellStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontSize: rem(14),
    lineHeight: 16 / 14,
    '> svg': {
      display: 'none',
    },
  },
});

const searchOptionStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  '> svg': {
    width: rem(24),
    height: rem(24),
    flexShrink: 0,
  },
});

const searchOptionMetaStyles = css({
  color: colour.foreground.tertiary,
});

const placeholderStyles = css({
  color: colour.foreground.disabled,
});

// react-select remounts a custom component whose identity changes, so the
// stateless ones are declared here; Option still takes a new identity whenever
// the added ids change. They take the multi variant because `MultiSelectProps`
// picks `components` from `Props<T, true>` whatever `isMulti` is.
const SearchPlaceholder = (
  placeholderProps: PlaceholderProps<AttendanceSearchOption, true>,
) => (
  <components.Placeholder {...placeholderProps}>
    <span css={[placeholderStyles, hideOnMobileStyles]}>
      Search for a team or interest group to add…
    </span>
    <span css={[placeholderStyles, hideOnDesktopStyles]}>
      Search team or group…
    </span>
  </components.Placeholder>
);

const SearchMenu = (menuProps: MenuProps<AttendanceSearchOption, true>) =>
  menuProps.selectProps.inputValue ? <components.Menu {...menuProps} /> : null;

const SearchOption = ({
  addedTeamIds,
  ...optionProps
}: OptionProps<AttendanceSearchOption, true> & {
  addedTeamIds: ReadonlySet<string>;
}) => {
  const option = optionProps.data;
  // What selecting the group would actually add, so the count does not promise
  // rows that are already in the list.
  const toAdd =
    option.optionType === 'interestGroup'
      ? option.teams.filter((team) => !addedTeamIds.has(team.teamId)).length
      : 0;
  return (
    <components.Option {...optionProps}>
      <span css={searchOptionStyles}>
        {option.optionType === 'interestGroup' ? (
          <InterestGroupsIcon />
        ) : (
          <TeamIcon />
        )}
        <span>{option.label}</span>
        {option.optionType === 'interestGroup' && (
          <span css={searchOptionMetaStyles}>
            {toAdd === 0
              ? '• all teams already added'
              : `• adds ${pluralizeTeams(toAdd)}`}
          </span>
        )}
      </span>
    </components.Option>
  );
};

const noSearchMatchesMessage = ({ inputValue }: { inputValue: string }) =>
  `Sorry, no matches for ${inputValue}.`;

const AttendeeGroup: React.FC<{
  // Dropped when the event has no hosting group: with a single group there is
  // nothing to tell apart, so the rows start straight under the column header.
  title?: string;
  helperText?: string;
  teams: EventAttendanceTeam[];
  locked?: boolean;
  enabled: boolean;
  onToggleAttended: (teamId: string) => void;
  onRemove: (teamId: string) => void;
}> = ({
  title,
  helperText,
  teams,
  locked = false,
  enabled,
  onToggleAttended,
  onRemove,
}) => {
  const {
    canExpand,
    showingAll,
    visibleRows: visibleTeams,
    hiddenCount,
    toggle,
  } = useSectionExpansion(teams);

  return (
    <div css={attendeesGroupStyles}>
      {title && (
        <div css={groupHeaderStyles}>
          <p css={groupTitleStyles}>
            {title} ({teams.length})
          </p>
          {helperText && <p css={groupHelperStyles}>{helperText}</p>}
        </div>
      )}
      <div css={attendeesRowsStyles} role="list">
        {visibleTeams.map((team, index) => (
          <div
            key={team.teamId}
            css={[
              attendanceGridStyles,
              (index < visibleTeams.length - 1 || canExpand) &&
                rowDividerStyles,
            ]}
            role="listitem"
          >
            <span css={teamCellStyles}>
              {teamIcon(team.teamType)}
              <Link
                openInNewTab
                href={network({}).teams({}).team({ teamId: team.teamId }).$}
              >
                {team.teamName}
              </Link>
              {team.isTeamInactive && <InactiveBadgeIcon />}
            </span>
            <Switch
              checked={team.attended}
              enabled={enabled}
              ariaLabel={`${team.teamName} attendance`}
              onClick={() => onToggleAttended(team.teamId)}
            />
            {locked ? (
              <span css={lockStyles} role="img" aria-label="Locked">
                {lockSmallIcon}
              </span>
            ) : (
              <Button
                noMargin
                enabled={enabled}
                aria-label={`Remove ${team.teamName}`}
                onClick={() => onRemove(team.teamId)}
                overrideStyles={deleteButtonStyles(enabled, 'light')}
              >
                {binIcon}
              </Button>
            )}
          </div>
        ))}
      </div>
      {canExpand && (
        <div>
          <Button linkStyle onClick={toggle}>
            {showingAll ? 'Show less' : `Show ${hiddenCount} more`}
          </Button>
        </div>
      )}
    </div>
  );
};

const EditEventAttendanceModal: React.FC<EditEventAttendanceModalProps> = ({
  teams = [],
  interestGroupName,
  loadSearchOptions,
  onUploadList,
  sourceLists = [],
  onSave,
  onDismiss,
}) => {
  const [rows, setRows] = useState<EventAttendanceTeam[]>(() => [...teams]);
  const [showUploadList, setShowUploadList] = useState(false);
  const [sourceFiles, setSourceFiles] =
    useState<UploadListSourceFile[]>(sourceLists);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaveError, setHasSaveError] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isEditMode = teams.length > 0;
  const title = isEditMode ? 'Edit Attendance' : 'Add Attendance';

  const attendedCount = rows.filter((team) => team.attended).length;
  const hasRows = rows.length > 0;
  const allAttended = hasRows && attendedCount === rows.length;
  const saveEnabled = hasRows && !isSaving;
  const addedTeamIds = useMemo(
    () => new Set(rows.map((team) => team.teamId)),
    [rows],
  );
  const searchComponents = useMemo(
    () => ({
      Placeholder: SearchPlaceholder,
      Menu: SearchMenu,
      Option: (optionProps: OptionProps<AttendanceSearchOption, true>) => (
        <SearchOption {...optionProps} addedTeamIds={addedTeamIds} />
      ),
    }),
    [addedTeamIds],
  );

  const interestGroupRows = rows.filter((team) => team.isFromInterestGroup);
  const additionalRows = rows.filter((team) => !team.isFromInterestGroup);

  const addTeams = (teamsToAdd: EventAttendanceTeam[]) =>
    setRows((current) => {
      const existingIds = new Set(current.map((team) => team.teamId));
      const additions = teamsToAdd.filter(
        (team) => !existingIds.has(team.teamId),
      );
      return [...current, ...additions];
    });

  // Upsert kept separate from addTeams so the search path stays append-only: an
  // existing row keeps its attendanceId (and its interest-group provenance) and
  // takes the uploaded status; a new team is appended.
  const applyUploadedTeams = (teamsToApply: EventAttendanceTeam[]) =>
    setRows((current) => {
      const byId = new Map(current.map((team) => [team.teamId, team]));
      teamsToApply.forEach((team) =>
        byId.set(team.teamId, { ...byId.get(team.teamId), ...team }),
      );
      return [...byId.values()];
    });

  const handleUploadAddAttendees = (
    uploadedTeams: EventAttendanceTeam[],
    files: File[],
  ) => {
    applyUploadedTeams(uploadedTeams);
    const addedDate = new Date().toLocaleDateString('en-GB');
    setSourceFiles((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${file.name}-${current.length + index}`,
        filename: file.name,
        addedDate,
        onDownload: () => {
          const url = URL.createObjectURL(file);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = file.name;
          anchor.click();
          // Defer so the click-triggered download can read the blob before the
          // URL is revoked (a synchronous revoke cancels it in Firefox/Safari).
          setTimeout(() => URL.revokeObjectURL(url), 0);
        },
      })),
    ]);
    setShowUploadList(false);
  };

  const handleSelectSearchOption = (option: AttendanceSearchOption) => {
    if (option.optionType === 'interestGroup') {
      addTeams(option.teams);
    } else {
      addTeams([
        {
          teamId: option.value,
          teamName: option.label,
          attended: true,
          teamType: option.teamType,
          isTeamInactive: option.isTeamInactive,
        },
      ]);
    }
  };

  const toggleAttended = (teamId: string) =>
    setRows((current) =>
      current.map((team) =>
        team.teamId === teamId ? { ...team, attended: !team.attended } : team,
      ),
    );

  const removeTeam = (teamId: string) =>
    setRows((current) => current.filter((team) => team.teamId !== teamId));

  const toggleMarkAllAttended = () =>
    setRows((current) =>
      current.map((team) => ({ ...team, attended: !allAttended })),
    );

  const handleSave = async () => {
    setIsSaving(true);
    setHasSaveError(false);
    try {
      await onSave(rows);
    } catch {
      setHasSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty =
    rows.length !== teams.length ||
    rows.some(
      (row, index) =>
        row.teamId !== teams[index]?.teamId ||
        row.attended !== teams[index]?.attended,
    );

  const handleCancel = () => (isDirty ? setIsCancelling(true) : onDismiss());

  if (showUploadList && onUploadList) {
    return (
      <UploadListModal
        onUploadList={onUploadList}
        onAddAttendees={handleUploadAddAttendees}
        onBack={() => setShowUploadList(false)}
        currentTeamIds={addedTeamIds}
      />
    );
  }

  return (
    <Modal padding={false} overrideModalStyles={modalStyles}>
      <header css={headerStyles}>
        <Headline2 noMargin overrideStyles={titleStyles}>
          {title}
        </Headline2>
        <Button
          small
          noMargin
          aria-label="Close"
          enabled={!isSaving}
          onClick={handleCancel}
          overrideStyles={iconButtonStyles}
        >
          {crossIcon}
        </Button>
      </header>

      <div css={bodyStyles}>
        {hasSaveError && (
          <Toast>An error has occurred. Please try again later.</Toast>
        )}
        <div css={searchSpacingStyles}>
          <MultiSelect<AttendanceSearchOption, false>
            isMulti={false}
            values={null}
            noMargin
            enabled={!isCancelling}
            defaultOptions={false}
            leftIndicator={searchIcon}
            loadOptions={loadSearchOptions}
            onChange={handleSelectSearchOption}
            noOptionsMessage={noSearchMatchesMessage}
            components={searchComponents}
          />
        </div>

        {onUploadList && (
          <section
            css={[uploadSectionStyles, spacingLarge, hideOnMobileStyles]}
          >
            <div css={uploadTextStyles}>
              <SectionTitle optional>Upload a list</SectionTitle>
              <Paragraph noMargin accent="tertiary">
                Add several teams at once from a spreadsheet, instead of
                searching one by one.
              </Paragraph>
            </div>
            <Button
              noMargin
              enabled={!isCancelling}
              overrideStyles={uploadButtonStyles(!isCancelling)}
              onClick={() => setShowUploadList(true)}
            >
              {uploadIcon}
              Upload a List
            </Button>
          </section>
        )}

        <section css={[attendeesSectionStyles, attendeesSpacingStyles]}>
          <div css={attendeesHeaderStyles}>
            <div css={attendeesStatsStyles}>
              <SectionTitle>Attendees</SectionTitle>
              {hasRows && (
                <span css={statsGroupStyles}>
                  <span css={[separatorStyles, hideOnMobileStyles]}>•</span>
                  <span css={attendeesStatStyles}>{rows.length} Expected</span>
                  <span css={separatorStyles}>•</span>
                  <span css={attendeesStatStyles}>
                    {attendedCount} Attended
                  </span>
                </span>
              )}
            </div>
            {hasRows && (
              <Button
                small
                noMargin
                enabled={!isCancelling}
                overrideStyles={markAllButtonStyles}
                onClick={toggleMarkAllAttended}
              >
                {allAttended ? 'Mark All Not Attended' : 'Mark All Attended'}
              </Button>
            )}
          </div>

          {!hasRows ? (
            <div css={emptyAttendeesStyles} role="status">
              <Paragraph noMargin accent="tertiary">
                <strong>Add teams to track attendance</strong>
              </Paragraph>
              <Paragraph noMargin accent="tertiary">
                This event has no hosting group, so nothing was added
                automatically. Search for a team above or upload a list.
              </Paragraph>
            </div>
          ) : (
            <div css={attendeesCardStyles(!isCancelling)}>
              <div css={[attendanceGridStyles, attendeesTableHeaderStyles]}>
                <span>Team</span>
                <span css={attendanceHeaderStyles}>Attendance</span>
              </div>
              <div css={attendeesGroupsStyles}>
                {interestGroupRows.length > 0 && (
                  <AttendeeGroup
                    title={
                      interestGroupName
                        ? `From ${interestGroupName}`
                        : 'From interest group'
                    }
                    helperText="Added automatically because this group is hosting. These cannot be removed."
                    teams={interestGroupRows}
                    locked
                    enabled={!isCancelling}
                    onToggleAttended={toggleAttended}
                    onRemove={removeTeam}
                  />
                )}
                {additionalRows.length > 0 && (
                  <AttendeeGroup
                    title={
                      interestGroupRows.length > 0
                        ? 'Additional teams'
                        : undefined
                    }
                    teams={additionalRows}
                    enabled={!isCancelling}
                    onToggleAttended={toggleAttended}
                    onRemove={removeTeam}
                  />
                )}
              </div>
            </div>
          )}
        </section>

        <SourceLists files={sourceFiles} />
      </div>

      <ConfirmableModalFooter
        isConfirming={isCancelling}
        confirmationMessage="You'll lose all unsaved changes if you cancel now."
        onKeepEditing={() => setIsCancelling(false)}
        onDiscard={onDismiss}
        onCancel={handleCancel}
        cancelEnabled={!isSaving}
        confirmLabel="Save"
        onConfirm={() => {
          void handleSave();
        }}
        confirmEnabled={saveEnabled}
        confirmLoading={isSaving}
      />
    </Modal>
  );
};

export default EditEventAttendanceModal;
