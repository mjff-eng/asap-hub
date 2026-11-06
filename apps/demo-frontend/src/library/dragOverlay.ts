import type { Modifier } from '@dnd-kit/core';

// the ghost is a small label, so it belongs just off the pointer rather than
// wherever the card happened to be grabbed, where it covers the row being aimed at
export const cursorOffset = 14;

const coordinatesOf = (
  event: Event | null,
): { x: number; y: number } | undefined => {
  if (!event) return undefined;
  if ('clientX' in event && 'clientY' in event) {
    const { clientX, clientY } = event as MouseEvent;
    return { x: clientX, y: clientY };
  }
  const touch = (event as TouchEvent).touches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : undefined;
};

export const followCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  const activator = coordinatesOf(activatorEvent);
  if (!draggingNodeRect || !activator) return transform;
  return {
    ...transform,
    x: transform.x + activator.x - draggingNodeRect.left + cursorOffset,
    y: transform.y + activator.y - draggingNodeRect.top + cursorOffset,
  };
};
