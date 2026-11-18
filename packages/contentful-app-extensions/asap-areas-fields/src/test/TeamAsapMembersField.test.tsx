import { FieldAppSDK } from '@contentful/app-sdk';
import { useSDK } from '@contentful/react-apps-toolkit';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { EntryLink, toLink } from '../asapAreas';
import TeamAsapMembersField, {
  LOAD_ERROR,
  PUBLISH_ERROR,
  NO_MEMBERS,
  NO_TEAM_ASAP,
} from '../locations/TeamAsapMembersField';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: jest.fn(),
}));

jest.mock('@contentful/field-editor-reference', () => ({
  MultipleEntryReferenceEditor: ({
    isInitiallyDisabled,
    hasCardEditActions,
    hasCardMoveActions,
    hasCardRemoveActions,
    renderCustomActions,
  }: {
    isInitiallyDisabled: boolean;
    hasCardEditActions: boolean;
    hasCardMoveActions: boolean;
    hasCardRemoveActions: boolean;
    renderCustomActions?: () => React.ReactElement;
  }) => (
    <div data-testid="reference-editor">
      {[
        isInitiallyDisabled ? 'disabled' : 'draggable',
        hasCardEditActions ? 'editable' : 'not editable',
        hasCardMoveActions ? 'move menu' : 'no move menu',
        hasCardRemoveActions ? 'removable' : 'not removable',
        renderCustomActions ? 'no add actions' : 'default actions',
      ].join(', ')}
    </div>
  ),
}));

const membershipsAndUsers = (userIds: string[]) =>
  jest
    .fn()
    .mockResolvedValueOnce({ items: [{ sys: { id: 'membership-1' } }] })
    .mockResolvedValueOnce({ items: userIds.map((id) => ({ sys: { id } })) });

const DRAFT = { version: 1 };
const PUBLISHED = { version: 5, publishedVersion: 4 };
const PUBLISHED_WITH_CHANGES = { version: 7, publishedVersion: 4 };

const mockSdk = ({
  teamAsapId,
  value,
  getMany = membershipsAndUsers([]),
  entrySys = DRAFT,
  publish = jest.fn().mockResolvedValue(undefined),
}: {
  teamAsapId?: string;
  value?: EntryLink[];
  getMany?: jest.Mock;
  entrySys?: { version: number; publishedVersion?: number };
  publish?: jest.Mock;
}) => {
  let onTeamChanged: (value?: EntryLink) => void = () => {};
  const sdk = {
    field: {
      getValue: jest.fn(() => value),
      setValue: jest.fn(),
      removeValue: jest.fn(),
    },
    entry: {
      getSys: jest.fn(() => entrySys),
      publish,
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

  it('only allows dragging to reorder, with no edit, remove or add actions', async () => {
    mockSdk({ teamAsapId: 'team-asap' });

    render(<TeamAsapMembersField />);

    expect(await screen.findByTestId('reference-editor')).toHaveTextContent(
      'draggable, not editable, no move menu, not removable, no add actions',
    );
  });

  it('keeps the saved order, drops people who left and appends new members', async () => {
    const getMany = membershipsAndUsers(['user-a', 'user-b']);
    const { sdk } = mockSdk({
      teamAsapId: 'team-asap',
      value: [toLink('user-b'), toLink('old-user')],
      getMany,
    });

    render(<TeamAsapMembersField />);

    await waitFor(() =>
      expect(sdk.field.setValue).toHaveBeenCalledWith([
        toLink('user-b'),
        toLink('user-a'),
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

  describe('publishing', () => {
    it('publishes the entry after updating the list when it had no other changes', async () => {
      const { sdk } = mockSdk({
        teamAsapId: 'team-asap',
        getMany: membershipsAndUsers(['user-a']),
        entrySys: PUBLISHED,
      });

      render(<TeamAsapMembersField />);

      await waitFor(() => expect(sdk.entry.publish).toHaveBeenCalled());
      expect(sdk.field.setValue).toHaveBeenCalledWith([toLink('user-a')]);
    });

    it('does not publish when the entry has other unpublished changes', async () => {
      const { sdk } = mockSdk({
        teamAsapId: 'team-asap',
        getMany: membershipsAndUsers(['user-a']),
        entrySys: PUBLISHED_WITH_CHANGES,
      });

      render(<TeamAsapMembersField />);

      await waitFor(() => expect(sdk.field.setValue).toHaveBeenCalled());
      expect(sdk.entry.publish).not.toHaveBeenCalled();
    });

    it('does not publish a draft entry', async () => {
      const { sdk } = mockSdk({
        teamAsapId: 'team-asap',
        getMany: membershipsAndUsers(['user-a']),
        entrySys: DRAFT,
      });

      render(<TeamAsapMembersField />);

      await waitFor(() => expect(sdk.field.setValue).toHaveBeenCalled());
      expect(sdk.entry.publish).not.toHaveBeenCalled();
    });

    it('does not publish when the list did not change', async () => {
      const getMany = membershipsAndUsers(['user-a']);
      const { sdk } = mockSdk({
        teamAsapId: 'team-asap',
        value: [toLink('user-a')],
        getMany,
        entrySys: PUBLISHED,
      });

      render(<TeamAsapMembersField />);

      await waitFor(() => expect(getMany).toHaveBeenCalledTimes(2));
      expect(sdk.entry.publish).not.toHaveBeenCalled();
    });

    it('shows a warning when publishing fails', async () => {
      mockSdk({
        teamAsapId: 'team-asap',
        getMany: membershipsAndUsers(['user-a']),
        entrySys: PUBLISHED,
        publish: jest.fn().mockRejectedValue(new Error('validation')),
      });

      render(<TeamAsapMembersField />);

      expect(await screen.findByText(PUBLISH_ERROR)).toBeInTheDocument();
    });
  });
});
