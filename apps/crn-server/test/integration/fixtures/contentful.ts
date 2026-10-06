import { omit } from 'lodash';
import { addLocaleToFields, getLinkEntity } from '@asap-hub/contentful';
import { parseHtml } from 'contentful-html-rich-text-converter';
import {
  createClient,
  RestAdapter,
  MakeRequestOptions,
  Environment,
} from 'contentful-management';
import { RateLimiter } from 'limiter';

import {
  Fixture,
  CalendarCreateDataObject,
  EventCreateDataObject,
  UserCreateDataObject,
  TeamCreateDataObject,
  InterestGroupCreateDataObject,
  WorkingGroupCreateDataObject,
  ResearchOutputCreateDataObject,
} from './types';

import {
  contentfulSpaceId,
  contentfulEnvId,
  contentfulManagementAccessToken,
} from '../../../src/config';

export type TestEnvironment = Environment & { teardown: () => Promise<void> };

class ApiAdapter extends RestAdapter {
  rateLimiter = new RateLimiter({
    tokensPerInterval: 3,
    interval: 'second',
  });

  created: string[] = [];

  async makeRequest<R>(options: MakeRequestOptions): Promise<R> {
    this.rateLimiter.removeTokens(1);
    const result = await super.makeRequest<R>(options);
    if (options.action.match(/^create/)) {
      /*
        Handle an issue with the type definitions for `makeRequest` in contentful-management
        The exported types insist `sys` cannot exist on the return value when it patently does
        https://github.com/contentful/contentful-management.js/blob/v10.32.0/lib/contentful-management.ts#L94-L96
        */
      // @ts-ignore
      if (typeof result?.sys?.id === 'string') {
        // @ts-ignore
        this.created.push(result.sys.id);
      }
    }
    return result;
  }
}

export const getEnvironment = async () => {
  const apiAdapter = new ApiAdapter({
    accessToken: contentfulManagementAccessToken!,
  });
  const client = createClient({
    apiAdapter,
  });
  const space = await client.getSpace(contentfulSpaceId);
  return space.getEnvironment(contentfulEnvId);
};

export class ContentfulFixture implements Fixture {
  private apiAdapter: ApiAdapter;

  constructor() {
    this.apiAdapter = new ApiAdapter({
      accessToken: contentfulManagementAccessToken!,
    });
  }

  private async getEnvironment() {
    const client = createClient({
      apiAdapter: this.apiAdapter,
    });
    const space = await client.getSpace(contentfulSpaceId);
    return space.getEnvironment(contentfulEnvId);
  }

  private async prepareCalendar(props: CalendarCreateDataObject) {
    return props;
  }

  private async prepareEvent(props: EventCreateDataObject) {
    const environment = await this.getEnvironment();
    return {
      ...props,
      calendar: getLinkEntity(props.calendar),
      speakers: await Promise.all(
        (props.speakers || [])
          .map(async (speaker) => {
            if (speaker.team[0] && speaker.user[0]) {
              const eventSpeaker = await environment.createEntry(
                'eventSpeakers',
                {
                  fields: addLocaleToFields({
                    team: getLinkEntity(speaker.team[0]),
                    user: getLinkEntity(speaker.user[0]),
                    preliminaryDataShared: false,
                  }),
                },
              );
              await eventSpeaker.publish();
              return getLinkEntity(eventSpeaker.sys.id);
            }
            return null;
          })
          .filter(Boolean),
      ),
      notes: getMaterial(props.notes),
      presentation: getMaterial(props.presentation),
      videoRecording: getMaterial(props.videoRecording),
    };
  }

  private async prepareUser(props: UserCreateDataObject) {
    const environment = await this.getEnvironment();
    return {
      ...props,
      labs: [],
      teams: await Promise.all(
        (props.teams || []).map(async (team) => {
          const membership = await environment.createEntry('teamMembership', {
            fields: addLocaleToFields({
              team: getLinkEntity(team.id),
              role: team.role,
              inactiveSinceDate: team.inactiveSinceDate,
            }),
          });
          await membership.publish();
          return getLinkEntity(membership.sys.id);
        }),
      ),
      connections: (props.connections || []).map(({ code }) => code),
    };
  }

