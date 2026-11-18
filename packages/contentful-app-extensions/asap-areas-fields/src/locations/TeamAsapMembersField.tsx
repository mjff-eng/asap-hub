import { FieldAppSDK } from '@contentful/app-sdk';
import { Note, Paragraph, Stack } from '@contentful/f36-components';
import { MultipleEntryReferenceEditor } from '@contentful/field-editor-reference';
import { useSDK } from '@contentful/react-apps-toolkit';
import React, { useEffect, useState } from 'react';
import {
  EntryLink,
  getTeamAsapMemberIds,
  isSameOrder,
  mergeOrder,
} from '../asapAreas';

export const NO_TEAM_ASAP =
  "Select the 'ASAP Team' on this entry to fill this list.";
export const NO_MEMBERS = 'Team ASAP has no current members.';
export const LOAD_ERROR =
  'Could not refresh this list. Reload the entry to try again.';
export const PUBLISH_ERROR =
  'The member list was updated but could not be published. Publish this entry to show the changes on the Hub.';

// True when the entry is published and has no other unpublished edits, so
// publishing it only ships the member list change.
const isPublishedWithoutChanges = (sdk: FieldAppSDK) => {
  const sys = sdk.entry.getSys();
  return (
    'publishedVersion' in sys &&
    !!sys.publishedVersion &&
    sys.version === sys.publishedVersion + 1
  );
};

// Turning off both link actions makes the editor show a "no permission"
// message, so the actions area is replaced with nothing instead.
const noActions = () => <></>;

type LoadState = 'loading' | 'loaded' | 'error' | 'publishError';

const TeamAsapMembersField = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [teamAsapId, setTeamAsapId] = useState<string | undefined>(
    sdk.entry.fields.membersTeam?.getValue()?.sys.id,
  );
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    sdk.window.startAutoResizer();
    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);

  useEffect(
    () =>
      sdk.entry.fields.membersTeam?.onValueChanged((value) =>
        setTeamAsapId(value?.sys.id),
      ),
    [sdk.entry.fields.membersTeam],
  );

  useEffect(() => {
    if (!teamAsapId) return undefined;

    let cancelled = false;
    setLoadState('loading');

    getTeamAsapMemberIds(sdk, teamAsapId)
      .then(async (ids) => {
        if (cancelled) return;
        const current = sdk.field.getValue() as EntryLink[] | undefined;
        const next = mergeOrder(current, ids);
        setIsEmpty(next.length === 0);
        setLoadState('loaded');
        if (isSameOrder(current, next)) return;

        const shouldPublish = isPublishedWithoutChanges(sdk);
        if (next.length) {
          await sdk.field.setValue(next);
        } else {
          await sdk.field.removeValue();
        }
        if (!shouldPublish) return;

        try {
          await sdk.entry.publish();
        } catch {
          if (!cancelled) setLoadState('publishError');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [sdk, teamAsapId]);

  if (!teamAsapId) {
    return <Note variant="warning">{NO_TEAM_ASAP}</Note>;
  }

  return (
    <Stack flexDirection="column" spacing="spacingS" alignItems="stretch">
      <MultipleEntryReferenceEditor
        sdk={sdk}
        viewType="link"
        isInitiallyDisabled={false}
        hasCardEditActions={false}
        hasCardMoveActions={false}
        hasCardRemoveActions={false}
        renderCustomActions={noActions}
        parameters={{
          instance: {
            showLinkEntityAction: false,
            showCreateEntityAction: false,
            bulkEditing: false,
          },
        }}
      />
      {loadState === 'loaded' && isEmpty && <Paragraph>{NO_MEMBERS}</Paragraph>}
      {loadState === 'error' && <Note variant="negative">{LOAD_ERROR}</Note>}
      {loadState === 'publishError' && (
        <Note variant="warning">{PUBLISH_ERROR}</Note>
      )}
    </Stack>
  );
};

export default TeamAsapMembersField;
