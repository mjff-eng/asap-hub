/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  FC,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router';

import type { Folder, FolderCounts } from '../api/types';
import { Spinner } from '../ui/components';
import {
  cerulean,
  charcoal,
  info100,
  lead,
  mint,
  pine,
  rem,
  silver,
  tin,
} from '../ui/theme';
import {
  CaretIcon,
  FolderIcon,
  HomeIcon,
  KebabIcon,
  PlusIcon,
  StackIcon,
} from './icons';
import { aggregateCount, buildTree, pathOf, type FolderNode } from './tree';
import { useIsNarrow } from './useIsNarrow';

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: rem(8),
});

const headingStyles = css({
  margin: 0,
  fontSize: rem(12),
  letterSpacing: rem(1.2),
  textTransform: 'uppercase',
  color: lead.rgb,
  fontWeight: 'bold',
});

const disclosureStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(8),
  padding: `${rem(4)} ${rem(6)}`,
  margin: `0 0 0 ${rem(-6)}`,
  border: 'none',
  borderRadius: rem(4),
  background: 'none',
  font: 'inherit',
  cursor: 'pointer',
});

const iconButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(26),
  height: rem(26),
  padding: 0,
  border: 'none',
  borderRadius: rem(4),
  background: 'none',
  color: lead.rgb,
  cursor: 'pointer',
  ':hover': { backgroundColor: silver.rgb, color: charcoal.rgb },
});

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: rem(2),
});

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(10),
  padding: `${rem(8)} ${rem(12)}`,
  borderRadius: rem(6),
  color: charcoal.rgb,
  fontSize: rem(15),
  ':hover': { backgroundColor: silver.rgb },
});

const rowLinkStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(10),
  flex: 1,
  minWidth: 0,
  color: 'inherit',
  font: 'inherit',
  textDecoration: 'none',
});

const activeRowStyles = css({
  backgroundColor: mint.rgb,
  color: pine.rgb,
  fontWeight: 'bold',
  ':hover': { backgroundColor: mint.rgb },
});

// the armed drop target must not borrow the green of the folder you are already
// in, or there is no telling which row a drop would land on
const dropTargetStyles = css({
  backgroundColor: info100.rgb,
  outline: `2px dashed ${cerulean.rgb}`,
  outlineOffset: rem(-2),
  color: cerulean.rgb,
  fontWeight: 'bold',
});

const labelStyles = css({
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const countStyles = css({
  fontSize: rem(13),
  fontWeight: 'normal',
  color: tin.rgb,
  fontVariantNumeric: 'tabular-nums',
});

const caretStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(18),
  height: rem(18),
  marginLeft: rem(-4),
  padding: 0,
  border: 'none',
  borderRadius: rem(4),
  background: 'none',
  color: tin.rgb,
  cursor: 'pointer',
  transition: 'transform 120ms',
  ':hover': { color: charcoal.rgb },
});

const caretOpenStyles = css({ transform: 'rotate(90deg)' });

const caretSpacerStyles = css({ width: rem(18), marginLeft: rem(-4) });

const kebabStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(20),
  height: rem(20),
  padding: 0,
  border: 'none',
  borderRadius: rem(4),
  background: 'none',
  color: lead.rgb,
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity 120ms',
  ':hover, :focus-visible': { color: charcoal.rgb },
});

const rowHoverStyles = css({
  ':hover .row-kebab, :focus-within .row-kebab': { opacity: 1 },
});

const inputStyles = css({
  boxSizing: 'border-box',
  width: '100%',
  padding: `${rem(7)} ${rem(11)}`,
  borderRadius: rem(6),
  border: `1px solid ${pine.rgb}`,
  font: 'inherit',
  fontSize: rem(15),
  color: charcoal.rgb,
});

export const InlineFolderInput: FC<{
  readonly initialValue?: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly onSubmit: (name: string) => void;
  readonly onCancel: () => void;
}> = ({ initialValue = '', label, placeholder, onSubmit, onCancel }) => {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (trimmed) onSubmit(trimmed);
        else onCancel();
      }}
    >
      <input
        autoFocus
        aria-label={label}
        placeholder={placeholder}
        css={inputStyles}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={onCancel}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      />
    </form>
  );
};

