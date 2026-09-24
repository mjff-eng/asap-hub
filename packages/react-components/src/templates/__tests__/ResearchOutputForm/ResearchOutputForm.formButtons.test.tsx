import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import {
  InnerToastContext,
  resolveResearchOutputAvailableActions,
} from '@asap-hub/react-context';

import {
  researchOutputDocumentTypeToType,
  ResearchOutputResponse,
  ResearchTagResponse,
} from '@asap-hub/model';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResearchOutputForm from '../../ResearchOutputForm';
import { colour, colorFromHex } from '../../../colors';
import {
  getDefaultProps,
  initialResearchOutputData,
} from '../../test-utils/research-output-form';
import { mockActErrorsInConsole } from '../../../test-utils';

jest.setTimeout(60000);

let consoleMock: ReturnType<typeof mockActErrorsInConsole>;

describe('form buttons', () => {
  const id = '42';
  const saveFn = jest.fn();
  const saveDraftFn = jest.fn();
  const getLabSuggestions = jest.fn();
  const getAuthorSuggestions = jest.fn();

  beforeEach(() => {
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    saveFn.mockResolvedValue({ id } as ResearchOutputResponse);
    saveDraftFn.mockResolvedValue({ id } as ResearchOutputResponse);
    getLabSuggestions.mockResolvedValue([]);
    getAuthorSuggestions.mockResolvedValue([]);

    consoleMock = mockActErrorsInConsole();
  });

  afterEach(() => {
    consoleMock.mockRestore();
    jest.resetAllMocks();
  });

  const setupForm = async (
    {
      canEditResearchOutput = false,
      canPublishResearchOutput = false,
      published = false,
      documentType = 'Article',
      researchTags = [{ id: '1', name: 'research tag 1' }],
      researchOutputData = undefined,
      versionAction = undefined,
      isImportedFromManuscript = false,
      flowId = 'team-create-manual',
    }: {
      canEditResearchOutput?: boolean;
      canPublishResearchOutput?: boolean;

      published?: boolean;
      documentType?: ComponentProps<typeof ResearchOutputForm>['documentType'];
      versionAction?: ComponentProps<
        typeof ResearchOutputForm
      >['versionAction'];
      researchTags?: ResearchTagResponse[];
      researchOutputData?: ComponentProps<
        typeof ResearchOutputForm
      >['researchOutputData'];
      isImportedFromManuscript?: ComponentProps<
        typeof ResearchOutputForm
      >['isImportedFromManuscript'];
      flowId?: ComponentProps<typeof ResearchOutputForm>['flowId'];
    } = {
      documentType: 'Article',
      researchTags: [],
    },
  ) => {
    const permissions = {
      canEditResearchOutput,
      canPublishResearchOutput,
      canShareResearchOutput: true,
    };
    render(
      <InnerToastContext.Provider value={jest.fn()}>
        <MemoryRouter>
          <ResearchOutputForm
            {...getDefaultProps()}
            versionAction={versionAction}
            researchOutputData={researchOutputData}
            selectedTeams={[{ value: 'TEAMID', label: 'Example Team' }]}
            documentType={documentType}
            typeOptions={Array.from(
              researchOutputDocumentTypeToType[documentType],
            )}
            onSave={saveFn}
            onSaveDraft={saveDraftFn}
            getLabSuggestions={getLabSuggestions}
            getAuthorSuggestions={getAuthorSuggestions}
            researchTags={researchTags}
            published={published}
            isImportedFromManuscript={isImportedFromManuscript}
            flowId={flowId}
            availableActions={resolveResearchOutputAvailableActions({
              flowId,
              permissions,
              documentType,
            })}
            permissions={permissions}
          />
        </MemoryRouter>
      </InnerToastContext.Provider>,
    );
  };

  const primaryButtonBg = colorFromHex(colour.brand.crn[500]).rgb;
  const notPrimaryButtonBg = colorFromHex(colour.neutral[0]).rgb;

  it('shows Cancel, Save Draft and Publish buttons when user has editing and publishing permissions and the research output has not been published yet', async () => {
    await setupForm({
      canEditResearchOutput: true,
      canPublishResearchOutput: true,
      published: false,
    });

    const publishButton = screen.getByRole('button', {
      name: /Publish/i,
    });
    expect(publishButton).toBeInTheDocument();
    expect(publishButton).toHaveStyle(`background-color:${primaryButtonBg}`);

    const saveDraftButton = screen.getByRole('button', { name: /Save Draft/i });
    expect(saveDraftButton).toBeInTheDocument();
    expect(saveDraftButton).toHaveStyle(
      `background-color:${notPrimaryButtonBg}`,
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveStyle(`background-color:${notPrimaryButtonBg}`);
  });

  it('shows only Cancel and Save buttons when user has editing and publishing permission and the research output has already been published', async () => {
    await setupForm({
      canEditResearchOutput: true,
      canPublishResearchOutput: true,
      published: true,
      flowId: 'team-edit-published',
    });

    expect(
      screen.queryByRole('button', { name: /Publish/i }),
    ).not.toBeInTheDocument();

    const saveDraftButton = screen.getByRole('button', { name: /Save/i });
    expect(saveDraftButton).toBeInTheDocument();
    expect(saveDraftButton).toHaveStyle(`background-color:${primaryButtonBg}`);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveStyle(`background-color:${notPrimaryButtonBg}`);
  });

  it('shows only Cancel and Save buttons when research output is manuscript output and the research output has already been published', async () => {
    await setupForm({
      isImportedFromManuscript: true,
      canPublishResearchOutput: true,
      published: true,
      flowId: 'team-edit-published',
    });

    expect(
      screen.queryByRole('button', { name: /Publish/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Save Draft/i }),
    ).not.toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toHaveStyle(`background-color:${primaryButtonBg}`);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveStyle(`background-color:${notPrimaryButtonBg}`);
  });

  it('shows only Cancel and Publish buttons when research output is manuscript output and the research output has not been published', async () => {
    await setupForm({
      isImportedFromManuscript: true,
      canPublishResearchOutput: true,
      published: false,
      flowId: 'team-create-imported-from-manuscript',
    });

    expect(
      screen.queryByRole('button', { name: /Save/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Save Draft/i }),
    ).not.toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Publish/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toHaveStyle(`background-color:${primaryButtonBg}`);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveStyle(`background-color:${notPrimaryButtonBg}`);
  });

  it('shows only Cancel and Save Draft buttons when user has editing permission and the research output has not been published yet', async () => {
    await setupForm({
      canEditResearchOutput: true,
      canPublishResearchOutput: false,
      published: false,
    });

    expect(
      screen.queryByRole('button', { name: /Publish/i }),
    ).not.toBeInTheDocument();

    const saveDraftButton = screen.getByRole('button', { name: /Save Draft/i });
    expect(saveDraftButton).toBeInTheDocument();
    expect(saveDraftButton).toHaveStyle(`background-color:${primaryButtonBg}`);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveStyle(`background-color:${notPrimaryButtonBg}`);
  });

  describe('save loader', () => {
    it('shows a loader on the Save button while a published output is saving', async () => {
      saveFn.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves, to hold the loading state */
          }),
      );
      await setupForm({
        flowId: 'team-edit-published',
        canEditResearchOutput: true,
        canPublishResearchOutput: true,
        published: true,
        documentType: 'Bioinformatics',
        researchOutputData: initialResearchOutputData,
      });

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => {
        expect(saveFn).toHaveBeenCalled();
      });
      expect(await screen.findByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    });

    it('shows a loader on the Save Draft button while a draft is saving', async () => {
      saveDraftFn.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves, to hold the loading state */
          }),
      );
      await setupForm({
        canEditResearchOutput: true,
        canPublishResearchOutput: false,
        published: false,
        documentType: 'Bioinformatics',
        researchOutputData: initialResearchOutputData,
      });

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: /Save Draft/i }),
      );

      await waitFor(() => {
        expect(saveDraftFn).toHaveBeenCalled();
      });
      expect(await screen.findByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    });
  });

  it('pre-selects DOI on identifier type when importing from manuscript', async () => {
    await setupForm({ isImportedFromManuscript: true });

    const identifierType = await screen.findByDisplayValue('DOI');
    expect(identifierType).toHaveValue('DOI');
  });

  it('shows placeholder text when not importing from manuscript', async () => {
    await setupForm({ isImportedFromManuscript: false });

    expect(await screen.findByText('Choose an identifier')).toBeInTheDocument();
  });
});
