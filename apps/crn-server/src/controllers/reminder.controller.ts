import { DateTime } from 'luxon';
import {
  compliance,
  events,
  network,
  projectRouteByType,
  sharedResearch,
} from '@asap-hub/routing';
import {
  EventReminderType,
  FetchRemindersOptions,
  GrantType,
  ListReminderResponse,
  ProjectType,
} from '@asap-hub/model';
import { capitalizeFirstLetter } from '@asap-hub/server-common';
import { ReminderDataProvider } from '../data-providers/types';
import { crnMeetingMaterialsDrive } from '../config';

export const formattedMaterialByEventType = (
  type: EventReminderType,
): string => {
  switch (type) {
    case 'Notes Updated':
      return 'Notes';
    case 'Video Updated':
      return 'Video(s)';
    case 'Presentation Updated':
      return 'Presentation(s)';
    default:
      throw new Error('Unknown Material Event');
  }
};

const discussionTeamPrefix = (teams: string): string =>
  teams ? ` on **${teams}**` : '';

const getMilestonesTabHref = (
  projectType: ProjectType,
  projectId: string,
  grantType: GrantType,
): string =>
  `${
    projectRouteByType[projectType](projectId).milestones({}).$
  }?grantType=${grantType}`;

export default class ReminderController {
  constructor(private reminderDataProvider: ReminderDataProvider) {}

  async fetch(options: FetchRemindersOptions): Promise<ListReminderResponse> {
    const reminders = await this.reminderDataProvider.fetch(options);

    return {
      total: reminders.total,
      items: reminders.items.map((reminder) => {
        if (
          reminder.entity === 'Research Output Version' &&
          reminder.type === 'Published'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: sharedResearch({}).researchOutput({
              researchOutputId: reminder.data.researchOutputId,
            }).$,
            description:
              reminder.data.associationType === 'project'
                ? `**${
                    reminder.data.associationName
                  }** published a new project ${reminder.data.documentType.toLowerCase()} version: ${
                    reminder.data.title
                  }.`
                : `${capitalizeFirstLetter(reminder.data.associationType)} **${
                    reminder.data.associationName
                  }** published a new ${reminder.data.associationType} ${
                    reminder.data.documentType
                  } output version: ${reminder.data.title}.`,
          };
        }
        if (
          reminder.entity === 'Research Output' &&
          reminder.type === 'Published'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: sharedResearch({}).researchOutput({
              researchOutputId: reminder.data.researchOutputId,
            }).$,
            description:
              reminder.data.associationType === 'project'
                ? `**${
                    reminder.data.statusChangedBy
                  }** published a project ${reminder.data.documentType.toLowerCase()} for **${
                    reminder.data.associationName
                  }**: ${reminder.data.title}.`
                : `**${reminder.data.statusChangedBy}** on ${reminder.data.associationType} **${reminder.data.associationName}** published a ${reminder.data.associationType} ${reminder.data.documentType} output: ${reminder.data.title}.`,
          };
        }

        if (
          reminder.entity === 'Research Output' &&
          reminder.type === 'Draft'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: sharedResearch({}).researchOutput({
              researchOutputId: reminder.data.researchOutputId,
            }).$,
            description:
              reminder.data.associationType === 'project'
                ? `**${reminder.data.createdBy}** updated a draft output for **${reminder.data.associationName}**: ${reminder.data.title}.`
                : `**${reminder.data.createdBy}** on ${reminder.data.associationType} **${reminder.data.associationName}** created a draft ${reminder.data.associationType} output: ${reminder.data.title}.`,
          };
        }

        if (
          reminder.entity === 'Research Output' &&
          reminder.type === 'In Review'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: sharedResearch({}).researchOutput({
              researchOutputId: reminder.data.researchOutputId,
            }).$,
            description:
              reminder.data.associationType === 'project'
                ? `**${
                    reminder.data.statusChangedBy
                  }** requested the PM to review a draft ${reminder.data.documentType.toLowerCase()} from **${
                    reminder.data.associationName
                  }**: ${reminder.data.title}.`
                : `**${reminder.data.statusChangedBy}** on ${reminder.data.associationType} **${reminder.data.associationName}** requested PMs to review a ${reminder.data.associationType} ${reminder.data.documentType} output: ${reminder.data.title}.`,
          };
        }