  private async prepareInterestGroup(props: InterestGroupCreateDataObject) {
    const environment = await this.getEnvironment();
    const { teams, ...rest } = props;
    return {
      ...rest,
      leaders: await Promise.all(
        (props.leaders || []).map(async (leader) => {
          const leadership = await environment.createEntry(
            'interestGroupLeaders',
            {
              fields: addLocaleToFields({
                user: getLinkEntity(leader.user),
                role: leader.role,
                inactiveSinceDate: leader.inactiveSinceDate,
              }),
            },
          );
          await leadership.publish();
          return getLinkEntity(leadership.sys.id);
        }),
      ),
      teams: await Promise.all(
        (props.teams || []).map(async (team) => {
          const teamMembership = await environment.createEntry(
            'interestGroupsTeams',
            {
              fields: addLocaleToFields({
                team: getLinkEntity(team.id),
                startDate: new Date().toISOString(),
              }),
            },
          );
          await teamMembership.publish();
          return getLinkEntity(teamMembership.sys.id);
        }),
      ),
    };
  }

  private async prepareWorkingGroup(props: WorkingGroupCreateDataObject) {
    const environment = await this.getEnvironment();
    const leaders = await Promise.all(
      (props.leaders || []).map(async (leader) => {
        const leadership = await environment.createEntry(
          'workingGroupLeaders',
          {
            fields: addLocaleToFields({
              user: getLinkEntity(leader.user),
              role: leader.role,
              workstreamRole: leader.workstreamRole || 'Test',
              inactiveSinceDate: leader.inactiveSinceDate,
            }),
          },
        );
        await leadership.publish();
        return getLinkEntity(leadership.sys.id);
      }),
    );
    const members = await Promise.all(
      (props.members || []).map(async (member) => {
        const membership = await environment.createEntry(
          'workingGroupMembers',
          {
            fields: addLocaleToFields({
              user: getLinkEntity(member),
              inactiveSinceDate: null,
            }),
          },
        );
        await membership.publish();
        return getLinkEntity(membership.sys.id);
      }),
    );
    return {
      ...omit(props, 'leaders'),
      description: parseHtml(props.description),
      members: [...leaders, ...members],
    };
  }

  private async prepareResearchOutput(props: ResearchOutputCreateDataObject) {
    const {
      teams,
      workingGroups,
      published: _published,
      ...researchOutputData
    } = props;
    return {
      ...researchOutputData,
      teams: teams.map((id) => getLinkEntity(id)),
      workingGroup:
        workingGroups && workingGroups[0]
          ? getLinkEntity(workingGroups[0])
          : null,
      usedInAPublication: 'No' as NonNullable<'Yes' | 'No' | 'Not Sure'>,
      asapFunded: 'No' as NonNullable<'Yes' | 'No' | 'Not Sure'>,
    };
  }

  async createCalendar(calendar: CalendarCreateDataObject) {
    const environment = await this.getEnvironment();
    const input = await this.prepareCalendar(calendar);
    const result = await environment.createEntry('calendars', {
      fields: addLocaleToFields(input),
    });
    await result.publish();
    return {
      id: result.sys.id,
      ...calendar,
    };
  }

  async createEvent(event: EventCreateDataObject) {
    const environment = await this.getEnvironment();
    const input = await this.prepareEvent(event);
    const result = await environment.createEntry('events', {
      fields: addLocaleToFields(input),
    });
    await result.publish();
    return {
      id: result.sys.id,
      ...event,
    };
  }

  async publishEvent(id: string, status?: 'Published' | 'Draft') {
    const environment = await this.getEnvironment();
    const entry = await environment.getEntry(id);

    if (status === 'Draft' && entry.isPublished()) {
      await entry.unpublish();
    }

    if (status === 'Published' && entry.isDraft()) {
      await entry.publish();
    }
  }

