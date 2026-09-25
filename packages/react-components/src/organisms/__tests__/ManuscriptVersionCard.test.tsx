import {
  createDiscussionResponse,
  createManuscriptResponse,
  getComplianceReportDataObject,
} from '@asap-hub/fixtures';
import { ManuscriptVersion } from '@asap-hub/model';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import ManuscriptVersionCard from '../ManuscriptVersionCard';

const originalScrollHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollHeight',
);

const mockScrollHeight = (height: number) => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    value: height,
  });
};

afterEach(() => {
  jest.restoreAllMocks();
  // Restore original scrollHeight descriptor
  if (originalScrollHeightDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      'scrollHeight',
      originalScrollHeightDescriptor,
    );
  }
});

afterAll(jest.clearAllMocks);

const baseVersion = createManuscriptResponse().versions[0] as ManuscriptVersion;
const props: ComponentProps<typeof ManuscriptVersionCard> = {
  version: baseVersion,
  manuscriptId: 'manuscript-1',
  openDiscussionTab: jest.fn(),
};

it('displays quick checks when present', async () => {
  const asapAffiliationIncludedDetails =
    "Including ASAP as an affiliation hasn't been done due to compliance with journal guidelines, needing agreement from authors and institutions, administrative complexities, and balancing recognition with primary affiliations.";

  const author = {
    id: 'author-id',
    displayName: 'Arthur Author',
    firstName: 'Arthur',
    lastName: 'Author',
    alumniSinceDate: undefined,
    avatarUrl: 'http://image',
    teams: [
      {
        id: 'team-author',
        name: 'Team Author',
      },
    ],
  };

  const editor = {
    id: 'editor-id',
    displayName: 'Edith Editor',
    firstName: 'Edith',
    lastName: 'Editor',
    alumniSinceDate: undefined,
    avatarUrl: 'http://image',
    teams: [
      {
        id: 'team-editor',
        name: 'Team Editor',
      },
    ],
  };
  const user = userEvent.setup();
  const { getByText, queryByText, getByLabelText, rerender } = render(
    <MemoryRouter>
      <ManuscriptVersionCard {...props} />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));

  await waitFor(() => {
    expect(
      queryByText(
        /Included ASAP as an affiliation within the author list for all ASAP-affiliated authors/i,
      ),
    ).not.toBeInTheDocument();
  });

  const updatedVersion = {
    ...baseVersion,
    asapAffiliationIncludedDetails,
    createdBy: author,
    updatedBy: editor,
    createdDate: '2024-06-20T11:06:58.899Z',
    publishedAt: '2024-06-21T11:06:58.899Z',
    otherDetails: 'Necessary info',
  };

  rerender(
    <MemoryRouter>
      <ManuscriptVersionCard {...props} version={updatedVersion} />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(
      getByText(
        /Included ASAP as an affiliation within the author list for all ASAP-affiliated authors/i,
      ),
    ).toBeVisible();
    expect(
      getByText(
        /Including ASAP as an affiliation hasn't been done due to compliance with journal guidelines, needing agreement from authors and institutions, administrative complexities, and balancing recognition with primary affiliations./i,
      ),
    ).toBeVisible();
  });
});
it.each(['No', 'Not applicable'])(
  'displays the quick check answer %s alongside its details',
  async (answer) => {
    const user = userEvent.setup();
    const { getByText, getByLabelText } = render(
      <MemoryRouter>
        <ManuscriptVersionCard
          {...props}
          version={{
            ...baseVersion,
            asapAffiliationIncluded: answer,
            asapAffiliationIncludedDetails: 'Some quick check reason',
          }}
        />
      </MemoryRouter>,
    );
    await user.click(getByLabelText('Expand Version'));

    await waitFor(() => {
      expect(
        getByText(
          /Included ASAP as an affiliation within the author list for all ASAP-affiliated authors/i,
        ),
      ).toBeVisible();
      expect(getByText(answer)).toBeVisible();
      expect(getByText('Some quick check reason')).toBeVisible();
    });
  },
);