const SidebarRow: FC<{
  readonly to: string;
  readonly icon: ReactNode;
  readonly name: string;
  readonly count?: number;
  readonly isActive: boolean;
  readonly depth?: number;
  readonly hasChildren?: boolean;
  readonly isExpanded?: boolean;
  readonly onToggle?: () => void;
  readonly droppableId?: string;
  readonly draggableId?: string;
  readonly onContextMenu?: (event: ReactMouseEvent) => void;
  readonly onMenuButton?: (event: ReactMouseEvent) => void;
  readonly onNavClick?: (event: ReactMouseEvent) => void;
}> = ({
  to,
  icon,
  name,
  count,
  isActive,
  depth = 0,
  hasChildren = false,
  isExpanded = false,
  onToggle,
  droppableId,
  draggableId,
  onContextMenu,
  onMenuButton,
  onNavClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId ?? `sidebar-${name}`,
    disabled: droppableId === undefined,
  });
  // the drag a11y attributes are deliberately not spread: they would put
  // role="button" back on the row, and no keyboard sensor is registered
  const {
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: draggableId ?? `sidebar-drag-${name}`,
    disabled: draggableId === undefined,
  });
  // the row is a container, not a link: the caret and the kebab are siblings of
  // the link rather than buttons nested inside it
  return (
    <div
      ref={(node: HTMLDivElement | null) => {
        setNodeRef(node);
        if (draggableId !== undefined) setDragRef(node);
      }}
      onContextMenu={onContextMenu}
      {...(draggableId !== undefined ? listeners : {})}
      css={[
        rowStyles,
        rowHoverStyles,
        { paddingLeft: rem(12 + depth * 16) },
        isDragging && { opacity: 0.4 },
        isActive && activeRowStyles,
        droppableId !== undefined && isOver && dropTargetStyles,
      ]}
    >
      {hasChildren && onToggle ? (
        <button
          type="button"
          aria-label={isExpanded ? `Collapse ${name}` : `Expand ${name}`}
          aria-expanded={isExpanded}
          css={[caretStyles, isExpanded && caretOpenStyles]}
          onClick={onToggle}
        >
          <CaretIcon size={12} />
        </button>
      ) : (
        <span css={caretSpacerStyles} aria-hidden />
      )}
      <Link
        to={to}
        draggable={false}
        onClick={onNavClick}
        css={rowLinkStyles}
        aria-current={isActive ? 'page' : undefined}
      >
        <span css={{ display: 'flex', color: 'inherit' }}>{icon}</span>
        <span css={labelStyles}>{name}</span>
      </Link>
      {onMenuButton && (
        <button
          type="button"
          className="row-kebab"
          aria-label={`Actions for ${name}`}
          css={kebabStyles}
          onClick={onMenuButton}
        >
          <KebabIcon size={14} />
        </button>
      )}
      {count !== undefined && <span css={countStyles}>{count}</span>}
    </div>
  );
};

const expandedKey = 'demo-hub.library.expanded-folders';

