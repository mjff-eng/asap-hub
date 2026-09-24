import { ProjectType } from '@asap-hub/model';
import { css } from '@emotion/react';
import { useRef, useState } from 'react';
import { components } from 'react-select';

import {
  Avatar,
  Button,
  Headline2,
  MultiSelect,
  MultiSelectOptionsType,
  Paragraph,
} from '../atoms';
import { lead, neutral1000, pearl, pine, silver, steel, tin } from '../colors';
import { crossIcon, plusIcon, searchIcon } from '../icons';
import { ConfirmableModalFooter, Modal } from '../molecules';
import ExternalSpeakerAffiliationCard, {
  AffiliationOption,
} from '../molecules/ExternalSpeakerAffiliationCard';
import PendingSpeakerCard from '../molecules/PendingSpeakerCard';
import SpeakerTeamRow from '../molecules/SpeakerTeamRow';
import SpeakerToast from '../molecules/SpeakerToast';
import SpeakerUserRow, {
  avatar24Styles,
  chevronSpacerStyles,
  findingsColumnStyles,
  flexRowGap8Styles,
  trailingColumnsStyles,
} from '../molecules/SpeakerUserRow';
import { mobileScreen, rem } from '../pixels';
import { splitDisplayName } from '../utils/user';
import { EventTeamType } from './shared-event-card';
import { iconButtonStyles } from './shared-event-card-styles';
import {
  groupLabel,
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
} from './speaker-group';
import SpeakerSection from './speaker-section';
import Toast from './Toast';

export type SpeakerTeamOption = AffiliationOption & {
  readonly teamType?: EventTeamType;
  readonly projectType?: ProjectType;
  readonly isTeamInactive?: boolean;
  readonly role?: string;
};

export type SpeakerSearchOption = MultiSelectOptionsType & {
  readonly user?: {
    readonly userId: string;
    readonly displayName: string;
    readonly avatarUrl?: string;
    readonly isAlumni?: boolean;
    readonly affiliationOptions: ReadonlyArray<SpeakerTeamOption>;
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
  gap: rem(32),
  marginTop: rem(32),
});

const cardSurfaceStyles = (enabled: boolean) =>
  css({
    border: `1px solid ${steel.rgb}`,
    borderRadius: rem(8),
    backgroundColor: enabled ? pearl.rgb : silver.rgb,
  });

const groupsCardStyles = (enabled: boolean) =>
  css([cardSurfaceStyles(enabled), { padding: rem(24), overflowX: 'auto' }]);

const groupsTableHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(24),
  fontSize: rem(17),
  fontWeight: 'bold',
  lineHeight: rem(24),
  letterSpacing: rem(0.1),
  color: neutral1000.rgb,
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

// Both branches are identical: TS only narrows the union when the discriminant
// is checked on both sides.
const removeGroupUser = (group: SpeakerGroup, userId: string): SpeakerGroup =>
  group.variant === 'external'
    ? { ...group, users: group.users.filter((user) => user.id !== userId) }
    : { ...group, users: group.users.filter((user) => user.id !== userId) };

const setGroupUserShared = (
  group: SpeakerGroup,
  userId: string,
  shared: boolean,
): SpeakerGroup =>
  group.variant === 'external'
    ? {
        ...group,
        users: group.users.map((user) =>
          user.id === userId
            ? { ...user, preliminaryFindingsShared: shared }
            : user,
        ),
      }
    : {
        ...group,
        users: group.users.map((user) =>
          user.id === userId
            ? { ...user, preliminaryFindingsShared: shared }
            : user,
        ),
      };

const withoutGroupsAddedThisSession = (
  nextGroups: SpeakerGroup[],
  originalGroupIds: ReadonlySet<string>,
) =>
  nextGroups.filter(
    (group) => group.users.length > 0 || originalGroupIds.has(group.id),
  );

const withExternalGroupLast = (nextGroups: SpeakerGroup[]) => [
  ...nextGroups.filter((group) => group.variant !== 'external'),
  ...nextGroups.filter((group) => group.variant === 'external'),
];

type PendingSpeaker = {
  readonly displayName: string;
  readonly user?: NonNullable<SpeakerSearchOption['user']>;
};

