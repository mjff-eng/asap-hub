import {
  Banner,
  ClipPlacement,
  CursorEffect,
  NarrationClip,
  Timeline,
  Zoom,
} from '@asap-hub/demo-timeline';

// One thing is selected at a time. Holding that as four independent ids let a
// clip and a cursor effect be selected at once, which showed the wrong
// inspector and pointed Delete at the wrong item.
export type Selection = {
  kind: 'clip' | 'banner' | 'zoom' | 'effect' | 'narration';
  id: string;
};

export const isSelected = (
  selection: Selection | undefined,
  kind: Selection['kind'],
  id: string,
): boolean => selection?.kind === kind && selection.id === id;

export type ResolvedSelection = {
  clip?: ClipPlacement;
  banner?: Banner;
  zoom?: Zoom;
  effect?: CursorEffect;
  narration?: NarrationClip;
};

// A selection can outlive what it points at: an effect belongs to the clip
// under the playhead, so scrubbing away from that clip leaves nothing resolved
// and the panels fall back to their empty state.
export const resolveSelection = (
  selection: Selection | undefined,
  timeline: Timeline,
  placements: ClipPlacement[],
  current?: ClipPlacement,
): ResolvedSelection => {
  switch (selection?.kind) {
    case 'clip':
      return {
        clip: placements.find(({ clip }) => clip.id === selection.id),
      };

    case 'banner':
      return {
        banner: timeline.banners.find(({ id }) => id === selection.id),
      };

    case 'zoom':
      return { zoom: timeline.zooms.find(({ id }) => id === selection.id) };

    case 'narration':
      return {
        narration: timeline.narration.find(({ id }) => id === selection.id),
      };

    case 'effect':
      return {
        effect: timeline.cursor
          .find((layer) => layer.clipId === current?.clip.id)
          ?.effects.find(({ id }) => id === selection.id),
      };

    default:
      return {};
  }
};

export const hasResolvedSelection = (resolved: ResolvedSelection): boolean =>
  Boolean(
    resolved.clip ??
      resolved.banner ??
      resolved.zoom ??
      resolved.effect ??
      resolved.narration,
  );
