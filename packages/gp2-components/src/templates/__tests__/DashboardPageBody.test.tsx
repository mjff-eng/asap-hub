import { gp2 } from '@asap-hub/fixtures';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';
import DashboardPageBody from '../DashboardPageBody';

// Mock react-router's useNavigate
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
}));

const mockStats = {
  sampleCount: 0,
  cohortCount: 0,
  articleCount: 0,
};

let navigateSpy: jest.Mock;

describe('DashboardPageBody', () => {
  beforeEach(() => {
    navigateSpy = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(navigateSpy);
  });
  it('should render GP2 Hub Stats', () => {
    render(
      <MemoryRouter>
        <DashboardPageBody
          canPublish={true}
          reminders={[]}
          news={{ total: 0, items: [] }}
          latestStats={mockStats}
          upcomingEvents={[]}
          totalOfUpcomingEvents={0}
          latestUsers={[]}
          pastEvents={[]}
          totalOfPastEvents={0}
          recentOutputs={[]}
          totalOutputs={0}
          announcements={[]}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'GP2 Hub Stats' }),
    ).toBeVisible();
  });

  it('should render Latest News if there is a news item', () => {
    render(
      <MemoryRouter>
        <DashboardPageBody
          canPublish={true}
          reminders={[]}
          news={gp2.createNewsResponse()}
          latestStats={mockStats}
          upcomingEvents={[]}
          totalOfUpcomingEvents={0}
          latestUsers={[]}
          pastEvents={[]}
          totalOfPastEvents={0}
          recentOutputs={[]}
          totalOutputs={0}
          announcements={[]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Latest News' })).toBeVisible();
  });
  describe('Announcements', () => {
    it('hides the card if there are no announcements', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={gp2.createNewsResponse()}
            latestStats={mockStats}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            latestUsers={[]}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(screen.queryByText('Announcements')).not.toBeInTheDocument();
    });

    it('should render announcements if there is an announcement', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            announcements={[
              {
                id: '123',
                description: 'This is an announcement',
              },
            ]}
            latestUsers={[]}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[]}
            totalOutputs={0}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Announcements' }),
      ).toBeVisible();
      expect(screen.getByText('This is an announcement')).toBeVisible();
      expect(screen.getByText('Latest admin announcements.')).toBeVisible();
    });
  });

  describe('Reminders', () => {
    it.each`
      description                                                | canPublish | selector
      ${'shows no reminders message'}                            | ${true}    | ${/no reminders/i}
      ${'informs other users to contact their project managers'} | ${false}   | ${/anything to share /i}
    `(
      `$description when canPublish is $canPublish`,
      ({ canPublish, selector }) => {
        render(
          <MemoryRouter>
            <DashboardPageBody
              canPublish={canPublish}
              reminders={[]}
              news={{ total: 0, items: [] }}
              latestStats={mockStats}
              upcomingEvents={[]}
              totalOfUpcomingEvents={0}
              announcements={[]}
              latestUsers={[]}
              pastEvents={[]}
              totalOfPastEvents={0}
              recentOutputs={[]}
              totalOutputs={0}
            />
          </MemoryRouter>,
        );
        expect(screen.getByText(selector)).toBeVisible();
      },
    );
  });

  describe('Tools and tutorials', () => {
    it('should not render tools and tutorials if there is no guide', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            latestUsers={[]}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.queryByRole('heading', { name: 'Tools and Tutorials' }),
      ).not.toBeInTheDocument();
    });

    it('should render tools and tutorials if there is a guide', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            latestUsers={[]}
            recentOutputs={[]}
            totalOutputs={0}
            guides={[
              {
                id: '123',
                title: 'Learn Header',
                icon: '://icon.url',
                description: [
                  {
                    id: '2',
                    title: 'Description title',
                    bodyText: 'Learn how to use gp2.',
                  },
                ],
              },
            ]}
            pastEvents={[]}
            totalOfPastEvents={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Tools and Tutorials' }),
      ).toBeVisible();
      expect(screen.getByText('Learn Header')).toBeVisible();
      expect(screen.getByRole('img', { name: 'Learn Header' })).toBeVisible();
    });
  });

  describe('Upcoming Events', () => {
    it('should render no events if there is no upcoming event items', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            latestUsers={[]}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Upcoming Events' }),
      ).toBeVisible();
      expect(screen.getByText('There are no upcoming events.')).toBeVisible();
    });

    it('should render with events if there is an upcoming event item', async () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            upcomingEvents={gp2
              .createListEventResponse(1)
              .items.map((event) => ({
                ...event,
                eventOwner: <div>GP2 Team</div>,
                tags: event.tags.map((k) => k.name),
              }))}
            totalOfUpcomingEvents={1}
            latestUsers={[]}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Upcoming Events' }),
      ).toBeVisible();
      expect(
        await screen.queryByText('There are no upcoming events.'),
      ).not.toBeInTheDocument();
    });

    it('should render View All if there are more than 3 upcoming event items', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            upcomingEvents={gp2
              .createListEventResponse(4)
              .items.map((event) => ({
                ...event,
                eventOwner: <div>GP2 Team</div>,
                tags: event.tags.map((k) => k.name),
              }))}
            totalOfUpcomingEvents={4}
            latestUsers={[]}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Upcoming Events' }),
      ).toBeVisible();
      const viewAllButton = screen.getByTestId('view-upcoming-events');
      expect(viewAllButton).toBeVisible();

      fireEvent.click(viewAllButton);

      expect(navigateSpy).toHaveBeenCalledWith('/events/upcoming');
    });
  });

  describe('Latest Users', () => {
    it('should render users if there is a latest user item', async () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            latestUsers={[
              {
                ...gp2.createUserResponse(),
                displayName: 'John Doe',
              },
              {
                ...gp2.createUserResponse(),
                displayName: 'Octavian Ratiu',
              },
              {
                ...gp2.createUserResponse(),
                displayName: 'User 3',
              },
            ]}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Latest Users' }),
      ).toBeVisible();
      expect(screen.getByText(/John Doe/i)).toBeVisible();
      expect(screen.getByText(/Octavian Ratiu/i)).toBeVisible();
      expect(screen.getByText(/User 3/i)).toBeVisible();
    });

    it('should render View All', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            latestUsers={gp2.createUsersResponse(3).items}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Latest Users' }),
      ).toBeVisible();
      const viewAllButton = screen.getByTestId('view-users');
      expect(viewAllButton).toBeVisible();

      fireEvent.click(viewAllButton);

      expect(navigateSpy).toHaveBeenCalledWith('/users');
    });
  });

  describe('Past Events', () => {
    it('should render past events', async () => {
      const pastEvents = gp2.createListEventResponse(3, {
        customTitle: 'TestEvent',
      }).items;
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            latestUsers={[]}
            pastEvents={pastEvents}
            totalOfPastEvents={1}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Past Events' }),
      ).toBeVisible();
      expect(screen.getByText('TestEvent 1')).toBeVisible();
      expect(
        await screen.queryByTestId('view-past-events'),
      ).not.toBeInTheDocument();
    });

    it('should render View All if there are more than 3 past event items', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            latestUsers={[]}
            pastEvents={gp2.createListEventResponse(4).items}
            totalOfPastEvents={4}
            recentOutputs={[]}
            totalOutputs={0}
            announcements={[]}
          />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole('heading', { name: 'Past Events' }),
      ).toBeVisible();
      const viewAllButton = screen.getByTestId('view-past-events');
      expect(viewAllButton).toBeVisible();

      fireEvent.click(viewAllButton);

      expect(navigateSpy).toHaveBeenCalledWith('/events/past');
    });
  });

  describe('Recent Outputs', () => {
    it('should render outputs if there is any', async () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            latestUsers={[]}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={[
              {
                ...gp2.createOutputResponse(),
                id: 'output-1',
                title: 'Output 1',
                documentType: 'GP2 Reports',
                addedDate: '2023-10-11T09:00:00Z',
              },
              {
                ...gp2.createOutputResponse(),
                id: 'output-2',
                title: 'Output 2',
                documentType: 'Training Materials',
                addedDate: '2023-10-09T09:00:00Z',
              },
            ]}
            totalOutputs={2}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Recent Outputs' }),
      ).toBeVisible();
      expect(screen.getByText('Output 1')).toBeVisible();
      expect(screen.getAllByText('GP2 Reports').length).toBeGreaterThan(0);
      expect(screen.getByText('WED, 11 OCT 2023')).toBeVisible();

      expect(screen.getByText('Output 2')).toBeVisible();
      expect(screen.getAllByText('Training Materials').length).toBeGreaterThan(
        0,
      );
      expect(screen.getByText('MON, 9 OCT 2023')).toBeVisible();
    });

    it('should render View All', () => {
      render(
        <MemoryRouter>
          <DashboardPageBody
            canPublish={true}
            reminders={[]}
            news={{ total: 0, items: [] }}
            latestStats={mockStats}
            latestUsers={[]}
            upcomingEvents={[]}
            totalOfUpcomingEvents={0}
            pastEvents={[]}
            totalOfPastEvents={0}
            recentOutputs={gp2.createListOutputResponse(9).items}
            totalOutputs={9}
            announcements={[]}
          />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Recent Outputs' }),
      ).toBeVisible();
      const viewAllButton = screen.getByTestId('view-outputs');
      expect(viewAllButton).toBeVisible();

      fireEvent.click(viewAllButton);

      expect(navigateSpy).toHaveBeenCalledWith('/outputs');
    });
  });
});
