import { css } from '@emotion/react';
import { useState } from 'react';
import { components } from 'react-select';

import {
  Avatar,
  Button,
  Headline2,
  MultiSelect,
  MultiSelectOptionsType,
  Paragraph,
} from '../atoms';
import {
  charcoal,
  lead,
  neutral1000,
  pearl,
  pine,
  silver,
  steel,
  tin,
} from '../colors';
import { crossIcon, plusIcon, searchIcon } from '../icons';
import { ConfirmableModalFooter, Modal } from '../molecules';
import PendingSpeakerCard from '../molecules/PendingSpeakerCard';
import SpeakerTeamRow from '../molecules/SpeakerTeamRow';
import { avatar24Styles, flexRowGap8Styles } from '../molecules/SpeakerUserRow';
import { mobileScreen, rem } from '../pixels';
import { pluralize, pluralizeTeams } from '../utils';
import { splitDisplayName } from '../utils/user';
import { EventTeamType } from './shared-event-card';
import { iconButtonStyles } from './shared-event-card-styles';
import {
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
} from './speaker-group';

export type SpeakerTeamOption = {
  readonly teamId: string;
  readonly teamName: string;
  readonly teamType?: EventTeamType;
  readonly isTeamInactive?: boolean;
  readonly role: string;
};

export type SpeakerSearchOption = MultiSelectOptionsType & {
  readonly user?: {
    readonly userId: string;
    readonly displayName: string;
    readonly avatarUrl?: string;
    readonly isAlumni?: boolean;
    readonly teamOptions: ReadonlyArray<SpeakerTeamOption>;
  };
};

type EditEventSpeakersModalProps = {
  readonly groups?: SpeakerGroup[];
  readonly isPastEvent?: boolean;
  readonly loadSearchOptions: (
    inputValue: string,
  ) => Promise<SpeakerSearchOption[]>;
  readonly onSave: (groups: SpeakerGroup[]) => void | Promise<void>;
  readonly onDismiss: () => void;
};

const modalStyles = css({ width: '100%' });

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
  lineHeight: rem(32),
  color: neutral1000.rgb,
});

const bodyStyles = css({
  display: 'flex',
  flexDirection: 'column',
  padding: `0 ${rem(24)}`,
});

const searchSpacingStyles = css({ marginTop: rem(32) });

const hideOnMobileStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: { display: 'none' },
});

const hideOnDesktopStyles = css({
  [`@media (min-width: ${mobileScreen.max + 1}px)`]: { display: 'none' },
});

const placeholderStyles = css({ color: tin.rgb });

const searchOptionStyles = css([
  flexRowGap8Styles,
  { '> svg': { width: rem(24), height: rem(24), flexShrink: 0 } },
]);

const searchUserNameStyles = css({
  color: pine.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const searchExternalTextStyles = css({
  color: lead.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const speakersSectionStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  marginTop: rem(48),
  [`@media (max-width: ${mobileScreen.max}px)`]: { gap: rem(24) },
});

const speakersHeaderStyles = css({
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

const sectionTitleStyles = css({
  margin: 0,
  fontSize: rem(17),
  fontWeight: 700,
  lineHeight: rem(24),
  color: neutral1000.rgb,
});

// Wraps the "Speakers" heading and the stat span — always stacked on
// mobile (not just when it doesn't fit), matching
// EditEventAttendanceModal's attendeesStatsStyles.
const statsHeaderStyles = css({
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
  flexWrap: 'wrap',
});

const statStyles = css({
  fontSize: rem(17),
  fontWeight: 400,
  color: lead.rgb,
});

const separatorStyles = css({
  fontSize: rem(17),
  fontWeight: 400,
  color: lead.rgb,
  padding: `0 ${rem(8)}`,
});

const markAllSharedButtonStyles = css({
  flexGrow: 0,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexGrow: 1,
    minWidth: '100%',
  },
});

const cardSurfaceStyles = (enabled: boolean) =>
  css({
    border: `1px solid ${steel.rgb}`,
    borderRadius: rem(8),
    backgroundColor: enabled ? pearl.rgb : silver.rgb,
  });

const groupsCardStyles = (enabled: boolean) =>
  css([cardSurfaceStyles(enabled), { padding: rem(24), overflowX: 'auto' }]);

// "Team" and "Preliminary Findings", mirroring SpeakerTeamRow's row layout
// below it. `gap` is a floor — space-between still pushes them apart when
// there's room.
const groupsTableHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(24),
  fontSize: rem(17),
  fontWeight: 'bold',
  lineHeight: rem(24),
  letterSpacing: rem(0.1),
  color: charcoal.rgb,
  paddingBottom: rem(16),
});

const groupsRowsStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

const emptyStateStyles = (enabled: boolean) =>
  css([
    cardSurfaceStyles(enabled),
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: rem(8),
      textAlign: 'center',
      padding: rem(24),
    },
  ]);

