import { getOverrides } from '@asap-hub/flags';
import {
  BackendError,
  createQueryKeys,
  normalizeListOptions,
  nullOnUndefined,
  withEmptyListFallback,
} from '@asap-hub/frontend-utils';
import {
  DiscussionRequest,
  DiscussionResponse,
  ListPartialManuscriptResponse,
  ListTeamAwardMetricsResponse,
  ListTeamResponse,
  ManuscriptDataObject,
  ManuscriptFileResponse,
  ManuscriptPutRequest,
  ManuscriptResponse,
  ManuscriptWorkspaceTab,
  ManuscriptWorkspaceUrlResponse,
  ResearchOutputResponse,
  TeamResponse,
  WorkspaceManuscriptsResponse,
} from '@asap-hub/model';
import { useCurrentUserCRN } from '@asap-hub/react-context';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthorization } from '../../auth/useAuthorization';
import { useAlgolia } from '../../hooks/algolia';
import { useSetResearchOutputItem } from '../../shared-research/state';
import {
  createDiscussion,
  createPreprintResearchOutput,
  downloadFullComplianceDataset,
  getManuscript,
  getManuscriptWorkspaceUrl,
  getManuscripts,
  getManuscriptVersions,
  getManuscriptVersionByManuscriptId,
  getTeam,
  getTeamAwardMetrics,
  ManuscriptsOptions,
  markDiscussionAsRead,
  updateDiscussion,
  updateManuscript,
  GetTeamsListOptions,
  getAlgoliaTeams,
} from './api';

export const teamQueryKeys = createQueryKeys<GetTeamsListOptions>('teams');

type ManuscriptWorkspaceUrlParams = {
  manuscriptId: string;
  tab?: ManuscriptWorkspaceTab;
};

export const manuscriptQueryKeys = {
  ...createQueryKeys<ManuscriptsOptions>('manuscripts'),
  workspaceAll: ['manuscripts', 'workspace'] as const,
  workspace: (params: Partial<Record<'teamId' | 'projectId', string>>) =>
    ['manuscripts', 'workspace', params] as const,
  workspaceUrl: (params: ManuscriptWorkspaceUrlParams) =>
    ['manuscripts', 'workspace-url', normalizeListOptions(params)] as const,
};

export const discussionQueryKeys = {
  all: ['discussions'] as const,
  detail: (id: string) => [...discussionQueryKeys.all, id] as const,
};

export const useTeams = (options: GetTeamsListOptions): ListTeamResponse => {
  const algoliaClient = useAlgolia();
  return useSuspenseQuery({
    queryKey: teamQueryKeys.list(options),
    queryFn: (): Promise<ListTeamResponse> =>
      withEmptyListFallback(
        () => getAlgoliaTeams(algoliaClient.client, options),
        { total: 0, items: [] },
      ),
  }).data;
};

export const useTeamById = (id: string): TeamResponse | undefined => {
  const getAuthorization = useAuthorization();
  const { data } = useSuspenseQuery({
    queryKey: teamQueryKeys.detail(id),
    queryFn: () =>
      nullOnUndefined(async () => getTeam(id, await getAuthorization())),
  });
  return data ?? undefined;
};

export const useManuscriptWorkspaceUrl = (
  manuscriptId: string,
  tab?: ManuscriptWorkspaceTab,
): ManuscriptWorkspaceUrlResponse | undefined => {
  const getAuthorization = useAuthorization();
  const { data } = useSuspenseQuery({
    queryKey: manuscriptQueryKeys.workspaceUrl({
      manuscriptId,
      tab,
    }),
    queryFn: () =>
      nullOnUndefined(async () =>
        getManuscriptWorkspaceUrl(manuscriptId, await getAuthorization(), tab),
      ),
  });
  return data ?? undefined;
};

// Writes a mutation response into the manuscript detail cache — never
// refetched, because Contentful has read-after-write lag. The manuscripts
// list re-syncs via useManuscripts's refresh updater instead.
export const useSetManuscriptItem = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (manuscript: ManuscriptResponse) => {
      queryClient.setQueryData(
        manuscriptQueryKeys.detail(manuscript.id),
        manuscript,
      );
    },
    [queryClient],
  );
};

