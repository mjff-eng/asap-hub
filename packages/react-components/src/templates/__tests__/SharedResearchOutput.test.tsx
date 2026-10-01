import { ComponentProps, useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createResearchOutputResponse } from '@asap-hub/fixtures';
import { ResearchOutputPermissionsContext } from '@asap-hub/react-context';
import { researchOutputDocumentTypes } from '@asap-hub/model';
import { MemoryRouter, useLocation } from 'react-router';
import { sharedResearch } from '@asap-hub/routing';

import SharedResearchOutput from '../SharedResearchOutput';

let currentLocation: { pathname: string; search: string } | null = null;
const LocationCapture = () => {
  const location = useLocation();
  useEffect(() => {
    currentLocation = { pathname: location.pathname, search: location.search };
  }, [location]);
  return null;
};

const renderWithRouter = (component: React.ReactElement) =>
  render(<MemoryRouter>{component}</MemoryRouter>);

const props: ComponentProps<typeof SharedResearchOutput> = {
  ...createResearchOutputResponse(),
  shortDescription: undefined,
  changelog: undefined,
  descriptionMD: '',
  methods: [],
  subtype: undefined,
  environments: [],
  organisms: [],
  backHref: '#',
  toast: undefined,
  onRequestReview: jest.fn(() => Promise.resolve()),
  onPublish: jest.fn(() => Promise.resolve()),
  checkForNewVersion: jest.fn(() => Promise.resolve(false)),
};

beforeEach(() => {
  currentLocation = null;
  jest.spyOn(console, 'error').mockImplementation();
});

describe('Grant Documents', () => {
  it('renders an output with title and content', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        documentType="Grant Document"
        title="title"
        description="content"
      />,
    );
    expect(getByText(/grant document/i)).toBeVisible();
    expect(getByText(/title/i, { selector: 'h1' })).toBeVisible();
    expect(getByText(/content/i)).toBeVisible();
  });

  it('displays edit button when user has permission', () => {
    const { queryByTitle, rerender } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: false,
          canPublishResearchOutput: false,
          canShareResearchOutput: false,
        }}
      >
        <SharedResearchOutput {...props} documentType="Article" />,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByTitle('Edit')).toBeNull();

    rerender(
      <MemoryRouter>
        <ResearchOutputPermissionsContext.Provider
          value={{
            canEditResearchOutput: false,
            canPublishResearchOutput: false,
            canShareResearchOutput: false,
          }}
        >
          <SharedResearchOutput {...props} documentType="Grant Document" />,
        </ResearchOutputPermissionsContext.Provider>
      </MemoryRouter>,
    );
    expect(queryByTitle('Edit')).toBeNull();

    rerender(
      <MemoryRouter>
        <ResearchOutputPermissionsContext.Provider
          value={{
            canEditResearchOutput: true,
            canPublishResearchOutput: false,
            canShareResearchOutput: false,
          }}
        >
          <SharedResearchOutput {...props} documentType="Article" />,
        </ResearchOutputPermissionsContext.Provider>
      </MemoryRouter>,
    );
    expect(queryByTitle('Edit')).toBeInTheDocument();
  });

  it('displays duplicate button when user has permission', () => {
    const { queryByTitle, rerender } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: false,
          canPublishResearchOutput: false,
          canShareResearchOutput: false,
          canDuplicateResearchOutput: false,
        }}
      >
        <SharedResearchOutput {...props} documentType="Article" />,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByTitle('Duplicate')).toBeNull();

    rerender(
      <MemoryRouter>
        <ResearchOutputPermissionsContext.Provider
          value={{
            canEditResearchOutput: false,
            canPublishResearchOutput: false,
            canShareResearchOutput: false,
            canDuplicateResearchOutput: false,
          }}
        >
          <SharedResearchOutput {...props} documentType="Grant Document" />,
        </ResearchOutputPermissionsContext.Provider>
      </MemoryRouter>,
    );
    expect(queryByTitle('Duplicate')).toBeNull();

    rerender(
      <MemoryRouter>
        <ResearchOutputPermissionsContext.Provider
          value={{
            canEditResearchOutput: true,
            canPublishResearchOutput: false,
            canShareResearchOutput: false,
            canDuplicateResearchOutput: true,
          }}
        >
          <SharedResearchOutput {...props} documentType="Article" />,
        </ResearchOutputPermissionsContext.Provider>
      </MemoryRouter>,
    );
    expect(queryByTitle('Duplicate')).toBeInTheDocument();
  });

  it('handles tags and separate RTF description', () => {
    const { queryByText, getByText, queryByRole } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        documentType="Grant Document"
        keywords={['tag1']}
        description="abc 123"
      />,
    );
    expect(queryByText(/tags/i, { selector: 'h2' })).toBeInTheDocument();
    expect(
      queryByText('Description', { selector: 'h3' }),
    ).not.toBeInTheDocument();
    expect(getByText('tag1')).toBeVisible();
    expect(getByText('abc 123')).toBeVisible();
    expect(queryByRole('separator')).not.toBeInTheDocument();
  });

  it('does not display additional information when data provided', () => {
    const { queryByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        documentType="Grant Document"
        usedInPublication={true}
      />,
    );
    expect(queryByText(/additional information/i)).not.toBeInTheDocument();
  });
});

