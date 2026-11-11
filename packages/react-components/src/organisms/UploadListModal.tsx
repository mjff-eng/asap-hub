import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useRef, useState } from 'react';

import { Button, Headline2, Link, Paragraph, Tag } from '../atoms';
import { colour } from '../colors';
import {
  binIcon,
  chevronDownIcon,
  CircleInfoIcon,
  InactiveBadgeIcon,
  InvalidTickIcon,
  crossSmallIcon,
  chevronLeftIcon,
  plusIcon,
  refreshSmallIcon,
  tickInCircleIcon,
  tickSmallIcon,
} from '../icons';
import { ConfirmableModalFooter, Modal, TooltipInfo } from '../molecules';
import { rem } from '../pixels';
import { pluralizeTeams } from '../utils/events';
import {
  EventAttendanceTeam,
  EventAttendanceTeamType,
} from './EventAttendance';
import { teamIcon } from './shared-event-card';
import {
  deleteButtonStyles,
  iconButtonStyles,
} from './shared-event-card-styles';

export type UploadListSuggestion = {
  teamId: string;
  teamName: string;
  teamType?: EventAttendanceTeamType;
  attended: boolean;
  isTeamInactive?: boolean;
};

export type UploadListUnmatchedTeam = {
  name: string;
  suggestion?: UploadListSuggestion;
};

export type UploadListResult = {
  // Every resolved Hub Team, new or already on the table; the modal splits them.
  matched: EventAttendanceTeam[];
  unmatched: UploadListUnmatchedTeam[];
};

export type UploadListSourceFile = {
  id: string;
  filename: string;
  addedDate?: string;
  onDownload?: () => void | Promise<void>;
};

type UploadListModalProps = {
  onUploadList: (file: File) => Promise<UploadListResult>;
  onAddAttendees: (
    teams: EventAttendanceTeam[],
    file: File,
  ) => void | Promise<void>;
  onBack: () => void;
  // Teams already on the table (including unsaved additions), shown as
  // "already in" rather than new.
  currentTeams?: ReadonlyArray<EventAttendanceTeam>;
  maxFileSizeMb?: number;
  accept?: string;
  initialFile?: File | null;
  initialResult?: UploadListResult | null;
  initialSectionsOpen?: boolean;
};

const defaultMaxFileSizeMb = 10;
const defaultAccept = '.csv,.xlsx';

const modalStyles = css({
  width: '100%',
});

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(15),
  padding: `${rem(32)} ${rem(24)} 0`,
});

const headerTitleStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(16),
  flex: 1,
});

const titleStyles = css({
  color: colour.foreground.primary,
});

const headerIconStyles = css({
  justifyContent: 'center',
  '> svg': {
    width: rem(24),
    height: rem(24),
    padding: 0,
  },
});

const bodyStyles = css({
  display: 'flex',
  flexDirection: 'column',
  padding: `${rem(32)} ${rem(24)} 0`,
});

const uploadSectionStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(16),
  marginTop: rem(16),
});

const resultStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  marginTop: rem(32),
});

const chipsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(8),
});

const buttonIconGapReset = { '> svg + span': { marginLeft: 0 } } as const;

const addButtonStyles = css({
  alignSelf: 'flex-start',
  alignItems: 'center',
  gap: rem(8),
  maxWidth: 'none',
  lineHeight: rem(24),
  '> svg': {
    width: rem(24),
    height: rem(24),
    paddingTop: rem(2),
    paddingBottom: rem(2),
  },
  ...buttonIconGapReset,
});

const errorStyles = css({
  margin: 0,
  color: colour.foreground.error,
  fontSize: rem(16),
  fontWeight: 400,
  lineHeight: rem(24),
  letterSpacing: 0,
});

const summaryStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  fontSize: rem(16),
  lineHeight: rem(24),
  color: colour.foreground.tertiary,
});

const summaryStrongStyles = css({
  fontWeight: 700,
  color: colour.foreground.primary,
});

const summarySeparatorStyles = css({
  paddingLeft: rem(8),
  paddingRight: rem(8),
});

const resultCardStyles = (enabled: boolean) =>
  css({
    border: `1px solid ${colour.border.tertiary}`,
    borderRadius: rem(8),
    backgroundColor: enabled
      ? colour.background.secondary
      : colour.background.disabled,
    overflow: 'hidden',
  });

const sectionHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(16),
  width: '100%',
  padding: rem(16),
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: rem(16),
  lineHeight: rem(24),
  textAlign: 'left',
  color: colour.foreground.primary,
});

const sectionHeaderLabelStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(12),
  '> svg': {
    width: rem(24),
    height: rem(24),
    flexShrink: 0,
  },
});

const matchedLabelStyles = css({
  color: colour.foreground.tertiary,
  fontWeight: 400,
  gap: rem(8),
  strong: {
    fontWeight: 700,
  },
});

const notMatchedLabelStyles = css({
  color: colour.foreground.error,
  gap: rem(8),
  '> svg': {
    fill: colour.foreground.error,
  },
});

const chevronStyles = (open: boolean) =>
  css({
    display: 'flex',
    transition: 'transform 0.2s',
    transform: open ? 'rotate(180deg)' : 'none',
    '> svg': {
      width: rem(24),
      height: rem(24),
    },
  });

const dividerStyles = css({
  borderTop: `1px solid ${colour.border.tertiary}`,
});

const sectionBodyStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  padding: `0 ${rem(16)} ${rem(16)} ${rem(48)}`,
});

const matchedRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(16),
});

const matchedTeamStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  color: colour.foreground.brand,
  '> svg': {
    width: rem(24),
    height: rem(24),
    flexShrink: 0,
  },
});

const matchedTeamNameStyles = css({
  color: colour.foreground.brand,
  fontWeight: 400,
});

const unmatchedRowsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(4),
});

const unmatchedRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(16),
});

const unmatchedTextStyles = css({
  fontSize: rem(16),
  lineHeight: rem(24),
  color: colour.foreground.tertiary,
});

const unmatchedMetaStyles = css({
  color: colour.foreground.tertiary,
});

const upToDateStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  verticalAlign: 'top',
  gap: rem(8),
  marginLeft: rem(48),
  color: colour.foreground.tertiary,
  '> svg': {
    flexShrink: 0,
  },
});

const suggestionLinkStyles = css({
  color: colour.foreground.brand,
});

const addSuggestionButtonStyles = css({
  flexGrow: 0,
  flexShrink: 0,
  minWidth: rem(90),
  alignItems: 'center',
  justifyContent: 'center',
  gap: rem(8),
  lineHeight: rem(24),
  color: colour.foreground.tertiary,
  '> svg': {
    width: rem(24),
    height: rem(24),
    paddingTop: rem(2),
    paddingBottom: rem(2),
  },
  ...buttonIconGapReset,
});

const infoBoxStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(12),
  padding: rem(16),
  borderRadius: rem(4),
  marginTop: rem(16),
  backgroundColor: colour.background.neutral,
  '> svg': {
    flexShrink: 0,
  },
});

const infoBoxTextStyles = css({
  margin: 0,
  color: colour.foreground.neutral,
  fontSize: rem(16),
  fontWeight: 500,
  lineHeight: rem(24),
});

const changingTeamStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(32),
});
const attendanceStatusStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  width: rem(127),
  color: colour.foreground.tertiary,
  fontSize: rem(16),
  lineHeight: rem(24),
  '> svg': {
    width: rem(20),
    height: rem(20),
    flexShrink: 0,
  },
});

// Caption/C1 from the designs: four lines at 16px with nothing between them,
// so the shared 6px row gap is dropped here.
const formatTooltipStyles = css({
  gap: 0,
  paddingTop: 0,
  paddingBottom: 0,
  textAlign: 'left',
  fontSize: rem(14),
  fontWeight: 400,
  lineHeight: rem(16),
});

const unmatchedHelpStyles = css({
  margin: 0,
  color: colour.foreground.tertiary,
  fontSize: rem(14),
  fontWeight: 400,
  lineHeight: rem(24),
});

const getAllowedExtensions = (accept: string): string[] =>
  accept
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.startsWith('.'));

const hasAllowedExtension = (
  file: File,
  allowedExtensions: string[],
): boolean => {
  const name = file.name.toLowerCase();
  return allowedExtensions.some((extension) => name.endsWith(extension));
};

const suggestionToTeam = (
  suggestion: UploadListSuggestion,
): EventAttendanceTeam => ({
  teamId: suggestion.teamId,
  teamName: suggestion.teamName,
  attended: suggestion.attended,
  teamType: suggestion.teamType,
  isTeamInactive: suggestion.isTeamInactive,
});

