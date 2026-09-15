import {
  EventHappeningNowReminder,
  EventHappeningTodayReminder,
  FetchRemindersOptions,
  PublishMaterialReminder,
  ResearchOutputDraftReminder,
  ResearchOutputInReviewReminder,
  ResearchOutputPublishedReminder,
  ResearchOutputSwitchToDraftReminder,
  ResearchOutputVersionPublishedReminder,
  SharePresentationReminder,
  UploadPresentationReminder,
} from '@asap-hub/model';
import Reminders, {
  formattedMaterialByEventType,
} from '../../src/controllers/reminder.controller';
import {
  getDiscussionRepliedToByGranteeReminder,
  getDiscussionRepliedToByOpenScienceMemberReminder,
  getDiscussionStartedByGranteeReminder,
  getDiscussionStartedByOpenScienceMemberReminder,
  getEventHappeningNowReminder,
  getEventHappeningTodayReminder,
  getManuscriptCreatedReminder,
  getManuscriptResubmittedReminder,
  getManuscriptStatusUpdatedReminder,
  getNotesUpdatedReminder,
  getPresentationUpdatedReminder,
  getPublishMaterialReminder,
  getReminderResponse,
  getResearchOutputDraftTeamReminder,
  getResearchOutputDraftWorkingGroupReminder,
  getResearchOutputInReviewTeamReminder,
  getResearchOutputPublishedReminder,
  getResearchOutputSwitchToDraftTeamReminder,
  getResearchOutputVersionPublishedReminder,
  getSharePresentationReminder,
  getUploadPresentationReminder,
  getVideoEventUpdatedReminder,
} from '../fixtures/reminders.fixtures';
import { getDataProviderMock } from '../mocks/data-provider.mock';
import { crnMeetingMaterialsDrive } from '../../src/config';

