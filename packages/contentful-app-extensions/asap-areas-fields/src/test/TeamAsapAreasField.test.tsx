import { FieldAppSDK } from '@contentful/app-sdk';
import { useSDK } from '@contentful/react-apps-toolkit';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { EntryLink } from '../asapAreas';
import TeamAsapAreasField, {
  NOT_TEAM_ASAP_NOTE,
  TEAM_ASAP_NOT_FOUND,
} from '../locations/TeamAsapAreasField';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: jest.fn(),
}));

jest.mock('@contentful/field-editor-reference', () => ({
  MultipleEntryReferenceEditor: () => <div data-testid="reference-editor" />,
}));

const link = (id: string): EntryLink => ({
  sys: { type: 'Link', linkType: 'Entry', id },
});

const aboutAsap = (teamId?: string) => ({
  items: teamId
    ? [
        {
          sys: { id: 'about' },
          fields: { membersTeam: { 'en-US': link(teamId) } },
        },
      ]
    : [],
});

const mockSdk = ({
  teamId,
  teamAsapId,
  areas,
}: {
  teamId?: string;
  teamAsapId?: string;
  areas?: EntryLink[];
}) => {
  let fieldValue = areas;
  let onTeamChanged: (value?: EntryLink) => void = () => {};
  const sdk = {
    field: {
      getValue: jest.fn(() => fieldValue),
      setValue: jest.fn((value: EntryLink[]) => {
        fieldValue = value;
      }),
      removeValue: jest.fn(() => {
        fieldValue = undefined;
      }),
    },
    entry: {
      fields: {
        team: {
          getValue: jest.fn(() => (teamId ? link(teamId) : undefined)),
          onValueChanged: jest.fn((cb: (value?: EntryLink) => void) => {
            onTeamChanged = cb;
            return jest.fn();
          }),
        },
      },
    },
    cma: {
      entry: { getMany: jest.fn().mockResolvedValue(aboutAsap(teamAsapId)) },
    },
    window: {
      startAutoResizer: jest.fn(),
      stopAutoResizer: jest.fn(),
    },
  };
  (useSDK as jest.Mock).mockReturnValue(sdk);
  return {
    sdk: sdk as unknown as jest.Mocked<FieldAppSDK> & typeof sdk,
    changeTeam: (id?: string) =>
      act(() => onTeamChanged(id ? link(id) : undefined)),
  };
};

describe('TeamAsapAreasField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the area picker for a Team ASAP membership', async () => {
    mockSdk({ teamId: 'team-asap', teamAsapId: 'team-asap' });

    render(<TeamAsapAreasField />);

    expect(await screen.findByTestId('reference-editor')).toBeInTheDocument();
    expect(screen.queryByText(NOT_TEAM_ASAP_NOTE)).not.toBeInTheDocument();
  });

  it('shows the note instead of the picker for other teams', async () => {
    mockSdk({ teamId: 'team-other', teamAsapId: 'team-asap' });

    render(<TeamAsapAreasField />);

    expect(await screen.findByText(NOT_TEAM_ASAP_NOTE)).toBeInTheDocument();
    expect(screen.queryByTestId('reference-editor')).not.toBeInTheDocument();
  });

  it('shows the note when no team is selected yet', async () => {
    mockSdk({ teamAsapId: 'team-asap' });

    render(<TeamAsapAreasField />);

    expect(await screen.findByText(NOT_TEAM_ASAP_NOTE)).toBeInTheDocument();
  });

  it('warns when the About ASAP entry has no ASAP Team, without clearing areas', async () => {
    const { sdk } = mockSdk({ teamId: 'team-other', areas: [link('area-1')] });

    render(<TeamAsapAreasField />);

    expect(await screen.findByText(TEAM_ASAP_NOT_FOUND)).toBeInTheDocument();
    expect(sdk.field.removeValue).not.toHaveBeenCalled();
  });

  it('clears areas when the team changes away from Team ASAP and restores them when it changes back', async () => {
    const { sdk, changeTeam } = mockSdk({
      teamId: 'team-asap',
      teamAsapId: 'team-asap',
      areas: [link('area-1')],
    });

    render(<TeamAsapAreasField />);
    await screen.findByTestId('reference-editor');

    changeTeam('team-other');
    await waitFor(() => expect(sdk.field.removeValue).toHaveBeenCalled());
    expect(await screen.findByText(NOT_TEAM_ASAP_NOTE)).toBeInTheDocument();

    changeTeam('team-asap');
    await waitFor(() =>
      expect(sdk.field.setValue).toHaveBeenCalledWith([link('area-1')]),
    );
    expect(await screen.findByTestId('reference-editor')).toBeInTheDocument();
  });
});
