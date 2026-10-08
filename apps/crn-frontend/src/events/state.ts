import { useCallback, useMemo } from 'react';
import { User } from '@asap-hub/auth';
import {
  createQueryKeys,
  GetEventListOptions,
  nullOnUndefined,
  withEmptyListFallback,
} from '@asap-hub/frontend-utils';
import {
  EventResponse,
  EventUpdateDetailsRequest,
  ListEventResponse,
} from '@asap-hub/model';
import { SpeakerGroup } from '@asap-hub/react-components';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import useDeepCompareEffect from 'use-deep-compare-effect';

import { useAuthorization } from '../auth/useAuthorization';
import { useAlgolia } from '../hooks/algolia';
import { teamQueryKeys } from '../network/teams/state';
import {
  getEvent,
  getEvents,
  getTeamsForMatching,
  patchEvent,
  teamsForMatchingOptions,
} from './api';
import { mapSpeakersToGroups } from './map-speakers-to-groups';

export const eventQueryKeys = createQueryKeys<GetEventListOptions>('events');

export const useEventById = (id: string): EventResponse | undefined => {
  const getAuthorization = useAuthorization();
  const { data } = useSuspenseQuery({
    queryKey: eventQueryKeys.detail(id),
    queryFn: () =>
      nullOnUndefined(async () => getEvent(id, await getAuthorization())),
  });
  return data ?? undefined;
};

// Reuse the existing useEventById query rather than duplicating the
// queryKey/queryFn; the event reference is stable between data changes, so the
// memo only re-runs the transform when the event actually changes.
export const useEventSpeakerGroups = (id: string): SpeakerGroup[] => {
  const event = useEventById(id);
  return useMemo(() => (event ? mapSpeakersToGroups(event) : []), [event]);
};

export const useQuietRefreshEventById = (id: string) => {
  const getAuthorization = useAuthorization();
  const queryClient = useQueryClient();
  return async () => {
    const event = await getEvent(id, await getAuthorization());
    queryClient.setQueryData(eventQueryKeys.detail(id), event ?? null);
  };
};

export const usePatchEvent = (id: string) => {
  const getAuthorization = useAuthorization();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: async (data: EventUpdateDetailsRequest) =>
      patchEvent(id, data, await getAuthorization()),
    onSuccess: (event) => {
      queryClient.setQueryData(eventQueryKeys.detail(id), event);
    },
  });
  return mutateAsync;
};

export const usePrefetchEvents = (options: GetEventListOptions) => {
  const { client } = useAlgolia();
  const queryClient = useQueryClient();

  useDeepCompareEffect(() => {
    // prefetchQuery is a no-op when the key is already cached (staleTime
    // Infinity).
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    queryClient.prefetchQuery({
      queryKey: eventQueryKeys.list(options),
      queryFn: () => getEvents(client, options),
    });
  }, [options, client, queryClient]);
};

export const useEvents = (
  options: GetEventListOptions,
  // Kept for signature compatibility; never used.
  _user?: User | null,
): ListEventResponse => {
  const { client } = useAlgolia();
  return useSuspenseQuery({
    queryKey: eventQueryKeys.list(options),
    queryFn: (): Promise<ListEventResponse> =>
      withEmptyListFallback(() => getEvents(client, options), {
        total: 0,
        items: [],
      }),
  }).data;
};

// fetchQuery rather than a hook subscription: the corpus is only needed once a
// file is actually uploaded, and it must not suspend inside the modal.
export const useTeamsForMatching = () => {
  const { client } = useAlgolia();
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: teamQueryKeys.list(teamsForMatchingOptions),
        queryFn: () => getTeamsForMatching(client),
        staleTime: Infinity,
      }),
    [client, queryClient],
  );
};
