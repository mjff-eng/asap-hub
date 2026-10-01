/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  FC,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';

import {
  useAllVideos,
  useBulkDeleteVideos,
  useBulkMoveVideos,
  useCreateFolder,
  useDeleteFolder,
  useFolderCounts,
  useFolders,
  useMoveFolder,
  useRenameFolder,
  useVideos,
} from '../api/hooks';
import {
  rootFolderId,
  topLevelParentId,
  type Folder,
  type Video,
} from '../api/types';
import { useIsCreator } from '../auth/MeContext';
import { FolderCard } from '../library/FolderCard';
import { Sidebar } from '../library/Sidebar';
import { Toolbar } from '../library/Toolbar';
import { isWatchable, VideoCard } from '../library/VideoCard';
import {
  aggregateCount,
  buildTree,
  childrenOf,
  depthOf,
  flattenTree,
  maxFolderDepth,
  pathOf,
  realFolders,
  subtreeIds,
} from '../library/tree';
import { followCursor } from '../library/dragOverlay';
import {
  defaultSort,
  defaultStatusFilter,
  deleteTitle,
  deleteWarning,
  keptFolderMessage,
  matchesQuery,
  matchesStatusFilter,
  parseSort,
  parseStatusFilter,
  refusedVideosMessage,
  sortVideos,
  useViewMode,
  videoSubject,
  type RefusedVideos,
} from '../library/state';
import { Button, Modal, Spinner } from '../ui/components';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSubmenu,
  type MenuPosition,
} from '../ui/ContextMenu';
import {
  charcoal,
  ember,
  lead,
  mint,
  paper,
  pine,
  rem,
  rose,
  shadowStrong,
  steel,
} from '../ui/theme';
import { folderCount, videoCount } from '../utils/format';
import { useDebounced } from '../utils/useDebounced';
import {
  applySelection,
  emptySelection,
  pruneSelection,
  selectionForContextMenu,
  type SelectionState,
} from './selection';

// two columns survive down to a tablet: at 768px the grid still fits two demos
// beside the tree, and only a phone is narrow enough to stack them
const layoutStyles = css({
  display: 'grid',
  gridTemplateColumns: `minmax(${rem(200)}, ${rem(240)}) 1fr`,
  gap: rem(32),
  alignItems: 'start',
  '@media (max-width: 900px)': {
    gridTemplateColumns: `minmax(${rem(160)}, ${rem(200)}) 1fr`,
    gap: rem(20),
  },
  '@media (max-width: 700px)': {
    gridTemplateColumns: '1fr',
    gap: rem(12),
  },
});

const breadcrumbStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  gap: rem(10),
  paddingBottom: rem(16),
});

const breadcrumbNameStyles = css({
  margin: 0,
  fontSize: rem(20),
  fontWeight: 'bold',
  color: charcoal.rgb,
});

const summaryStyles = css({ fontSize: rem(14), color: lead.rgb });

const sectionLabelStyles = css({
  fontSize: rem(12),
  letterSpacing: rem(1.2),
  textTransform: 'uppercase',
  color: lead.rgb,
  fontWeight: 'bold',
  paddingBottom: rem(10),
});

const folderGridStyles = css({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${rem(200)}, 1fr))`,
  gap: rem(12),
  paddingBottom: rem(28),
});

const videoGridStyles = css({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${rem(210)}, 1fr))`,
  gap: rem(16),
});

const selectionBarStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(12),
  marginBottom: rem(12),
  padding: `${rem(8)} ${rem(12)}`,
  borderRadius: rem(8),
  border: `1px solid ${pine.rgb}`,
  backgroundColor: mint.rgb,
});

const selectionCountStyles = css({
  fontSize: rem(14),
  fontWeight: 'bold',
  color: pine.rgb,
});

const videoListStyles = css({ display: 'grid', gap: rem(10) });

const emptyStyles = css({
  padding: rem(32),
  border: `1px dashed ${steel.rgb}`,
  borderRadius: rem(8),
  color: lead.rgb,
  textAlign: 'center' as const,
});