        if (
          reminder.entity === 'Research Output' &&
          reminder.type === 'Switch To Draft'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: sharedResearch({}).researchOutput({
              researchOutputId: reminder.data.researchOutputId,
            }).$,
            description: `**${reminder.data.statusChangedBy}** on ${
              reminder.data.associationType
            } **${reminder.data.associationName}** switched to draft a ${
              reminder.data.isProjectOutput
                ? `project ${reminder.data.documentType.toLowerCase()}`
                : `${reminder.data.associationType} ${reminder.data.documentType}`
            } output: ${reminder.data.title}.`,
          };
        }

        if (
          reminder.entity === 'Manuscript' &&
          reminder.type === 'Manuscript Created'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: compliance({}).manuscript({
              manuscriptId: reminder.data.manuscriptId,
            }).$,
            description: `**${reminder.data.createdBy}** submitted a manuscript for **${reminder.data.teams}** and its status is 'Waiting for Report':`,
            subtext: reminder.data.title,
            date: reminder.data.publishedAt,
          };
        }

        if (
          reminder.entity === 'Manuscript' &&
          reminder.type === 'Manuscript Resubmitted'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: compliance({}).manuscript({
              manuscriptId: reminder.data.manuscriptId,
            }).$,
            description: `**${reminder.data.resubmittedBy}** resubmitted a manuscript for **${reminder.data.teams}** and its status changed to 'Manuscript Re-Submitted':`,
            subtext: reminder.data.title,
            date: reminder.data.resubmittedAt,
          };
        }

        if (
          reminder.entity === 'Manuscript' &&
          reminder.type === 'Manuscript Status Updated'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: compliance({}).manuscript({
              manuscriptId: reminder.data.manuscriptId,
            }).$,
            description: `**${reminder.data.updatedBy}** on **${reminder.data.teams}** changed a compliance status from ${reminder.data.previousStatus} to ${reminder.data.status}:`,
            subtext: reminder.data.title,
            date: reminder.data.updatedAt,
          };
        }

        if (reminder.entity === 'Discussion') {
          const isCreated =
            reminder.type === 'Discussion Created by Grantee' ||
            reminder.type === 'Discussion Created by Open Science Member';
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: `${
              compliance({}).manuscript({
                manuscriptId: reminder.data.manuscriptId,
              }).$
            }?tab=discussions`,
            description: `**${reminder.data.createdBy}**${discussionTeamPrefix(
              reminder.data.manuscriptTeams,
            )} ${
              isCreated
                ? 'started a discussion on:'
                : 'replied to a discussion on:'
            }`,
            subtext: reminder.data.title,
            date: reminder.data.publishedAt,
          };
        }

        if (reminder.entity === 'Milestone') {
          const href = getMilestonesTabHref(
            reminder.data.projectType,
            reminder.data.projectId,
            reminder.data.grantType,
          );
          const aims = `Aim(s) ${reminder.data.aimNumbers}`;

          if (reminder.type === 'Milestone Created') {
            return {
              id: reminder.id,
              entity: reminder.entity,
              href,
              description: `A new milestone has been added for **${reminder.data.projectName}**: Aim ${reminder.data.aimNumbers}. The milestone has been linked to their corresponding Aim(s) and is now available in the Milestones tab.`,
              date: reminder.data.createdAt,
            };
          }

          if (reminder.type === 'Milestone Status Updated') {
            return {
              id: reminder.id,
              entity: reminder.entity,
              href,
              description: `A milestone for **${reminder.data.projectName}** was marked as ${reminder.data.status} (${aims}).`,
              date: reminder.data.statusUpdatedAt,
            };
          }

          return {
            id: reminder.id,
            entity: reminder.entity,
            href,
            description: `**${reminder.data.outputsLinkedBy}** linked outputs to a milestone on **${reminder.data.projectName}**: ${reminder.data.milestoneName} (${aims}).`,
            date: reminder.data.outputsLinkedAt,
          };
        }

        if (
          reminder.entity === 'Event' &&
          reminder.type === 'Happening Today'
        ) {
          const startTime = DateTime.fromISO(reminder.data.startDate)
            .setZone(options.timezone)
            .toFormat('h.mm a');

          return {
            id: reminder.id,
            entity: reminder.entity,
            href: events({}).event({
              eventId: reminder.data.eventId,
            }).$,
            description: `Today there is the ${reminder.data.title} event happening at ${startTime}.`,
          };
        }

        if (
          reminder.entity === 'Event' &&
          reminder.type === 'Share Presentation'
        ) {
          const href = reminder.data.pmId
            ? network({}).users({}).user({ userId: reminder.data.pmId }).$
            : events({}).event({
                eventId: reminder.data.eventId,
              }).$;
          return {
            id: reminder.id,
            entity: reminder.entity,
            href,
            description: `Don't forget to share your presentation for the ${reminder.data.title} event with your Project Manager.`,
          };
        }

        if (
          reminder.entity === 'Event' &&
          reminder.type === 'Publish Material'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            description: `It's time to publish the meeting materials for the ${reminder.data.title} event.`,
          };
        }

        if (
          reminder.entity === 'Event' &&
          reminder.type === 'Upload Presentation'
        ) {
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: crnMeetingMaterialsDrive,
            description: `Don't forget to upload presentations for the ${reminder.data.title} event in the ASAP CRN Meeting Materials Drive.`,
          };
        }

        if (
          reminder.entity === 'Event' &&
          ['Video Updated', 'Presentation Updated', 'Notes Updated'].includes(
            reminder.type,
          )
        ) {
          const description = `${formattedMaterialByEventType(
            reminder.type,
          )} for ${reminder.data.title} event has been shared.`;
          return {
            id: reminder.id,
            entity: reminder.entity,
            href: events({}).event({
              eventId: reminder.data.eventId,
            }).$,
            description,
          };
        }

        return {
          id: reminder.id,
          entity: reminder.entity,
          href: events({}).event({
            eventId: reminder.data.eventId,
          }).$,
          description: `${reminder.data.title} event is happening now! Click here to join the meeting!`,
        };
      }),
    };
  }
}
