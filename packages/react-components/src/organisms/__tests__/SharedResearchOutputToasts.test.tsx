import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SharedResearchOutputToasts, {
  SharedResearchOutputToastsProps,
} from '../SharedResearchOutputToasts';

const defaultProps: SharedResearchOutputToastsProps = {
  association: 'working group',
  documentType: 'Article',
  published: false,
  statusChangedBy: undefined,
  toast: undefined,
  reviewToggled: false,
  associationName: 'Association Name',
  isInReview: false,
};

it('should render draft created toast', async () => {
  const { queryByText, getByText, getByRole } = render(
    <SharedResearchOutputToasts {...defaultProps} toast="draftCreated" />,
  );

  const toastText = 'Draft Working Group Article created successfully.';

  expect(getByText(toastText)).toBeInTheDocument();

  const closeButton = getByRole('button');

  await userEvent.click(closeButton);

  await waitFor(() => expect(queryByText(toastText)).toBeNull());
});

test.each`
  associationDisplayableText | association
  ${'Working Group'}         | ${'working group'}
  ${'Team'}                  | ${'team'}
  ${'Project'}               | ${'project'}
`(
  'should render draft created toast for $associationDisplayableText',
  async ({ associationDisplayableText, association }) => {
    const { queryByText, getByText, getByRole } = render(
      <SharedResearchOutputToasts
        {...defaultProps}
        toast="draftCreated"
        association={association}
      />,
    );

    const toastText = `Draft ${associationDisplayableText} Article created successfully.`;

    expect(getByText(toastText)).toBeInTheDocument();

    const closeButton = getByRole('button');

    await userEvent.click(closeButton);

    await waitFor(() => expect(queryByText(toastText)).toBeNull());
  },
);

it('should render review requested toast', async () => {
  const { queryByText, getByText, getByRole } = render(
    <SharedResearchOutputToasts
      {...defaultProps}
      reviewToggled={true}
      statusChangedBy={{
        id: 'user-id',
        firstName: 'First',
        lastName: 'Last',
      }}
      isInReview={true}
    />,
  );

  const toastText =
    'Draft working group Article submitted for PM review successfully.';

  expect(getByText(toastText)).toBeInTheDocument();

  const closeButton = getByRole('button');

  await userEvent.click(closeButton);

  await waitFor(() => expect(queryByText(toastText)).toBeNull());
});

it('should render review dismissed toast', async () => {
  const { queryByText, getByText, getByRole } = render(
    <SharedResearchOutputToasts
      {...defaultProps}
      reviewToggled={true}
      statusChangedBy={undefined}
    />,
  );

  const toastText =
    'In review working group Article switched to draft successfully.';

  expect(getByText(toastText)).toBeInTheDocument();

  const closeButton = getByRole('button');

  await userEvent.click(closeButton);

  await waitFor(() => expect(queryByText(toastText)).toBeNull());
});

it('should render review requested toast with association name', async () => {
  const { getByText } = render(
    <SharedResearchOutputToasts
      {...defaultProps}
      statusChangedBy={{
        id: 'user-id',
        firstName: 'First',
        lastName: 'Last',
      }}
      isInReview={true}
    />,
  );

  expect(
    getByText(
      'First Last on Association Name requested PMs to review this output. This draft is only available to members in the working group listed below.',
    ),
  ).toBeInTheDocument();
});

it('should render published now toast', async () => {
  const { queryByText, getByText, getByRole } = render(
    <SharedResearchOutputToasts
      {...defaultProps}
      published
      toast="published"
    />,
  );

  const toastText = 'Working Group Article published successfully.';

  expect(getByText(toastText)).toBeInTheDocument();

  const closeButton = getByRole('button');

  await userEvent.click(closeButton);

  await waitFor(() => expect(queryByText(toastText)).toBeNull());
});

it('should render only PMs can publish output', async () => {
  const { getByText } = render(
    <SharedResearchOutputToasts
      {...defaultProps}
      statusChangedBy={undefined}
    />,
  );

  expect(
    getByText(
      'This draft is available to members in the working group listed below. Only PMs can publish this output.',
    ),
  ).toBeInTheDocument();
});