export const usePutManuscript = () => {
  const getAuthorization = useAuthorization();
  const setManuscriptItem = useSetManuscriptItem();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ManuscriptPutRequest;
    }) => {
      const notificationList = getOverrides()
        .COMPLIANCE_NOTIFICATION_LIST as string;
      return updateManuscript(
        id,
        {
          ...payload,
          notificationList,
        },
        await getAuthorization(),
      );
    },
    onSuccess: (manuscript) => {
      setManuscriptItem(manuscript);
      // Patch the workspace lists in place rather than refetching — Contentful
      // has read-after-write lag, so a refetch could serve the old status.
      queryClient.setQueriesData<WorkspaceManuscriptsResponse>(
        { queryKey: manuscriptQueryKeys.workspaceAll },
        (cached) =>
          cached && {
            manuscripts: cached.manuscripts.map((item) =>
              item.id === manuscript.id
                ? {
                    ...item,
                    status: manuscript.status,
                    title: manuscript.title,
                  }
                : item,
            ),
            collaborationManuscripts: cached.collaborationManuscripts.map(
              (item) =>
                item.id === manuscript.id
                  ? {
                      ...item,
                      status: manuscript.status,
                      title: manuscript.title,
                    }
                  : item,
            ),
          },
      );
    },
  });
  return (id: string, payload: ManuscriptPutRequest) =>
    mutateAsync({ id, payload });
};

export const useIsComplianceReviewer = (): boolean => {
  const { role, openScienceTeamMember } = useCurrentUserCRN() ?? {};
  return role === 'Staff' && !!openScienceTeamMember;
};

export const useDownloadFullComplianceDataset = () => {
  const getAuthorization = useAuthorization();

  return async () => downloadFullComplianceDataset(await getAuthorization());
};

export const useSetDiscussion = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (discussion: DiscussionResponse) => {
      queryClient.setQueryData(
        discussionQueryKeys.detail(discussion.id),
        discussion,
      );
    },
    [queryClient],
  );
};

export const useReplyToDiscussion = () => {
  const getAuthorization = useAuthorization();
  const setDiscussion = useSetDiscussion();
  const setManuscriptItem = useSetManuscriptItem();

  const { mutateAsync } = useMutation({
    mutationFn: async ({
      manuscriptId,
      id,
      patch,
    }: {
      manuscriptId: string;
      id: string;
      patch: DiscussionRequest;
    }) => {
      const notificationList = getOverrides()
        .COMPLIANCE_NOTIFICATION_LIST as string;
      const authorization = await getAuthorization();

      try {
        const discussion = await updateDiscussion(
          id,
          {
            ...patch,
            notificationList,
          },
          authorization,
        );
        setDiscussion(discussion);
        const updatedManuscript = await getManuscript(
          manuscriptId,
          authorization,
        );
        if (updatedManuscript) setManuscriptItem(updatedManuscript);
      } catch (error) {
        // 403-triggered manuscript re-fetch before re-throwing (error-path
        // cache sync), preserved verbatim.
        if (
          error instanceof BackendError &&
          (error as BackendError).response?.statusCode === 403
        ) {
          const updatedManuscript = await getManuscript(
            manuscriptId,
            authorization,
          );
          if (updatedManuscript) setManuscriptItem(updatedManuscript);
        }
        throw error;
      }
    },
  });
  return (manuscriptId: string, id: string, patch: DiscussionRequest) =>
    mutateAsync({ manuscriptId, id, patch });
};

export const useMarkDiscussionAsRead = () => {
  const getAuthorization = useAuthorization();
  const setDiscussion = useSetDiscussion();
  const setManuscriptItem = useSetManuscriptItem();
  const queryClient = useQueryClient();

  const { mutateAsync } = useMutation({
    onMutate: ({
      manuscriptId,
      discussionId,
    }: {
      manuscriptId: string;
      discussionId: string;
    }) => {
      // Optimistic update from the cached manuscript before awaiting the API.
      const manuscript = queryClient.getQueryData<ManuscriptResponse | null>(
        manuscriptQueryKeys.detail(manuscriptId),
      );

      if (manuscript) {
        const discussions = manuscript.discussions.map((discussion) => {
          if (discussion.id === discussionId) {
            return { ...discussion, read: true };
          }
          return discussion;
        });

        setManuscriptItem({ ...manuscript, discussions });
      }
    },
    mutationFn: async ({
      discussionId,
    }: {
      manuscriptId: string;
      discussionId: string;
    }) => markDiscussionAsRead(discussionId, await getAuthorization()),
    onSuccess: (discussion) => {
      setDiscussion(discussion);
    },
  });
  return async (manuscriptId: string, discussionId: string) => {
    await mutateAsync({ manuscriptId, discussionId });
  };
};

