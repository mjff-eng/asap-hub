import { FieldAppSDK } from '@contentful/app-sdk';
import { useSDK } from '@contentful/react-apps-toolkit';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { EntryLink, toLink } from '../asapAreas';
import TeamAsapMembersField, {
  LOAD_ERROR,
  NO_MEMBERS,
  NO_TEAM_ASAP,
} from '../locations/TeamAsapMembersField';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: jest.fn(),
}));

jest.mock('@contentful/field-editor-reference', () => ({
  MultipleEntryReferenceEditor: ({
    sdk,
    hasCardMoveActions,
    hasCardRemoveActions,
    renderCustomActions,
  }: {
    sdk: FieldAppSDK;
    hasCardMoveActions: boolean;
    hasCardRemoveActions: boolean;
    renderCustomActions?: () => React.ReactElement;
  }) => {
    let disabledFromSubscription: boolean | undefined;
    sdk.field.onIsDisabledChanged((disabled) => {
      disabledFromSubscription = disabled;
    });
    return (
      <div data-testid="reference-editor">
        {[
          sdk.field.getIsDisabled() && disabledFromSubscription
            ? 'disabled'
            : 'enabled',
          hasCardMoveActions ? 'movable' : 'not movable',
          hasCardRemoveActions ? 'removable' : 'not removable',
          renderCustomActions ? 'no actions' : 'default actions',
        ].join(', ')}
      </div>
    );
  },
}));

const membershipsAndUsers = (userIds: string[]) =>
  jest
    .fn()
    .mockResolvedValueOnce({ items: [{ sys: { id: 'membership-1' } }] })
    .mockResolvedValueOnce({ items: userIds.map((id) => ({ sys: { id } })) });

const mockSdk = ({
  teamAsapId,
  value,
  getMany = membershipsAndUsers([]),
}: {
  teamAsapId?: string;
  value?: EntryLink[];
  getMany?: jest.Mock;
}) => {
  let onTeamChanged: (value?: EntryLink) => void = () => {};
  const sdk = {
    field: {
      getValue: jest.fn(() => value),
      setValue: jest.fn(),
      removeValue: jest.fn(),
      getIsDisabled: jest.fn(() => false),
      onIsDisabledChanged: jest.fn((cb: (disabled: boolean) => void) => {
        cb(false);
        return jest.fn();
      }),
    },
    entry: {
      fields: {
        membersTeam: {
          getValue: jest.fn(() =>
            teamAsapId ? toLink(teamAsapId) : undefined,
          ),
          onValueChanged: jest.fn((cb: (value?: EntryLink) => void) => {
            onTeamChanged = cb;
            return jest.fn();
          }),
        },
      },
    },
    cma: { entry: { getMany } },
    window: {
      startAutoResizer: jest.fn(),
      stopAutoResizer: jest.fn(),
    },
  };
  (useSDK as jest.Mock).mockReturnValue(sdk);
  return {
    sdk: sdk as unknown as jest.Mocked<FieldAppSDK> & typeof sdk,
    changeTeam: (id?: string) =>
      act(() => onTeamChanged(id ? toLink(id) : undefined)),
  };
};

describe('TeamAsapMembersField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a disabled list with no move, remove or add actions', async () => {
    mockSdk({ teamAsapId: 'team-asap' });

    render(<TeamAsapMembersField />);

    expect(await screen.findByTestId('reference-editor')).toHaveTextContent(
      'disabled, not movable, not removable, no actions',
    );
  });

  it('replaces the list with the current Team ASAP members', async () => {
    const getMany = membershipsAndUsers(['user-a', 'user-b']);
    const { sdk } = mockSdk({
      teamAsapId: 'team-asap',
      value: [toLink('user-b'), toLink('old-user')],
      getMany,
    });

    render(<TeamAsapMembersField />);

    await waitFor(() =>
      expect(sdk.field.setValue).toHaveBeenCalledWith([
        toLink('user-a'),
        toLink('user-b'),
      ]),
    );
    expect(getMany).toHaveBeenNthCalledWith(1, {
      query: expect.objectContaining({
        content_type: 'teamMembership',
        'fields.team.sys.id': 'team-asap',
        'fields.inactiveSinceDate[exists]': false,
      }),
    });
    expect(getMany).toHaveBeenNthCalledWith(2, {
      query: expect.objectContaining({
        content_type: 'users',
        'fields.alumniSinceDate[exists]': false,
      }),
    });
  });

  it('does not change the field when it already matches', async () => {
    const getMany = membershipsAndUsers(['user-a']);
    const { sdk } = mockSdk({
      teamAsapId: 'team-asap',
      value: [toLink('user-a')],
      getMany,
    });

    render(<TeamAsapMembersField />);

    await waitFor(() => expect(getMany).toHaveBeenCalledTimes(2));
    expect(sdk.field.setValue).not.toHaveBeenCalled();
    expect(sdk.field.removeValue).not.toHaveBeenCalled();
  });

  it('clears the field and says so when Team ASAP has no current members', async () => {
    const { sdk } = mockSdk({
      teamAsapId: 'team-asap',
      value: [toLink('old-user')],
      getMany: jest.fn().mockResolvedValue({ items: [] }),
    });

    render(<TeamAsapMembersField />);

    expect(await screen.findByText(NO_MEMBERS)).toBeInTheDocument();
    expect(sdk.field.removeValue).toHaveBeenCalled();
  });

  it('asks for the ASAP Team when it is not set, and loads once it is', async () => {
    const getMany = membershipsAndUsers(['user-a']);
    const { sdk, changeTeam } = mockSdk({ getMany });

    render(<TeamAsapMembersField />);

    expect(screen.getByText(NO_TEAM_ASAP)).toBeInTheDocument();
    expect(getMany).not.toHaveBeenCalled();

    changeTeam('team-asap');

    await waitFor(() =>
      expect(sdk.field.setValue).toHaveBeenCalledWith([toLink('user-a')]),
    );
  });

  it('shows an error and keeps the field when members cannot be loaded', async () => {
    const { sdk } = mockSdk({
      teamAsapId: 'team-asap',
      value: [toLink('user-a')],
      getMany: jest.fn().mockRejectedValue(new Error('network')),
    });

    render(<TeamAsapMembersField />);

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(sdk.field.setValue).not.toHaveBeenCalled();
    expect(sdk.field.removeValue).not.toHaveBeenCalled();
  });
});