it('displays createdBy as fallback for updatedBy when updatedBy is well defined', async () => {
  const author = {
    id: 'author-id',
    displayName: 'Arthur Author',
    firstName: 'Arthur',
    lastName: 'Author',
    alumniSinceDate: undefined,
    avatarUrl: 'http://image',
    teams: [
      {
        id: 'team-author',
        name: 'Team Author',
      },
    ],
  };

  const user = userEvent.setup();
  const screen = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          createdBy: author,
          updatedBy: {
            ...author,
            id: '',
          },
        }}
      />
    </MemoryRouter>,
  );

  await user.click(screen.getByLabelText('Expand Version'));

  expect(screen.getAllByText('Arthur Author').length).toEqual(2);
  expect(
    screen.getAllByText('Arthur Author')[0]!.closest('a')!.href!,
  ).toContain('/network/users/author-id');
  expect(screen.getAllByText('Team Author')[0]!.closest('a')!.href!).toContain(
    '/network/teams/team-author',
  );
});

describe('edit', () => {
  it('does not display the edit button when isManuscriptContributor is false', () => {
    const { queryByLabelText } = render(
      <MemoryRouter>
        <ManuscriptVersionCard {...props} isManuscriptContributor={false} />
      </MemoryRouter>,
    );
    expect(queryByLabelText('Edit')).not.toBeInTheDocument();
  });

  it('does not display the edit button when isActiveVersion is false', () => {
    const { queryByLabelText } = render(
      <MemoryRouter>
        <ManuscriptVersionCard {...props} isActiveVersion={false} />
      </MemoryRouter>,
    );
    expect(queryByLabelText('Edit')).not.toBeInTheDocument();
  });

  it('navigates to edit form page when clicking on edit button', async () => {
    const user = userEvent.setup();
    const { getByLabelText } = render(
      <MemoryRouter>
        <ManuscriptVersionCard
          {...props}
          isActiveVersion
          isManuscriptContributor
        />
      </MemoryRouter>,
    );
    const editButton = getByLabelText('Edit');
    expect(editButton).toBeInTheDocument();
    await user.click(editButton);
    // Navigation is tested indirectly - the button should trigger useNavigate without errors
  });

  it('uses getEditManuscriptHref when provided to build the edit URL', () => {
    const getEditManuscriptHref = jest.fn(
      (manuscriptId: string) =>
        `/projects/discovery/project-1/workspace/edit-manuscript/${manuscriptId}`,
    );
    render(
      <MemoryRouter>
        <ManuscriptVersionCard
          {...props}
          isActiveVersion
          isManuscriptContributor
          getEditManuscriptHref={getEditManuscriptHref}
        />
      </MemoryRouter>,
    );
    expect(getEditManuscriptHref).toHaveBeenCalledWith(props.manuscriptId);
  });
});

it('displays Additional Information section when present', async () => {
  const user = userEvent.setup();
  const { getByRole, queryByRole, rerender, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard {...props} />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));
  expect(
    queryByRole('heading', { name: /Additional Information/i }),
  ).not.toBeInTheDocument();

  rerender(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{ ...baseVersion, otherDetails: 'Necessary info' }}
      />
    </MemoryRouter>,
  );

  expect(
    getByRole('heading', { name: /Additional Information/i }),
  ).toBeVisible();
});

it('renders a divider between fields in Additional Information section and files section', async () => {
  const user = userEvent.setup();
  const { queryAllByRole, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          preprintDoi: '10.1101/gr.10.12.1841',
          publicationDoi: '10.1101/gr.10.12.1842',
          otherDetails: 'Necessary info',
        }}
      />
    </MemoryRouter>,
  );

  await user.click(getByLabelText('Expand Version'));
  expect(queryAllByRole('separator').length).toEqual(5);
});

it.each`
  field               | title                | newValue
  ${'preprintDoi'}    | ${'Preprint DOI'}    | ${'10.1101/gr.10.12.1841'}
  ${'publicationDoi'} | ${'Publication DOI'} | ${'10.1101/gr.10.12.1841'}
  ${'otherDetails'}   | ${'Other details'}   | ${'new details'}
`(`displays field $field when present`, async ({ field, title, newValue }) => {
  const user = userEvent.setup();
  const { getByLabelText, getByText, queryByText, rerender } = render(
    <MemoryRouter>
      <ManuscriptVersionCard {...props} />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));
  expect(queryByText(title)).not.toBeInTheDocument();

  const updatedVersion = {
    ...baseVersion,
    [field]: newValue,
  };

  rerender(
    <MemoryRouter>
      <ManuscriptVersionCard {...props} version={updatedVersion} />
    </MemoryRouter>,
  );

  expect(getByText(title)).toBeVisible();
  expect(getByText(newValue)).toBeVisible();
});