describe('Grant Document page', () => {
  const originalGrant = {
    researchOutputId: 'original-id',
    title: 'Original grant',
    description: 'Original grant overview',
  };
  const supplementGrant = {
    researchOutputId: 'supplement-id',
    title: 'Supplement grant',
    description: 'Supplement grant overview',
  };
  const project = {
    id: 'project-id',
    title: 'Project title',
    projectType: 'Discovery Project' as const,
  };
  const grantProps: ComponentProps<typeof SharedResearchOutput> = {
    ...props,
    id: 'original-id',
    documentType: 'Grant Document',
    type: 'Proposal',
    title: 'Grant title',
    description: 'Output description',
    link: 'https://example.com/grant.pdf',
    grantDocument: {
      grantType: 'original',
      project,
      original: originalGrant,
    },
  };
  const supplementToastText = /This is an original grant proposal/;
  const renderGrantPage = (
    overrides: Partial<ComponentProps<typeof SharedResearchOutput>> = {},
  ) =>
    renderWithRouter(<SharedResearchOutput {...grantProps} {...overrides} />);

  it('keeps the current layout for a grant document without grant data', () => {
    renderGrantPage({ grantDocument: undefined });
    expect(screen.getByText('Output description')).toBeVisible();
    expect(screen.queryByText('Project Output')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Overview' }),
    ).not.toBeInTheDocument();
  });

  it('renders the project output header from the grant document', () => {
    renderGrantPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Grant title' }),
    ).toBeVisible();
    expect(screen.getByText('Project Output')).toBeVisible();
    expect(screen.getByText('Original')).toBeVisible();
    expect(screen.queryByText('Proposal')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Project title' })).toHaveAttribute(
      'href',
      '/projects/discovery/project-id',
    );
  });

  it('uses the grant page layout for any output linked as a grant proposal', () => {
    renderGrantPage({
      documentType: 'Article',
    });
    expect(screen.getByText('Project Output')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Additional Information' }),
    ).not.toBeInTheDocument();
  });

  it('renders the overview from the current grant description', () => {
    const { rerender } = renderGrantPage();
    expect(screen.getByText('Original grant overview')).toBeVisible();
    expect(screen.queryByText('Output description')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SharedResearchOutput
          {...grantProps}
          id="supplement-id"
          grantDocument={{
            grantType: 'supplement',
            project,
            original: originalGrant,
            supplement: supplementGrant,
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Supplement grant overview')).toBeVisible();
  });

  it('falls back to the output description without a grant description', () => {
    renderGrantPage({
      grantDocument: {
        grantType: 'original',
        project,
        original: { ...originalGrant, description: undefined },
      },
    });
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
    expect(screen.getByText('Output description')).toBeVisible();
  });

  it('renders only the tags in the tags card', () => {
    renderGrantPage({
      keywords: ['tag1'],
      shortDescription: 'Short description',
      changelog: 'Changelog entry',
    });
    expect(screen.getByText('tag1')).toBeVisible();
    expect(screen.queryByText('Short description')).not.toBeInTheDocument();
    expect(screen.queryByText('Changelog entry')).not.toBeInTheDocument();
  });

  it('renders the cards in the design order', () => {
    renderGrantPage({
      keywords: ['tag1'],
      versions: [
        { id: 'v1', documentType: 'Grant Document', title: 'Old version' },
      ],
      grantDocument: {
        grantType: 'original',
        project,
        original: originalGrant,
        supplement: supplementGrant,
      },
    });
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map(({ textContent }) => textContent);
    expect(headings).toEqual([
      'Overview',
      'Grant Document PDF',
      'Grants',
      'Tags',
      'Version History',
    ]);
  });

  it('embeds the output link as a PDF only when there is a link', () => {
    const { rerender } = renderGrantPage();
    expect(screen.getByTitle('Grant Document PDF')).toHaveAttribute(
      'src',
      'https://example.com/grant.pdf',
    );

    rerender(
      <MemoryRouter>
        <SharedResearchOutput {...grantProps} link={undefined} />
      </MemoryRouter>,
    );
    expect(screen.queryByTitle('Grant Document PDF')).not.toBeInTheDocument();
  });

  it('renders the grants card only when there is a supplement grant', () => {
    const { rerender } = renderGrantPage();
    expect(
      screen.queryByRole('heading', { name: 'Grants' }),
    ).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SharedResearchOutput
          {...grantProps}
          grantDocument={{
            grantType: 'original',
            project,
            original: originalGrant,
            supplement: supplementGrant,
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Grants' })).toBeVisible();
  });

  it('shows the supplement toast only on the original grant with a supplement output', () => {
    const grantDocument = {
      grantType: 'original' as const,
      project,
      original: originalGrant,
      supplement: supplementGrant,
    };
    const { rerender } = renderGrantPage({
      grantDocument,
    });
    expect(screen.getByText(supplementToastText)).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'supplement version' }),
    ).toHaveAttribute('href', '/shared-research/supplement-id');

    rerender(
      <MemoryRouter>
        <SharedResearchOutput
          {...grantProps}
          grantDocument={{ ...grantDocument, grantType: 'supplement' }}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(supplementToastText)).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SharedResearchOutput
          {...grantProps}
          grantDocument={{
            ...grantDocument,
            supplement: { ...supplementGrant, researchOutputId: undefined },
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(supplementToastText)).not.toBeInTheDocument();
  });
});

describe('Not Grant Documents', () => {
  it('displays access instructions when data provided', () => {
    const { queryByText, getByText, rerender } = renderWithRouter(
      <SharedResearchOutput {...props} documentType="Article" usageNotes="" />,
    );
    expect(queryByText(/access instructions/i)).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <SharedResearchOutput
          {...props}
          documentType="Article"
          usageNotes="Some Data"
        />
      </MemoryRouter>,
    );
    expect(getByText(/usage notes/i)).toBeVisible();
    expect(getByText(/some data/i)).toBeVisible();
  });
  it('displays access instructions when data provided as markdown', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        documentType="Article"
        usageNotesMD="Markdown Content"
      />,
    );
    expect(getByText(/markdown content/i)).toBeVisible();
  });
  describe('tags and description', () => {
    it('handles tags and description omitted', () => {
      const { queryByText, queryByRole } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          documentType="Article"
          keywords={[]}
          description=""
          descriptionMD=""
        />,
      );
      expect(queryByText(/tags/i, { selector: 'h3' })).not.toBeInTheDocument();
      expect(
        queryByText('Description', { selector: 'h3' }),
      ).not.toBeInTheDocument();
      expect(queryByRole('separator')).not.toBeInTheDocument();
    });

    it('handles just a description', () => {
      const { queryByText, getByText, queryByRole } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          documentType="Article"
          keywords={[]}
          description="text"
        />,
      );
      expect(queryByText(/tags/i, { selector: 'h2' })).not.toBeInTheDocument();
      expect(
        queryByText('Description', { selector: 'h3' }),
      ).toBeInTheDocument();
      expect(getByText('text')).toBeVisible();
      expect(queryByRole('separator')).not.toBeInTheDocument();
    });

    it('handles no description', () => {
      const { queryByText } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          documentType="Article"
          keywords={['tag1']}
          description={undefined}
          descriptionMD={undefined}
        />,
      );
      expect(
        queryByText('Description', { selector: 'h3' }),
      ).not.toBeInTheDocument();
    });
    it('handles just tags', () => {
      const { queryByText, getByText, queryByRole } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          documentType="Article"
          keywords={['tag1']}
          description=""
          descriptionMD=""
        />,
      );
      expect(queryByText(/tags/i, { selector: 'h2' })).toBeInTheDocument();
      expect(
        queryByText('Description', { selector: 'h3' }),
      ).not.toBeInTheDocument();
      expect(getByText('tag1')).toBeVisible();
      expect(queryByRole('separator')).not.toBeInTheDocument();
    });
    it('handles tags and description', () => {
      const { queryByText, getByText, queryByRole } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          documentType="Article"
          keywords={['tag1']}
          description="text"
        />,
      );
      expect(queryByText(/tags/i, { selector: 'h2' })).toBeInTheDocument();
      expect(
        queryByText('Description', { selector: 'h3' }),
      ).toBeInTheDocument();
      expect(getByText('tag1')).toBeVisible();
      expect(getByText('text')).toBeVisible();
      expect(queryByRole('separator')).toBeVisible();
    });
    it('only display descriptionMD if it is set', () => {
      const { queryByText, getByText, queryByRole } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          documentType="Article"
          keywords={['tag1']}
          description="should not be there"
          descriptionMD="should be visible"
        />,
      );
      expect(getByText('should be visible')).toBeVisible();
      expect(queryByText('should not be there')).not.toBeInTheDocument();
      expect(queryByRole('separator')).toBeVisible();
    });
    it('displays the related research card when data provided', () => {
      const { queryByText, getByText, rerender } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          documentType="Article"
          relatedResearch={[]}
        />,
      );
      expect(queryByText(/Related Research/i)).not.toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <SharedResearchOutput
            {...props}
            documentType="Article"
            relatedResearch={[
              {
                id: 'id1',
                title: 'Related research article',
                teams: [
                  {
                    id: 'team1',
                    displayName: 'team 1',
                    teamType: 'Discovery Team',
                  },
                ],
                workingGroups: [],
                type: 'Published',
                documentType: 'Article',
              },
            ]}
          />
        </MemoryRouter>,
      );
      expect(getByText('Related Research')).toBeVisible();
      expect(
        getByText(
          'Find out all shared research outputs that contributed to this one.',
        ),
      ).toBeVisible();
      expect(getByText(/Related research article/i)).toBeVisible();
    });
  });
});

