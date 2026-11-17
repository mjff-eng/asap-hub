/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useDraggable } from '@dnd-kit/core';
import { FC, Fragment, MouseEvent as ReactMouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import type { Video } from '../api/types';
import { Badge } from '../ui/components';
import type { MenuPosition } from '../ui/ContextMenu';
import {
  captionStyles,
  cerulean,
  charcoal,
  info100,
  lead,
  mint,
  paper,
  pine,
  rem,
  shadowSoft,
  shadowStrong,
  silver,
  steel,
  tin,
} from '../ui/theme';
import { formatDuration } from '../utils/time';
import {
  chapterCount,
  dateLabel,
  formatEditedAgo,
  formatUploadedOn,
} from '../utils/format';
import { CameraIcon, DragHandleIcon, KebabIcon, PencilIcon } from './icons';
import { Thumbnail } from './Thumbnail';
import type { ViewMode } from './state';

export const isWatchable = (video: Video): boolean =>
  video.processingState === 'ready' && video.status === 'published';

// a studio project is edited, not encoded, so it goes straight to its editor
export const editPathOf = (video: Video): string =>
  video.kind === 'studio'
    ? `/studio/projects/${video.id}`
    : `/studio/videos/${video.id}`;

// 'empty' is a project that has never been exported: it is a draft waiting to
// be worked on, not something the encoder is busy with
export const isStudioDraft = (video: Video): boolean =>
  video.processingState === 'empty';

const studioBadgeStyles = css({
  ...captionStyles,
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(4),
  borderRadius: rem(12),
  padding: `${rem(1)} ${rem(9)}`,
  border: `1px solid ${cerulean.rgb}`,
  backgroundColor: info100.rgb,
  color: cerulean.rgb,
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
});

export const VideoStatusBadge: FC<{ readonly video: Video }> = ({ video }) => {
  if (video.processingState === 'failed') {
    return <Badge tone="error">Failed</Badge>;
  }
  // an unfinished project and a finished video held back from publishing are
  // different problems, so they must not look like the same grey pill
  if (isStudioDraft(video)) {
    return (
      <span css={studioBadgeStyles}>
        <PencilIcon size={11} />
        Studio draft
      </span>
    );
  }
  if (video.processingState !== 'ready') {
    return <Badge tone="warning">Processing</Badge>;
  }
  if (video.status === 'draft') {
    return <Badge tone="neutral">Draft</Badge>;
  }
  return null;
};

const shellStyles = css({
  position: 'relative',
  boxSizing: 'border-box',
  backgroundColor: paper.rgb,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(10),
  transition: 'box-shadow 150ms, border-color 150ms',
  ':hover': { boxShadow: `0 ${rem(2)} ${rem(10)} ${shadowSoft.rgb}` },
});

const selectedShellStyles = css({
  backgroundColor: mint.rgb,
  borderColor: pine.rgb,
});

const gridShellStyles = css({
  padding: rem(10),
  display: 'grid',
  gap: rem(10),
});

const listShellStyles = css({
  padding: rem(10),
  display: 'flex',
  alignItems: 'center',
  gap: rem(14),
});

const selectableStyles = css({ userSelect: 'none', cursor: 'default' });

const titleStyles = css({
  margin: 0,
  fontSize: rem(15),
  fontWeight: 'bold',
  lineHeight: 1.35,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

const titleLinkStyles = css({
  color: charcoal.rgb,
  textDecoration: 'none',
  ':hover': { textDecoration: 'underline' },
});

const metaStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(6),
  fontSize: rem(13),
  color: lead.rgb,
});

const dotStyles = css({ color: tin.rgb });

const actionsStyles = css({
  position: 'absolute',
  top: rem(18),
  right: rem(18),
  display: 'flex',
  gap: rem(6),
  opacity: 0,
  transition: 'opacity 120ms',
  zIndex: 1,
});

const actionsVisibleStyles = css({ opacity: 1 });

const actionButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(28),
  height: rem(28),
  padding: 0,
  border: 'none',
  borderRadius: rem(6),
  backgroundColor: paper.rgb,
  color: charcoal.rgb,
  cursor: 'pointer',
  boxShadow: `0 ${rem(1)} ${rem(4)} ${shadowStrong.rgb}`,
  ':hover': { backgroundColor: silver.rgb },
  ':focus-visible': { outline: `2px solid ${pine.rgb}`, outlineOffset: rem(1) },
});

const stop = (event: ReactMouseEvent) => event.stopPropagation();

export type VideoCardProps = {
  readonly video: Video;
  readonly view: ViewMode;
  readonly isCreator: boolean;
  readonly isSelected: boolean;
  readonly folderName?: string;
  readonly onSelect: (event: ReactMouseEvent) => void;
  readonly onOpenMenu: (position: MenuPosition) => void;
};