// A picked File is read from disk lazily, so Chrome refuses to send it
// (ERR_UPLOAD_FILE_CHANGED) if the file is edited before the attendance is saved.
// Copying the bytes up front decouples the upload from the disk file.
const copyFileToMemory = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(
        new File([reader.result as ArrayBuffer], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        }),
      );
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

const dedupeByTeamId = (
  teams: EventAttendanceTeam[],
): EventAttendanceTeam[] => {
  const seen = new Set<string>();
  return teams.filter((team) => {
    if (seen.has(team.teamId)) {
      return false;
    }
    seen.add(team.teamId);
    return true;
  });
};

const UploadListModal: React.FC<UploadListModalProps> = ({
  onUploadList,
  onAddAttendees,
  onBack,
  currentTeams = [],
  maxFileSizeMb = defaultMaxFileSizeMb,
  accept = defaultAccept,
  initialFile = null,
  initialResult = null,
  initialSectionsOpen = false,
}) => {
  const [file, setFile] = useState<File | null>(initialFile);
  const [result, setResult] = useState<UploadListResult | null>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [addedSuggestionIds, setAddedSuggestionIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [removedMatchedIds, setRemovedMatchedIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [matchedOpen, setMatchedOpen] = useState(initialSectionsOpen);
  const [unmatchedOpen, setUnmatchedOpen] = useState(initialSectionsOpen);
  const [changingOpen, setChangingOpen] = useState(initialSectionsOpen);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = getAllowedExtensions(accept);
  const maxBytes = maxFileSizeMb * 1000 * 1000;

  const runUpload = (nextFile: File | null) => {
    setFile(nextFile);
    setAddedSuggestionIds(new Set());
    setRemovedMatchedIds(new Set());

    if (!nextFile) {
      setResult(null);
      setIsUploading(false);
      return;
    }

    void onUploadList(nextFile)
      .then((uploadResult) => {
        setResult(uploadResult);
        setError(null);
      })
      .catch(() => {
        setResult(null);
        setError('Something went wrong reading this file. Please try again.');
      })
      .finally(() => setIsUploading(false));
  };

  const onFileChange = (selectedFile: File) => {
    const isInvalid = !hasAllowedExtension(selectedFile, allowedExtensions);
    const isTooLarge = selectedFile.size > maxBytes;

    let selectionError: string | null = null;

    if (isTooLarge) {
      selectionError = `The file size exceeds the limit of ${maxFileSizeMb} MB. Please upload a smaller file.`;
    }

    if (isInvalid) {
      selectionError = 'CSV or XLSX files only.';
    }

    setError(selectionError);
    if (selectionError) return;

    setIsUploading(true);
    void copyFileToMemory(selectedFile)
      .then(runUpload)
      .catch(() => {
        setIsUploading(false);
        setError('Something went wrong reading this file. Please try again.');
      });
  };

  const removeFile = () => runUpload(null);

  const promoteSuggestion = (teamId: string) =>
    setAddedSuggestionIds((prev) => new Set(prev).add(teamId));

  const removeMatchedTeam = (teamId: string) => {
    if (addedSuggestionIds.has(teamId)) {
      setAddedSuggestionIds((prev) => {
        const next = new Set(prev);
        next.delete(teamId);
        return next;
      });
      return;
    }
    setRemovedMatchedIds((prev) => new Set(prev).add(teamId));
  };

  const isPromoted = (
    team: UploadListUnmatchedTeam,
  ): team is UploadListUnmatchedTeam & { suggestion: UploadListSuggestion } =>
    !!team.suggestion && addedSuggestionIds.has(team.suggestion.teamId);

  const currentAttendance = new Map(
    currentTeams.map((team) => [team.teamId, team.attended]),
  );

  const changesAttendance = (team: EventAttendanceTeam) =>
    currentAttendance.get(team.teamId) !== team.attended;

  const suggestionChangesAttendance = (suggestion: UploadListSuggestion) =>
    currentAttendance.get(suggestion.teamId) !== suggestion.attended;

  const alreadyIn = result
    ? result.matched.filter((team) => currentAttendance.has(team.teamId))
    : [];
  const newMatchedCount = result ? result.matched.length - alreadyIn.length : 0;

  const promotedTeams: EventAttendanceTeam[] = result
    ? result.unmatched
        .filter(isPromoted)
        .map((team) => suggestionToTeam(team.suggestion))
    : [];
  const promotedUpdates = promotedTeams.filter((team) =>
    currentAttendance.has(team.teamId),
  );
  const promotedNew = promotedTeams.filter(
    (team) => !currentAttendance.has(team.teamId),
  );

  const matchedTeams: EventAttendanceTeam[] = result
    ? [
        ...result.matched.filter(
          (team) =>
            !currentAttendance.has(team.teamId) &&
            !removedMatchedIds.has(team.teamId),
        ),
        ...promotedNew,
      ]
    : [];

  const changingTeams = dedupeByTeamId([...promotedUpdates, ...alreadyIn])
    .filter(changesAttendance)
    .filter((team) => !removedMatchedIds.has(team.teamId));

  const nothingToChange =
    !!result &&
    result.matched.length > 0 &&
    result.unmatched.length === 0 &&
    newMatchedCount === 0 &&
    !alreadyIn.some(changesAttendance);

  const alreadyInCount = new Set([
    ...alreadyIn.map((team) => team.teamId),
    ...promotedUpdates.map((team) => team.teamId),
  ]).size;

  const remainingUnmatched = result
    ? result.unmatched.filter((team) => !isPromoted(team))
    : [];

  const totalTeams = result
    ? result.matched.length + result.unmatched.length
    : 0;

  // A file that yields no names is reported as an upload error rather than as
  // an empty result, so the counts line never reads "0 Teams".
  const yieldedNothing = !!result && totalTeams === 0;
  // A file or selection problem is the more specific cause, so it wins.
  const shownError =
    error ??
    (yieldedNothing
      ? 'No team names found. Check that the file has a Team Name column.'
      : null);

  const hasSections =
    matchedTeams.length > 0 ||
    changingTeams.length > 0 ||
    remainingUnmatched.length > 0;

  const isDirty = !!file || matchedTeams.length > 0;
  const addEnabled =
    !!file &&
    (matchedTeams.length > 0 || changingTeams.length > 0) &&
    !isSaving;

  const requestClose = () => {
    if (isDirty) {
      setIsCancelling(true);
    } else {
      onBack();
    }
  };

  const handleAddAttendees = async () => {
    if (!file) return;
    setIsSaving(true);
    try {
      await onAddAttendees(
        dedupeByTeamId([...matchedTeams, ...changingTeams]),
        file,
      );
    } catch {
      // The caller surfaces the error; the modal only needs to unlock so the
      // user can retry or cancel instead of staying stuck on "saving".
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal padding={false} overrideModalStyles={modalStyles}>
      <header css={headerStyles}>
        <div css={headerTitleStyles}>
          <Button
            small
            noMargin
            aria-label="Back"
            enabled={!isSaving}
            onClick={requestClose}
            overrideStyles={css([iconButtonStyles, headerIconStyles])}
          >
            {chevronLeftIcon}
          </Button>
          <Headline2 styleAsHeading={4} noMargin overrideStyles={titleStyles}>
            Upload a list
          </Headline2>
        </div>
      </header>

      <div css={bodyStyles}>
        <Paragraph noMargin accent="tertiary">
          Add teams from a list. Matched teams are added and marked attended. If
          a team is already in your list, their attendance will be updated to
          match the file. CSV or XLSX files only. What format does the file
          need?
          <TooltipInfo
            openOnHover
            floating
            width={296}
            background={colour.neutral[900]}
            overrideTooltipStyles={formatTooltipStyles}
          >
            <span>Your file needs two columns.</span>
            <span>For team names, use the header Team.</span>
            <span>For attendance, use Attended.</span>
            <span>Mark attendance as yes/no.</span>
          </TooltipInfo>
        </Paragraph>

        <section css={uploadSectionStyles}>
          {file && !nothingToChange && (
            <div css={chipsStyles}>
              <Tag
                enabled={!isCancelling && !isUploading}
                onRemove={removeFile}
              >
                {file.name}
              </Tag>
            </div>
          )}
          <input
            ref={uploadInputRef}
            type="file"
            accept={accept}
            aria-label="Add a list"
            hidden
            disabled={isCancelling}
            onChange={({ target }) => {
              const [selectedFile] = Array.from(target.files ?? []);
              if (selectedFile) onFileChange(selectedFile);
              if (uploadInputRef.current) {
                uploadInputRef.current.value = '';
              }
            }}
          />
          {(!file || nothingToChange || isUploading) && (
            <Button
              small
              primary
              noMargin
              enabled={!isUploading && !isCancelling}
              loading={isUploading}
              overrideStyles={addButtonStyles}
              onClick={() => uploadInputRef.current?.click()}
            >
              {!isUploading && plusIcon}
              Add
            </Button>
          )}
          {shownError && (
            <p css={errorStyles} role="alert">
              {shownError}
            </p>
          )}
        </section>

        {nothingToChange && (
          <div css={infoBoxStyles} role="status">
            <CircleInfoIcon color={colour.foreground.neutral} size={24} />
            <p css={infoBoxTextStyles}>
              Every team in this file is already in your list with the same
              attendance, so there&apos;s nothing to add. Replace the file to
              try a different one, or cancel to close without changing your
              list.
            </p>
          </div>
        )}

        {result && !yieldedNothing && !nothingToChange && (
          <div css={resultStyles}>
            <div css={summaryStyles}>
              <span css={summaryStrongStyles}>
                {pluralizeTeams(totalTeams, true)}
              </span>
              <span css={summarySeparatorStyles}>•</span>
              <span>{newMatchedCount} matched</span>
              <span css={summarySeparatorStyles}>•</span>
              <span>{alreadyInCount} already in</span>
            </div>

            {hasSections && (
              <div css={resultCardStyles(!isCancelling)}>
                {matchedTeams.length > 0 && (
                  <>
                    <button
                      type="button"
                      css={sectionHeaderStyles}
                      aria-expanded={matchedOpen}
                      onClick={() => setMatchedOpen((open) => !open)}
                    >
                      <span
                        css={[sectionHeaderLabelStyles, matchedLabelStyles]}
                      >
                        {tickSmallIcon}
                        <span>
                          <strong>{pluralizeTeams(matchedTeams.length)}</strong>{' '}
                          will be added and marked if attended
                        </span>
                      </span>
                      <span css={chevronStyles(matchedOpen)}>
                        {chevronDownIcon}
                      </span>
                    </button>
                    {matchedOpen && (
                      <div css={sectionBodyStyles}>
                        {matchedTeams.map((team) => (
                          <div key={team.teamId} css={matchedRowStyles}>
                            <span css={matchedTeamStyles}>
                              {teamIcon(team.teamType)}
                              <Link
                                openInNewTab
                                href={
                                  network({})
                                    .teams({})
                                    .team({ teamId: team.teamId }).$
                                }
                              >
                                <span css={matchedTeamNameStyles}>
                                  {team.teamName}
                                </span>
                              </Link>
                              {team.isTeamInactive && <InactiveBadgeIcon />}
                            </span>
                            <Button
                              noMargin
                              enabled={!isCancelling}
                              aria-label={`Remove ${team.teamName}`}
                              onClick={() => removeMatchedTeam(team.teamId)}
                              overrideStyles={deleteButtonStyles(!isCancelling)}
                            >
                              {binIcon}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {matchedTeams.length > 0 && changingTeams.length > 0 && (
                  <div css={dividerStyles} />
                )}

                {changingTeams.length > 0 && (
                  <>
                    <button
                      type="button"
                      css={sectionHeaderStyles}
                      aria-expanded={changingOpen}
                      onClick={() => setChangingOpen((open) => !open)}
                    >
                      <span css={sectionHeaderLabelStyles}>
                        {refreshSmallIcon}
                        <span>
                          <strong>
                            {changingTeams.length} already in your list
                          </strong>{' '}
                          • attendance will change
                        </span>
                      </span>
                      <span css={chevronStyles(changingOpen)}>
                        {chevronDownIcon}
                      </span>
                    </button>
                    {changingOpen && (
                      <div css={sectionBodyStyles}>
                        {changingTeams.map((team) => (
                          <div key={team.teamId} css={matchedRowStyles}>
                            <span css={changingTeamStyles}>
                              <span css={matchedTeamStyles}>
                                {teamIcon(team.teamType)}
                                <Link
                                  openInNewTab
                                  href={
                                    network({})
                                      .teams({})
                                      .team({ teamId: team.teamId }).$
                                  }
                                >
                                  <span css={matchedTeamNameStyles}>
                                    {team.teamName}
                                  </span>
                                </Link>
                                {team.isTeamInactive && <InactiveBadgeIcon />}
                              </span>
                              <span css={attendanceStatusStyles}>
                                {team.attended ? (
                                  tickInCircleIcon
                                ) : (
                                  <InvalidTickIcon
                                    color={colour.neutral[100]}
                                  />
                                )}
                                {team.attended ? 'Attended' : 'Not attended'}
                              </span>
                            </span>
                            <Button
                              noMargin
                              enabled={!isCancelling}
                              aria-label={`Remove ${team.teamName}`}
                              onClick={() => removeMatchedTeam(team.teamId)}
                              overrideStyles={deleteButtonStyles(!isCancelling)}
                            >
                              {binIcon}
                            </Button>
                          </div>
                        ))}
                        <p css={unmatchedHelpStyles}>
                          Updating overwrites the current attendance. Remove a
                          row to keep it as it is.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {(matchedTeams.length > 0 || changingTeams.length > 0) &&
                  remainingUnmatched.length > 0 && <div css={dividerStyles} />}

                {remainingUnmatched.length > 0 && (
                  <>
                    <button
                      type="button"
                      css={sectionHeaderStyles}
                      aria-expanded={unmatchedOpen}
                      onClick={() => setUnmatchedOpen((open) => !open)}
                    >
                      <span
                        css={[sectionHeaderLabelStyles, notMatchedLabelStyles]}
                      >
                        {crossSmallIcon}
                        <span>
                          <strong>
                            {remainingUnmatched.length} not matched
                          </strong>{' '}
                          • will not be added
                        </span>
                      </span>
                      <span css={chevronStyles(unmatchedOpen)}>
                        {chevronDownIcon}
                      </span>
                    </button>
                    {unmatchedOpen && (
                      <div css={sectionBodyStyles}>
                        <div css={unmatchedRowsStyles}>
                          {remainingUnmatched.map((team) => {
                            const { suggestion } = team;
                            return (
                              <div key={team.name} css={unmatchedRowStyles}>
                                <span css={unmatchedTextStyles}>
                                  “{team.name}”{' '}
                                  {suggestion ? (
                                    <span css={unmatchedMetaStyles}>
                                      • did you mean{' '}
                                      <Link
                                        openInNewTab
                                        href={
                                          network({}).teams({}).team({
                                            teamId: suggestion.teamId,
                                          }).$
                                        }
                                      >
                                        <span css={suggestionLinkStyles}>
                                          {suggestion.teamName}
                                        </span>
                                      </Link>
                                      ?
                                    </span>
                                  ) : (
                                    <span css={unmatchedMetaStyles}>
                                      • no close match
                                    </span>
                                  )}
                                  {suggestion &&
                                    !suggestionChangesAttendance(
                                      suggestion,
                                    ) && (
                                      <span css={upToDateStyles}>
                                        {tickSmallIcon}
                                        Already up to date
                                      </span>
                                    )}
                                </span>
                                {suggestion &&
                                  suggestionChangesAttendance(suggestion) && (
                                    <Button
                                      small
                                      noMargin
                                      enabled={!isCancelling}
                                      overrideStyles={addSuggestionButtonStyles}
                                      onClick={() =>
                                        promoteSuggestion(suggestion.teamId)
                                      }
                                    >
                                      {currentAttendance.has(
                                        suggestion.teamId,
                                      ) ? (
                                        'Update'
                                      ) : (
                                        <>
                                          {plusIcon}
                                          Add
                                        </>
                                      )}
                                    </Button>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                        <p css={unmatchedHelpStyles}>
                          Add or update a suggested team to include it. For a
                          team already up to date, there&apos;s nothing to do.
                          If a suggestion is wrong, fix the name in your file
                          and upload again.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmableModalFooter
        isConfirming={isCancelling}
        confirmationMessage="You'll lose all unsaved changes if you cancel now."
        onKeepEditing={() => setIsCancelling(false)}
        onDiscard={onBack}
        onCancel={requestClose}
        cancelEnabled={!isSaving}
        confirmLabel="Add Attendees"
        onConfirm={handleAddAttendees}
        confirmEnabled={addEnabled}
        confirmLoading={isSaving}
      />
    </Modal>
  );
};

export default UploadListModal;