const alertStyles = css({
  margin: 0,
  paddingBottom: rem(16),
  fontSize: rem(14),
  color: ember.rgb,
});

const modalAlertStyles = css({
  margin: `${rem(16)} 0 0`,
  fontSize: rem(14),
  color: ember.rgb,
});

const dangerTitleStyles = css({
  margin: 0,
  fontSize: rem(18),
  fontWeight: 'bold',
  color: ember.rgb,
});

const dangerBodyStyles = css({
  margin: `${rem(12)} 0 0`,
  fontSize: rem(15),
  lineHeight: 1.5,
  color: charcoal.rgb,
});

const dangerNoticeStyles = css({
  marginTop: rem(16),
  padding: rem(12),
  borderRadius: rem(4),
  borderLeft: `${rem(3)} solid ${ember.rgb}`,
  backgroundColor: rose.rgb,
  fontSize: rem(14),
  color: charcoal.rgb,
});

const confirmInputStyles = css({
  boxSizing: 'border-box',
  width: '100%',
  marginTop: rem(8),
  padding: rem(10),
  borderRadius: rem(4),
  border: `1px solid ${steel.rgb}`,
  font: 'inherit',
  fontSize: rem(15),
});

const modalActionsStyles = css({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: rem(12),
  marginTop: rem(24),
});

const dragOverlayStyles = css({
  width: 'fit-content',
  padding: `${rem(10)} ${rem(16)}`,
  borderRadius: rem(6),
  backgroundColor: pine.rgb,
  color: paper.rgb,
  fontSize: rem(14),
  fontWeight: 'bold',
  boxShadow: `0 ${rem(4)} ${rem(12)} ${shadowStrong.rgb}`,
});

type FolderMenuState = { folder: Folder; position: MenuPosition };
type VideoMenuState = { position: MenuPosition };

// folder cards register as `card-<id>` so they never collide with the sidebar row ids
const folderIdFromDropTarget = (id: string): string =>
  id.startsWith('card-') ? id.slice('card-'.length) : id;

const folderDragPrefix = 'folder:';

