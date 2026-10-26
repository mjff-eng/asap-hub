import {
  CalendarCreateDataObject,
  CalendarDataObject,
  CalendarDataProvider,
  CalendarUpdateDataObject,
  FetchCalendarProviderOptions,
  ListCalendarDataObject,
} from '@asap-hub/model';
import {
  addLocaleToFields,
  GraphQLClient,
  FETCH_CALENDARS,
  FETCH_CALENDAR_BY_ID,
  FetchCalendarByIdQuery,
  FetchCalendarByIdQueryVariables,
  FetchCalendarsQuery,
  FetchCalendarsQueryVariables,
  Environment,
  CalendarsOrder,
  updateEntryFields,
} from '@asap-hub/contentful';
import { parseContentfulGraphqlCalendarPartialToDataObject } from '../transformers';

export type CalendarItem = NonNullable<
  NonNullable<FetchCalendarsQuery['calendarsCollection']>['items'][number]
>;

type WorkingGroupItem = NonNullable<
  NonNullable<
    NonNullable<CalendarItem['linkedFrom']>['workingGroupsCollection']
  >['items'][number]
>;

type InterestGroupItem = NonNullable<
  NonNullable<
    NonNullable<CalendarItem['linkedFrom']>['interestGroupsCollection']
  >['items'][number]
>;

export class CalendarContentfulDataProvider implements CalendarDataProvider {
  constructor(
    private contentfulClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}

  async fetchById(id: string): Promise<CalendarDataObject | null> {
    const { calendars } = await this.contentfulClient.request<
      FetchCalendarByIdQuery,
      FetchCalendarByIdQueryVariables
    >(FETCH_CALENDAR_BY_ID, { id });

    if (!calendars) {
      return null;
    }

    return parseGraphQlCalendarToDataObject(calendars);
  }

  async fetch(
    options?: FetchCalendarProviderOptions,
  ): Promise<ListCalendarDataObject> {
    const { maxExpiration, resourceId, active } = options || {};

    const { calendarsCollection } = await this.contentfulClient.request<
      FetchCalendarsQuery,
      FetchCalendarsQueryVariables
    >(FETCH_CALENDARS, {
      limit: 50,
      skip: 0,
      order: [CalendarsOrder.NameAsc],
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

    let calendars: CalendarItem[] = calendarsCollection.items.filter(
      (x): x is CalendarItem => x !== null,
    );

    if (active === true) {
      calendars = calendars.filter((calendar) => {
        if (
          (!calendar?.linkedFrom?.interestGroupsCollection ||
            !calendar?.linkedFrom?.interestGroupsCollection?.items?.length) &&
          (!calendar?.linkedFrom?.workingGroupsCollection ||
            !calendar?.linkedFrom?.workingGroupsCollection?.items?.length)
        ) {
          return true;
        }

        return (
          (calendar?.linkedFrom?.interestGroupsCollection?.items || []).some(
            (ig) => ig?.active,
          ) ||
          (calendar?.linkedFrom?.workingGroupsCollection?.items || []).some(
            (wg) => !wg?.complete,
          )
        );
      });
    }

    if (resourceId || maxExpiration) {
      const filteredCalendarItems = calendars.filter((calendar) => {
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
      });
      return {
        total: (filteredCalendarItems || [])?.length,
        items: (filteredCalendarItems || []).map(
          parseGraphQlCalendarToDataObject,
        ),
      };
    }

    return {
      total: calendars.length,
      items: calendars.map(parseGraphQlCalendarToDataObject),
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

    updateEntryFields(calendar, otherFields);

    const hasResourceId = 'resourceId' in update;
    if (hasResourceId || expirationDate || syncToken) {
      calendar.fields.googleApiMetadata = {
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

    const calendarUpdated = await calendar.update();
    await calendarUpdated.publish();
  }
}

export const parseGraphQlCalendarToDataObject = (
  item: CalendarItem,
): CalendarDataObject => {
  const workingGroups = (item.linkedFrom?.workingGroupsCollection?.items || [])
    .filter((wg): wg is WorkingGroupItem => wg !== null)
    .map((wg) => ({
      id: wg.sys.id,
      complete: !!wg.complete,
    }));

  const interestGroups = (
    item.linkedFrom?.interestGroupsCollection?.items || []
  )
    .filter((ig): ig is InterestGroupItem => ig !== null)
    .map((ig) => ({
      id: ig.sys.id,
      active: !!ig.active,
    }));

  return {
    id: item.sys.id,
    version: item.sys.publishedVersion ?? 1,
    resourceId: item.googleApiMetadata?.resourceId ?? undefined,
    channelId: item.googleApiMetadata?.channelId ?? undefined,
    expirationDate: item.googleApiMetadata?.expirationDate ?? undefined,
    syncToken: item.googleApiMetadata?.syncToken ?? undefined,
    workingGroups,
    interestGroups,
    crnCalendar: !!item.crnCalendar,
    seminarSeries: !!item.seminarSeries,
    ...parseContentfulGraphqlCalendarPartialToDataObject(item),
  };
};