describe('footer', () => {
  const originalNavigator = window.navigator;
  Object.assign(window.navigator, {
    clipboard: {
      writeText: () => {},
    },
  });

  beforeEach(() => {
    currentLocation = null;
    jest.spyOn(window.navigator.clipboard, 'writeText');
  });
  afterEach(() => {
    Object.assign(window.navigator, originalNavigator);
  });

  it('displays contact card when there are contact emails', () => {
    const { queryByText, getByText, rerender } = renderWithRouter(
      <SharedResearchOutput {...props} contactEmails={[]} />,
    );
    expect(queryByText(/contact/i)).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <SharedResearchOutput {...props} contactEmails={['blah@gmail.com']} />
      </MemoryRouter>,
    );
    expect(getByText(/contact/i).closest('a')).toHaveAttribute(
      'href',
      expect.stringMatching(/blah/i),
    );
  });

  it('adds the email to clipboard when user clicks on copy button', () => {
    const { getByTitle } = renderWithRouter(
      <SharedResearchOutput {...props} contactEmails={['blah@gmail.com']} />,
    );

    fireEvent.click(getByTitle(/copy/i));
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringMatching(/blah@gmail.com/i),
    );
  });
});

it('merges different tag types in the correct order', () => {
  const { getAllByRole } = renderWithRouter(
    <SharedResearchOutput
      {...props}
      methods={['method']}
      organisms={['organisms']}
      environments={['environment']}
      subtype={'subtype'}
      keywords={['tag']}
      teams={[]}
      labs={[]}
      authors={[]}
      impact={undefined}
      categories={[]}
      workingGroups={undefined}
    />,
  );
  expect(
    getAllByRole('listitem')
      .map(({ textContent }) => textContent)
      .slice(3),
  ).toEqual(['method', 'organisms', 'environment', 'subtype', 'tag']);
});