export const useManuscripts = (
  options: ManuscriptsOptions,
): ListPartialManuscriptResponse & {
  refresh: (manuscript: ManuscriptDataObject) => void;
} => {
  const algoliaClient = useAlgolia();
  const queryClient = useQueryClient();

  const manuscripts = useSuspenseQuery({
    queryKey: manuscriptQueryKeys.list(options),
    queryFn: (): Promise<ListPartialManuscriptResponse> =>
      withEmptyListFallback(
        () => getManuscripts(algoliaClient.client, options),
        { total: 0, items: [] },
      ),
  }).data;

  // Surgical write-through after a manuscript mutation: merges the selected
  // fields into the item inside every cached manuscript list. Never a
  // refetch — Algolia has indexing lag after mutations.
  const refreshManuscripts = useCallback(
    (updatedManuscriptItem: ManuscriptDataObject) => {
      queryClient.setQueriesData<ListPartialManuscriptResponse>(
        { queryKey: manuscriptQueryKeys.lists() },
        (previousManuscripts) =>
          previousManuscripts && {
            ...previousManuscripts,
            items: previousManuscripts.items.map((previousManuscriptItem) =>
              previousManuscriptItem.id === updatedManuscriptItem.id
                ? {
                    ...previousManuscriptItem,
                    status: updatedManuscriptItem.status,
                    assignedUsers: updatedManuscriptItem.assignedUsers,
                    apcAmountPaid: updatedManuscriptItem.apcAmountPaid,
                    apcAmountRequested:
                      updatedManuscriptItem.apcAmountRequested,
                    apcCoverageRequestStatus:
                      updatedManuscriptItem.apcCoverageRequestStatus,
                    apcRequested: updatedManuscriptItem.apcRequested,
                    declinedReason: updatedManuscriptItem.declinedReason,
                  }
                : previousManuscriptItem,
            ),
          },
      );
    },
    [queryClient],
  );

  return { ...manuscripts, refresh: refreshManuscripts };
};

export const useManuscriptVersionSuggestions = () => {
  const algoliaClient = useAlgolia();

  return (
    searchQuery: string,
    association?: { teamId?: string; projectId?: string },
  ) =>
    getManuscriptVersions(algoliaClient.client, {
      searchQuery,
      currentPage: null,
      pageSize: 100,
      teamId: association?.teamId,
      projectId: association?.projectId,
    }).then(({ items }) => items);
};

export const useLatestManuscriptVersionByManuscriptId = () => {
  const algoliaClient = useAlgolia();

  return (manuscriptId: string) =>
    getManuscriptVersionByManuscriptId(algoliaClient.client, manuscriptId);
};

export const useCreateDiscussion = () => {
  const getAuthorization = useAuthorization();
  const setManuscriptItem = useSetManuscriptItem();

  const { mutateAsync } = useMutation({
    mutationFn: async ({
      manuscriptId,
      title,
      text,
      files,
    }: {
      manuscriptId: string;
      title: string;
      text: string;
      files?: ManuscriptFileResponse[];
    }): Promise<string | undefined> => {
      const notificationList = getOverrides()
        .COMPLIANCE_NOTIFICATION_LIST as string;
      const authorization = await getAuthorization();

      try {
        const discussion = await createDiscussion(
          {
            manuscriptId,
            title,
            text,
            files,
            notificationList,
          },
          authorization,
        );
        const updatedManuscript = await getManuscript(
          manuscriptId,
          authorization,
        );
        if (updatedManuscript) setManuscriptItem(updatedManuscript);
        return discussion.id;
      } catch (error) {
        // 403-triggered manuscript re-fetch before re-throwing (error-path
        // cache sync), preserved verbatim.
        if (
          error instanceof BackendError &&
          (error as BackendError).response?.statusCode === 403
        ) {
          const updatedManuscript = await getManuscript(
            manuscriptId,
            authorization,
          );
          if (updatedManuscript) setManuscriptItem(updatedManuscript);
        }
        throw error;
      }
    },
  });
  return (
    manuscriptId: string,
    title: string,
    text: string,
    files?: ManuscriptFileResponse[],
  ): Promise<string | undefined> =>
    mutateAsync({ manuscriptId, title, text, files });
};

export const usePostPreprintResearchOutput = () => {
  const getAuthorization = useAuthorization();
  const setResearchOutputItem = useSetResearchOutputItem();

  const { mutateAsync } = useMutation({
    mutationFn: async (manuscriptId: string): Promise<ResearchOutputResponse> =>
      createPreprintResearchOutput(manuscriptId, await getAuthorization()),
    onSuccess: (preprintResearchOutput) => {
      setResearchOutputItem(preprintResearchOutput);
    },
  });
  return mutateAsync;
};

export const teamAwardMetricsQueryKeys = {
  all: ['team-award-metrics'] as const,
  detail: (teamId: string) =>
    [...teamAwardMetricsQueryKeys.all, teamId] as const,
};

export const useTeamAwardMetrics = (
  teamId: string,
): ListTeamAwardMetricsResponse => {
  const getAuthorization = useAuthorization();
  return useSuspenseQuery({
    queryKey: teamAwardMetricsQueryKeys.detail(teamId),
    queryFn: async () => getTeamAwardMetrics(teamId, await getAuthorization()),
  }).data;
};
