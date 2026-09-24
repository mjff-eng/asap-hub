import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

import { useApi } from './ApiProvider';
import { ApiError } from './client';
import type {
  Folder,
  FolderCounts,
  Invite,
  ManagedUser,
  Me,
  Role,
  UserStatus,
  Video,
  VideoAccess,
  VideoPatch,
} from './types';

const noRetryOnClientError = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
};

export const useMe = (enabled: boolean): UseQueryResult<Me, unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe(),
    enabled,
    retry: noRetryOnClientError,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFolders = (): UseQueryResult<Folder[], unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['folders'],
    queryFn: () => api.listFolders(),
    retry: noRetryOnClientError,
  });
};

export const useFolderCounts = (): UseQueryResult<FolderCounts, unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['folder-counts'],
    queryFn: () => api.folderCounts(),
    retry: noRetryOnClientError,
    staleTime: 60 * 1000,
  });
};

export const useVideos = (
  folderId?: string,
): UseQueryResult<Video[], unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['videos', folderId ?? null],
    queryFn: () => api.listVideos(folderId),
    retry: noRetryOnClientError,
  });
};

export const useAllVideos = (
  enabled: boolean,
): UseQueryResult<Video[], unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['videos', 'all'],
    queryFn: () => api.listAllVideos(),
    enabled,
    retry: noRetryOnClientError,
  });
};

export const useVideo = (id: string): UseQueryResult<Video, unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => api.getVideo(id),
    enabled: Boolean(id),
    // a freshly created video can 404 for a moment right after upload
    retry: (count, error) =>
      error instanceof ApiError && error.status === 404
        ? count < 3
        : noRetryOnClientError(count, error),
  });
};

export const useEditableVideo = (
  id: string,
): UseQueryResult<Video, unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => api.getVideo(id),
    enabled: Boolean(id),
    retry: noRetryOnClientError,
    refetchInterval: (query) => {
      const video = query.state.data;
      const busy =
        video?.processingState === 'uploading' ||
        video?.processingState === 'processing' ||
        video?.render?.state === 'queued' ||
        video?.render?.state === 'rendering';
      return busy ? 5000 : false;
    },
  });
};

export const useUpdateVideo = (id: string) => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: VideoPatch) => api.updateVideo(id, patch),
    onSuccess: (video) => {
      queryClient.setQueryData(['video', id], video);
      void queryClient.invalidateQueries({ queryKey: ['videos'] });
      void queryClient.invalidateQueries({ queryKey: ['folder-counts'] });
    },
  });
};

export const useUnpublishVideo = (id: string) => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => api.unpublishVideo(id, version),
    onSuccess: (video) => {
      queryClient.setQueryData(['video', id], video);
      void queryClient.invalidateQueries({ queryKey: ['videos'] });
      void queryClient.invalidateQueries({ queryKey: ['folder-counts'] });
    },
  });
};

export const usePublishVideo = (id: string) => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => api.publishVideo(id, version),
    onSuccess: (video) => {
      queryClient.setQueryData(['video', id], video);
      void queryClient.invalidateQueries({ queryKey: ['videos'] });
      void queryClient.invalidateQueries({ queryKey: ['folder-counts'] });
    },
  });
};

export const useDeleteVideo = (id: string) => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteVideo(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['video', id] });
      queryClient.removeQueries({ queryKey: ['video-access', id] });
      void queryClient.invalidateQueries({ queryKey: ['videos'] });
      void queryClient.invalidateQueries({ queryKey: ['folder-counts'] });
    },
  });
};

export const useVideoAccess = (
  id: string,
  mediaPath?: string,
): UseQueryResult<VideoAccess, unknown> => {
  const api = useApi();
  return useQuery({
    // keyed on the revision as well, so a re-export is picked up the moment
    // the row names it rather than after the ten minute stale window
    queryKey: ['video-access', id, mediaPath ?? ''],
    queryFn: () => api.requestAccess(id),
    enabled: id !== '',
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
};

export const useInvites = (): UseQueryResult<Invite[], unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['invites'],
    queryFn: () => api.listInvites(),
    retry: noRetryOnClientError,
  });
};

export const useCreateInvite = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: Role }) =>
      api.createInvite(email, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites'] }),
  });
};

export const useCancelInvite = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.cancelInvite(email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites'] }),
  });
};

export const useUsers = (
  enabled: boolean,
): UseQueryResult<ManagedUser[], unknown> => {
  const api = useApi();
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.listUsers(),
    enabled,
    retry: noRetryOnClientError,
  });
};

export const useUpdateUser = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sub,
      ...patch
    }: {
      sub: string;
      role?: Role;
      status?: UserStatus;
    }) => api.updateUser(sub, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useDeleteUser = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sub: string) => api.deleteUser(sub),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
};

export const useCreateFolder = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      api.createFolder(name, parentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['folders'] });
      void queryClient.invalidateQueries({ queryKey: ['folder-counts'] });
    },
  });
};

const useInvalidateFoldersAndVideos = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['videos'] });
    void queryClient.invalidateQueries({ queryKey: ['folders'] });
    void queryClient.invalidateQueries({ queryKey: ['folder-counts'] });
  };
};

export const useRenameFolder = () => {
  const api = useApi();
  const invalidate = useInvalidateFoldersAndVideos();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.renameFolder(id, name),
    onSuccess: invalidate,
  });
};

export const useMoveFolder = () => {
  const api = useApi();
  const invalidate = useInvalidateFoldersAndVideos();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId?: string }) =>
      api.moveFolder(id, parentId),
    onSuccess: invalidate,
  });
};

export const useDeleteFolder = () => {
  const api = useApi();
  const invalidate = useInvalidateFoldersAndVideos();
  return useMutation({
    mutationFn: (id: string) => api.deleteFolder(id),
    onSuccess: invalidate,
  });
};

export const useBulkMoveVideos = () => {
  const api = useApi();
  const invalidate = useInvalidateFoldersAndVideos();
  return useMutation({
    mutationFn: ({ ids, folderId }: { ids: string[]; folderId: string }) =>
      api.bulkMoveVideos(ids, folderId),
    onSuccess: invalidate,
  });
};

export const useBulkDeleteVideos = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFoldersAndVideos();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteVideos(ids),
    onSuccess: ({ deleted }) => {
      deleted.forEach((id) => {
        queryClient.removeQueries({ queryKey: ['video', id] });
        queryClient.removeQueries({ queryKey: ['video-access', id] });
      });
      invalidate();
    },
  });
};
