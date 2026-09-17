import { FetchRemindersOptions } from '@asap-hub/model';
import {
  FETCH_MILESTONE_REMINDER_PROJECTS,
  FETCH_MILESTONE_REMINDERS,
  FetchRemindersQuery,
} from '@asap-hub/contentful';
import { getReferenceDates } from '@asap-hub/server-common';
import { DateTime } from 'luxon';

import {
  getMilestoneProjectFilter,
  MilestoneItem,
  MilestoneProjectItem,
  ReminderContentfulDataProvider,
} from '../../../../src/data-providers/contentful/reminder.data-provider';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';
import logger from '../../../../src/utils/logger';
import {
  getContentfulReminderMilestoneCollectionItem,
  getContentfulReminderMilestoneProjectCollectionItem,
  getContentfulReminderUsersContent,
  getMilestoneCreatedReminder,
  getMilestoneOutputsLinkedReminder,
  getMilestoneStatusUpdatedReminder,
} from '../../../fixtures/reminders.fixtures';

describe('Reminders data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();

  const remindersDataProvider = new ReminderContentfulDataProvider(
    contentfulGraphqlClientMock,
  );

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(
      DateTime.fromISO(
        getContentfulReminderMilestoneCollectionItem()!.sys.firstPublishedAt,
      )
        .plus({ days: 1 })
        .toJSDate(),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch milestone reminders', () => {
    const timezone = 'Europe/London';
    const fetchOptions = (userId: string): FetchRemindersOptions => ({
      userId,
      timezone,
    });

    const getUserInTeam = (role: string): FetchRemindersQuery['users'] => {
      const user = getContentfulReminderUsersContent();
      user!.teamsCollection = {
        items: [{ role, team: { sys: { id: 'reminder-team' } } }],
      };
      return user;
    };

    const mockGraphqlResponse = ({
      milestones = [getContentfulReminderMilestoneCollectionItem()],
      projects = [getContentfulReminderMilestoneProjectCollectionItem()],
      user = getUserInTeam('Project Manager'),
    }: {
      milestones?: (MilestoneItem | null)[];
      projects?: (MilestoneProjectItem | null)[];
      user?: FetchRemindersQuery['users'];
    } = {}) => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: user,
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        discussionsCollection: { items: [] },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        messagesCollection: { items: [] },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        milestonesCollection: { items: milestones },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projectsCollection: { items: projects },
      });
    };

    const republishedSys = {
      ...getContentfulReminderMilestoneCollectionItem()!.sys,
      publishedAt: '2025-01-08T10:00:00.500Z',
    };

    const getStatusUpdatedMilestone = (): MilestoneItem => ({
      ...getContentfulReminderMilestoneCollectionItem()!,
      sys: republishedSys,
      status: 'Complete',
      statusUpdatedAt: '2025-01-08T10:00:00.000Z',
      statusUpdatedBy: { sys: { id: 'status-updater-user' } },
    });

    const getOutputsLinkedMilestone = (): MilestoneItem => ({
      ...getContentfulReminderMilestoneCollectionItem()!,
      sys: republishedSys,
      relatedArticlesCollection: { total: 2 },
      outputsLinkedAt: '2025-01-08T10:00:00.000Z',
      outputsLinkedBy: {
        sys: { id: 'outputs-linker-user' },
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    describe('Querying', () => {
      test('fetches milestones from the last 7 days with a dedicated query', async () => {
        mockGraphqlResponse();

        await remindersDataProvider.fetch(fetchOptions('user-id'));

        const { last7DaysISO } = getReferenceDates(timezone);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          4,
          FETCH_MILESTONE_REMINDERS,
          {
            milestoneFilter: {
              OR: [
                {
                  AND: [
                    { sys: { firstPublishedAt_gte: last7DaysISO } },
                    {
                      OR: [
                        { bulkImported: false },
                        { bulkImported_exists: false },
                      ],
                    },
                  ],
                },
                { statusUpdatedAt_gte: last7DaysISO },
                { outputsLinkedAt_gte: last7DaysISO },
              ],
            },
            limit: 100,
            skip: 0,
          },
        );
      });

      test('fetches the projects of the milestone aims and supplement grants', async () => {
        const milestone = getContentfulReminderMilestoneCollectionItem()!;
        milestone.linkedFrom!.aimsCollection!.items.push({
          sys: { id: 'supplement-aim-id' },
          linkedFrom: {
            supplementGrantCollection: {
              items: [{ sys: { id: 'supplement-grant-id' } }],
            },
          },
        });
        mockGraphqlResponse({ milestones: [milestone] });

        await remindersDataProvider.fetch(fetchOptions('user-id'));

        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          5,
          FETCH_MILESTONE_REMINDER_PROJECTS,
          {
            limit: 100,
            skip: 0,
            projectFilter: {
              OR: [
                {
                  originalGrantAims: {
                    sys: { id_in: ['aim-id-2', 'supplement-aim-id'] },
                  },
                },
                {
                  supplementGrant: { sys: { id_in: ['supplement-grant-id'] } },
                },
              ],
            },
          },
        );
      });

      test('pages through milestones and projects until every item is fetched', async () => {
        const secondMilestone = {
          ...getContentfulReminderMilestoneCollectionItem()!,
          sys: {
            ...getContentfulReminderMilestoneCollectionItem()!.sys,
            id: 'milestone-id-2',
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: getUserInTeam('Project Manager'),
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: { items: [] },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: { items: [] },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          milestonesCollection: {
            total: 2,
            items: [getContentfulReminderMilestoneCollectionItem()],
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          milestonesCollection: { total: 2, items: [secondMilestone] },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projectsCollection: {
            total: 1,
            items: [getContentfulReminderMilestoneProjectCollectionItem()],
          },
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          5,
          FETCH_MILESTONE_REMINDERS,
          expect.objectContaining({ limit: 100, skip: 1 }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(6);
        expect(result.items.map((reminder) => reminder.id)).toEqual([
          'milestone-created-milestone-id-1',
          'milestone-created-milestone-id-2',
        ]);
      });

      test('does not fetch projects when there are no milestones', async () => {
        mockGraphqlResponse({ milestones: [] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([]);
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(4);
      });

      test('surfaces milestone query failures', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: getUserInTeam('Project Manager'),
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: { items: [] },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: { items: [] },
        });
        contentfulGraphqlClientMock.request.mockRejectedValueOnce(
          new Error('Query cannot be executed'),
        );

        await expect(
          remindersDataProvider.fetch(fetchOptions('user-id')),
        ).rejects.toThrow('Query cannot be executed');
      });

      test('returns no project filter for milestones without aims', () => {
        expect(getMilestoneProjectFilter([])).toBeNull();
      });
    });

    describe('Missing data', () => {
      test.each`
        description                                       | milestone
        ${'the milestone is null'}                        | ${null}
        ${'the milestone is not published'}               | ${{ ...getContentfulReminderMilestoneCollectionItem(), sys: { id: 'milestone-id-1', firstPublishedAt: null } }}
        ${'the milestone is not linked to a project aim'} | ${{ ...getContentfulReminderMilestoneCollectionItem(), linkedFrom: { aimsCollection: { total: 1, items: [{ sys: { id: 'unknown-aim' }, linkedFrom: null }] } } }}
      `(
        'does not return a reminder when $description',
        async ({ milestone }) => {
          mockGraphqlResponse({ milestones: [milestone] });

          const result = await remindersDataProvider.fetch(
            fetchOptions('user-id'),
          );

          expect(result.items).toEqual([]);
        },
      );

      test('does not return a reminder for a discovery project without a funded team', async () => {
        const project = getContentfulReminderMilestoneProjectCollectionItem()!;
        project.membersCollection = {
          total: 1,
          items: [
            {
              role: 'Project Manager',
              projectMember: { __typename: 'Users', sys: { id: 'user-id' } },
            },
          ],
        };
        mockGraphqlResponse({ projects: [project] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([]);
      });

      test('does not return a reminder when the project type is unknown', async () => {
        const project = getContentfulReminderMilestoneProjectCollectionItem()!;
        project.projectType = 'Unknown Project';
        mockGraphqlResponse({ projects: [project] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([]);
      });
    });

    describe('Milestone created', () => {
      test.each`
        role
        ${'Project Manager'}
        ${'Lead PI (Core Leadership)'}
        ${'Co-PI (Core Leadership)'}
        ${'Collaborating PI'}
        ${'Key Personnel'}
      `(
        'the project team member with role $role sees the reminder',
        async ({ role }) => {
          mockGraphqlResponse({ user: getUserInTeam(role) });

          const result = await remindersDataProvider.fetch(
            fetchOptions('user-id'),
          );

          expect(result.items).toEqual([getMilestoneCreatedReminder()]);
        },
      );

      test('the scientific facilitator sees the reminder without being in the team', async () => {
        const user = getContentfulReminderUsersContent();
        user!.teamsCollection = { items: [] };
        mockGraphqlResponse({ user });

        const result = await remindersDataProvider.fetch(
          fetchOptions('scientific-facilitator-user'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('a user outside the project team does not see the reminder', async () => {
        const user = getContentfulReminderUsersContent();
        user!.teamsCollection = {
          items: [
            { role: 'Project Manager', team: { sys: { id: 'other-team' } } },
          ],
        };
        mockGraphqlResponse({ user });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([]);
      });

      test('the user who created the milestone does not see the reminder', async () => {
        mockGraphqlResponse();

        const result = await remindersDataProvider.fetch(
          fetchOptions('milestone-creator-user'),
        );

        expect(result.items).toEqual([]);
      });

      test('bulk imported milestones do not generate a reminder', async () => {
        const milestone = getContentfulReminderMilestoneCollectionItem()!;
        milestone.bulkImported = true;
        mockGraphqlResponse({ milestones: [milestone] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([]);
      });

      test('milestones created more than 7 days ago do not generate a reminder', async () => {
        jest.setSystemTime(
          DateTime.fromISO('2025-01-07T16:21:33.824Z')
            .plus({ days: 8 })
            .toJSDate(),
        );
        mockGraphqlResponse();

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([]);
      });

      test('lists the numbers of every linked aim, comma separated', async () => {
        const milestone = getContentfulReminderMilestoneCollectionItem()!;
        milestone.linkedFrom!.aimsCollection!.items.push({
          sys: { id: 'aim-id-1' },
          linkedFrom: { supplementGrantCollection: { items: [] } },
        });
        mockGraphqlResponse({ milestones: [milestone] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items[0]!.data).toMatchObject({ aimNumbers: [1, 2] });
      });

      test('numbers supplement grant aims by their position in the supplement grant', async () => {
        const milestone = getContentfulReminderMilestoneCollectionItem()!;
        milestone.linkedFrom = {
          aimsCollection: {
            total: 1,
            items: [
              {
                sys: { id: 'supplement-aim-id' },
                linkedFrom: {
                  supplementGrantCollection: {
                    items: [{ sys: { id: 'supplement-grant-id' } }],
                  },
                },
              },
            ],
          },
        };
        const project = getContentfulReminderMilestoneProjectCollectionItem()!;
        project.supplementGrant = {
          aimsCollection: {
            total: 2,
            items: [
              { sys: { id: 'other-supplement-aim' } },
              { sys: { id: 'supplement-aim-id' } },
            ],
          },
        };
        mockGraphqlResponse({ milestones: [milestone], projects: [project] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items[0]!.data).toMatchObject({
          aimNumbers: [2],
          grantType: 'supplement',
        });
      });

      describe('projects without a funded team', () => {
        const getUserBasedProject = (
          projectType: string,
          role: string,
        ): MilestoneProjectItem => ({
          ...getContentfulReminderMilestoneProjectCollectionItem()!,
          projectType,
          membersCollection: {
            total: 1,
            items: [
              {
                role,
                projectMember: {
                  __typename: 'Users',
                  sys: { id: 'user-id' },
                },
              },
            ],
          },
        });

        test.each`
          projectType           | role
          ${'Resource Project'} | ${'Lead PI'}
          ${'Resource Project'} | ${'Key Personnel'}
          ${'Trainee Project'}  | ${'Independent Project - Lead'}
          ${'Trainee Project'}  | ${'Independent Project - Mentor'}
        `(
          'the $projectType member with role $role sees the reminder',
          async ({ projectType, role }) => {
            mockGraphqlResponse({
              projects: [getUserBasedProject(projectType, role)],
              user: getUserInTeam('Collaborating PI'),
            });

            const result = await remindersDataProvider.fetch(
              fetchOptions('user-id'),
            );

            expect(result.items).toMatchObject([
              { type: 'Milestone Created', data: { projectType } },
            ]);
          },
        );

        test('a trainee project member without a recognised role does not see the reminder', async () => {
          mockGraphqlResponse({
            projects: [getUserBasedProject('Trainee Project', '')],
            user: getUserInTeam('Collaborating PI'),
          });

          const result = await remindersDataProvider.fetch(
            fetchOptions('user-id'),
          );

          expect(result.items).toEqual([]);
        });
      });
    });

    describe('Milestone status updated', () => {
      test.each`
        role
        ${'Project Manager'}
        ${'Lead PI (Core Leadership)'}
        ${'Co-PI (Core Leadership)'}
        ${'Data Manager'}
      `(
        'the project lead with role $role sees the reminder',
        async ({ role }) => {
          mockGraphqlResponse({
            milestones: [getStatusUpdatedMilestone()],
            user: getUserInTeam(role),
          });

          const result = await remindersDataProvider.fetch(
            fetchOptions('user-id'),
          );

          expect(result.items).toContainEqual(
            getMilestoneStatusUpdatedReminder(),
          );
        },
      );

      test('the scientific facilitator sees the reminder', async () => {
        mockGraphqlResponse({
          milestones: [getStatusUpdatedMilestone()],
          user: getUserInTeam('Collaborating PI'),
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('scientific-facilitator-user'),
        );

        expect(result.items).toContainEqual(
          getMilestoneStatusUpdatedReminder(),
        );
      });

      test('a project member who is not a lead does not see the reminder', async () => {
        mockGraphqlResponse({
          milestones: [getStatusUpdatedMilestone()],
          user: getUserInTeam('Collaborating PI'),
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('the user who updated the status does not see the reminder', async () => {
        mockGraphqlResponse({ milestones: [getStatusUpdatedMilestone()] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('status-updater-user'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('returns the reminder when the milestone is terminated', async () => {
        mockGraphqlResponse({
          milestones: [
            { ...getStatusUpdatedMilestone(), status: 'Terminated' },
          ],
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toContainEqual({
          ...getMilestoneStatusUpdatedReminder(),
          data: {
            ...getMilestoneStatusUpdatedReminder().data,
            status: 'Terminated',
          },
        });
      });

      test('returns both reminders when the milestone was created and completed in the same week', async () => {
        mockGraphqlResponse({ milestones: [getStatusUpdatedMilestone()] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([
          getMilestoneStatusUpdatedReminder(),
          getMilestoneCreatedReminder(),
        ]);
      });

      test.each`
        status
        ${'Pending'}
        ${'In Progress'}
      `(
        'does not return the reminder when the status changed to $status',
        async ({ status }) => {
          mockGraphqlResponse({
            milestones: [{ ...getStatusUpdatedMilestone(), status }],
          });

          const result = await remindersDataProvider.fetch(
            fetchOptions('user-id'),
          );

          expect(result.items).toEqual([getMilestoneCreatedReminder()]);
        },
      );

      test('does not return the reminder when the status was set on creation', async () => {
        const milestone = getContentfulReminderMilestoneCollectionItem()!;
        milestone.status = 'Complete';
        mockGraphqlResponse({ milestones: [milestone] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('treats the status as set on creation when the milestone was never republished, even if the audit clock ran ahead', async () => {
        const milestone = getContentfulReminderMilestoneCollectionItem()!;
        milestone.status = 'Complete';
        milestone.statusUpdatedAt = '2025-01-07T16:21:35.000Z';
        mockGraphqlResponse({ milestones: [milestone] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('does not return the reminder when the status changed more than 7 days ago', async () => {
        jest.setSystemTime(
          DateTime.fromISO('2025-01-08T10:00:00.000Z')
            .plus({ days: 8 })
            .toJSDate(),
        );
        mockGraphqlResponse({ milestones: [getStatusUpdatedMilestone()] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([]);
      });
    });

    describe('Milestone outputs linked', () => {
      test('the project lead sees the reminder', async () => {
        mockGraphqlResponse({ milestones: [getOutputsLinkedMilestone()] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([
          getMilestoneOutputsLinkedReminder(),
          getMilestoneCreatedReminder(),
        ]);
      });

      test('the scientific facilitator sees the reminder', async () => {
        mockGraphqlResponse({
          milestones: [getOutputsLinkedMilestone()],
          user: getUserInTeam('Collaborating PI'),
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('scientific-facilitator-user'),
        );

        expect(result.items).toContainEqual(
          getMilestoneOutputsLinkedReminder(),
        );
      });

      test('a project member who is not a lead does not see the reminder', async () => {
        mockGraphqlResponse({
          milestones: [getOutputsLinkedMilestone()],
          user: getUserInTeam('Collaborating PI'),
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('the user who linked the outputs does not see the reminder', async () => {
        mockGraphqlResponse({ milestones: [getOutputsLinkedMilestone()] });

        const result = await remindersDataProvider.fetch(
          fetchOptions('outputs-linker-user'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('does not return the reminder when the milestone has no linked outputs', async () => {
        mockGraphqlResponse({
          milestones: [
            {
              ...getOutputsLinkedMilestone(),
              relatedArticlesCollection: { total: 0 },
            },
          ],
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('does not return the reminder when the linking user is unknown', async () => {
        mockGraphqlResponse({
          milestones: [
            { ...getOutputsLinkedMilestone(), outputsLinkedBy: null },
          ],
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });

      test('does not return the reminder when the outputs were linked on creation', async () => {
        mockGraphqlResponse({
          milestones: [
            {
              ...getOutputsLinkedMilestone(),
              outputsLinkedAt: '2025-01-07T16:21:32.000Z',
            },
          ],
        });

        const result = await remindersDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
      });
    });

    describe('Truncated nested collections', () => {
      const alerts = { error: jest.fn() };
      const alertingDataProvider = new ReminderContentfulDataProvider(
        contentfulGraphqlClientMock,
        alerts,
      );

      test('logs, alerts and still returns reminders when a project collection is truncated', async () => {
        const loggerErrorSpy = jest.spyOn(logger, 'error');
        const project = getContentfulReminderMilestoneProjectCollectionItem()!;
        project.membersCollection!.total = 101;
        mockGraphqlResponse({ projects: [project] });

        const result = await alertingDataProvider.fetch(
          fetchOptions('user-id'),
        );

        expect(result.items).toEqual([getMilestoneCreatedReminder()]);
        const details = {
          entryId: 'project-id-1',
          collection: 'members',
          total: 101,
          fetched: 1,
        };
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Reminder query returned a truncated collection',
          details,
        );
        expect(alerts.error).toHaveBeenCalledWith(
          new Error(
            `Reminder query returned a truncated collection: ${JSON.stringify(
              details,
            )}`,
          ),
        );
      });

      test('reports truncated aim links of a milestone', async () => {
        const milestone = getContentfulReminderMilestoneCollectionItem()!;
        milestone.linkedFrom!.aimsCollection!.total = 11;
        mockGraphqlResponse({ milestones: [milestone] });

        await alertingDataProvider.fetch(fetchOptions('user-id'));

        expect(alerts.error).toHaveBeenCalledTimes(1);
        expect(alerts.error.mock.calls[0]![0].message).toEqual(
          expect.stringContaining(
            '"entryId":"milestone-id-1","collection":"aims"',
          ),
        );
      });

      test('does not report complete collections', async () => {
        mockGraphqlResponse();

        await alertingDataProvider.fetch(fetchOptions('user-id'));

        expect(alerts.error).not.toHaveBeenCalled();
      });
    });
  });
});