describe('a draft output', () => {
  it('can never display the published now toast for a draft', () => {
    const { queryByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        published={false}
        toast="published"
        teams={[
          { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
        ]}
        workingGroups={undefined}
      />,
    );
    expect(
      queryByText('Team Article published successfully.'),
    ).not.toBeInTheDocument();
  });
  it('can display the draft created now toast', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        published={false}
        toast="draftCreated"
        teams={[
          { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
        ]}
        workingGroups={undefined}
      />,
    );
    expect(
      getByText('Draft Team Grant Document created successfully.'),
    ).toBeInTheDocument();
  });
  it('has a closable toast', async () => {
    const user = userEvent.setup();
    const { getByText, getByTitle } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        published={false}
        toast="draftCreated"
        teams={[
          { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
        ]}
        workingGroups={undefined}
      />,
    );
    const toast = getByText('Draft Team Grant Document created successfully.');
    expect(toast).toBeVisible();
    await user.click(getByTitle(/close/i));
    expect(toast).not.toBeInTheDocument();
  });
  it.each(researchOutputDocumentTypes)(
    'shows the created now toast for team draft outputs with documentType: %s',
    (researchOutputDocumentType) => {
      const { getByText } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          published={false}
          toast="draftCreated"
          teams={[
            { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
          ]}
          workingGroups={undefined}
          documentType={researchOutputDocumentType}
        />,
      );
      expect(
        getByText(
          `Draft Team ${researchOutputDocumentType} created successfully.`,
        ),
      ).toBeVisible();
    },
  );
  it.each(researchOutputDocumentTypes)(
    'shows the created now toast for working group draft outputs with documentType: %s',
    (researchOutputDocumentType) => {
      const { getByText } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          published={false}
          toast="draftCreated"
          teams={[
            { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
          ]}
          workingGroups={[
            {
              id: 'wg1',
              title: 'wg 1',
            },
          ]}
          documentType={researchOutputDocumentType}
        />,
      );
      expect(
        getByText(
          `Draft Working Group ${researchOutputDocumentType} created successfully.`,
        ),
      ).toBeVisible();
    },
  );
  it('shows the toast for team drafts that contain only one team', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        published={false}
        teams={[
          { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
        ]}
        workingGroups={undefined}
      />,
    );
    expect(
      getByText(
        'This draft is available to members in the team listed below. Only PMs can publish this output.',
      ),
    ).toBeVisible();
    expect(getByText('Draft')).toBeVisible();
  });
  it('shows the toast for team drafts that contain more than one teams', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        published={false}
        teams={[
          { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
          { id: 'team2', displayName: 'team 2', teamType: 'Discovery Team' },
        ]}
        workingGroups={undefined}
      />,
    );
    expect(
      getByText(
        'This draft is available to members in the teams listed below. Only PMs can publish this output.',
      ),
    ).toBeVisible();
    expect(getByText('Draft')).toBeVisible();
  });
  it('shows the toast for team drafts that contain a working group', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        published={false}
        teams={[
          { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
        ]}
        workingGroups={[
          {
            id: 'wg1',
            title: 'wg 1',
          },
        ]}
      />,
    );
    expect(
      getByText(
        'This draft is available to members in the working group listed below. Only PMs can publish this output.',
      ),
    ).toBeVisible();
    expect(getByText('Draft')).toBeVisible();
  });
  it('shows the toast for project drafts when the project has a lead', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        published={false}
        publishingEntity="Project"
        workingGroups={undefined}
        teams={[]}
        project={{
          id: 'project-1',
          title: 'My Project',
          projectType: 'Trainee Project',
        }}
        projectHasLead
      />,
    );
    expect(
      getByText(
        'This draft is available to members in the project listed below. Only project leads can publish this output.',
      ),
    ).toBeVisible();
    expect(getByText('Draft')).toBeVisible();
  });
  it('shows the toast for project drafts when the project has no lead', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        published={false}
        publishingEntity="Project"
        workingGroups={undefined}
        teams={[]}
        project={{
          id: 'project-1',
          title: 'My Project',
          projectType: 'Trainee Project',
        }}
        projectHasLead={false}
      />,
    );
    expect(
      getByText(
        'This draft is available to members in the project listed below. Any project member can publish this output.',
      ),
    ).toBeVisible();
    expect(getByText('Draft')).toBeVisible();
  });
});

describe('a newly published output', () => {
  it('has a closable toast', async () => {
    const user = userEvent.setup();
    const { getByText, getByTitle } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        teams={[
          { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
        ]}
        workingGroups={undefined}
        documentType="Article"
        published={true}
        toast="published"
      />,
    );
    const toast = getByText('Team Article published successfully.');
    expect(toast).toBeVisible();
    await user.click(getByTitle(/close/i));
    expect(toast).not.toBeInTheDocument();
  });
  it.each(researchOutputDocumentTypes)(
    'shows the toast for team outputs with documentType: %s',
    (researchOutputDocumentType) => {
      const { getByText } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          teams={[
            { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
          ]}
          workingGroups={undefined}
          documentType={researchOutputDocumentType}
          published={true}
          toast="published"
        />,
      );
      expect(
        getByText(`Team ${researchOutputDocumentType} published successfully.`),
      ).toBeVisible();
    },
  );
  it.each(researchOutputDocumentTypes)(
    'shows the toast for working group outputs with documentType: %s',
    (researchOutputDocumentType) => {
      const { getByText } = renderWithRouter(
        <SharedResearchOutput
          {...props}
          teams={[
            { id: 'team1', displayName: 'team 1', teamType: 'Discovery Team' },
          ]}
          workingGroups={[
            {
              id: 'wg1',
              title: 'wg 1',
            },
          ]}
          documentType={researchOutputDocumentType}
          published={true}
          toast="published"
        />,
      );
      expect(
        getByText(
          `Working Group ${researchOutputDocumentType} published successfully.`,
        ),
      ).toBeVisible();
    },
  );
});

