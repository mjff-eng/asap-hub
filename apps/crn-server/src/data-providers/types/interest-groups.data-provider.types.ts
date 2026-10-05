import {
  FetchInterestGroupOptions,
  InterestGroupDataObject,
  DataProvider,
} from '@asap-hub/model';

export type InterestGroupDataProvider = DataProvider<
  InterestGroupDataObject,
  InterestGroupDataObject,
  FetchInterestGroupOptions
> & {
  fetchCalendarId: (id: string) => Promise<string | null>;
  fetchIdByInterestGroupTeamId: (
    interestGroupTeamId: string,
  ) => Promise<string | null>;
};