export const VideoCard: FC<VideoCardProps> = ({
  video,
  view,
  isCreator,
  isSelected,
  folderName,
  onSelect,
  onOpenMenu,
}) => {
  const navigate = useNavigate();
  const editPath = editPathOf(video);
  const titlePath =
    isCreator && !isWatchable(video) ? editPath : `/videos/${video.id}`;

  // the drag a11y attributes are deliberately not spread: they would put
  // role="button" on a card that already holds a link and a menu button
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: video.id,
    disabled: !isCreator,
  });

  // a project with no export has no running time to show, and a 0:00 badge
  // reads as a broken video rather than as one that has not been made yet
  const duration = video.durationMs > 0 ? formatDuration(video.durationMs) : '';

  const draft = isStudioDraft(video);
  const editedAgo =
    draft && video.timeline ? formatEditedAgo(video.timeline.updatedAt) : '';

  // four untouched projects all read "Untitled demo" with the same placeholder,
  // so what separates them is when each was last worked on and how far it got
  const details = [
    `${dateLabel(video)} · ${formatUploadedOn(video.recordedAt)}`,
    ...(editedAgo ? [`Edited ${editedAgo}`] : []),
    ...(draft && video.chapters.length > 0
      ? [chapterCount(video.chapters.length)]
      : []),
    ...(folderName ? [folderName] : []),
  ];

  const meta = (
    <div css={[metaStyles, isCreator && selectableStyles]}>
      <CameraIcon />
      {details.map((detail, index) => (
        <Fragment key={detail}>
          {index > 0 && <span css={dotStyles}>&middot;</span>}
          <span>{detail}</span>
        </Fragment>
      ))}
      {isCreator && (
        <span css={{ marginLeft: 'auto' }}>
          <VideoStatusBadge video={video} />
        </span>
      )}
    </div>
  );

  const title = (
    <h3 css={titleStyles}>
      <Link
        to={titlePath}
        css={titleLinkStyles}
        draggable={false}
        onClick={stop}
        onMouseDown={stop}
      >
        {video.title}
      </Link>
    </h3>
  );

  const openMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    onOpenMenu({ x: bounds.left, y: bounds.bottom + 4 });
  };

  // one menu button replaces the edit link and the trash button: the same
  // actions, reachable by keyboard and touch, at a single tab stop
  const hoverActions = isCreator && (
    <div
      css={[actionsStyles, isSelected && actionsVisibleStyles]}
      className="card-actions"
    >
      <span
        css={actionButtonStyles}
        aria-hidden
        title="Drag to a folder to move"
      >
        <DragHandleIcon size={16} />
      </span>
      <button
        type="button"
        aria-label={`Actions for ${video.title}`}
        aria-haspopup="menu"
        title="Actions"
        css={actionButtonStyles}
        onMouseDown={stop}
        onClick={openMenu}
      >
        <KebabIcon size={16} />
      </button>
    </div>
  );

  return (
    <div
      ref={isCreator ? setNodeRef : undefined}
      data-testid={`video-card-${video.id}`}
      data-selected={isCreator ? String(isSelected) : undefined}
      css={{
        position: 'relative',
        opacity: isDragging ? 0.4 : 1,
        ':hover .card-actions, :focus-within .card-actions': { opacity: 1 },
      }}
      {...(isCreator ? listeners : {})}
      onContextMenu={
        isCreator
          ? (event: ReactMouseEvent) => {
              event.preventDefault();
              onOpenMenu({ x: event.clientX, y: event.clientY });
            }
          : undefined
      }
      onMouseDown={
        isCreator
          ? (event: ReactMouseEvent) => {
              // shift-click and the second click of a dblclick paint a text selection
              if (event.shiftKey || event.detail > 1) event.preventDefault();
            }
          : undefined
      }
      onDoubleClick={(event: ReactMouseEvent) => {
        // the inner links and buttons already navigate or act on their own
        if ((event.target as HTMLElement).closest('a, button')) return;
        event.preventDefault();
        event.stopPropagation();
        void navigate(titlePath);
      }}
      onClick={isCreator ? onSelect : undefined}
    >
      <div
        css={[
          shellStyles,
          view === 'grid' ? gridShellStyles : listShellStyles,
          isSelected && selectedShellStyles,
        ]}
      >
        {view === 'grid' ? (
          <>
            <Thumbnail
              videoId={video.id}
              mediaPath={video.mediaPath}
              creatorName={video.createdBy.name}
              duration={duration}
              hasPoster={video.processingState === 'ready'}
            />
            <div css={{ display: 'grid', gap: rem(6), padding: `0 ${rem(2)}` }}>
              {title}
              {meta}
            </div>
          </>
        ) : (
          <>
            <Thumbnail
              videoId={video.id}
              mediaPath={video.mediaPath}
              creatorName={video.createdBy.name}
              duration={duration}
              hasPoster={video.processingState === 'ready'}
              width={120}
              radius={6}
            />
            <div css={{ flex: 1, display: 'grid', gap: rem(4), minWidth: 0 }}>
              {title}
              {meta}
            </div>
          </>
        )}
      </div>
      {hoverActions}
    </div>
  );
};
