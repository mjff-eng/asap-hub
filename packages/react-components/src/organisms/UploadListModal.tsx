import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useRef, useState } from 'react';

import { Button, Headline2, Link, Paragraph, Tag } from '../atoms';
import { colour } from '../colors';
import {
  binIcon,
  chevronDownIcon,
  InactiveBadgeIcon,
  crossIcon,
  crossSmallIcon,
  chevronLeftIcon,
  plusIcon,
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
  onUploadList: (files: File[]) => Promise<UploadListResult>;
  onAddAttendees: (
    teams: EventAttendanceTeam[],
    files: File[],
  ) => void | Promise<void>;
  onBack: () => void;
  // Team ids already on the table (including unsaved additions), shown as
  // "already in" rather than new.
  currentTeamIds?: ReadonlySet<string>;
  maxFileSizeMb?: number;
  accept?: string;
  initialFiles?: File[];
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
  fontSize: rem(26),
  fontWeight: 700,
  lineHeight: rem(32),
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
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  letterSpacing: 0,
});

const summaryStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  fontSize: rem(17),
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
  fontSize: rem(17),
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
  color: colour.utilitarian.red[700],
  gap: rem(8),
  '> svg': {
    fill: colour.utilitarian.red[700],
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
  fontSize: rem(17),
  lineHeight: rem(24),
  color: colour.foreground.tertiary,
});

const unmatchedMetaStyles = css({
  color: colour.foreground.tertiary,
});

const suggestionLinkStyles = css({
  color: colour.foreground.brand,
});

