import { FieldAppSDK } from '@contentful/app-sdk';
import { Note, Paragraph, Stack } from '@contentful/f36-components';
import { MultipleEntryReferenceEditor } from '@contentful/field-editor-reference';
import { useSDK } from '@contentful/react-apps-toolkit';
import React, { useEffect, useState } from 'react';
import { EntryLink, isSameOrder, mergeOrder } from '../asapAreas';

export const LOAD_ERROR =
  'Could not refresh this list. Reload the entry to try again.';

type OrderedReferencesFieldProps = {
  loadIds: (sdk: FieldAppSDK) => Promise<string[]>;
  emptyMessage: string;
};

// Turning off both link actions makes the editor show a "no permission"
// message, so the actions area is replaced with nothing instead.
const noActions = () => <></>;

const OrderedReferencesField = ({
  loadIds,
  emptyMessage,
}: OrderedReferencesFieldProps) => {
  const sdk = useSDK<FieldAppSDK>();
  const [hasError, setHasError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    sdk.window.startAutoResizer();
    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);

  useEffect(() => {
    let cancelled = false;

    loadIds(sdk)
      .then((ids) => {
        if (cancelled) return;
        const current = sdk.field.getValue() as EntryLink[] | undefined;
        const next = mergeOrder(current, ids);
        setIsEmpty(next.length === 0);
        if (isSameOrder(current, next)) return;
        if (next.length) {
          sdk.field.setValue(next);
        } else {
          sdk.field.removeValue();
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sdk, loadIds]);

  return (
    <Stack flexDirection="column" spacing="spacingS" alignItems="stretch">
      <MultipleEntryReferenceEditor
        sdk={sdk}
        viewType="link"
        isInitiallyDisabled={false}
        hasCardEditActions={true}
        hasCardMoveActions={true}
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
      {isEmpty && <Paragraph>{emptyMessage}</Paragraph>}
      {hasError && <Note variant="negative">{LOAD_ERROR}</Note>}
    </Stack>
  );
};

export default OrderedReferencesField;