type AddedSpeaker = {
  readonly speakerName: string;
  readonly destination?: string;
  readonly groupId: string;
  readonly userId: string;
};

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
  const [expandedSections, setExpandedSections] = useState<
    ReadonlySet<SpeakerGroup['variant']>
  >(() => new Set());
  const [pendingSpeaker, setPendingSpeaker] = useState<PendingSpeaker | null>(
    null,
  );
  const [addedSpeaker, setAddedSpeaker] = useState<AddedSpeaker | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaveError, setHasSaveError] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  // Never decremented: reusing a number after a removal makes two rows share an
  // id, and they then delete together.
  const externalUserCount = useRef(0);
  // Never compare against the live `groups` prop: a refresh under the open modal
  // would enable Save with no local change and turn another admin's additions
  // into removals on save.
  const [original] = useState(() => ({
    groups,
    groupIds: new Set(groups.map((group) => group.id)) as ReadonlySet<string>,
  }));
  // Two adds dispatched in the same batch have to see each other, and setState
  // has not committed the first one when the second reads it.
  const latestGroups = useRef(speakerGroups);

  const updateGroups = (
    update: (current: SpeakerGroup[]) => SpeakerGroup[],
  ): SpeakerGroup[] => {
    const next = update(latestGroups.current);
    latestGroups.current = next;
    setSpeakerGroups(next);
    return next;
  };

  const isEditMode = speakerGroups.some((group) => group.users.length > 0);
  const title = isEditMode ? 'Edit Speakers' : 'Add Speakers';
  const visibleGroups = speakerGroups.filter((group) => group.users.length > 0);
  const teamGroups = visibleGroups.filter(
    (group): group is SpeakerTeamGroup => group.variant === 'team',
  );
  const projectGroups = visibleGroups.filter(
    (group): group is SpeakerProjectGroup => group.variant === 'project',
  );
  const externalUsers = visibleGroups.flatMap((group) =>
    group.variant === 'external' ? group.users : [],
  );
  const isDirty =
    JSON.stringify(speakerGroups) !== JSON.stringify(original.groups);
  const saveEnabled = !isSaving && isDirty && !pendingSpeaker;

  const addUserToAffiliation = (
    user: NonNullable<SpeakerSearchOption['user']>,
    affiliation: SpeakerTeamOption,
    { isExternal = false }: { isExternal?: boolean } = {},
  ) => {
    const newUser: SpeakerGroupUser = {
      id: user.userId,
      speakerIds: [],
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAlumni: user.isAlumni,
      isExternal,
      roles: affiliation.role ? [affiliation.role] : [],
      preliminaryFindingsShared: false,
    };
    const before = latestGroups.current;
    const after = updateGroups((current) => {
      const existingGroup = current.find(
        (group) => group.id === affiliation.id && group.variant !== 'external',
      );
      if (!existingGroup) {
        const newGroup: SpeakerGroup =
          affiliation.variant === 'team'
            ? {
                id: affiliation.id,
                variant: 'team',
                teamName: affiliation.name,
                teamType: affiliation.teamType,
                isTeamInactive: affiliation.isTeamInactive,
                users: [newUser],
              }
            : {
                id: affiliation.id,
                variant: 'project',
                projectName: affiliation.name,
                projectType: affiliation.projectType,
                users: [newUser],
              };
        return withExternalGroupLast([...current, newGroup]);
      }
      if (
        existingGroup.variant === 'external' ||
        existingGroup.users.some((row) => row.id === user.userId)
      ) {
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
    setExpandedIds((current) => new Set(current).add(affiliation.id));
    expandSection(affiliation.variant);
    setPendingSpeaker(null);
    setAddedSpeaker(
      after === before
        ? null
        : {
            speakerName: user.displayName,
            destination: affiliation.name,
            groupId: affiliation.id,
            userId: user.userId,
          },
    );
  };

  const nextGuestId = (name: string) => {
    externalUserCount.current += 1;
    return `external-${externalUserCount.current}-${name}`;
  };

  // Only unique within this edit session, until the backend can mint a real one.
  const addGuestToAffiliation = (
    name: string,
    affiliation: SpeakerTeamOption,
  ) =>
    addUserToAffiliation(
      { userId: nextGuestId(name), displayName: name, affiliationOptions: [] },
      affiliation,
      { isExternal: true },
    );

  const addExternalUser = (name: string) => {
    const newUser: SpeakerGroupExternalUser = {
      id: nextGuestId(name),
      speakerIds: [],
      displayName: name,
      preliminaryFindingsShared: false,
    };
    updateGroups((current) =>
      current.some((group) => group.variant === 'external')
        ? current.map((group) =>
            group.variant === 'external'
              ? { ...group, users: [...group.users, newUser] }
              : group,
          )
        : [
            ...current,
            { id: 'external', variant: 'external', users: [newUser] },
          ],
    );
    expandSection('external');
    setPendingSpeaker(null);
    setAddedSpeaker({
      speakerName: name,
      groupId: 'external',
      userId: newUser.id,
    });
  };

  const handleSelectSearchOption = (option: SpeakerSearchOption) => {
    const affiliations = option.user?.affiliationOptions ?? [];
    const [onlyAffiliation] = affiliations;
    if (option.user && onlyAffiliation && affiliations.length === 1) {
      addUserToAffiliation(option.user, onlyAffiliation);
      return;
    }
    setAddedSpeaker(null);
    setPendingSpeaker({
      displayName: option.user?.displayName ?? option.label,
      user: option.user,
    });
  };

  const toggleUserShared = (groupId: string, userId: string, shared: boolean) =>
    updateGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? setGroupUserShared(group, userId, shared)
          : group,
      ),
    );

  const expandSection = (variant: SpeakerGroup['variant']) =>
    setExpandedSections((current) => new Set(current).add(variant));

  const toggleSection = (variant: SpeakerGroup['variant']) =>
    setExpandedSections((current) => {
      const next = new Set(current);
      if (!next.delete(variant)) {
        next.add(variant);
      }
      return next;
    });

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

  const removeSpeaker = (groupId: string, userId: string) =>
    updateGroups((current) =>
      withoutGroupsAddedThisSession(
        current.map((group) =>
          group.id === groupId ? removeGroupUser(group, userId) : group,
        ),
        original.groupIds,
      ),
    );

  const removeUser = (groupId: string, userId: string) => {
    removeSpeaker(groupId, userId);
    if (addedSpeaker?.groupId === groupId && addedSpeaker.userId === userId) {
      setAddedSpeaker(null);
    }
  };

  const undoAddedSpeaker = ({ groupId, userId }: AddedSpeaker) => {
    removeSpeaker(groupId, userId);
    setAddedSpeaker(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setHasSaveError(false);
    try {
      await onSave(speakerGroups);
    } catch {
      setHasSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => (isDirty ? setIsCancelling(true) : onDismiss());

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
      showShared={isPastEvent}
      showCount={false}
      expanded={expandedIds.has(group.id)}
      onToggleExpanded={() => toggleExpanded(group.id)}
      onToggleUserShared={(userId, shared) =>
        toggleUserShared(group.id, userId, shared)
      }
      onRemoveUser={(userId) => removeUser(group.id, userId)}
      enabled={!isCancelling}
    />
  );

  const renderBanner = ({ displayName, user }: PendingSpeaker) => {
    if (user && user.affiliationOptions.length === 0) {
      return (
        <SpeakerToast
          accent="error"
          message="This speaker is not a member on any CRN team or individual project. They cannot be added as a speaker until they belong to one."
          onDismiss={() => setPendingSpeaker(null)}
          enabled={!isCancelling}
        />
      );
    }
    return user && user.affiliationOptions.length > 1 ? (
      <PendingSpeakerCard
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        userId={user.userId}
        affiliations={user.affiliationOptions}
        onPickAffiliation={(affiliation) =>
          addUserToAffiliation(user, affiliation)
        }
        onDismiss={() => setPendingSpeaker(null)}
        enabled={!isCancelling}
      />
    ) : (
      <ExternalSpeakerAffiliationCard
        displayName={displayName}
        affiliationOptions={[...teamGroups, ...projectGroups].map((group) => ({
          variant: group.variant,
          id: group.id,
          name: groupLabel(group),
        }))}
        onSelectAffiliation={(affiliation) =>
          addGuestToAffiliation(displayName, affiliation)
        }
        onKeepAsExternalGuest={() => addExternalUser(displayName)}
        onDismiss={() => setPendingSpeaker(null)}
        enabled={!isCancelling}
      />
    );
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
        {hasSaveError && (
          <Toast>An error has occurred. Please try again later.</Toast>
        )}
        <div css={searchSpacingStyles}>
          <MultiSelect<SpeakerSearchOption, false>
            isMulti={false}
            values={null}
            noMargin
            enabled={!isCancelling && !pendingSpeaker}
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
          {addedSpeaker && (
            <SpeakerToast
              message={
                addedSpeaker.destination
                  ? `Added ${addedSpeaker.speakerName} to ${addedSpeaker.destination}`
                  : `Added ${addedSpeaker.speakerName} as an External Guest`
              }
              onUndo={() => undoAddedSpeaker(addedSpeaker)}
              onDismiss={() => setAddedSpeaker(null)}
              enabled={!isCancelling}
            />
          )}

          {pendingSpeaker && renderBanner(pendingSpeaker)}

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
            visibleGroups.length > 0 && (
              <div
                css={groupsCardStyles(!isCancelling)}
                role="group"
                aria-label="Speakers"
              >
                {isPastEvent && (
                  <div css={groupsTableHeaderStyles}>
                    <span>Speakers</span>
                    <span css={trailingColumnsStyles}>
                      <span css={findingsColumnStyles}>
                        <span css={hideOnMobileStyles}>
                          Preliminary Findings
                        </span>
                        <span css={hideOnDesktopStyles}>P. Findings</span>
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
                    groupedRowsStyles={groupsRowsStyles}
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
                      showShared={isPastEvent}
                      onToggleShared={(shared) =>
                        toggleUserShared('external', user.id, shared)
                      }
                      onRemove={() => removeUser('external', user.id)}
                      enabled={!isCancelling}
                    />
                  ))}
                  expanded={expandedSections.has('external')}
                  onToggle={() => toggleSection('external')}
                  groupedRowsStyles={groupsRowsStyles}
                />
              </div>
            )
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