const addSuggestionButtonStyles = css({
  flexGrow: 0,
  flexShrink: 0,
  alignItems: 'center',
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

const emptyResultStyles = css({
  margin: 0,
  color: colour.foreground.tertiary,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
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

const noTeamIds: ReadonlySet<string> = new Set();

const UploadListModal: React.FC<UploadListModalProps> = ({
  onUploadList,
  onAddAttendees,
  onBack,
  currentTeamIds = noTeamIds,
  maxFileSizeMb = defaultMaxFileSizeMb,
  accept = defaultAccept,
  initialFiles = [],
  initialResult = null,
  initialSectionsOpen = false,
}) => {
  const [files, setFiles] = useState<File[]>(initialFiles);
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
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadSeq = useRef(0);

  const allowedExtensions = getAllowedExtensions(accept);
  const maxBytes = maxFileSizeMb * 1000 * 1000;

  // selectionError is whatever the file selection itself decided (size or
  // extension). It is restored on success so a successful parse clears only a
  // previous read failure, not the warning about the files that were skipped.
  const runUpload = (
    nextFiles: File[],
    selectionError: string | null = null,
  ) => {
    setFiles(nextFiles);
    // A new file set invalidates the per-team edits made against the old result.
    setAddedSuggestionIds(new Set());
    setRemovedMatchedIds(new Set());
    // Bump the sequence first so any parse still in flight (e.g. the file was
    // removed before it resolved) can no longer write its result.
    const seq = uploadSeq.current + 1;
    uploadSeq.current = seq;
    if (nextFiles.length === 0) {
      setResult(null);
      setIsUploading(false);
      return;
    }
    void onUploadList(nextFiles)
      .then((uploadResult) => {
        if (seq === uploadSeq.current) {
          setResult(uploadResult);
          setError(selectionError);
          setIsUploading(false);
        }
      })
      .catch(() => {
        if (seq === uploadSeq.current) {
          setResult(null);
          setError('Something went wrong reading this file. Please try again.');
          setIsUploading(false);
        }
      });
  };

  const handleFilesSelected = (selected: File[]) => {
    const valid = selected.filter(
      (file) =>
        hasAllowedExtension(file, allowedExtensions) && file.size <= maxBytes,
    );
    const tooLarge = selected.some(
      (file) =>
        hasAllowedExtension(file, allowedExtensions) && file.size > maxBytes,
    );
    let selectionError: string | null = null;
    if (tooLarge) {
      selectionError = `The file size exceeds the limit of ${maxFileSizeMb} MB. Please upload a smaller file.`;
    } else if (valid.length < selected.length) {
      selectionError = 'CSV or XLSX files only.';
    }
    setError(selectionError);
    if (valid.length > 0) {
      setIsUploading(true);
      runUpload([...files, ...valid], selectionError);
    }
  };

  const removeFile = (index: number) =>
    runUpload(files.filter((_, fileIndex) => fileIndex !== index));

  const promoteSuggestion = (teamId: string) =>
    setAddedSuggestionIds((prev) => new Set(prev).add(teamId));

  const removeMatchedTeam = (teamId: string) =>
    setRemovedMatchedIds((prev) => new Set(prev).add(teamId));

  const isPromoted = (
    team: UploadListUnmatchedTeam,
  ): team is UploadListUnmatchedTeam & { suggestion: UploadListSuggestion } =>
    !!team.suggestion && addedSuggestionIds.has(team.suggestion.teamId);

  const alreadyIn = result
    ? result.matched.filter((team) => currentTeamIds.has(team.teamId))
    : [];
  const newMatchedCount = result ? result.matched.length - alreadyIn.length : 0;

  const promotedTeams: EventAttendanceTeam[] = result
    ? result.unmatched
        .filter(isPromoted)
        .map((team) => suggestionToTeam(team.suggestion))
    : [];
  const promotedUpdates = promotedTeams.filter((team) =>
    currentTeamIds.has(team.teamId),
  );
  const promotedNew = promotedTeams.filter(
    (team) => !currentTeamIds.has(team.teamId),
  );

  const matchedTeams: EventAttendanceTeam[] = result
    ? [
        ...result.matched.filter(
          (team) =>
            !currentTeamIds.has(team.teamId) &&
            !removedMatchedIds.has(team.teamId),
        ),
        ...promotedNew,
      ]
    : [];

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

  const hasSections = matchedTeams.length > 0 || remainingUnmatched.length > 0;
  // Describes the file, not the current view: once the user deletes the rows
  // themselves there is nothing to explain, so no message is shown.
  const alreadyInMessage =
    alreadyInCount === 1
      ? 'This team is already in the attendance table.'
      : `All ${pluralizeTeams(
          alreadyInCount,
        )} in this list are already in the attendance table.`;
  const emptyResultMessage = newMatchedCount === 0 ? alreadyInMessage : null;

  const isDirty = files.length > 0 || matchedTeams.length > 0;
  const addEnabled =
    (matchedTeams.length > 0 ||
      alreadyIn.length > 0 ||
      promotedUpdates.length > 0) &&
    !isSaving;

  const requestClose = () => {
    if (isDirty) {
      setIsCancelling(true);
    } else {
      onBack();
    }
  };

  const handleAddAttendees = async () => {
    setIsSaving(true);
    try {
      await onAddAttendees(
        dedupeByTeamId([...matchedTeams, ...promotedUpdates, ...alreadyIn]),
        files,
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
          <Headline2 noMargin overrideStyles={titleStyles}>
            Upload a list
          </Headline2>
        </div>
        <Button
          small
          noMargin
          aria-label="Close"
          enabled={!isSaving}
          onClick={requestClose}
          overrideStyles={css([iconButtonStyles, headerIconStyles])}
        >
          {crossIcon}
        </Button>
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
          {files.length > 0 && (
            <div css={chipsStyles}>
              {files.map((file, index) => (
                <Tag
                  key={`${file.name}-${index}`}
                  enabled={!isCancelling}
                  onRemove={() => removeFile(index)}
                >
                  {file.name}
                </Tag>
              ))}
            </div>
          )}
          <input
            ref={uploadInputRef}
            type="file"
            accept={accept}
            aria-label="Add a list"
            multiple
            hidden
            disabled={isCancelling}
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              if (selected.length > 0) {
                handleFilesSelected(selected);
              }
              if (uploadInputRef.current) {
                uploadInputRef.current.value = '';
              }
            }}
          />
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
          {shownError && (
            <p css={errorStyles} role="alert">
              {shownError}
            </p>
          )}
        </section>

        {result && !yieldedNothing && (
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

            {!hasSections && emptyResultMessage && (
              <p css={emptyResultStyles}>{emptyResultMessage}</p>
            )}

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

                {matchedTeams.length > 0 && remainingUnmatched.length > 0 && (
                  <div css={dividerStyles} />
                )}

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
                                </span>
                                {suggestion && (
                                  <Button
                                    small
                                    noMargin
                                    enabled={!isCancelling}
                                    overrideStyles={addSuggestionButtonStyles}
                                    onClick={() =>
                                      promoteSuggestion(suggestion.teamId)
                                    }
                                  >
                                    {currentTeamIds.has(suggestion.teamId) ? (
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
                          Add a suggested team to include it, or fix the name in
                          your file and upload again.
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
        onConfirm={() => {
          void handleAddAttendees();
        }}
        confirmEnabled={addEnabled}
        confirmLoading={isSaving}
      />
    </Modal>
  );
};

export default UploadListModal;
