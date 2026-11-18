import { FieldAppSDK } from '@contentful/app-sdk';
import { Note, Paragraph, Stack } from '@contentful/f36-components';
import { MultipleEntryReferenceEditor } from '@contentful/field-editor-reference';
import { useSDK } from '@contentful/react-apps-toolkit';
import React, { useEffect, useMemo, useState } from 'react';
import {
  EntryLink,
  getTeamAsapMemberIds,
  isSameOrder,
  toLink,
} from '../asapAreas';

export const NO_TEAM_ASAP =
  "Select the 'ASAP Team' on this entry to fill this list.";
export const NO_MEMBERS = 'Team ASAP has no current members.';
export const LOAD_ERROR =
  'Could not refresh this list. Reload the entry to try again.';

const noActions = () => <></>;

// The reference editor re-enables itself from the field's real disabled
// state, so the SDK it receives always reports the field as disabled. That
// removes dragging, removing and adding while cards still open the user entry.
const withReadOnlyField = (sdk: FieldAppSDK): FieldAppSDK => {
  const field = new Proxy(sdk.field, {
    get(target, prop) {
      if (prop === 'getIsDisabled') return () => true;
      if (prop === 'onIsDisabledChanged') {
        return (callback: (disabled: boolean) => void) => {
          callback(true);
          return () => undefined;
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return new Proxy(sdk, {
    get(target, prop) {
      if (prop === 'field') return field;
      return Reflect.get(target, prop, target);
    },
  });
};

type LoadState = 'loading' | 'loaded' | 'error';

const TeamAsapMembersField = () => {
  const sdk = useSDK<FieldAppSDK>();
  const readOnlySdk = useMemo(() => withReadOnlyField(sdk), [sdk]);
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
      .then((ids) => {
        if (cancelled) return;
        const current = sdk.field.getValue() as EntryLink[] | undefined;
        const next = ids.map(toLink);
        setIsEmpty(next.length === 0);
        setLoadState('loaded');
        if (isSameOrder(current, next)) return;
        if (next.length) {
          sdk.field.setValue(next);
        } else {
          sdk.field.removeValue();
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
        sdk={readOnlySdk}
        viewType="link"
        isInitiallyDisabled={true}
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
    </Stack>
  );
};

export default TeamAsapMembersField;