describe('Reminder Controller', () => {
  const reminderDataProviderMock = getDataProviderMock();
  const reminderController = new Reminders(reminderDataProviderMock);

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch method', () => {
    const userId = 'some-user-id';
    const timezone = 'Europe/London';
    const options: FetchRemindersOptions = { userId, timezone };

    test('Should return the reminders', async () => {
      reminderDataProviderMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [getResearchOutputPublishedReminder()],
      });

      const result = await reminderController.fetch(options);

      expect(result).toEqual({ items: [getReminderResponse()], total: 1 });
    });

    test('Should return an empty list when there are no reminders', async () => {
      reminderDataProviderMock.fetch.mockResolvedValueOnce({
        total: 0,
        items: [],
      });
      const result = await reminderController.fetch(options);

      expect(result).toEqual({ items: [], total: 0 });
    });

    test('Should call the data provider with correct parameters', async () => {
      reminderDataProviderMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [getResearchOutputPublishedReminder()],
      });

      await reminderController.fetch(options);

      expect(reminderDataProviderMock.fetch).toBeCalledWith(options);
    });

    describe('Description and href', () => {
      test('Should return the correct description and href for the research-output-version-published team reminder', async () => {
        const researchOutputPublishedReminder =
          getResearchOutputVersionPublishedReminder();
        const reminderDataObject: ResearchOutputVersionPublishedReminder = {
          ...researchOutputPublishedReminder,
          data: {
            ...researchOutputPublishedReminder.data,
            documentType: 'Presentation',
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            publishedAt: '2021-01-01',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            'Team **Team A** published a new team Presentation output version: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-version-published working group reminder', async () => {
        const researchOutputPublishedReminder =
          getResearchOutputVersionPublishedReminder();
        const reminderDataObject: ResearchOutputVersionPublishedReminder = {
          ...researchOutputPublishedReminder,
          data: {
            ...researchOutputPublishedReminder.data,
            documentType: 'Presentation',
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            publishedAt: '2021-01-01',
            associationType: 'working group',
            associationName: 'Working Group 1',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            'Working group **Working Group 1** published a new working group Presentation output version: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-published reminder', async () => {
        const researchOutputPublishedReminder =
          getResearchOutputPublishedReminder();
        const reminderDataObject: ResearchOutputPublishedReminder = {
          ...researchOutputPublishedReminder,
          entity: 'Research Output',
          type: 'Published',
          data: {
            ...researchOutputPublishedReminder.data,
            documentType: 'Presentation',
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            addedDate: '2021-01-01',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            '**Tom Hardy** on team **Team A** published a team Presentation output: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-draft team reminder', async () => {
        const reminder: ResearchOutputDraftReminder = {
          ...getResearchOutputDraftTeamReminder(),
          entity: 'Research Output',
          type: 'Draft',
          data: {
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            createdDate: '2021-01-01',
            createdBy: 'some-user-id',
            associationType: 'team',
            associationName: 'Team 1',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminder],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description: `**${reminder.data.createdBy}** on team **${reminder.data.associationName}** created a draft team output: ${reminder.data.title}.`,
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-draft working group reminder', async () => {
        const reminder: ResearchOutputDraftReminder = {
          ...getResearchOutputDraftWorkingGroupReminder(),
          entity: 'Research Output',
          type: 'Draft',
          data: {
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            createdDate: '2021-01-01',
            createdBy: 'some-user-id',
            associationType: 'working group',
            associationName: 'Working Group 1',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminder],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description: `**${reminder.data.createdBy}** on ${reminder.data.associationType} **${reminder.data.associationName}** created a draft ${reminder.data.associationType} output: ${reminder.data.title}.`,
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-in-review team reminder', async () => {
        const reminder: ResearchOutputInReviewReminder = {
          ...getResearchOutputInReviewTeamReminder(),
          entity: 'Research Output',
          type: 'In Review',
          data: {
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            createdDate: '2021-01-01',
            associationType: 'team',
            associationName: 'Team 1',
            statusChangedBy: 'Some User',
            documentType: 'Article',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminder],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description: `**${reminder.data.statusChangedBy}** on team **${reminder.data.associationName}** requested PMs to review a team ${reminder.data.documentType} output: ${reminder.data.title}.`,
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-in-review working group reminder', async () => {
        const reminder: ResearchOutputInReviewReminder = {
          ...getResearchOutputInReviewTeamReminder(),
          entity: 'Research Output',
          type: 'In Review',
          data: {
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            createdDate: '2021-01-01',
            associationType: 'working group',
            associationName: 'Working Group 1',
            statusChangedBy: 'Some User',
            documentType: 'Article',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminder],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description: `**${reminder.data.statusChangedBy}** on working group **${reminder.data.associationName}** requested PMs to review a working group ${reminder.data.documentType} output: ${reminder.data.title}.`,
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-version-published project reminder', async () => {
        const researchOutputPublishedReminder =
          getResearchOutputVersionPublishedReminder();
        const reminderDataObject: ResearchOutputVersionPublishedReminder = {
          ...researchOutputPublishedReminder,
          data: {
            ...researchOutputPublishedReminder.data,
            documentType: 'Presentation',
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            publishedAt: '2021-01-01',
            associationType: 'project',
            associationName: 'Genetic Determinants of Progression',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            '**Genetic Determinants of Progression** published a new project presentation version: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-published project reminder', async () => {
        const researchOutputPublishedReminder =
          getResearchOutputPublishedReminder();
        const reminderDataObject: ResearchOutputPublishedReminder = {
          ...researchOutputPublishedReminder,
          data: {
            ...researchOutputPublishedReminder.data,
            documentType: 'Presentation',
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            addedDate: '2021-01-01',
            associationType: 'project',
            associationName: 'Genetic Determinants of Progression',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            '**Tom Hardy** published a project presentation for **Genetic Determinants of Progression**: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-draft project reminder', async () => {
        const reminder: ResearchOutputDraftReminder = {
          ...getResearchOutputDraftTeamReminder(),
          entity: 'Research Output',
          type: 'Draft',
          data: {
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            createdDate: '2021-01-01',
            createdBy: 'Tom Hardy',
            associationType: 'project',
            associationName: 'Genetic Determinants of Progression',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminder],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            '**Tom Hardy** updated a draft output for **Genetic Determinants of Progression**: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-in-review project reminder', async () => {
        const reminder: ResearchOutputInReviewReminder = {
          ...getResearchOutputInReviewTeamReminder(),
          entity: 'Research Output',
          type: 'In Review',
          data: {
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            createdDate: '2021-01-01',
            associationType: 'project',
            associationName: 'Genetic Determinants of Progression',
            statusChangedBy: 'Some User',
            documentType: 'Article',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminder],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            '**Some User** requested the PM to review a draft article from **Genetic Determinants of Progression**: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-switch-to-draft project output reminder', async () => {
        const reminder: ResearchOutputSwitchToDraftReminder = {
          ...getResearchOutputSwitchToDraftTeamReminder(),
          data: {
            ...getResearchOutputSwitchToDraftTeamReminder().data,
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            associationType: 'team',
            associationName: 'Team A',
            statusChangedBy: 'Some User',
            documentType: 'Article',
            isProjectOutput: true,
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminder],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            '**Some User** on team **Team A** switched to draft a project article output: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description and href for the research-output-switch-to-draft team reminder', async () => {
        const reminder: ResearchOutputSwitchToDraftReminder = {
          ...getResearchOutputSwitchToDraftTeamReminder(),
          data: {
            ...getResearchOutputSwitchToDraftTeamReminder().data,
            title: 'Some Test title',
            researchOutputId: 'some-research-output-id',
            associationType: 'team',
            associationName: 'Team A',
            statusChangedBy: 'Some User',
            documentType: 'Article',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminder],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            '**Some User** on team **Team A** switched to draft a team Article output: Some Test title.',
          href: `/shared-research/some-research-output-id`,
        });
      });

      test('Should return the correct description, subtext and href for the manuscript created reminder', async () => {
        const reminderDataObject = getManuscriptCreatedReminder();

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            "**Jane Doe** submitted a manuscript for **Team Reminder** and its status is 'Waiting for Report':",
          href: '/compliance/manuscripts/manuscript-id-1',
          subtext: 'Contextual AI models for single-cell protein biology',
        });
      });

      test('Should return the correct description, subtext and href for the manuscript resubmitted reminder', async () => {
        const reminderDataObject = getManuscriptResubmittedReminder();

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            "**John Doe** resubmitted a manuscript for **Team Reminder** and its status changed to 'Manuscript Re-Submitted':",
          href: '/compliance/manuscripts/manuscript-id-1',
          subtext: 'Contextual AI models for single-cell protein biology',
        });
      });

      test('Should return the correct description, subtext and href for the manuscript status changed reminder', async () => {
        const reminderDataObject = getManuscriptStatusUpdatedReminder();

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            '**Jannet Doe** on **Team ASAP** changed a compliance status from Waiting for Report to Review Compliance Report:',
          href: '/compliance/manuscripts/manuscript-id-1',
          subtext: 'Contextual AI models for single-cell protein biology',
        });
      });

      test('Should return the correct description, subtext and href for the discussion started by open science member reminder', async () => {
        const reminderDataObject =
          getDiscussionStartedByOpenScienceMemberReminder();

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);
        expect(items[0]).toMatchObject({
          description:
            '**Tom Hardy** on **Team Reminder** started a discussion on:',
          href: '/compliance/manuscripts/manuscript-id-1?tab=discussions',
          subtext: 'Contextual AI models for single-cell protein biology',
        });
      });

      test('Should omit the association when the manuscript has no resolvable name (started)', async () => {
        const reminderDataObject =
          getDiscussionStartedByOpenScienceMemberReminder();
        reminderDataObject.data.manuscriptTeams = '';

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);
        expect(items[0]).toMatchObject({
          description: '**Tom Hardy** started a discussion on:',
          href: '/compliance/manuscripts/manuscript-id-1?tab=discussions',
        });
      });

      test('Should return the correct description and href for the discussion started by grantee reminder', async () => {
        const reminderDataObject = getDiscussionStartedByGranteeReminder();

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);
        expect(items[0]).toMatchObject({
          description:
            '**Tom Hardy** on **Team Reminder** started a discussion on:',
          href: '/compliance/manuscripts/manuscript-id-1?tab=discussions',
        });
      });

      test('Should return the correct description, subtext and href for the discussion replied to by open science member reminder', async () => {
        const reminderDataObject =
          getDiscussionRepliedToByOpenScienceMemberReminder();

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);
        expect(items[0]).toMatchObject({
          description:
            '**Tom Hardy** on **Team Reminder** replied to a discussion on:',
          href: '/compliance/manuscripts/manuscript-id-1?tab=discussions',
          subtext: 'Contextual AI models for single-cell protein biology',
        });
      });

      test('Should omit the association when the manuscript has no resolvable name (replied)', async () => {
        const reminderDataObject =
          getDiscussionRepliedToByOpenScienceMemberReminder();
        reminderDataObject.data.manuscriptTeams = '';

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);
        expect(items[0]).toMatchObject({
          description: '**Tom Hardy** replied to a discussion on:',
          href: '/compliance/manuscripts/manuscript-id-1?tab=discussions',
        });
      });

      test('Should return the correct description and href for the discussion replied to by grantee reminder', async () => {
        const reminderDataObject = getDiscussionRepliedToByGranteeReminder();

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);
        expect(items[0]).toMatchObject({
          description:
            '**Tom Hardy** on **Team Reminder** replied to a discussion on:',
          href: '/compliance/manuscripts/manuscript-id-1?tab=discussions',
        });
      });

      test('Should return the correct description and href for the event-happening-today reminder', async () => {
        const reminderDataObject: EventHappeningTodayReminder = {
          ...getEventHappeningTodayReminder(),
          data: {
            startDate: '2022-02-28T17:00:00.000Z',
            eventId: 'some-event-id',
            title: 'Some Test Event Title',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description: `Today there is the Some Test Event Title event happening at 5.00 PM.`,
          href: `/events/some-event-id`,
        });
      });

      test('Should return the event-happening-today description with the time formatted for the desired timezone', async () => {
        const reminderDataObject: EventHappeningTodayReminder = {
          ...getEventHappeningTodayReminder(),
          data: {
            startDate: '2022-02-28T17:00:00.000Z',
            eventId: 'some-event-id',
            title: 'Some Test Event Title',
          },
        };

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const timezone = 'America/New_York';
        const { items } = await reminderController.fetch({
          userId,
          timezone,
        });

        expect(items[0]).toMatchObject({
          description: `Today there is the Some Test Event Title event happening at 12.00 PM.`,
          href: `/events/some-event-id`,
        });
      });

      test('Should return the correct description and href for the event-happening-now online event reminder', async () => {
        const reminderDataObject: EventHappeningNowReminder =
          getEventHappeningNowReminder();
        reminderDataObject.data.title = 'Some Test Event Title';
        reminderDataObject.data.eventId = 'some-event-id';

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description: `Some Test Event Title event is happening now! Click here to join the meeting!`,
          href: `/events/some-event-id`,
        });
      });

      test('Should return the correct description and href for the share presentation reminder', async () => {
        const reminderDataObject: SharePresentationReminder =
          getSharePresentationReminder();
        reminderDataObject.data.title = 'Some Test Event Title';
        reminderDataObject.data.eventId = 'some-event-id';

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            "Don't forget to share your presentation for the Some Test Event Title event with your Project Manager.",
          href: `/events/some-event-id`,
        });

        const reminderDataObjectWithPM: SharePresentationReminder =
          getSharePresentationReminder();
        reminderDataObjectWithPM.data.pmId = 'user-pm';

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObjectWithPM],
        });

        const { items: itemsWithPM } = await reminderController.fetch(options);
        expect(itemsWithPM[0]?.href).toBe('/network/users/user-pm');
      });

      test('Should return the correct description for the publish material reminder', async () => {
        const reminderDataObject: PublishMaterialReminder =
          getPublishMaterialReminder();
        reminderDataObject.data.title = 'Some Test Event Title';
        reminderDataObject.data.eventId = 'some-event-id';

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            "It's time to publish the meeting materials for the Some Test Event Title event.",
        });
      });

      test('Should return the correct description and href for the upload presentation reminder', async () => {
        const reminderDataObject: UploadPresentationReminder =
          getUploadPresentationReminder();
        reminderDataObject.data.title = 'Some Test Event Title';
        reminderDataObject.data.eventId = 'some-event-id';

        reminderDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [reminderDataObject],
        });

        const { items } = await reminderController.fetch(options);

        expect(items[0]).toMatchObject({
          description:
            "Don't forget to upload presentations for the Some Test Event Title event in the ASAP CRN Meeting Materials Drive.",
          href: crnMeetingMaterialsDrive,
        });
      });

      test.each`
        reminderType      | reminderDataObject                  | expectedDescription
        ${'Video'}        | ${getVideoEventUpdatedReminder()}   | ${'Video(s) for Some Test Event Title event has been shared.'}
        ${'Presentation'} | ${getPresentationUpdatedReminder()} | ${'Presentation(s) for Some Test Event Title event has been shared.'}
        ${'Notes'}        | ${getNotesUpdatedReminder()}        | ${'Notes for Some Test Event Title event has been shared.'}
      `(
        'Should return the correct description and href for the $reminderType reminder',
        async ({ reminderDataObject, expectedDescription }) => {
          reminderDataObject.data.title = 'Some Test Event Title';
          reminderDataObject.data.eventId = 'some-event-id';

          reminderDataProviderMock.fetch.mockResolvedValueOnce({
            total: 1,
            items: [reminderDataObject],
          });

          const { items } = await reminderController.fetch(options);

          expect(items[0]).toMatchObject({
            description: expectedDescription,
            href: `/events/some-event-id`,
          });
        },
      );
    });
  });

  describe('formattedMaterialByEventType', () => {
    test('Should return formatted Material by reminder event type', () => {
      let material = formattedMaterialByEventType('Notes Updated');
      expect(material).toBe('Notes');

      material = formattedMaterialByEventType('Video Updated');
      expect(material).toBe('Video(s)');

      material = formattedMaterialByEventType('Presentation Updated');
      expect(material).toBe('Presentation(s)');

      expect(() =>
        formattedMaterialByEventType('Happening Today'),
      ).toThrowError(`Unknown Material Event`);
    });
  });
});
