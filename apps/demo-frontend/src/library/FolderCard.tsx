/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { FC, MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router';

import type { Folder } from '../api/types';
import {
  charcoal,
  cerulean,
  info100,
  lead,
  paper,
  rem,
  shadowSoft,
  steel,
} from '../ui/theme';
import { videoCount } from '../utils/format';
import { FolderIcon } from './icons';

const cardStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(12),
  padding: `${rem(12)} ${rem(14)}`,
  borderRadius: rem(10),
  border: `1px solid ${steel.rgb}`,
  backgroundColor: paper.rgb,
  color: charcoal.rgb,
  textDecoration: 'none',
  transition: 'box-shadow 150ms, border-color 150ms',
  ':hover': { boxShadow: `0 ${rem(2)} ${rem(10)} ${shadowSoft.rgb}` },
});

const overStyles = css({
  backgroundColor: info100.rgb,
  borderColor: cerulean.rgb,
  outline: `2px solid ${cerulean.rgb}`,
  outlineOffset: rem(-2),
});

const nameStyles = css({
  fontSize: rem(15),
  fontWeight: 'bold',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const countStyles = css({ fontSize: rem(13), color: lead.rgb });

export const FolderCard: FC<{
  readonly folder: Folder;
  readonly count?: number;
  readonly isDropTarget: boolean;
  readonly isDraggable?: boolean;
  readonly onContextMenu?: (event: ReactMouseEvent) => void;
  readonly onNavClick?: (event: ReactMouseEvent) => void;
}> = ({
  folder,
  count,
  isDropTarget,
  isDraggable = false,
  onContextMenu,
  onNavClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `card-${folder.id}`,
    data: { folderId: folder.id },
    disabled: !isDropTarget,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `folder:${folder.id}`,
    disabled: !isDraggable,
  });
  return (
    <Link
      ref={(node: HTMLAnchorElement | null) => {
        setNodeRef(node);
        if (isDraggable) setDragRef(node);
      }}
      to={`/?folder=${folder.id}`}
      draggable={false}
      onContextMenu={onContextMenu}
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
      onClick={onNavClick}
      css={[
        cardStyles,
        isDragging && { opacity: 0.4 },
        isDropTarget && isOver && overStyles,
      ]}
    >
      <span css={{ display: 'flex', color: lead.rgb }}>
        <FolderIcon size={20} />
      </span>
      <span css={{ display: 'grid', gap: rem(2), minWidth: 0 }}>
        <span css={nameStyles}>{folder.name}</span>
        <span css={countStyles}>{videoCount(count ?? 0)}</span>
      </span>
    </Link>
  );
};
