import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManuscriptDiscussion } from '@asap-hub/model';
import { colour } from '../../colors';
import DiscussionCard from '../DiscussionCard';
import { mockActErrorsInConsole } from '../../test-utils';

const mockOnMarkDiscussionAsRead = jest.fn();
const mockDiscussion: ManuscriptDiscussion = {
  id: 'discussion-1',
  title: 'Test Discussion',
  text: 'Test discussion content',
  createdDate: '2024-01-01T00:00:00Z',
  lastUpdatedAt: '2024-01-02T00:00:00Z',
  read: false,
  createdBy: {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    teams: [
      {
        id: 'team-1',
        name: 'Team 1',
      },
    ],
  },
  replies: [
    {
      text: 'Test reply',
      createdDate: '2024-01-01T01:00:00Z',
      createdBy: {
        id: 'user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar2.jpg',
        teams: [
          {
            id: 'team-2',
            name: 'Team 2',
          },
        ],
      },
    },
  ],
};

const mockOnReplyToDiscussion = jest.fn();
const mockHandleFileUpload = jest.fn(() =>
  Promise.resolve({
    id: 'file-id',
    filename: 'test.pdf',
    url: 'https://example.com/test.pdf',
  }),
);

describe('DiscussionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in collapsed state by default', () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
      />,
    );

    expect(screen.getByText('Test Discussion')).toBeInTheDocument();
    expect(screen.getByText('Started by:')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Last Update:/i)).toBeInTheDocument();
    expect(screen.getByText(/2nd January 2024/i)).toBeInTheDocument();
    expect(
      screen.queryByText('Test discussion content'),
    ).not.toBeInTheDocument();
  });

  it('hides the creator team name when showTeamName is false', () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
        showTeamName={false}
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Team 1')).not.toBeInTheDocument();
  });

  it('shows singular reply count when there is one reply', async () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('1 reply')).toBeInTheDocument();
      expect(screen.queryByText('1 replies')).not.toBeInTheDocument();
    });
  });

  it('shows plural reply count when there are multiple replies', async () => {
    const baseReply = mockDiscussion.replies[0];

    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={{
          ...mockDiscussion,
          replies: [
            baseReply!,
            {
              ...baseReply!,
              text: 'Second reply',
              createdDate: '2024-01-01T02:00:00Z',
            },
          ],
        }}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('2 replies')).toBeInTheDocument();
    });
  });

  it('expands when clicking the expand button', async () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Test discussion content')).toBeInTheDocument();
      expect(screen.getByText('Test reply')).toBeInTheDocument();
    });
  });

  it('expands when clicking the avatar plus button', async () => {
    const baseReply = mockDiscussion.replies[0];

    const discussionWithSeveralReplies = {
      ...mockDiscussion,
      replies: [
        {
          ...baseReply,
          text: 'Test reply 1',
          createdDate: '2024-01-01T00:00:00Z',
          createdBy: {
            id: 'user-reply-1',
            firstName: 'Alice',
            lastName: 'Archer',
            displayName: 'Alice Archer',
            avatarUrl: undefined,
            teams: [{ id: 'team-1', name: 'Team 1' }],
          },
        },
        {
          ...baseReply,
          text: 'Test reply 2',
          createdDate: '2024-01-01T01:00:00Z',
          createdBy: {
            id: 'user-reply-2',
            firstName: 'Bob',
            lastName: 'Baker',
            displayName: 'Bob Baker',
            avatarUrl: undefined,
            teams: [{ id: 'team-2', name: 'Team 2' }],
          },
        },
        {
          ...baseReply,
          text: 'Test reply 3',
          createdDate: '2024-01-01T02:00:00Z',
          createdBy: {
            id: 'user-reply-3',
            firstName: 'Charlie',
            lastName: 'Carter',
            displayName: 'Charlie Carter',
            avatarUrl: undefined,
            teams: [{ id: 'team-3', name: 'Team 3' }],
          },
        },
        {
          ...baseReply,
          text: 'Test reply 4',
          createdDate: '2024-01-01T03:00:00Z',
          createdBy: {
            id: 'user-reply-4',
            firstName: 'Dave',
            lastName: 'Davis',
            displayName: 'Dave Davis',
            avatarUrl: undefined,
            teams: [{ id: 'team-4', name: 'Team 4' }],
          },
        },
        {
          ...baseReply,
          text: 'Test reply 5',
          createdDate: '2024-01-01T04:00:00Z',
          createdBy: {
            id: 'user-reply-5',
            firstName: 'Eve',
            lastName: 'Evans',
            displayName: 'Eve Evans',
            avatarUrl: undefined,
            teams: [{ id: 'team-5', name: 'Team 5' }],
          },
        },
        {
          ...baseReply,
          text: 'Test reply 6',
          createdDate: '2024-01-01T05:00:00Z',
          createdBy: {
            id: 'user-reply-6',
            firstName: 'Frank',
            lastName: 'Foster',
            displayName: 'Frank Foster',
            avatarUrl: undefined,
            teams: [{ id: 'team-6', name: 'Team 6' }],
          },
        },
      ],
    };
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={discussionWithSeveralReplies}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
      />,
    );

    [
      'Profile picture of Alice Archer',
      'Profile picture of Bob Baker',
      'Profile picture of Charlie Carter',
      'Profile picture of Dave Davis',
      'Profile picture of Eve Evans',
    ].forEach((text) => {
      expect(screen.getByLabelText(text)).toBeInTheDocument();
    });

    expect(
      screen.queryByText('Test discussion content'),
    ).not.toBeInTheDocument();

    const avatarPlusButton = screen.getByRole('button', {
      name: 'Profile picture placeholder: +1',
    });
    expect(avatarPlusButton).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(avatarPlusButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Test discussion content')).toBeInTheDocument();
    });
  });

  it('collapses when clicking the collapse button', async () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);
    expect(screen.getByText('Test discussion content')).toBeInTheDocument();

    await userEvent.click(expandButton);
    expect(
      screen.queryByText('Test discussion content'),
    ).not.toBeInTheDocument();
  });

  it('displays reply button when displayReplyButton is true', async () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
        displayReplyButton={true}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });
  });

  it('do not display reply button when displayReplyButton is false', async () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
        displayReplyButton={false}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.queryByText('Reply')).not.toBeInTheDocument();
    });
  });

  it('opens reply modal when clicking reply button', async () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
        displayReplyButton={true}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);

    await waitFor(async () => {
      const replyButton = screen.getByText('Reply');
      expect(replyButton).toBeInTheDocument();
      await userEvent.click(replyButton);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('handles reply submission correctly', async () => {
    // Suppress act() warnings from react-hook-form's internal state updates
    const consoleMock = mockActErrorsInConsole();

    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
        displayReplyButton={true}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);
    await waitFor(async () => {
      const replyButton = screen.getByText('Reply');
      expect(replyButton).toBeInTheDocument();
      await userEvent.click(replyButton);
    });

    const textInput = screen.getByTestId('editor');
    await act(async () => {
      await userEvent.click(textInput);
      await userEvent.tab();
      fireEvent.input(textInput, { data: 'test message' });
      await userEvent.tab();
    });
    const saveButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnReplyToDiscussion).toHaveBeenCalledWith(
        'manuscript-1',
        'discussion-1',
        { text: 'test message', manuscriptId: 'manuscript-1', files: [] },
      );
    });

    consoleMock.mockRestore();
  });

  it('renders without replies when displayReplyButton is true', async () => {
    const discussionWithoutReplies = {
      ...mockDiscussion,
      replies: [],
    };

    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={discussionWithoutReplies}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
        displayReplyButton={true}
      />,
    );

    expect(screen.getByText('No replies')).toBeInTheDocument();
    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);
    await waitFor(() => {
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });
  });

  it('renders without replies when displayReplyButton is false', async () => {
    const discussionWithoutReplies = {
      ...mockDiscussion,
      replies: [],
    };

    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={discussionWithoutReplies}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
        displayReplyButton={false}
      />,
    );

    expect(screen.getByText('No replies')).toBeInTheDocument();
    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);
    await waitFor(() => {
      expect(screen.queryByText('Reply')).not.toBeInTheDocument();
    });
  });

  it('applies correct styles for last item', () => {
    const { container } = render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
        isLast={true}
      />,
    );

    const cardElement = container.firstChild;
    expect(cardElement).toHaveStyleRule(
      'border-bottom',
      `1px solid ${colour.border.tertiary}`,
    );
  });

  it('displays team information correctly', async () => {
    render(
      <DiscussionCard
        manuscriptId="manuscript-1"
        discussion={mockDiscussion}
        onReplyToDiscussion={mockOnReplyToDiscussion}
        onMarkDiscussionAsRead={mockOnMarkDiscussionAsRead}
        handleFileUpload={mockHandleFileUpload}
      />,
    );

    const expandButton = screen.getByTestId(
      'discussion-collapsible-button-discussion-1',
    );
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Team 1')).toBeInTheDocument();
    });
  });
});