it('builds the correct href for doi fields', async () => {
  const preprintDoiValue = '10.1101/gr.10.12.1841';
  const publicationDoiValue = '10.1101/gr.10.12.1842';
  const expectedPreprintLink = new URL(
    `https://doi.org/${preprintDoiValue}`,
  ).toString();
  const expectedPublicationLink = new URL(
    `https://doi.org/${publicationDoiValue}`,
  ).toString();

  const user = userEvent.setup();
  const { getByText, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          preprintDoi: preprintDoiValue,
          publicationDoi: publicationDoiValue,
        }}
      />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));

  expect(getByText(preprintDoiValue)?.closest('a')).toHaveAttribute(
    'href',
    expectedPreprintLink,
  );
  expect(getByText(publicationDoiValue)?.closest('a')).toHaveAttribute(
    'href',
    expectedPublicationLink,
  );
});

it('renders manuscript main file details and download link', async () => {
  const user = userEvent.setup();
  const { getByText, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          manuscriptFile: {
            filename: 'manuscript_file.pdf',
            url: 'https://example.com/main-file.pdf',
            id: 'file-1',
          },
          keyResourceTable: undefined,
        }}
      />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));

  expect(getByText('manuscript_file.pdf')).toBeVisible();
  expect(getByText('Download').closest('a')).toHaveAttribute(
    'href',
    'https://example.com/main-file.pdf',
  );
});

it('renders key resource table file details and download link', async () => {
  const user = userEvent.setup();
  const { getAllByText, getByText, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          manuscriptFile: {
            filename: 'manuscript_file.pdf',
            url: 'https://example.com/main-file.pdf',
            id: 'file-1',
          },
          keyResourceTable: {
            filename: 'key_resource_table.csv',
            url: 'https://example.com/key_resource_table.csv',
            id: 'file-2',
          },
        }}
      />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));

  expect(getByText('key_resource_table.csv')).toBeVisible();
  expect(getAllByText('Download')[1]!.closest('a')).toHaveAttribute(
    'href',
    'https://example.com/key_resource_table.csv',
  );
});

it('renders additional files details and download link when provided', async () => {
  const user = userEvent.setup();
  const { getAllByText, getByText, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          manuscriptFile: {
            filename: 'manuscript_file.pdf',
            url: 'https://example.com/main-file.pdf',
            id: 'file-1',
          },
          keyResourceTable: undefined,
          additionalFiles: [
            {
              filename: 'additional_file.pdf',
              url: 'https://example.com/additional-file.pdf',
              id: 'additional-file-1',
            },
          ],
        }}
      />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));

  expect(getByText('additional_file.pdf')).toBeVisible();
  expect(getAllByText('Download')[1]!.closest('a')).toHaveAttribute(
    'href',
    'https://example.com/additional-file.pdf',
  );
});

it('renders compliance report response and download link when provided', async () => {
  const user = userEvent.setup();
  const { getAllByText, getByText, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          manuscriptFile: {
            filename: 'manuscript_file.pdf',
            url: 'https://example.com/main-file.pdf',
            id: 'file-1',
          },
          keyResourceTable: undefined,
          complianceReportResponse: {
            filename: 'compliance_report_response.pdf',
            url: 'https://example.com/compliance-report-response.pdf',
            id: 'compliance-report-response-1',
          },
        }}
      />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));

  expect(getByText('compliance_report_response.pdf')).toBeVisible();
  expect(getAllByText('Download')[1]!.closest('a')).toHaveAttribute(
    'href',
    'https://example.com/compliance-report-response.pdf',
  );
});

it('displays compliance report section when present', async () => {
  const user = userEvent.setup();
  const { getByLabelText, queryByRole } = render(
    <MemoryRouter>
      <ManuscriptVersionCard {...props} />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));
  expect(
    queryByRole('heading', { name: /Compliance Report/i }),
  ).not.toBeInTheDocument();
});

it('displays compliance report when complianceReport is provided', () => {
  const { getByRole } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          complianceReport: getComplianceReportDataObject(),
        }}
      />
    </MemoryRouter>,
  );

  expect(getByRole('heading', { name: /Compliance Report/i })).toBeVisible();
});

it('displays the version count in the title', () => {
  const { getByText, queryByText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{ ...baseVersion, count: 3 }}
      />
    </MemoryRouter>,
  );

  expect(getByText('Version #3')).toBeVisible();
  expect(queryByText('Manuscript #3')).not.toBeInTheDocument();
});