const readExpanded = (): string[] => {
  try {
    const raw = window.localStorage.getItem(expandedKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
};

const useExpandedFolders = (
  folders: readonly Folder[],
  selectedFolder?: string,
): [ReadonlySet<string>, (id: string) => void] => {
  const [expanded, setExpanded] = useState<string[]>(readExpanded);

  const ancestors = useMemo(
    () =>
      selectedFolder
        ? pathOf(selectedFolder, folders)
            .slice(0, -1)
            .map(({ id }) => id)
        : [],
    [selectedFolder, folders],
  );

  const persist = useCallback((next: string[]) => {
    setExpanded(next);
    try {
      window.localStorage.setItem(expandedKey, JSON.stringify(next));
    } catch {
      // a blocked storage should not break the tree
    }
  }, []);

  const toggle = useCallback(
    (id: string) =>
      persist(
        expanded.includes(id)
          ? expanded.filter((value) => value !== id)
          : [...expanded, id],
      ),
    [expanded, persist],
  );

  const visible = useMemo(
    () => new Set([...expanded, ...ancestors]),
    [expanded, ancestors],
  );

  return [visible, toggle];
};

const homeExpandedKey = 'demo-hub.library.home-expanded';

// Home is the root of the tree and starts open, so only an explicit "0" collapses it
const useHomeExpanded = (): [boolean, () => void] => {
  const [expanded, setExpanded] = useState(() => {
    try {
      return window.localStorage.getItem(homeExpandedKey) !== '0';
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setExpanded((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(homeExpandedKey, next ? '1' : '0');
      } catch {
        // a blocked storage should not break the tree
      }
      return next;
    });
  }, []);

  return [expanded, toggle];
};

export const Sidebar: FC<{
  readonly folders: readonly Folder[];
  readonly counts?: FolderCounts;
  readonly unfiledCount?: number;
  readonly selectedFolder?: string;
  readonly isCreator: boolean;
  readonly isLoading: boolean;
  readonly isCreatingFolder: boolean;
  readonly creatingChildOf?: string;
  readonly renamingFolderId?: string;
  readonly onStartCreate: () => void;
  readonly onCreate: (name: string) => void;
  readonly onCancelCreate: () => void;
  readonly onCreateChild: (parentId: string, name: string) => void;
  readonly onCancelCreateChild: () => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onCancelRename: () => void;
  readonly isBlockedTarget: (folderId: string) => boolean;
  readonly homeDroppableId?: string;
  readonly isAllVideos: boolean;
  readonly allVideosCount?: number;
  readonly onFolderContextMenu: (
    folder: Folder,
  ) => (event: ReactMouseEvent) => void;
  readonly onNavClick: (event: ReactMouseEvent) => void;
}> = ({
  folders,
  counts,
  unfiledCount,
  selectedFolder,
  isCreator,
  isLoading,
  isCreatingFolder,
  creatingChildOf,
  renamingFolderId,
  onStartCreate,
  onCreate,
  onCancelCreate,
  onCreateChild,
  onCancelCreateChild,
  onRename,
  onCancelRename,
  isBlockedTarget,
  homeDroppableId,
  isAllVideos,
  allVideosCount,
  onFolderContextMenu,
  onNavClick,
}) => {
  const [expanded, toggle] = useExpandedFolders(folders, selectedFolder);
  const [homeExpanded, toggleHome] = useHomeExpanded();
  const isNarrow = useIsNarrow();
  const [treeOpen, setTreeOpen] = useState(false);
  // the input blurs itself shut on the press, so the click has to remember
  // whether it was open or a second press would silently reopen it
  const wasCreating = useRef(false);
  const tree = useMemo(() => buildTree(folders), [folders]);

  // Home occupies depth 0, so every real folder renders one level deeper
  const renderNode = ({
    folder,
    depth: folderDepth,
    children,
  }: FolderNode): ReactNode => {
    const depth = folderDepth + 1;
    const isExpanded = expanded.has(folder.id) || creatingChildOf === folder.id;
    const hasChildren = children.length > 0;
    const direct = counts?.[folder.id];
    const count = hasChildren
      ? aggregateCount(folder.id, folders, counts)
      : direct;

    return (
      <li key={folder.id}>
        {renamingFolderId === folder.id ? (
          <div css={{ paddingLeft: rem(depth * 16) }}>
            <InlineFolderInput
              initialValue={folder.name}
              label={`Rename ${folder.name}`}
              onCancel={onCancelRename}
              onSubmit={(name) => onRename(folder.id, name)}
            />
          </div>
        ) : (
          <SidebarRow
            to={`/?folder=${folder.id}`}
            icon={<FolderIcon />}
            name={folder.name}
            count={count}
            depth={depth}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            onToggle={hasChildren ? () => toggle(folder.id) : undefined}
            isActive={selectedFolder === folder.id}
            droppableId={
              isCreator &&
              selectedFolder !== folder.id &&
              !isBlockedTarget(folder.id)
                ? folder.id
                : undefined
            }
            draggableId={isCreator ? `folder:${folder.id}` : undefined}
            onContextMenu={isCreator ? onFolderContextMenu(folder) : undefined}
            onMenuButton={isCreator ? onFolderContextMenu(folder) : undefined}
            onNavClick={onNavClick}
          />
        )}
        {(isExpanded || creatingChildOf === folder.id) && (
          <ul css={listStyles}>
            {creatingChildOf === folder.id && (
              <li css={{ paddingLeft: rem((depth + 1) * 16) }}>
                <InlineFolderInput
                  label={`New subfolder in ${folder.name}`}
                  placeholder="Folder name"
                  onCancel={onCancelCreateChild}
                  onSubmit={(name) => onCreateChild(folder.id, name)}
                />
              </li>
            )}
            {children.map(renderNode)}
          </ul>
        )}
      </li>
    );
  };

  // the label is the landmark's own name, so it never competes with the page
  // heading for the first entry in the heading outline
  return (
    <aside aria-label="Folders">
      <div css={headerStyles}>
        {isNarrow ? (
          <button
            type="button"
            css={[disclosureStyles, headingStyles]}
            aria-expanded={treeOpen}
            onClick={() => setTreeOpen((open) => !open)}
          >
            <span css={[caretStyles, treeOpen && caretOpenStyles]}>
              <CaretIcon size={12} />
            </span>
            Folders
          </button>
        ) : (
          <div css={headingStyles}>Folders</div>
        )}
        {isCreator && (
          <button
            type="button"
            css={iconButtonStyles}
            aria-label="New top-level folder"
            title="New top-level folder"
            aria-expanded={isCreatingFolder}
            onMouseDown={() => {
              wasCreating.current = isCreatingFolder;
            }}
            onClick={() => {
              setTreeOpen(true);
              if (wasCreating.current) onCancelCreate();
              else onStartCreate();
              wasCreating.current = false;
            }}
          >
            <PlusIcon />
          </button>
        )}
      </div>
      {isNarrow && !treeOpen ? null : isLoading ? (
        <Spinner label="Loading folders" />
      ) : (
        <>
          {isCreator && isCreatingFolder && (
            <div css={{ paddingBottom: rem(6) }}>
              <InlineFolderInput
                label="New folder name"
                placeholder="Folder name"
                onCancel={onCancelCreate}
                onSubmit={onCreate}
              />
            </div>
          )}
          <ul css={listStyles}>
            <li>
              <SidebarRow
                to="/?view=all"
                icon={<StackIcon />}
                name="All videos"
                count={allVideosCount}
                isActive={isAllVideos}
                onNavClick={onNavClick}
              />
            </li>
            <li>
              <SidebarRow
                to="/"
                icon={<HomeIcon />}
                name="Home"
                count={unfiledCount}
                isActive={!isAllVideos && !selectedFolder}
                hasChildren={tree.length > 0}
                isExpanded={homeExpanded}
                onToggle={tree.length > 0 ? toggleHome : undefined}
                droppableId={homeDroppableId}
                onNavClick={onNavClick}
              />
              {homeExpanded && <ul css={listStyles}>{tree.map(renderNode)}</ul>}
            </li>
          </ul>
        </>
      )}
    </aside>
  );
};