describe('the ready for pm review button', () => {
  it('does not render if the user does not have ready for review permissions', () => {
    const { queryByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: true,
          canPublishResearchOutput: true,
          canShareResearchOutput: true,
          canRequestReview: false,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={false}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByText('Ready for PM Review.')).not.toBeInTheDocument();
  });
  it('does not render if someone requested a review', () => {
    const { queryByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: false,
          canPublishResearchOutput: false,
          canShareResearchOutput: false,
          canRequestReview: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={false}
          isInReview={true}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByText('Ready for PM Review.')).not.toBeInTheDocument();
  });
  it('does not render if the research output was published', () => {
    const { queryByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: false,
          canPublishResearchOutput: false,
          canShareResearchOutput: true,
          canRequestReview: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={true}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByText('Ready for PM Review.')).not.toBeInTheDocument();
  });
  it('renders if user has ready for review permissions', () => {
    const { getByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: false,
          canPublishResearchOutput: false,
          canShareResearchOutput: true,
          canRequestReview: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={false}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );

    const button = getByText('Ready for PM Review');
    expect(button).toBeVisible();
  });
  describe('displays the request review modal', () => {
    it('and renders with the correct text fields for a team research output', () => {
      const { getByText, getAllByText } = render(
        <MemoryRouter>
          <ResearchOutputPermissionsContext.Provider
            value={{
              canEditResearchOutput: false,
              canPublishResearchOutput: false,
              canShareResearchOutput: true,
              canRequestReview: true,
            }}
          >
            <SharedResearchOutput
              {...props}
              documentType="Article"
              published={false}
              workingGroups={undefined}
            />
            ,
          </ResearchOutputPermissionsContext.Provider>
          ,
        </MemoryRouter>,
      );
      const button = getByText('Ready for PM Review');
      fireEvent.click(button);
      expect(getByText('Output ready for PM review?')).toBeVisible();
      expect(
        getByText(
          /All team members listed on this output will be notified and PMs will be able to review and publish this output./i,
        ),
      ).toBeVisible();
      expect(getByText('Cancel')).toBeVisible();
      expect(getAllByText('Ready for PM Review').length).toEqual(2);
    });
    it('and renders with the correct text fields for a working group research output', () => {
      const { getByText } = render(
        <MemoryRouter>
          <ResearchOutputPermissionsContext.Provider
            value={{
              canEditResearchOutput: false,
              canPublishResearchOutput: false,
              canShareResearchOutput: true,
              canRequestReview: true,
            }}
          >
            <SharedResearchOutput
              {...props}
              documentType="Article"
              published={false}
              workingGroups={[
                {
                  id: 'wg1',
                  title: 'wg 1',
                },
              ]}
            />
            ,
          </ResearchOutputPermissionsContext.Provider>
          ,
        </MemoryRouter>,
      );
      const button = getByText('Ready for PM Review');
      fireEvent.click(button);
      expect(
        getByText(
          /All working group members listed on this output will be notified and PMs will be able to review and publish this output./i,
        ),
      ).toBeVisible();
    });
    it('and renders with the correct text fields for a project research output', () => {
      const { getByText, getAllByText, queryByText } = render(
        <MemoryRouter>
          <ResearchOutputPermissionsContext.Provider
            value={{
              canEditResearchOutput: false,
              canPublishResearchOutput: false,
              canShareResearchOutput: true,
              canRequestReview: true,
            }}
          >
            <SharedResearchOutput
              {...props}
              documentType="Article"
              published={false}
              publishingEntity="Project"
              workingGroups={undefined}
              teams={[]}
              project={{
                id: 'project-1',
                title: 'My Project',
                projectType: 'Trainee Project',
              }}
            />
            ,
          </ResearchOutputPermissionsContext.Provider>
          ,
        </MemoryRouter>,
      );
      const button = getByText('Ready for Review');
      fireEvent.click(button);
      expect(getByText('Output ready for review?')).toBeVisible();
      expect(
        getByText(
          /All project members listed on this output will be notified and the project leads will be able to review and publish this output./i,
        ),
      ).toBeVisible();
      expect(queryByText(/PM/)).not.toBeInTheDocument();
      expect(getAllByText('Ready for Review').length).toEqual(2);
    });
    it('shows project review copy for a team-based project output', () => {
      const { getByText, getAllByText, queryByText } = render(
        <MemoryRouter>
          <ResearchOutputPermissionsContext.Provider
            value={{
              canEditResearchOutput: false,
              canPublishResearchOutput: false,
              canShareResearchOutput: true,
              canRequestReview: true,
            }}
          >
            <SharedResearchOutput
              {...props}
              documentType="Article"
              published={false}
              publishingEntity="Team"
              workingGroups={undefined}
              teams={[
                {
                  id: 'team-1',
                  displayName: 'Team ASAP',
                  teamType: 'Discovery Team',
                  project: {
                    id: 'project-1',
                    title: 'My Project',
                    projectType: 'Trainee Project',
                    projectId: 'ASAP-P1',
                  },
                },
              ]}
              project={undefined}
            />
          </ResearchOutputPermissionsContext.Provider>
        </MemoryRouter>,
      );
      const button = getByText('Ready for Review');
      fireEvent.click(button);
      expect(getByText('Output ready for review?')).toBeVisible();
      expect(
        getByText(
          /All project members listed on this output will be notified and the project manager will be able to review and publish this output./i,
        ),
      ).toBeVisible();
      expect(queryByText(/PM/)).not.toBeInTheDocument();
      expect(getAllByText('Ready for Review').length).toEqual(2);
    });
    describe('and has the correct actions on the  buttons', () => {
      it('closes the modal correctly', () => {
        const { getByText, queryByText } = render(
          <MemoryRouter>
            <ResearchOutputPermissionsContext.Provider
              value={{
                canEditResearchOutput: false,
                canPublishResearchOutput: false,
                canShareResearchOutput: true,
                canRequestReview: true,
              }}
            >
              <SharedResearchOutput
                {...props}
                documentType="Article"
                published={false}
              />
              ,
            </ResearchOutputPermissionsContext.Provider>
            ,
          </MemoryRouter>,
        );
        const showModalButton = getByText('Ready for PM Review');
        fireEvent.click(showModalButton);
        expect(queryByText('Output ready for PM review?')).toBeInTheDocument();
        const closeButton = getByText('Cancel');
        fireEvent.click(closeButton);
        expect(
          queryByText('Output ready for PM review?'),
        ).not.toBeInTheDocument();
      });
      it('and requests a review from a PM on the right button', async () => {
        const requestReviewFn = jest.fn();
        const { getByText, getAllByText } = render(
          <MemoryRouter>
            <ResearchOutputPermissionsContext.Provider
              value={{
                canEditResearchOutput: false,
                canPublishResearchOutput: false,
                canShareResearchOutput: true,
                canRequestReview: true,
              }}
            >
              <SharedResearchOutput
                {...props}
                documentType="Article"
                published={false}
                onRequestReview={requestReviewFn}
              />
              ,
            </ResearchOutputPermissionsContext.Provider>
            ,
          </MemoryRouter>,
        );
        const showModalButton = getByText('Ready for PM Review');
        fireEvent.click(showModalButton);
        const saveButton = getAllByText('Ready for PM Review')[1];

        fireEvent.click(saveButton as HTMLElement);
        await waitFor(() => {
          expect(saveButton).toBeEnabled();
        });
        expect(requestReviewFn).toHaveBeenCalled();
      });
    });
  });
});