const Home: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAllVideos = searchParams.get('view') === 'all';
  const folderParam = isAllVideos
    ? undefined
    : searchParams.get('folder') ?? undefined;
  const selectedFolder = folderParam === rootFolderId ? undefined : folderParam;
  const isCreator = useIsCreator();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 250).trim();
  const isSearching = debouncedQuery.length > 0;

  const folders = useFolders();
  const videos = useVideos(selectedFolder);
  const allVideos = useAllVideos(isAllVideos || isSearching);
  const counts = useFolderCounts();

  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const moveFolder = useMoveFolder();
  const bulkMove = useBulkMoveVideos();
  const bulkDelete = useBulkDeleteVideos();

  const [selection, setSelection] = useState<SelectionState>(emptySelection);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string>();
  const [folderMenu, setFolderMenu] = useState<FolderMenuState>();
  const [videoMenu, setVideoMenu] = useState<VideoMenuState>();
  const [folderToDelete, setFolderToDelete] = useState<Folder>();
  const [confirmName, setConfirmName] = useState('');
  const [isDeletingVideos, setIsDeletingVideos] = useState(false);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [creatingChildOf, setCreatingChildOf] = useState<string>();
  const [draggingFolderId, setDraggingFolderId] = useState<string>();

  const sort = parseSort(searchParams.get('sort'));
  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const [view, setView] = useViewMode();

  const setParam = useCallback(
    (key: string, value: string, fallback: string) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      });
    },
    [setSearchParams],
  );

  const folderList = useMemo(
    () => realFolders(folders.data ?? []),
    [folders.data],
  );
  const folderNames = useMemo(
    () => new Map(folderList.map(({ id, name }) => [id, name])),
    [folderList],
  );

  const filterAndSort = useCallback(
    (list: readonly Video[]): Video[] =>
      sortVideos(
        list.filter(
          (video) =>
            (isCreator || isWatchable(video)) &&
            (!isCreator || matchesStatusFilter(video, statusFilter)),
        ),
        sort,
      ),
    [isCreator, statusFilter, sort],
  );

  // search reads the one all-videos list rather than a request per folder
  const searchVideos = useMemo(
    () =>
      filterAndSort(
        (allVideos.data ?? []).filter((video) =>
          matchesQuery(video, debouncedQuery),
        ),
      ),
    [allVideos.data, debouncedQuery, filterAndSort],
  );

  const folderVideos = useMemo(
    () => filterAndSort(videos.data ?? []),
    [videos.data, filterAndSort],
  );

  const allVideosList = useMemo(
    () => filterAndSort(allVideos.data ?? []),
    [allVideos.data, filterAndSort],
  );

  // the folder path badge is what makes a mixed-folder list readable
  const showsFolderPath = isSearching || isAllVideos;

  const visibleVideos = isSearching
    ? searchVideos
    : isAllVideos
      ? allVideosList
      : folderVideos;

  const orderedIds = useMemo(
    () => visibleVideos.map(({ id }) => id),
    [visibleVideos],
  );

  const clearSelection = useCallback(() => setSelection(emptySelection), []);

  const videoNames = useMemo(
    () =>
      new Map(
        [...(allVideos.data ?? []), ...(videos.data ?? [])].map(
          ({ id, title }) => [id, title] as const,
        ),
      ),
    [allVideos.data, videos.data],
  );

  // whatever the server refused stays selected, so it is still the thing in hand
  const keepRefusedSelected = ({ locked, missing, rendering }: RefusedVideos) =>
    setSelection((current) =>
      pruneSelection(current, [
        ...(locked ?? []),
        ...(rendering ?? []),
        ...(missing ?? []),
      ]),
    );

  const libraryMutations = [
    createFolder,
    renameFolder,
    moveFolder,
    bulkMove,
    bulkDelete,
  ];
  const libraryMutationsRef = useRef(libraryMutations);
  libraryMutationsRef.current = libraryMutations;

  // a settled mutation stays terminal until it is reset, so every library action
  // starts by dropping the outcomes of the ones before it. Resetting one that is
  // still running would detach the callbacks it was started with, so those stay.
  const clearLibraryOutcomes = useCallback(() => {
    libraryMutationsRef.current.forEach((mutation) => {
      if (!mutation.isPending) mutation.reset();
    });
  }, []);

  const startFolderCreate = (variables: {
    name: string;
    parentId?: string;
  }) => {
    clearLibraryOutcomes();
    createFolder.mutate(variables);
  };

  const startFolderRename = (id: string, name: string) => {
    clearLibraryOutcomes();
    renameFolder.mutate({ id, name });
  };

  const moveSelected = (ids: string[], folderId: string) => {
    clearLibraryOutcomes();
    bulkMove.mutate({ ids, folderId }, { onSuccess: keepRefusedSelected });
  };

  useEffect(() => {
    setSelection((current) => pruneSelection(current, orderedIds));
  }, [orderedIds]);

  // the alert speaks about the folder in hand, so it goes when that folder does
  useEffect(() => {
    clearSelection();
    clearLibraryOutcomes();
  }, [selectedFolder, isAllVideos, clearSelection, clearLibraryOutcomes]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearSelection();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clearSelection]);

  const selectedVideos = useMemo(
    () => visibleVideos.filter(({ id }) => selection.ids.includes(id)),
    [visibleVideos, selection.ids],
  );

  const onCardSelect = (id: string) => (event: ReactMouseEvent) => {
    setSelection((current) =>
      applySelection(current, orderedIds, id, {
        toggle: event.metaKey || event.ctrlKey,
        range: event.shiftKey,
      }),
    );
  };

  const onCardOpenMenu = (id: string) => (position: MenuPosition) => {
    setFolderMenu(undefined);
    setSelection((current) => selectionForContextMenu(current, id));
    setVideoMenu({ position });
  };

  const onFolderContextMenu = (folder: Folder) => (event: ReactMouseEvent) => {
    event.preventDefault();
    setVideoMenu(undefined);
    setFolderMenu({ folder, position: { x: event.clientX, y: event.clientY } });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // a browser without pointer events still has to be able to drag a card
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const draggingIdsRef = useRef<string[]>([]);

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setVideoMenu(undefined);
    setFolderMenu(undefined);

    if (id.startsWith(folderDragPrefix)) {
      setDraggingFolderId(id.slice(folderDragPrefix.length));
      return;
    }

    const next = selectionForContextMenu(selection, id);
    if (next !== selection) setSelection(next);
    draggingIdsRef.current = [...next.ids];
    setDraggingIds(draggingIdsRef.current);
  };

  // a finished drag still fires the underlying link's click; swallow that one
  const suppressNavRef = useRef(false);
  const suppressNextNav = () => {
    suppressNavRef.current = true;
    setTimeout(() => {
      suppressNavRef.current = false;
    }, 0);
  };
  const guardNav = (event: { preventDefault: () => void }) => {
    if (suppressNavRef.current) event.preventDefault();
  };

  const resetDrag = () => {
    if (draggingIdsRef.current.length > 0 || draggingFolderId) {
      suppressNextNav();
    }
    draggingIdsRef.current = [];
    setDraggingIds([]);
    setDraggingFolderId(undefined);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const ids = draggingIdsRef.current;
    const movedFolderId = draggingFolderId;
    resetDrag();

    const target = event.over
      ? folderIdFromDropTarget(String(event.over.id))
      : undefined;
    if (!target) return;

    if (movedFolderId) {
      // a folder can never land on itself or inside its own subtree
      if (
        target !== topLevelParentId &&
        subtreeIds(movedFolderId, folderList).includes(target)
      ) {
        return;
      }
      if (target === rootFolderId) return;
      clearLibraryOutcomes();
      moveFolder.mutate({ id: movedFolderId, parentId: target });
      return;
    }

    if (ids.length === 0) return;
    moveSelected(ids, target);
  };

  const resetFolderDelete = deleteFolder.reset;

  const openFolderDeleteModal = useCallback(
    (folder: Folder) => {
      resetFolderDelete();
      setFolderToDelete(folder);
      setConfirmName('');
    },
    [resetFolderDelete],
  );

  const closeFolderDeleteModal = () => {
    setFolderToDelete(undefined);
    setConfirmName('');
  };

  const confirmFolderDelete = () => {
    if (!folderToDelete) return;
    const { id } = folderToDelete;
    clearLibraryOutcomes();
    deleteFolder.mutate(id, {
      onSuccess: (result) => {
        // a folder kept because of what is inside it has not been deleted
        if ((result?.kept ?? []).length > 0) return;
        closeFolderDeleteModal();
        if (selectedFolder === id) void navigate('/');
      },
    });
  };

  const confirmVideoDelete = () => {
    clearLibraryOutcomes();
    bulkDelete.mutate(selection.ids as string[], {
      onSuccess: ({ locked, missing, rendering }) => {
        setIsDeletingVideos(false);
        // anything the server refused survives, so it stays selected and
        // visible rather than silently looking deleted
        keepRefusedSelected({ locked, missing, rendering });
      },
    });
  };

  const moveTargets = useMemo(
    () =>
      [
        { folder: { id: rootFolderId, name: 'Home' }, depth: 0 },
        ...flattenTree(buildTree(folderList)),
      ].filter(({ folder }) => folder.id !== selectedFolder),
    [folderList, selectedFolder],
  );
  const singleSelected =
    selectedVideos.length === 1 ? selectedVideos[0] : undefined;

  const selectedTitles = selectedVideos.map(({ title }) => title);

  const openSelectionMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setFolderMenu(undefined);
    setVideoMenu({ position: { x: bounds.left, y: bounds.bottom + 4 } });
  };

  const dragLabel =
    draggingIds.length === 1
      ? visibleVideos.find(({ id }) => id === draggingIds[0])?.title ??
        videoCount(1)
      : videoCount(draggingIds.length);

  const subtreeCounts = useMemo(() => {
    if (!folderToDelete) return undefined;
    const videoTotal = aggregateCount(
      folderToDelete.id,
      folderList,
      counts.data,
    );
    if (videoTotal === undefined) return undefined;
    return {
      videos: videoTotal,
      folders: subtreeIds(folderToDelete.id, folderList).length - 1,
    };
  }, [folderToDelete, folderList, counts.data]);

  const isEmptyFolderDelete =
    subtreeCounts !== undefined &&
    subtreeCounts.videos === 0 &&
    subtreeCounts.folders === 0;

  const unfiledCount = counts.data?.[rootFolderId];

  const allVideosCount = useMemo(
    () =>
      counts.data
        ? Object.values(counts.data).reduce((sum, value) => sum + value, 0)
        : undefined,
    [counts.data],
  );

  const currentFolderName = selectedFolder
    ? folderNames.get(selectedFolder) ?? 'Folder'
    : 'Home';

  // top level on Home, the direct subfolders of the folder being viewed otherwise
  const childFolders = useMemo(
    () => childrenOf(selectedFolder, folderList),
    [selectedFolder, folderList],
  );

  const currentDepth = selectedFolder ? depthOf(selectedFolder, folderList) : 0;

  const canCreateHere = currentDepth < maxFolderDepth;

  const blockedTargetIds = useMemo(
    () =>
      draggingFolderId
        ? new Set(subtreeIds(draggingFolderId, folderList))
        : new Set<string>(),
    [draggingFolderId, folderList],
  );

  const isBlockedTarget = useCallback(
    (folderId: string) => blockedTargetIds.has(folderId),
    [blockedTargetIds],
  );

  const draggingFolderIsTopLevel =
    draggingFolderId !== undefined &&
    childrenOf(undefined, folderList).some(({ id }) => id === draggingFolderId);

  // Home takes videos (unfile) and folders (detach to top level), unless already there
  const homeDroppableId = !isCreator
    ? undefined
    : draggingFolderId
      ? draggingFolderIsTopLevel
        ? undefined
        : topLevelParentId
      : selectedFolder || isSearching || isAllVideos
        ? rootFolderId
        : undefined;

  const folderPathLabel = useCallback(
    (folderId: string) =>
      folderId === rootFolderId
        ? 'Home'
        : pathOf(folderId, folderList)
            .map(({ name }) => name)
            .join(' / '),
    [folderList],
  );

  const createFolderHere = (name: string) =>
    startFolderCreate({ name, parentId: selectedFolder });

  const libraryOutcomes = [
    {
      at: createFolder.submittedAt,
      message: createFolder.isError
        ? 'We could not create that folder. Try again in a moment.'
        : undefined,
    },
    {
      at: renameFolder.submittedAt,
      message: renameFolder.isError
        ? 'We could not rename that folder. Try again in a moment.'
        : undefined,
    },
    {
      at: moveFolder.submittedAt,
      message: moveFolder.isError
        ? 'We could not move that folder. Try again in a moment.'
        : undefined,
    },
    {
      at: bulkMove.submittedAt,
      message: bulkMove.isError
        ? `We could not move ${videoSubject(
            bulkMove.variables?.ids ?? [],
            videoNames,
          )}. Try again in a moment.`
        : bulkMove.isSuccess
          ? refusedVideosMessage(bulkMove.data, 'move', videoNames)
          : undefined,
    },
    {
      at: bulkDelete.submittedAt,
      // the delete modal carries its own failure, so this only reports the rest
      message:
        bulkDelete.isSuccess && !isDeletingVideos
          ? refusedVideosMessage(bulkDelete.data, 'delete', videoNames)
          : undefined,
    },
  ];

  // one line reports the change the creator made last, by when each was started.
  // Only actions still running when the latest one began survive
  // clearLibraryOutcomes, so the newest one with something to say is never stale,
  // and a newer change that has nothing to say still leaves nothing behind it
  const libraryAlert = [...libraryOutcomes]
    .sort((first, second) => second.at - first.at)
    .find(({ message }) => message !== undefined)?.message;

  const folderDeleteAlert = deleteFolder.isError
    ? 'We could not delete that folder. Try again in a moment.'
    : folderToDelete && deleteFolder.isSuccess
      ? keptFolderMessage(deleteFolder.data, folderToDelete.name)
      : undefined;

  const videoDeleteAlert = bulkDelete.isError
    ? `We could not delete ${videoSubject(
        bulkDelete.variables ?? [],
        videoNames,
      )}. Try again in a moment.`
    : undefined;

  const usesAllVideos = isSearching || isAllVideos;
  const isLoadingList = usesAllVideos ? allVideos.isLoading : videos.isLoading;
  const hasListError = usesAllVideos ? allVideos.isError : videos.isError;
  const isEmpty = !isLoadingList && !hasListError && visibleVideos.length === 0;
  // a folder card is a video listing in disguise, so it has no place in a list
  // that has been narrowed to drafts or to published demos
  const showsFolderCards =
    !isSearching &&
    !isAllVideos &&
    childFolders.length > 0 &&
    statusFilter === defaultStatusFilter;

  if (folderParam === rootFolderId) return <Navigate to="/" replace />;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={resetDrag}
    >
      <div
        css={layoutStyles}
        onClick={(event) => {
          if (event.target === event.currentTarget) clearSelection();
        }}
      >
        <Sidebar
          folders={folderList}
          counts={counts.data}
          unfiledCount={unfiledCount}
          selectedFolder={selectedFolder}
          isCreator={isCreator}
          isLoading={folders.isLoading}
          isCreatingFolder={isCreatingFolder}
          creatingChildOf={creatingChildOf}
          renamingFolderId={renamingFolderId}
          onStartCreate={() => setIsCreatingFolder(true)}
          onCancelCreate={() => setIsCreatingFolder(false)}
          onCreate={(name) => {
            setIsCreatingFolder(false);
            startFolderCreate({ name });
          }}
          onCancelCreateChild={() => setCreatingChildOf(undefined)}
          onCreateChild={(parentId, name) => {
            setCreatingChildOf(undefined);
            startFolderCreate({ name, parentId });
          }}
          onCancelRename={() => setRenamingFolderId(undefined)}
          onRename={(id, name) => {
            setRenamingFolderId(undefined);
            startFolderRename(id, name);
          }}
          isBlockedTarget={isBlockedTarget}
          homeDroppableId={homeDroppableId}
          isAllVideos={isAllVideos}
          allVideosCount={allVideosCount}
          onFolderContextMenu={onFolderContextMenu}
          onNavClick={guardNav}
        />

        <section
          onClick={(event) => {
            if (event.target === event.currentTarget) clearSelection();
          }}
        >
          <Toolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={(next) => setParam('sort', next, defaultSort)}
            view={view}
            onViewChange={setView}
            statusFilter={statusFilter}
            onStatusFilterChange={(next) =>
              setParam('status', next, defaultStatusFilter)
            }
            isCreator={isCreator}
            currentLocationName={currentFolderName}
            canCreateHere={canCreateHere}
            onCreateFolderHere={createFolderHere}
          />

          <div css={breadcrumbStyles}>
            <h1 css={breadcrumbNameStyles}>
              {isSearching
                ? `Results for "${debouncedQuery}"`
                : isAllVideos
                  ? 'All videos'
                  : currentFolderName}
            </h1>
            <span css={summaryStyles}>
              {videoCount(visibleVideos.length)}
              {showsFolderCards && ` · ${folderCount(childFolders.length)}`}
            </span>
          </div>

          {libraryAlert && (
            <p css={alertStyles} role="alert">
              {libraryAlert}
            </p>
          )}

          {showsFolderCards && (
            <>
              <div css={sectionLabelStyles}>Folders</div>
              <div css={folderGridStyles}>
                {childFolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    count={
                      childrenOf(folder.id, folderList).length > 0
                        ? aggregateCount(folder.id, folderList, counts.data)
                        : counts.data?.[folder.id]
                    }
                    isDropTarget={isCreator && !isBlockedTarget(folder.id)}
                    isDraggable={isCreator}
                    onContextMenu={
                      isCreator ? onFolderContextMenu(folder) : undefined
                    }
                    onNavClick={guardNav}
                  />
                ))}
              </div>
            </>
          )}

          {isLoadingList && <Spinner label="Loading videos" />}
          {hasListError && (
            <div css={emptyStyles}>
              {usesAllVideos
                ? 'We could not load the videos.'
                : 'We could not load the videos in this folder.'}
            </div>
          )}
          {isEmpty && (
            <div css={emptyStyles}>
              {isSearching
                ? `No results for ${debouncedQuery}`
                : isAllVideos
                  ? 'No videos yet.'
                  : 'No videos here yet.'}
            </div>
          )}

          {isCreator && selectedVideos.length > 0 && (
            <div css={selectionBarStyles}>
              <span css={selectionCountStyles} role="status">
                {`${selectedVideos.length} selected`}
              </span>
              <span css={{ marginLeft: 'auto', display: 'flex', gap: rem(8) }}>
                <Button small aria-haspopup="menu" onClick={openSelectionMenu}>
                  Actions
                </Button>
                <Button small onClick={clearSelection}>
                  Clear
                </Button>
              </span>
            </div>
          )}

          <div css={view === 'grid' ? videoGridStyles : videoListStyles}>
            {visibleVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                view={view}
                isCreator={isCreator}
                isSelected={selection.ids.includes(video.id)}
                folderName={
                  showsFolderPath ? folderPathLabel(video.folderId) : undefined
                }
                onSelect={onCardSelect(video.id)}
                onOpenMenu={onCardOpenMenu(video.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <DragOverlay dropAnimation={null} modifiers={[followCursor]}>
        {draggingFolderId ? (
          <div css={dragOverlayStyles}>
            {folderNames.get(draggingFolderId) ?? 'Folder'}
          </div>
        ) : draggingIds.length > 0 ? (
          <div css={dragOverlayStyles}>{dragLabel}</div>
        ) : null}
      </DragOverlay>

      {folderMenu && (
        <ContextMenu
          label={`Actions for ${folderMenu.folder.name}`}
          position={folderMenu.position}
          onClose={() => setFolderMenu(undefined)}
        >
          <ContextMenuItem
            onSelect={() => {
              setRenamingFolderId(folderMenu.folder.id);
              setFolderMenu(undefined);
            }}
          >
            Rename
          </ContextMenuItem>
          {depthOf(folderMenu.folder.id, folderList) < maxFolderDepth && (
            <ContextMenuItem
              onSelect={() => {
                setCreatingChildOf(folderMenu.folder.id);
                setFolderMenu(undefined);
              }}
            >
              New subfolder
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            danger
            onSelect={() => {
              const { folder } = folderMenu;
              setFolderMenu(undefined);
              openFolderDeleteModal(folder);
            }}
          >
            Delete
          </ContextMenuItem>
        </ContextMenu>
      )}

      {videoMenu && (
        <ContextMenu
          label="Video actions"
          position={videoMenu.position}
          onClose={() => setVideoMenu(undefined)}
        >
          {singleSelected && isWatchable(singleSelected) && (
            <ContextMenuItem
              onSelect={() => {
                setVideoMenu(undefined);
                void navigate(`/videos/${singleSelected.id}`);
              }}
            >
              Watch
            </ContextMenuItem>
          )}
          {singleSelected && (
            <ContextMenuItem
              onSelect={() => {
                setVideoMenu(undefined);
                void navigate(`/studio/videos/${singleSelected.id}`);
              }}
            >
              Edit
            </ContextMenuItem>
          )}
          <ContextMenuSubmenu label="Move to folder">
            {moveTargets.map(({ folder, depth }) => (
              <ContextMenuItem
                key={folder.id}
                disabled={folder.id === rootFolderId && !selectedFolder}
                onSelect={() => {
                  setVideoMenu(undefined);
                  moveSelected(selection.ids as string[], folder.id);
                }}
              >
                <span css={{ paddingLeft: rem(depth * 14) }}>
                  {folder.name}
                </span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubmenu>
          <ContextMenuSeparator />
          <ContextMenuItem
            danger
            onSelect={() => {
              setVideoMenu(undefined);
              bulkDelete.reset();
              setIsDeletingVideos(true);
            }}
          >
            {selection.ids.length > 1
              ? `Delete ${videoCount(selection.ids.length)}`
              : 'Delete'}
          </ContextMenuItem>
        </ContextMenu>
      )}

      {folderToDelete && (
        <Modal
          label={`Delete folder ${folderToDelete.name}`}
          onClose={closeFolderDeleteModal}
        >
          {subtreeCounts === undefined && !counts.isError ? (
            <Spinner label="Checking folder contents" />
          ) : (
            <>
              <h2 css={dangerTitleStyles}>
                Delete &ldquo;{folderToDelete.name}&rdquo;?
              </h2>
              {isEmptyFolderDelete ? (
                <p css={dangerBodyStyles}>
                  This folder is empty. Deleting it cannot be undone.
                </p>
              ) : (
                <>
                  <p css={dangerBodyStyles}>
                    {subtreeCounts
                      ? `This folder contains ${videoCount(
                          subtreeCounts.videos,
                        )} and ${folderCount(subtreeCounts.folders)}.`
                      : 'We could not count what is inside this folder.'}
                  </p>
                  <div css={dangerNoticeStyles}>
                    {subtreeCounts ? (
                      <>
                        {videoCount(subtreeCounts.videos)} and{' '}
                        {subtreeCounts.folders === 1
                          ? '1 subfolder'
                          : `${subtreeCounts.folders} subfolders`}
                        , including their video files, will be permanently
                        deleted and cannot be recovered.
                      </>
                    ) : (
                      'This folder, everything in it and every subfolder will be permanently deleted and cannot be recovered.'
                    )}
                  </div>
                  <label css={{ display: 'block', marginTop: rem(16) }}>
                    <span css={{ fontSize: rem(14), color: lead.rgb }}>
                      Type <strong>{folderToDelete.name}</strong> to confirm
                    </span>
                    <input
                      css={confirmInputStyles}
                      aria-label="Type the folder name to confirm"
                      value={confirmName}
                      onChange={(event) => setConfirmName(event.target.value)}
                    />
                  </label>
                </>
              )}
              {folderDeleteAlert && (
                <p css={modalAlertStyles} role="alert">
                  {folderDeleteAlert}
                </p>
              )}
              <div css={modalActionsStyles}>
                <Button onClick={closeFolderDeleteModal}>Cancel</Button>
                <Button
                  danger
                  disabled={
                    deleteFolder.isPending ||
                    (!isEmptyFolderDelete &&
                      confirmName !== folderToDelete.name)
                  }
                  onClick={confirmFolderDelete}
                >
                  Delete
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}

      {isDeletingVideos && (
        <Modal
          label={deleteTitle(selectedTitles)}
          onClose={() => setIsDeletingVideos(false)}
        >
          <h2 css={dangerTitleStyles}>{deleteTitle(selectedTitles)}</h2>
          <div css={dangerNoticeStyles}>{deleteWarning(selectedTitles)}</div>
          {videoDeleteAlert && (
            <p css={modalAlertStyles} role="alert">
              {videoDeleteAlert}
            </p>
          )}
          <div css={modalActionsStyles}>
            <Button onClick={() => setIsDeletingVideos(false)}>Cancel</Button>
            <Button
              danger
              disabled={bulkDelete.isPending}
              onClick={confirmVideoDelete}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </DndContext>
  );
};

export default Home;