const emptyStateTitleStyles = css({ fontWeight: 700 });

const findUserGroup = (
  groups: SpeakerGroup[],
  teamId: string,
): Extract<SpeakerGroup, { variant: 'team' }> | undefined =>
  groups.find(
    (group): group is Extract<SpeakerGroup, { variant: 'team' }> =>
      group.variant === 'team' && group.id === teamId,
  );

const EditEventSpeakersModal: React.FC<EditEventSpeakersModalProps> = ({
  groups = [],
  isPastEvent = false,
  loadSearchOptions,
  onSave,
  onDismiss,
}) => {
  const [speakerGroups, setSpeakerGroups] = useState<SpeakerGroup[]>(() => [
    ...groups,
  ]);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [pendingSpeaker, setPendingSpeaker] = useState<
    SpeakerSearchOption['user'] | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isEditMode = speakerGroups.some((group) => group.users.length > 0);
  const title = isEditMode ? 'Edit Speakers' : 'Add Speakers';
  // A group with no members left (every speaker removed) is dropped from the
  // visible table, but kept in speakerGroups so onSave still reports it.
  const visibleGroups = speakerGroups.filter((group) => group.users.length > 0);
  const teamCount = visibleGroups.filter(
    (group) => group.variant === 'team',
  ).length;
  const userCount = speakerGroups.reduce(
    (total, group) => total + group.users.length,
    0,
  );
  const saveEnabled = !isSaving && isEditMode;

  const withExternalGroupLast = (nextGroups: SpeakerGroup[]) => [
    ...nextGroups.filter((group) => group.variant !== 'external'),
    ...nextGroups.filter((group) => group.variant === 'external'),
  ];

  const addUserToTeam = (
    user: NonNullable<SpeakerSearchOption['user']>,
    team: SpeakerTeamOption,
  ) => {
    const newUser: SpeakerGroupUser = {
      id: user.userId,
      speakerIds: [],
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAlumni: user.isAlumni,
      roles: [team.role],
    };
    setSpeakerGroups((current) => {
      const existingGroup = findUserGroup(current, team.teamId);
      if (!existingGroup) {
        const newGroup: SpeakerGroup = {
          id: team.teamId,
          variant: 'team',
          teamName: team.teamName,
          teamType: team.teamType,
          isTeamInactive: team.isTeamInactive,
          preliminaryFindingsShared: false,
          users: [newUser],
        };
        return withExternalGroupLast([...current, newGroup]);
      }
      if (existingGroup.users.some((row) => row.id === user.userId)) {
        return current;
      }
      const updatedGroup: SpeakerGroup = {
        ...existingGroup,
        users: [...existingGroup.users, newUser],
      };
      return current.map((group) =>
        group.id === existingGroup.id ? updatedGroup : group,
      );
    });
    setExpandedIds((current) => new Set(current).add(team.teamId));
  };

  const addExternalUser = (name: string) => {
    setSpeakerGroups((current) => {
      const externalGroup = current.find(
        (group): group is Extract<SpeakerGroup, { variant: 'external' }> =>
          group.variant === 'external',
      );
      const totalUsers = current.reduce(
        (total, group) => total + group.users.length,
        0,
      );
      const newUser: SpeakerGroupExternalUser = {
        id: `external-${totalUsers}-${name}`,
        speakerIds: [],
        displayName: name,
      };
      if (!externalGroup) {
        return [
          ...current,
          {
            id: 'external',
            variant: 'external',
            preliminaryFindingsShared: false,
            users: [newUser],
          },
        ];
      }
      return current.map((group) =>
        group.variant === 'external'
          ? { ...group, users: [...group.users, newUser] }
          : group,
      );
    });
    setExpandedIds((current) => new Set(current).add('external'));
  };

  const handleSelectSearchOption = (option: SpeakerSearchOption) => {
    if (!option.user) {
      addExternalUser(option.label);
      return;
    }
    const [onlyTeam] = option.user.teamOptions;
    if (option.user.teamOptions.length === 1 && onlyTeam) {
      addUserToTeam(option.user, onlyTeam);
    } else {
      setPendingSpeaker(option.user);
    }
  };

  const resolvePendingSpeaker = (
    speaker: NonNullable<SpeakerSearchOption['user']>,
    teamId: string,
  ) => {
    speaker.teamOptions
      .filter((option) => option.teamId === teamId)
      .forEach((team) => addUserToTeam(speaker, team));
    setPendingSpeaker(null);
  };

  const toggleShared = (groupId: string) =>
    setSpeakerGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              preliminaryFindingsShared: !group.preliminaryFindingsShared,
            }
          : group,
      ),
    );

  // Preliminary findings is per-team, so "Mark All" ignores the external group.
  const visibleTeamGroups = visibleGroups.filter(
    (group) => group.variant === 'team',
  );
  const allShared =
    visibleTeamGroups.length > 0 &&
    visibleTeamGroups.every((group) => group.preliminaryFindingsShared);

  const toggleMarkAllShared = () => {
    const nextShared = !allShared;
    const teamIds = new Set(visibleTeamGroups.map((group) => group.id));
    setSpeakerGroups((current) =>
      current.map((group) =>
        teamIds.has(group.id)
          ? { ...group, preliminaryFindingsShared: nextShared }
          : group,
      ),
    );
  };

  const toggleExpanded = (groupId: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });

  const removeUser = (groupId: string, userId: string) =>
    setSpeakerGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) {
          return group;
        }
        // Duplicated on purpose: with a union return type, TS only narrows
        // `users`'s element type per-branch when the discriminant check
        // (variant === 'team') is explicit on both sides of the spread —
        // collapsing this into one unconditional branch fails to typecheck.
        return group.variant === 'team'
          ? {
              ...group,
              users: group.users.filter((user) => user.id !== userId),
            }
          : {
              ...group,
              users: group.users.filter((user) => user.id !== userId),
            };
      }),
    );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(speakerGroups);
    } catch {
      // The caller surfaces the error; the modal only needs to unlock so the
      // user can retry or cancel instead of staying stuck on "saving".
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const isDirty = JSON.stringify(speakerGroups) !== JSON.stringify(groups);
    return isDirty ? setIsCancelling(true) : onDismiss();
  };

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
        <div css={searchSpacingStyles}>
          <MultiSelect<SpeakerSearchOption, false>
            isMulti={false}
            values={null}
            noMargin
            enabled={!isCancelling}
            creatable
            defaultOptions={false}
            leftIndicator={searchIcon}
            loadOptions={loadSearchOptions}
            onChange={handleSelectSearchOption}
            noOptionsMessage={({ inputValue }) =>
              `Sorry, no matches for ${inputValue}.`
            }
            components={{
              Placeholder: (placeholderProps) => (
                <components.Placeholder {...placeholderProps}>
                  <span css={[placeholderStyles, hideOnMobileStyles]}>
                    Search for a person to add…
                  </span>
                  <span css={[placeholderStyles, hideOnDesktopStyles]}>
                    Search for a person…
                  </span>
                </components.Placeholder>
              ),
              Menu: (menuProps) =>
                menuProps.selectProps.inputValue ? (
                  <components.Menu {...menuProps} />
                ) : null,
              Option: (optionProps) => {
                const option = optionProps.data;
                return (
                  <components.Option {...optionProps}>
                    <span css={searchOptionStyles}>
                      {option.user ? (
                        <Avatar
                          {...splitDisplayName(option.user.displayName)}
                          imageUrl={option.user.avatarUrl}
                          overrideStyles={avatar24Styles}
                        />
                      ) : (
                        plusIcon
                      )}
                      <span
                        css={
                          option.user
                            ? searchUserNameStyles
                            : searchExternalTextStyles
                        }
                      >
                        {option.user ? (
                          option.user.displayName
                        ) : (
                          <>
                            <strong>{optionProps.children}</strong> (Non CRN)
                          </>
                        )}
                      </span>
                    </span>
                  </components.Option>
                );
              },
            }}
          />
        </div>

        <section css={speakersSectionStyles}>
          <div css={speakersHeaderStyles}>
            <div css={statsHeaderStyles}>
              <h3 css={sectionTitleStyles}>Speakers</h3>
              {visibleGroups.length > 0 && (
                <span css={statsGroupStyles}>
                  <span css={[separatorStyles, hideOnMobileStyles]}>•</span>
                  <span css={statStyles}>
                    {pluralizeTeams(teamCount, true)}
                  </span>
                  <span css={separatorStyles}>•</span>
                  <span css={statStyles}>{pluralize(userCount, 'User')}</span>
                </span>
              )}
            </div>
            {isPastEvent && visibleTeamGroups.length > 0 && (
              <Button
                small
                noMargin
                enabled={!isCancelling}
                overrideStyles={markAllSharedButtonStyles}
                onClick={toggleMarkAllShared}
              >
                {allShared ? 'Mark All Not Shared' : 'Mark All Shared'}
              </Button>
            )}
          </div>

          {visibleGroups.length === 0 && !pendingSpeaker ? (
            <div css={emptyStateStyles(!isCancelling)} role="status">
              <Paragraph noMargin accent="lead" styles={emptyStateTitleStyles}>
                Add speakers to this event
              </Paragraph>
              <Paragraph noMargin accent="lead">
                Search for a person to add them to this event. Once the event
                has taken place, you&apos;ll be able to mark whether each
                speaker shared preliminary findings.
              </Paragraph>
            </div>
          ) : (
            <div css={groupsCardStyles(!isCancelling)}>
              <div css={groupsTableHeaderStyles}>
                <span>Team</span>
                {isPastEvent && (
                  <span>
                    <span css={hideOnMobileStyles}>Preliminary Findings</span>
                    <span css={hideOnDesktopStyles}>P. Findings</span>
                  </span>
                )}
              </div>
              <div css={groupsRowsStyles} role="list">
                {pendingSpeaker && (
                  <PendingSpeakerCard
                    displayName={pendingSpeaker.displayName}
                    avatarUrl={pendingSpeaker.avatarUrl}
                    userId={pendingSpeaker.userId}
                    teams={pendingSpeaker.teamOptions}
                    onPickTeam={(teamId) =>
                      resolvePendingSpeaker(pendingSpeaker, teamId)
                    }
                    onDismiss={() => setPendingSpeaker(null)}
                    enabled={!isCancelling}
                  />
                )}
                {visibleGroups.map((group) => (
                  <SpeakerTeamRow
                    key={group.id}
                    variant={group.variant}
                    teamId={group.variant === 'team' ? group.id : undefined}
                    teamType={
                      group.variant === 'team' ? group.teamType : undefined
                    }
                    isTeamInactive={
                      group.variant === 'team'
                        ? group.isTeamInactive
                        : undefined
                    }
                    label={
                      group.variant === 'team'
                        ? group.teamName
                        : 'External Users'
                    }
                    users={group.users.map((user) => ({
                      id: user.id,
                      displayName: user.displayName,
                      avatarUrl:
                        'avatarUrl' in user ? user.avatarUrl : undefined,
                      roles: 'roles' in user ? user.roles : [],
                      isAlumni: 'isAlumni' in user ? user.isAlumni : undefined,
                    }))}
                    preliminaryFindingsShared={group.preliminaryFindingsShared}
                    showShared={isPastEvent && group.variant === 'team'}
                    expanded={expandedIds.has(group.id)}
                    onToggleExpanded={() => toggleExpanded(group.id)}
                    onToggleShared={() => toggleShared(group.id)}
                    onRemoveUser={(userId) => removeUser(group.id, userId)}
                    enabled={!isCancelling}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
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

export default EditEventSpeakersModal;
