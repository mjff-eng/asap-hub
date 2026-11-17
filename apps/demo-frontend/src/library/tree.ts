import { rootFolderId, type Folder } from '../api/types';

export const maxFolderDepth = 3;

export type FolderNode = {
  readonly folder: Folder;
  readonly depth: number;
  readonly children: readonly FolderNode[];
};

const isRealFolder = (folder: Folder): boolean => folder.id !== rootFolderId;

// the API returns a synthetic ROOT folder; Home stands in for it in the UI
export const realFolders = (folders: readonly Folder[]): Folder[] =>
  folders.filter(isRealFolder);

// a parentId pointing at a missing or synthetic folder falls back to top level
export const buildTree = (folders: readonly Folder[]): FolderNode[] => {
  const real = folders.filter(isRealFolder);
  const ids = new Set(real.map(({ id }) => id));

  const childrenOf = (
    parentId: string | undefined,
    depth: number,
  ): FolderNode[] =>
    real
      .filter((folder) => {
        const parent =
          folder.parentId && ids.has(folder.parentId)
            ? folder.parentId
            : undefined;
        return parent === parentId;
      })
      .map((folder) => ({
        folder,
        depth,
        children:
          depth + 1 < maxFolderDepth ? childrenOf(folder.id, depth + 1) : [],
      }));

  return childrenOf(undefined, 0);
};

export type FlatFolder = { readonly folder: Folder; readonly depth: number };

export const flattenTree = (nodes: readonly FolderNode[]): FlatFolder[] =>
  nodes.flatMap(({ folder, depth, children }) => [
    { folder, depth },
    ...flattenTree(children),
  ]);

export const subtreeIds = (
  id: string,
  folders: readonly Folder[],
): string[] => {
  const ids = [id];
  for (let index = 0; index < ids.length; index += 1) {
    const parentId = ids[index];
    folders.forEach((folder) => {
      if (
        isRealFolder(folder) &&
        folder.parentId === parentId &&
        !ids.includes(folder.id)
      ) {
        ids.push(folder.id);
      }
    });
  }
  return ids;
};

export const pathOf = (id: string, folders: readonly Folder[]): Folder[] => {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: Folder[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
};

export const depthOf = (id: string, folders: readonly Folder[]): number =>
  pathOf(id, folders).length;

export const childrenOf = (
  id: string | undefined,
  folders: readonly Folder[],
): Folder[] => {
  const ids = new Set(folders.filter(isRealFolder).map((folder) => folder.id));
  return folders.filter((folder) => {
    if (!isRealFolder(folder)) return false;
    const parent =
      folder.parentId && ids.has(folder.parentId) ? folder.parentId : undefined;
    return parent === id;
  });
};

export const aggregateCount = (
  id: string,
  folders: readonly Folder[],
  counts: Record<string, number> | undefined,
): number | undefined => {
  if (!counts) return undefined;
  return subtreeIds(id, folders).reduce(
    (sum, folderId) => sum + (counts[folderId] ?? 0),
    0,
  );
};