describe('the switch to draft button', () => {
  it('does not render if the user does not staff level permissions', () => {
    const { queryByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: true,
          canPublishResearchOutput: false,
          canShareResearchOutput: true,
          canRequestReview: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={false}
          isInReview={true}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByText('Switch to draft')).not.toBeInTheDocument();
  });
  it('does not render if the research output was published', () => {
    const { queryByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: true,
          canPublishResearchOutput: true,
          canShareResearchOutput: true,
          canRequestReview: false,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={true}
          isInReview={true}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByText('Switch to draft')).not.toBeInTheDocument();
  });
  it('does not render if no one requested a review', () => {
    const { queryByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: true,
          canPublishResearchOutput: true,
          canShareResearchOutput: true,
          canRequestReview: false,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={false}
          isInReview={false}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByText('Switch to draft')).not.toBeInTheDocument();
  });
  it('renders if someone requested a review and user is staff', () => {
    const { getByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canEditResearchOutput: false,
          canPublishResearchOutput: true,
          canShareResearchOutput: false,
          canRequestReview: false,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={false}
          isInReview={true}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );

    const button = getByText('Switch to Draft');
    expect(button).toBeVisible();
  });
  describe('displays the switch to draft modal', () => {
    it('and renders with the correct text fields for a team research output', () => {
      const { getByText, getAllByText } = render(
        <MemoryRouter>
          <ResearchOutputPermissionsContext.Provider
            value={{
              canEditResearchOutput: false,
              canPublishResearchOutput: true,
              canShareResearchOutput: false,
              canRequestReview: false,
            }}
          >
            <SharedResearchOutput
              {...props}
              documentType="Article"
              published={false}
              workingGroups={undefined}
              isInReview={true}
            />
            ,
          </ResearchOutputPermissionsContext.Provider>
          ,
        </MemoryRouter>,
      );
      const button = getByText('Switch to Draft');
      fireEvent.click(button);
      expect(getByText('Switch output to draft?')).toBeVisible();
      expect(
        getByText(
          /All team members listed on this output will be notified and will be able to edit this output again./i,
        ),
      ).toBeVisible();
      expect(getByText('Cancel')).toBeVisible();
      expect(getAllByText('Switch to Draft').length).toEqual(2);
    });
    it('and renders with the correct text fields for a working group research output', () => {
      const { getByText } = render(
        <MemoryRouter>
          <ResearchOutputPermissionsContext.Provider
            value={{
              canEditResearchOutput: false,
              canPublishResearchOutput: true,
              canShareResearchOutput: false,
              canRequestReview: false,
            }}
          >
            <SharedResearchOutput
              {...props}
              documentType="Article"
              published={false}
              workingGroups={[
                {
                  id: 'wg1',
                  title: 'wg 1',
                },
              ]}
              isInReview={true}
            />
            ,
          </ResearchOutputPermissionsContext.Provider>
          ,
        </MemoryRouter>,
      );
      const button = getByText('Switch to Draft');
      fireEvent.click(button);
      expect(
        getByText(
          /All working group members listed on this output will be notified and will be able to edit this output again./i,
        ),
      ).toBeVisible();
    });
    describe('and has the correct actions on the buttons', () => {
      it('closes the modal correctly', () => {
        const { getByText, queryByText } = render(
          <MemoryRouter>
            <ResearchOutputPermissionsContext.Provider
              value={{
                canEditResearchOutput: false,
                canPublishResearchOutput: true,
                canShareResearchOutput: false,
                canRequestReview: false,
              }}
            >
              <SharedResearchOutput
                {...props}
                documentType="Article"
                published={false}
                isInReview={true}
              />
              ,
            </ResearchOutputPermissionsContext.Provider>
            ,
          </MemoryRouter>,
        );
        const showModalButton = getByText('Switch to Draft');
        fireEvent.click(showModalButton);
        expect(getByText('Switch output to draft?')).toBeVisible();
        const closeButton = getByText('Cancel');
        fireEvent.click(closeButton);
        expect(queryByText('Switch output to draft?')).not.toBeInTheDocument();
      });
      it('and switches back into draft', async () => {
        const switchToDraft = jest.fn();
        const { getByText, getAllByText } = render(
          <MemoryRouter>
            <ResearchOutputPermissionsContext.Provider
              value={{
                canEditResearchOutput: false,
                canPublishResearchOutput: true,
                canShareResearchOutput: false,
                canRequestReview: false,
              }}
            >
              <SharedResearchOutput
                {...props}
                documentType="Article"
                published={false}
                onRequestReview={switchToDraft}
                isInReview={true}
              />
              ,
            </ResearchOutputPermissionsContext.Provider>
            ,
          </MemoryRouter>,
        );
        const showModalButton = getByText('Switch to Draft');
        fireEvent.click(showModalButton);
        const saveButton = getAllByText('Switch to Draft')[1];

        fireEvent.click(saveButton as HTMLElement);
        await waitFor(() => {
          expect(saveButton).toBeEnabled();
        });
        expect(switchToDraft).toHaveBeenCalled();
      });
    });
  });
});

