import {
  ResearchOutputDocumentType,
  ResearchOutputEntityType,
} from '@asap-hub/model';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps, ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';

import {
  NavigationBlockerProvider,
  useNavigationWarning,
} from '../../navigation';
import ResearchOutputHeader from '../ResearchOutputHeader';

const renderWithRouter = (
  ui: ReactNode,
  initialEntries = ['/previous', '/form'],
) =>
  render(
    <MemoryRouter
      initialEntries={initialEntries}
      initialIndex={initialEntries.length - 1}
    >
      <NavigationBlockerProvider>{ui}</NavigationBlockerProvider>
    </MemoryRouter>,
  );

it.each<{
  documentType: ResearchOutputDocumentType;
  entityType: ResearchOutputEntityType;
  headingName: RegExp;
  subHeader: RegExp;
}>([
  {
    documentType: 'Article',
    entityType: 'team',
    headingName: /Share a Team Article/i,
    subHeader: /published article/,
  },
  {
    documentType: 'Protocol',
    entityType: 'team',
    headingName: /Share a Team Protocol/i,
    subHeader: /Add your protocol/,
  },
  {
    documentType: 'Dataset',
    entityType: 'team',
    headingName: /Share a Team Dataset/i,
    subHeader: /Add your dataset/,
  },
  {
    documentType: 'Bioinformatics',
    entityType: 'team',
    headingName: /Share Team Bioinformatics/i,
    subHeader: /Add bioinformatics/,
  },
  {
    documentType: 'Lab Material',
    entityType: 'team',
    headingName: /Share a Team Lab Material/i,
    subHeader: /Add your lab material/,
  },
  {
    documentType: 'Article',
    entityType: 'working-group',
    headingName: /Share a Working Group Article/i,
    subHeader: /published article/,
  },
  {
    documentType: 'Report',
    entityType: 'working-group',
    headingName: /Share a Working Group CRN Report/i,
    subHeader: /add your CRN report/,
  },
])(
  'renders the $documentType $entityType research output',
  ({ documentType, headingName, subHeader, entityType }) => {
    renderWithRouter(
      <ResearchOutputHeader
        entityType={entityType}
        documentType={documentType}
      />,
    );
    expect(
      screen.getByRole('heading', { name: headingName }),
    ).toBeInTheDocument();
    expect(screen.getByText(subHeader)).toBeInTheDocument();
  },
);

it('renders a Project header for a team-based project output', () => {
  renderWithRouter(
    <ResearchOutputHeader
      entityType="team"
      documentType="Article"
      isProjectOutput
    />,
  );
  expect(
    screen.getByRole('heading', { name: /Share a Project Article/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: /Team/i }),
  ).not.toBeInTheDocument();
});

describe('the Back button', () => {
  const headerProps: ComponentProps<typeof ResearchOutputHeader> = {
    entityType: 'team',
    documentType: 'Article',
  };

  const LocationDisplay = () => (
    <>
      <div data-testid="location">{useLocation().pathname}</div>
      <div data-testid="navigation-type">{useNavigationType()}</div>
    </>
  );

  const DirtyForm = () => {
    useNavigationWarning({ shouldBlock: true });
    return null;
  };

  let confirmSpy: jest.SpyInstance;
  let goSpy: jest.SpyInstance;
  beforeEach(() => {
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    goSpy = jest.spyOn(window.history, 'go').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
    window.history.replaceState(null, '');
  });

  it('goes back to the previous page', async () => {
    renderWithRouter(
      <>
        <ResearchOutputHeader {...headerProps} />
        <LocationDisplay />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/previous');
  });

  it('goes to the dashboard when the form was opened from its URL', async () => {
    renderWithRouter(
      <>
        <ResearchOutputHeader {...headerProps} />
        <LocationDisplay />
      </>,
      ['/form'],
    );
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(screen.getByTestId('navigation-type')).toHaveTextContent('PUSH');
  });

  it('goes to the dashboard when the sign-in redirect replaced the form URL', async () => {
    // What React Router leaves on the first entry after a replace
    window.history.replaceState({ idx: 0 }, '');
    renderWithRouter(
      <>
        <ResearchOutputHeader {...headerProps} />
        <LocationDisplay />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('is disabled while the form is saving', () => {
    const SavingForm = () => {
      useNavigationWarning({ shouldBlock: true, isSaving: true });
      return null;
    };
    renderWithRouter(
      <>
        <SavingForm />
        <ResearchOutputHeader {...headerProps} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  describe('with unsaved changes', () => {
    const renderDirty = (initialEntries?: string[]) =>
      renderWithRouter(
        <>
          <DirtyForm />
          <ResearchOutputHeader {...headerProps} />
          <LocationDisplay />
        </>,
        initialEntries,
      );

    it('asks to discard them in a dialog without a close button', async () => {
      renderDirty();
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(
        screen.getByRole('heading', { name: 'Discard changes?' }),
      ).toBeVisible();
      expect(
        screen.getByText("All the information you've entered will be lost."),
      ).toBeVisible();
      expect(screen.queryByTitle('Close')).not.toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/form');
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('stays on the form when the user keeps editing', async () => {
      renderDirty();
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      await userEvent.click(
        screen.getByRole('button', { name: 'Keep editing' }),
      );

      expect(
        screen.queryByRole('heading', { name: 'Discard changes?' }),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/form');
    });

    it('goes back without the native confirm when the user discards them', async () => {
      renderDirty();
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

      expect(screen.getByTestId('location')).toHaveTextContent('/previous');
      // The browser back that leaves the form's guard entry
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(goSpy).toHaveBeenCalledWith(-2);
    });

    it('closes the dialog on discard and leaves only once', async () => {
      renderDirty(['/first', '/previous', '/form']);
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

      expect(
        screen.queryByRole('heading', { name: 'Discard changes?' }),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/previous');

      // The header is still up, as while a navigation transition is pending
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/previous');
    });

    it('goes to the dashboard and keeps guarding later browser backs when the form was opened from its URL', async () => {
      renderDirty(['/form']);
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

      expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
      // Replaces the form's guard entry so browser back shows the form once
      expect(screen.getByTestId('navigation-type')).toHaveTextContent(
        'REPLACE',
      );
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(confirmSpy).toHaveBeenCalled();
    });
  });
});