  async createUser(user: UserCreateDataObject) {
    const environment = await this.getEnvironment();
    const input = await this.prepareUser(user);
    const result = await environment.createEntry('users', {
      fields: addLocaleToFields(input),
    });
    await result.publish();
    return {
      id: result.sys.id,
      ...user,
    };
  }

  async createTeam(team: TeamCreateDataObject) {
    const environment = await this.getEnvironment();
    const result = await environment.createEntry('teams', {
      fields: addLocaleToFields(team),
    });
    await result.publish();
    return {
      id: result.sys.id,
      ...team,
    };
  }

  async createInterestGroup(interestGroup: InterestGroupCreateDataObject) {
    const environment = await this.getEnvironment();
    const input = await this.prepareInterestGroup(interestGroup);
    const result = await environment.createEntry('interestGroups', {
      fields: addLocaleToFields(input),
    });
    await result.publish();
    return {
      id: result.sys.id,
      ...interestGroup,
    };
  }

  async createWorkingGroup(workingGroup: WorkingGroupCreateDataObject) {
    const environment = await this.getEnvironment();
    const input = await this.prepareWorkingGroup(workingGroup);
    const result = await environment.createEntry('workingGroups', {
      fields: addLocaleToFields(input),
    });
    await result.publish();
    return {
      id: result.sys.id,
      ...workingGroup,
    };
  }

  async createResearchOutput(researchOutput: ResearchOutputCreateDataObject) {
    // Ideally we should use the post /research-outputs route to create
    // the research output. Use this method only if you need to change
    // fields that the API does not support like addedDate
    const environment = await this.getEnvironment();
    const input = await this.prepareResearchOutput(researchOutput);
    const result = await environment.createEntry('researchOutputs', {
      fields: addLocaleToFields(input),
    });
    if (researchOutput.published) {
      await result.publish();
    }
    return {
      id: result.sys.id,
      ...researchOutput,
    };
  }

  async teardown() {
    // no need to teardown in CI because we'll delete the environment anyway
    if (process.env.CI) {
      return;
    }
    const environment = await this.getEnvironment();
    while (this.apiAdapter.created.length) {
      const id = this.apiAdapter.created.pop();
      if (id) {
        try {
          const toDelete = await environment.getEntry(id);
          if (toDelete.isPublished()) {
            await toDelete.unpublish();
          }
          await toDelete.delete();
        } catch (err) {
          if (err instanceof Error && err.name === 'NotFound') {
            // This 404 (Not Found) is an expected error as we delete some events
            // while tests are still running (before the teardown)
            // So when teardown happens, some records were already deleted
          } else {
            // eslint-disable-next-line no-console
            console.log(`Fail to delete entry ${id}: ${err}`);
          }
        }
      }
    }
  }

  async deleteEvents(ids: string[]) {
    const environment = await this.getEnvironment();

    for (const id of ids) {
      const toDelete = await environment.getEntry(id);
      if (toDelete.isPublished()) {
        await toDelete.unpublish();
      }
      await toDelete.delete();
    }
  }

  async clearAllPreviousEvents() {
    // when we create a new environment in Contentful
    // we copy entries from a previous env
    // so if there are events updated recently it can
    // mess with our tests
    const environment = await this.getEnvironment();

    const { items: events } = await environment.getEntries({
      content_type: 'events',
    });

    for (const entry of events) {
      if (entry.isPublished()) {
        await entry.unpublish();
      }
      await entry.delete();
    }
  }
}

const getRichTextDocument = (text: string) => ({
  data: {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'paragraph',
        data: {},
        content: [
          {
            nodeType: 'text',
            value: text,
            marks: [],
            data: {},
          },
        ],
      },
    ],
  },
});

const getMaterial = (material?: string | null) => {
  if (!material) return undefined;

  const document = getRichTextDocument(material);
  return { 'en-US': document };
};