describe('the publish button', () => {
  it('does not render if the user is not staff', () => {
    const { queryByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canPublishResearchOutput: false,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={false}
          isInReview={true}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByText('Publish')).not.toBeInTheDocument();
  });
  it('does not render if the research output was published', () => {
    const { queryByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canPublishResearchOutput: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={true}
          isInReview={true}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );
    expect(queryByText('Publish')).not.toBeInTheDocument();
  });
  it('renders if user is staff and output is not published', () => {
    const { getByText } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canPublishResearchOutput: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={false}
          isInReview={true}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>,
    );

    const button = getByText('Publish');
    expect(button).toBeVisible();
  });
  describe('displays the publish modal', () => {
    it('and renders with the correct text fields for a team research output', () => {
      const { getByText, getByRole } = render(
        <MemoryRouter>
          <ResearchOutputPermissionsContext.Provider
            value={{
              canPublishResearchOutput: true,
            }}
          >
            <SharedResearchOutput
              {...props}
              documentType="Article"
              published={false}
              workingGroups={undefined}
              isInReview={true}
            />
            ,
          </ResearchOutputPermissionsContext.Provider>
          ,
        </MemoryRouter>,
      );
      const showModalButton = getByText('Publish');
      fireEvent.click(showModalButton);
      const description =
        'All team members listed on this output will be notified and all CRN members will be able to access it. If you want to switch to draft after the output was published you need to contact.';

      expect(getByText('Publish output for the whole hub?')).toBeVisible();
      expect(getByText(description)).toBeVisible();
      expect(
        getByRole('link', { name: 'techsupport@asap.science' }),
      ).toBeVisible();
      expect(getByText('Cancel')).toBeVisible();
      expect(getByText('Publish Output')).toBeVisible();
    });
    it('and renders with the correct text fields for a working group research output', () => {
      const { getByText } = render(
        <MemoryRouter>
          <ResearchOutputPermissionsContext.Provider
            value={{
              canPublishResearchOutput: true,
            }}
          >
            <SharedResearchOutput
              {...props}
              documentType="Article"
              published={false}
              workingGroups={[
                {
                  id: 'wg1',
                  title: 'wg 1',
                },
              ]}
              isInReview={true}
            />
            ,
          </ResearchOutputPermissionsContext.Provider>
          ,
        </MemoryRouter>,
      );
      const showModalButton = getByText('Publish');
      fireEvent.click(showModalButton);
      const description =
        'All working group members listed on this output will be notified and all CRN members will be able to access it. If you want to switch to draft after the output was published you need to contact.';

      expect(getByText(description)).toBeVisible();
    });
    describe('and has the correct actions on the buttons', () => {
      it('closes the modal correctly', () => {
        const { getByText, queryByText } = render(
          <MemoryRouter>
            <ResearchOutputPermissionsContext.Provider
              value={{
                canPublishResearchOutput: true,
              }}
            >
              <SharedResearchOutput
                {...props}
                documentType="Article"
                published={false}
                isInReview={true}
              />
              ,
            </ResearchOutputPermissionsContext.Provider>
            ,
          </MemoryRouter>,
        );
        const showModalButton = getByText('Publish');
        fireEvent.click(showModalButton);
        expect(getByText('Publish output for the whole hub?')).toBeVisible();
        const closeButton = getByText('Cancel');
        fireEvent.click(closeButton);
        expect(
          queryByText('Publish output for the whole hub?'),
        ).not.toBeInTheDocument();
      });
      it('publishes a research output', async () => {
        const publishOutput = jest.fn();
        const { getByText } = render(
          <MemoryRouter>
            <ResearchOutputPermissionsContext.Provider
              value={{
                canPublishResearchOutput: true,
              }}
            >
              <SharedResearchOutput
                {...props}
                documentType="Article"
                published={false}
                onPublish={publishOutput}
                isInReview={true}
              />
              ,
            </ResearchOutputPermissionsContext.Provider>
            ,
          </MemoryRouter>,
        );
        const showModalButton = getByText('Publish');
        fireEvent.click(showModalButton);
        const publishButton = getByText('Publish Output');

        fireEvent.click(publishButton);
        await waitFor(() => {
          expect(publishButton).toBeEnabled();
        });
        expect(publishOutput).toHaveBeenCalled();
      });
    });
  });
});