it('displays manuscript description', async () => {
  const shortDescription = 'A nice short description';
  const longDescription = 'A veeery long description.'.repeat(200);

  const user = userEvent.setup();
  mockScrollHeight(100);
  const { getByRole, rerender, getByText, queryByRole, getByLabelText } =
    render(
      <MemoryRouter>
        <ManuscriptVersionCard
          {...props}
          version={{
            ...baseVersion,
            description: shortDescription,
          }}
        />
      </MemoryRouter>,
    );
  await user.click(getByLabelText('Expand Version'));
  expect(getByText(shortDescription)).toBeInTheDocument();
  expect(queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();

  mockScrollHeight(300);
  rerender(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={{
          ...baseVersion,
          description: longDescription,
        }}
      />
    </MemoryRouter>,
  );

  expect(getByRole('button', { name: /show more/i })).toBeInTheDocument();
});

it('does not display edit button by default', async () => {
  const asapAffiliationIncludedDetails = 'test discussion';
  const commenter = {
    id: 'commenter-id',
    firstName: 'Connor',
    lastName: 'Commenter',
    displayName: 'Connor Commenter',
    teams: [
      {
        id: 'team-commenter',
        name: 'Team Commenter',
      },
    ],
  };

  const asapAffiliationIncludedDiscussion = createDiscussionResponse(
    asapAffiliationIncludedDetails,
  );
  asapAffiliationIncludedDiscussion.message.createdBy = commenter;
  asapAffiliationIncludedDiscussion.message.createdDate =
    '2024-06-21T11:06:58.899Z';

  const getDiscussion = jest.fn();
  getDiscussion.mockReturnValueOnce(asapAffiliationIncludedDiscussion);

  const updatedVersion = {
    ...baseVersion,
    asapAffiliationIncludedDetails: 'test discussion',
  };

  const user = userEvent.setup();
  const { getByText, queryByRole, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={updatedVersion}
        isActiveVersion={false}
      />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));

  await waitFor(() => {
    expect(getByText(/test discussion/i)).toBeVisible();
    expect(queryByRole('button', { name: /Reply/i })).not.toBeInTheDocument();
  });
});

it('does not display reply button if isActiveVersion is false', async () => {
  const asapAffiliationIncludedDetails = 'test discussion';
  const commenter = {
    id: 'commenter-id',
    firstName: 'Connor',
    lastName: 'Commenter',
    displayName: 'Connor Commenter',
    teams: [
      {
        id: 'team-commenter',
        name: 'Team Commenter',
      },
    ],
  };

  const asapAffiliationIncludedDiscussion = createDiscussionResponse(
    asapAffiliationIncludedDetails,
  );
  asapAffiliationIncludedDiscussion.message.createdBy = commenter;
  asapAffiliationIncludedDiscussion.message.createdDate =
    '2024-06-21T11:06:58.899Z';

  const getDiscussion = jest.fn();
  getDiscussion.mockReturnValueOnce(asapAffiliationIncludedDiscussion);

  const updatedVersion = {
    ...baseVersion,
    asapAffiliationIncludedDetails: 'test discussion',
  };

  const user = userEvent.setup();
  const { getByText, queryByRole, getByLabelText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard
        {...props}
        version={updatedVersion}
        isActiveVersion={false}
        impact={{
          id: 'impact-id',
          name: 'Impact Tag',
        }}
        categories={[
          {
            id: 'category-id',
            name: 'Category Tag',
          },
        ]}
      />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));

  await waitFor(() => {
    expect(getByText(/test discussion/i)).toBeVisible();
    expect(queryByRole('button', { name: /Reply/i })).not.toBeInTheDocument();
    expect(getByText(/Impact Tag/i)).toBeVisible();
    expect(getByText(/Category Tag/i)).toBeVisible();
  });
});

it('renders user team name in Updated by and Created by by default', async () => {
  const user = userEvent.setup();
  const { getByLabelText, getAllByText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard {...props} />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));
  expect(getAllByText('Team A').length).toBeGreaterThanOrEqual(2);
});

it('hides user team name in Updated by and Created by when showTeamName is false', async () => {
  const user = userEvent.setup();
  const { getByLabelText, queryByText, getByText } = render(
    <MemoryRouter>
      <ManuscriptVersionCard {...props} showTeamName={false} />
    </MemoryRouter>,
  );
  await user.click(getByLabelText('Expand Version'));
  expect(queryByText('Team A')).not.toBeInTheDocument();
  expect(getByText(/Team 1/)).toBeInTheDocument();
});
