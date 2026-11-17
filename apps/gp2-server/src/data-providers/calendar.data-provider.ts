import {
  addLocaleToFields,
  Environment,
  gp2,
  GraphQLClient,
  updateEntryFields,
} from '@asap-hub/contentful';
import {
  CalendarCreateDataObject,
  CalendarUpdateDataObject,
  FetchCalendarProviderOptions,
  gp2 as gp2Model,
} from '@asap-hub/model';
import {
  parseContentfulGraphqlCalendarPartialToDataObject,
  parseContentfulWorkingGroupsProjects,
} from './transformers';

export type CalendarItem = NonNullable<
  NonNullable<gp2.FetchCalendarsQuery['calendarsCollection']>['items'][number]
>;

export class CalendarContentfulDataProvider
  implements gp2Model.CalendarDataProvider
{
  constructor(
    private graphQLClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}

  async fetchById(id: string) {
    const { calendars } = await this.graphQLClient.request<
      gp2.FetchCalendarByIdQuery,
      gp2.FetchCalendarByIdQueryVariables
    >(gp2.FETCH_CALENDAR_BY_ID, { id });

    return calendars ? parseGraphQlCalendarToDataObject(calendars) : null;
  }

  async fetch(options?: FetchCalendarProviderOptions) {
    const { maxExpiration, resourceId } = options || {};

    const { calendarsCollection } = await this.graphQLClient.request<
      gp2.FetchCalendarsQuery,
      gp2.FetchCalendarsQueryVariables
    >(gp2.FETCH_CALENDARS, {
      limit: 50,
      skip: 0,
      order: [gp2.CalendarsOrder.NameAsc],
      where: {
        ...(maxExpiration || resourceId
          ? { googleApiMetadata_exists: true }
          : {}),
      },
    });

    if (!calendarsCollection?.items) {
      return {
        total: 0,
        items: [],
      };
    }

    if (resourceId || maxExpiration) {
      const filteredCalendarItems = calendarsCollection?.items.filter(
        (calendar) => {
          if (resourceId && maxExpiration) {
            return (
              calendar?.googleApiMetadata?.resourceId === resourceId &&
              calendar?.googleApiMetadata?.expirationDate <= maxExpiration
            );
          }

          if (maxExpiration) {
            return calendar?.googleApiMetadata?.expirationDate <= maxExpiration;
          }

          return calendar?.googleApiMetadata?.resourceId === resourceId;
        },
      );

      return {
        total: (filteredCalendarItems || [])?.length,
        items: (filteredCalendarItems || [])
          .filter((calendar): calendar is CalendarItem => calendar !== null)
          .map(parseGraphQlCalendarToDataObject),
      };
    }

    return {
      total: calendarsCollection.total,
      items: calendarsCollection.items
        .filter((item): item is CalendarItem => item !== null)
        .map(parseGraphQlCalendarToDataObject),
    };
  }

  async create(create: CalendarCreateDataObject): Promise<string> {
    const environment = await this.getRestClient();

    const calendarEntry = await environment.createEntry('calendars', {
      fields: addLocaleToFields(create),
    });

    await calendarEntry.publish();

    return calendarEntry.sys.id;
  }

  async update(id: string, update: CalendarUpdateDataObject): Promise<void> {
    const environment = await this.getRestClient();

    const calendar = await environment.getEntry(id);
    const previousGoogleApiMetadata = calendar.fields.googleApiMetadata;

    const { resourceId, channelId, expirationDate, syncToken, ...otherFields } =
      update;

    const calendarWithUpdatedFields = updateEntryFields(calendar, otherFields);

    const hasResourceId = 'resourceId' in update;
    if (hasResourceId || expirationDate || syncToken) {
      calendarWithUpdatedFields.fields.googleApiMetadata = {
        'en-US': {
          ...(previousGoogleApiMetadata
            ? previousGoogleApiMetadata['en-US']
            : {}),
          // if the resourceId is updated, we change associatedGoogleCalendarId
          // this field is used by webhooks
          ...(hasResourceId
            ? {
                resourceId,
                associatedGoogleCalendarId:
                  calendar.fields.googleCalendarId['en-US'],
              }
            : {}),
          ...(channelId ? { channelId } : {}),
          ...(syncToken ? { syncToken } : {}),
          ...(expirationDate ? { expirationDate } : {}),
        },
      };
    }

    const calendarUpdated = await calendarWithUpdatedFields.update();
    await calendarUpdated.publish();
  }
}

export const parseGraphQlCalendarToDataObject = (
  item: CalendarItem,
): gp2Model.CalendarDataObject => ({
  id: item.sys.id,
  version: item.sys.publishedVersion ?? 1,
  resourceId: item.googleApiMetadata?.resourceId,
  channelId: item.googleApiMetadata?.channelId,
  expirationDate: item.googleApiMetadata?.expirationDate,
  syncToken: item.googleApiMetadata?.syncToken,
  gp2Calendar: Boolean(item.gp2Calendar),
  ...parseContentfulGraphqlCalendarPartialToDataObject(item),
  ...parseContentfulWorkingGroupsProjects(item),
});