describe('displayNoNewManuscriptVersionModal', () => {
  const checkForNewVersion = jest.fn().mockResolvedValue(false);

  it('renders the modal when there is no new manuscript version', async () => {
    const user = userEvent.setup();
    const { getByText } = render(
      <MemoryRouter>
        <ResearchOutputPermissionsContext.Provider
          value={{
            canVersionResearchOutput: true,
          }}
        >
          <SharedResearchOutput
            {...props}
            documentType="Article"
            published={true}
            workingGroups={undefined}
            checkForNewVersion={checkForNewVersion}
            relatedManuscriptVersion={'manuscript-version-id-1'}
          />
          ,
        </ResearchOutputPermissionsContext.Provider>
        ,
      </MemoryRouter>,
    );

    const importVersionButton = getByText('Import Manuscript Version');
    await user.click(importVersionButton);

    expect(getByText('No new manuscript versions available')).toBeVisible();
    expect(getByText('Go to Compliance Area')).toBeVisible();
  });

  it('closes the modal on clicking cancel', async () => {
    const user = userEvent.setup();
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <ResearchOutputPermissionsContext.Provider
          value={{
            canVersionResearchOutput: true,
          }}
        >
          <SharedResearchOutput
            {...props}
            documentType="Article"
            published={true}
            workingGroups={undefined}
            checkForNewVersion={checkForNewVersion}
            relatedManuscriptVersion={'manuscript-version-id-1'}
          />
          ,
        </ResearchOutputPermissionsContext.Provider>
        ,
      </MemoryRouter>,
    );
    const importVersionButton = getByText('Import Manuscript Version');
    await user.click(importVersionButton);

    expect(getByText('No new manuscript versions available')).toBeVisible();

    const cancelButton = getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(
      queryByText('No new manuscript versions available'),
    ).not.toBeInTheDocument();
  });

  it('navigates to team workspace on clicking Go to Compliance Area', async () => {
    const user = userEvent.setup();
    const { getByText, queryByText } = render(
      <MemoryRouter
        initialEntries={[
          sharedResearch({}).researchOutput({ researchOutputId: props.id }).$,
        ]}
      >
        <ResearchOutputPermissionsContext.Provider
          value={{
            canVersionResearchOutput: true,
          }}
        >
          <SharedResearchOutput
            {...props}
            documentType="Article"
            published={true}
            workingGroups={undefined}
            checkForNewVersion={checkForNewVersion}
            relatedManuscriptVersion={'manuscript-version-id-1'}
          />
        </ResearchOutputPermissionsContext.Provider>
      </MemoryRouter>,
    );
    const importVersionButton = getByText('Import Manuscript Version');
    await user.click(importVersionButton);

    expect(getByText('No new manuscript versions available')).toBeVisible();

    const goToComplianceButton = getByText('Go to Compliance Area');
    await user.click(goToComplianceButton);

    // Modal should close when button is clicked, indicating navigation attempt
    await waitFor(() => {
      expect(
        queryByText('No new manuscript versions available'),
      ).not.toBeInTheDocument();
    });
  });
});

it('navigates to version creation page if there is a new manuscript version', async () => {
  const user = userEvent.setup();
  const checkForNewVersion = jest.fn().mockResolvedValue(true);
  const { getByText } = render(
    <MemoryRouter
      initialEntries={[
        sharedResearch({}).researchOutput({ researchOutputId: props.id }).$,
      ]}
    >
      <LocationCapture />
      <ResearchOutputPermissionsContext.Provider
        value={{
          canVersionResearchOutput: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          published={true}
          workingGroups={undefined}
          checkForNewVersion={checkForNewVersion}
          relatedManuscriptVersion={'manuscript-version-id-1'}
        />
        ,
      </ResearchOutputPermissionsContext.Provider>
      ,
    </MemoryRouter>,
  );
  const importVersionButton = getByText('Import Manuscript Version');
  await user.click(importVersionButton);

  await waitFor(() => {
    expect(currentLocation?.pathname).toBe(
      `/shared-research/${props.id}/version`,
    );
  });
});

describe('duplicate link', () => {
  it('links to the project duplicate route for project outputs', () => {
    const { getByTitle } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canDuplicateResearchOutput: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          publishingEntity="Project"
          workingGroups={undefined}
          project={{
            id: 'project-1',
            title: 'Trainee Project',
            projectType: 'Trainee Project',
          }}
          teams={[]}
        />
      </ResearchOutputPermissionsContext.Provider>,
    );

    expect(getByTitle('Duplicate').closest('a')).toHaveAttribute(
      'href',
      `/projects/trainee/project-1/duplicate/${props.id}`,
    );
  });

  it('links a team-based project output to its project duplicate route', () => {
    const { getByTitle } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canDuplicateResearchOutput: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          publishingEntity="Team"
          workingGroups={undefined}
          project={undefined}
          teams={[
            {
              id: 'team-1',
              displayName: 'Team 1',
              teamType: 'Discovery Team',
              project: {
                id: 'project-1',
                title: 'Discovery Project',
                projectType: 'Discovery Project',
                projectId: 'DP1',
              },
            },
          ]}
        />
      </ResearchOutputPermissionsContext.Provider>,
    );

    expect(getByTitle('Duplicate').closest('a')).toHaveAttribute(
      'href',
      `/projects/discovery/project-1/duplicate/${props.id}`,
    );
  });

  it('hides the duplicate button when a project output is missing routing data', () => {
    const { queryByTitle } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canDuplicateResearchOutput: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          publishingEntity="Project"
          workingGroups={undefined}
          project={undefined}
          teams={[]}
        />
      </ResearchOutputPermissionsContext.Provider>,
    );

    expect(queryByTitle('Duplicate')).toBeNull();
  });

  it('hides the duplicate button for team outputs without a linked project', () => {
    const { queryByTitle } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canDuplicateResearchOutput: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          publishingEntity="Team"
          workingGroups={undefined}
          project={undefined}
          teams={[
            { id: 'team-1', displayName: 'Team 1', teamType: 'Discovery Team' },
          ]}
        />
      </ResearchOutputPermissionsContext.Provider>,
    );

    expect(queryByTitle('Duplicate')).toBeNull();
  });

  it('hides the duplicate button for an unknown publishing entity', () => {
    const { queryByTitle } = renderWithRouter(
      <ResearchOutputPermissionsContext.Provider
        value={{
          canDuplicateResearchOutput: true,
        }}
      >
        <SharedResearchOutput
          {...props}
          documentType="Article"
          publishingEntity={'Unknown' as never}
          workingGroups={undefined}
          project={undefined}
          teams={[]}
        />
      </ResearchOutputPermissionsContext.Provider>,
    );

    expect(queryByTitle('Duplicate')).toBeNull();
  });

  it('renders output versions when versions are provided', () => {
    const { getByText } = renderWithRouter(
      <SharedResearchOutput
        {...props}
        documentType="Article"
        versions={[
          {
            id: 'version-1',
            title: 'Version One',
            documentType: 'Article',
            type: 'Published',
            addedDate: '2024-01-01',
            link: 'http://example.com/v1',
          },
        ]}
      />,
    );

    expect(getByText(/#1/)).toBeInTheDocument();
  });
});
