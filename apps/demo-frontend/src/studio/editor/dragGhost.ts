import { RefObject, useCallback, useMemo, useRef } from 'react';

export type DragGhost = {
  ref: RefObject<HTMLDivElement>;
  show: (block: HTMLElement, lane: HTMLElement) => void;
  move: (offsetPx: number, hint?: string) => void;
  hide: () => void;
};

// A translucent copy of the block under the pointer, so a drag says where it
// will land before it lands. It is one element that is always mounted and moved
// by writing to its style: the playhead proved that anything following a
// pointer sixty times a second cannot go through React and stay cheap.
export const useDragGhost = (): DragGhost => {
  const ref = useRef<HTMLDivElement>(null);
  const label = useRef('');

  const show = useCallback((block: HTMLElement, lane: HTMLElement) => {
    const ghost = ref.current;
    if (!ghost) {
      return;
    }

    const from = block.getBoundingClientRect();
    const within = lane.getBoundingClientRect();
    label.current = block.getAttribute('aria-label') ?? '';
    ghost.textContent = label.current;
    ghost.style.left = `${from.left - within.left}px`;
    ghost.style.top = `${from.top - within.top}px`;
    ghost.style.width = `${from.width}px`;
    ghost.style.height = `${from.height}px`;
    ghost.style.transform = 'translateX(0px)';
    ghost.hidden = false;
  }, []);

  const move = useCallback((offsetPx: number, hint?: string) => {
    const ghost = ref.current;
    if (!ghost || ghost.hidden) {
      return;
    }
    ghost.style.transform = `translateX(${Math.round(offsetPx)}px)`;
    ghost.textContent = hint ? `${label.current} · ${hint}` : label.current;
  }, []);

  const hide = useCallback(() => {
    const ghost = ref.current;
    if (!ghost) {
      return;
    }
    ghost.hidden = true;
    ghost.textContent = '';
  }, []);

  return useMemo(() => ({ ref, show, move, hide }), [hide, move, show]);
};
