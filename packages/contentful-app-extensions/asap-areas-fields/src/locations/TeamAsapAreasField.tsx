import { FieldAppSDK } from '@contentful/app-sdk';
import { Note } from '@contentful/f36-components';
import { MultipleEntryReferenceEditor } from '@contentful/field-editor-reference';
import { useSDK } from '@contentful/react-apps-toolkit';
import React, { useEffect, useRef, useState } from 'react';
import { EntryLink, getTeamAsapId } from '../asapAreas';

export const NOT_TEAM_ASAP_NOTE =
  'This field is to be populated for Team ASAP membership only';
export const TEAM_ASAP_NOT_FOUND =
  "Could not find Team ASAP. Set the 'ASAP Team' field on the About ASAP entry.";

type TeamAsapState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'found'; id: string };

const TeamAsapAreasField = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [teamAsap, setTeamAsap] = useState<TeamAsapState>({
    status: 'loading',
  });
  const [teamId, setTeamId] = useState<string | undefined>(
    sdk.entry.fields.team?.getValue()?.sys.id,
  );
  const savedAreas = useRef<EntryLink[]>();

  useEffect(() => {
    sdk.window.startAutoResizer();
    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);

  useEffect(
    () =>
      sdk.entry.fields.team?.onValueChanged((value) =>
        setTeamId(value?.sys.id),
      ),
    [sdk.entry.fields.team],
  );

  useEffect(() => {
    let cancelled = false;
    getTeamAsapId(sdk)
      .then((id) => {
        if (cancelled) return;
        setTeamAsap(id ? { status: 'found', id } : { status: 'missing' });
      })
      .catch(() => {
        if (!cancelled) setTeamAsap({ status: 'missing' });
      });
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  const isTeamAsap = teamAsap.status === 'found' && teamId === teamAsap.id;

  // Areas only make sense on a Team ASAP membership. Clear them when the team
  // changes, and put them back if the editor switches back in the same session.
  useEffect(() => {
    if (teamAsap.status !== 'found') return;

    if (!isTeamAsap) {
      const areas = sdk.field.getValue() as EntryLink[] | undefined;
      if (areas?.length) {
        savedAreas.current = areas;
        sdk.field.removeValue();
      }
    } else if (savedAreas.current) {
      sdk.field.setValue(savedAreas.current);
      savedAreas.current = undefined;
    }
  }, [isTeamAsap, teamAsap.status, sdk.field]);

  if (teamAsap.status === 'loading') {
    return null;
  }

  if (teamAsap.status === 'missing') {
    return <Note variant="warning">{TEAM_ASAP_NOT_FOUND}</Note>;
  }

  if (!isTeamAsap) {
    return <Note variant="neutral">{NOT_TEAM_ASAP_NOTE}</Note>;
  }

  return (
    <MultipleEntryReferenceEditor
      sdk={sdk}
      viewType="link"
      isInitiallyDisabled={false}
      hasCardEditActions={true}
      hasCardMoveActions={true}
      hasCardRemoveActions={true}
      parameters={{
        instance: {
          showLinkEntityAction: true,
          showCreateEntityAction: false,
          bulkEditing: false,
        },
      }}
    />
  );
};

export default TeamAsapAreasField;