describe('project outputs', () => {
  const projectProps: SharedResearchOutputToastsProps = {
    ...defaultProps,
    association: 'project',
    associationName: 'My Project',
  };

  it('renders the review requested toast without mentioning PMs', () => {
    const { getByText } = render(
      <SharedResearchOutputToasts
        {...projectProps}
        reviewToggled
        isInReview
        statusChangedBy={{
          id: 'user-id',
          firstName: 'First',
          lastName: 'Last',
        }}
      />,
    );

    expect(
      getByText('Draft project Article submitted for review successfully.'),
    ).toBeInTheDocument();
  });

  it('asks the project leads to review in the info toast', () => {
    const { getByText } = render(
      <SharedResearchOutputToasts
        {...projectProps}
        isInReview
        statusChangedBy={{
          id: 'user-id',
          firstName: 'First',
          lastName: 'Last',
        }}
      />,
    );

    expect(
      getByText(
        'First Last on My Project requested the project leads to review this output. This draft is only available to members in the project listed below.',
      ),
    ).toBeInTheDocument();
  });

  it('tells only project leads can publish when the project has a lead', () => {
    const { getByText } = render(
      <SharedResearchOutputToasts
        {...projectProps}
        statusChangedBy={undefined}
        projectHasLead
      />,
    );

    expect(
      getByText(
        'This draft is available to members in the project listed below. Only project leads can publish this output.',
      ),
    ).toBeInTheDocument();
  });

  it('tells any project member can publish when the project has no lead', () => {
    const { getByText } = render(
      <SharedResearchOutputToasts
        {...projectProps}
        statusChangedBy={undefined}
        projectHasLead={false}
      />,
    );

    expect(
      getByText(
        'This draft is available to members in the project listed below. Any project member can publish this output.',
      ),
    ).toBeInTheDocument();
  });

  it('asks the project manager to review for a team-based project output', () => {
    const { getByText } = render(
      <SharedResearchOutputToasts
        {...projectProps}
        isTeamBasedProject
        isInReview
        statusChangedBy={{
          id: 'user-id',
          firstName: 'First',
          lastName: 'Last',
        }}
      />,
    );

    expect(
      getByText(
        'First Last on My Project requested the project manager to review this output. This draft is only available to members in the project listed below.',
      ),
    ).toBeInTheDocument();
  });

  it('tells only the project manager can publish for a team-based project output with a project manager', () => {
    const { getByText } = render(
      <SharedResearchOutputToasts
        {...projectProps}
        isTeamBasedProject
        statusChangedBy={undefined}
        projectHasLead
      />,
    );

    expect(
      getByText(
        'This draft is available to members in the project listed below. Only the project manager can publish this output.',
      ),
    ).toBeInTheDocument();
  });

  it('tells any project member can publish for a team-based project output without a project manager', () => {
    const { getByText } = render(
      <SharedResearchOutputToasts
        {...projectProps}
        isTeamBasedProject
        statusChangedBy={undefined}
        projectHasLead={false}
      />,
    );

    expect(
      getByText(
        'This draft is available to members in the project listed below. Any project member can publish this output.',
      ),
    ).toBeInTheDocument();
  });
});

it('should render the supplement grant toast with a link to the supplement', async () => {
  const user = userEvent.setup();
  render(
    <SharedResearchOutputToasts
      {...defaultProps}
      published
      supplementGrantHref="/shared-research/supplement-id"
    />,
  );

  expect(screen.getByText(/This is an original grant proposal/)).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'supplement version' }),
  ).toHaveAttribute('href', '/shared-research/supplement-id');

  await user.click(screen.getByRole('button', { name: 'Close' }));

  expect(
    screen.queryByText(/This is an original grant proposal/),
  ).not.toBeInTheDocument();
});

it('should render the grant ended toast', async () => {
  const user = userEvent.setup();
  const toastText = 'The funding period for this grant has closed.';
  render(<SharedResearchOutputToasts {...defaultProps} published grantEnded />);

  expect(screen.getByText(toastText)).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Close' }));

  expect(screen.queryByText(toastText)).not.toBeInTheDocument();
});
