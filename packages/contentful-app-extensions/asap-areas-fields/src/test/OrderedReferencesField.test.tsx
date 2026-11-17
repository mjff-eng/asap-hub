import { FieldAppSDK } from '@contentful/app-sdk';
import { useSDK } from '@contentful/react-apps-toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { EntryLink } from '../asapAreas';
import OrderedReferencesField, {
  LOAD_ERROR,
} from '../locations/OrderedReferencesField';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: jest.fn(),
}));

jest.mock('@contentful/field-editor-reference', () => ({
  MultipleEntryReferenceEditor: (props: {
    hasCardRemoveActions: boolean;
    renderCustomActions?: () => React.ReactElement;
  }) => (
    <div data-testid="reference-editor">
      {props.hasCardRemoveActions ? 'removable' : 'not removable'}
      {props.renderCustomActions ? ' no actions' : ' default actions'}
    </div>
  ),
}));

const link = (id: string): EntryLink => ({
  sys: { type: 'Link', linkType: 'Entry', id },
});

const mockSdk = (value?: EntryLink[]) => {
  const sdk = {
    field: {
      getValue: jest.fn(() => value),
      setValue: jest.fn(),
      removeValue: jest.fn(),
    },
    window: {
      startAutoResizer: jest.fn(),
      stopAutoResizer: jest.fn(),
    },
  };
  (useSDK as jest.Mock).mockReturnValue(sdk);
  return sdk as unknown as jest.Mocked<FieldAppSDK> & typeof sdk;
};

const EMPTY = 'Nothing here yet.';

describe('OrderedReferencesField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a read-only, sortable list with no add actions', async () => {
    mockSdk([link('a')]);

    render(
      <OrderedReferencesField
        loadIds={jest.fn().mockResolvedValue(['a'])}
        emptyMessage={EMPTY}
      />,
    );

    expect(await screen.findByTestId('reference-editor')).toHaveTextContent(
      'not removable no actions',
    );
  });

  it('keeps the saved order and appends new entries', async () => {
    const sdk = mockSdk([link('b'), link('a')]);

    render(
      <OrderedReferencesField
        loadIds={jest.fn().mockResolvedValue(['a', 'b', 'c'])}
        emptyMessage={EMPTY}
      />,
    );

    await waitFor(() =>
      expect(sdk.field.setValue).toHaveBeenCalledWith([
        link('b'),
        link('a'),
        link('c'),
      ]),
    );
  });

  it('does not change the field when the list is already up to date', async () => {
    const sdk = mockSdk([link('a'), link('b')]);
    const loadIds = jest.fn().mockResolvedValue(['b', 'a']);

    render(<OrderedReferencesField loadIds={loadIds} emptyMessage={EMPTY} />);

    await waitFor(() => expect(loadIds).toHaveBeenCalled());
    expect(sdk.field.setValue).not.toHaveBeenCalled();
    expect(sdk.field.removeValue).not.toHaveBeenCalled();
  });

  it('clears the field and shows the empty message when nothing matches', async () => {
    const sdk = mockSdk([link('gone')]);

    render(
      <OrderedReferencesField
        loadIds={jest.fn().mockResolvedValue([])}
        emptyMessage={EMPTY}
      />,
    );

    expect(await screen.findByText(EMPTY)).toBeInTheDocument();
    expect(sdk.field.removeValue).toHaveBeenCalled();
  });

  it('shows an error when the entries cannot be loaded', async () => {
    const sdk = mockSdk([link('a')]);

    render(
      <OrderedReferencesField
        loadIds={jest.fn().mockRejectedValue(new Error('network'))}
        emptyMessage={EMPTY}
      />,
    );

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(sdk.field.setValue).not.toHaveBeenCalled();
  });
});
