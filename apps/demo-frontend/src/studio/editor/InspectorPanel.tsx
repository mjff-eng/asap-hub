import { ClipPlacement, CursorLayer } from '@asap-hub/demo-timeline';
import { FC, memo } from 'react';
import { ProjectAsset } from '../../api/types';
import { TimelineAction } from '../project/timelineReducer';
import BannerInspector from './BannerInspector';
import ClipInspector from './ClipInspector';
import CursorEffectInspector from './CursorEffectInspector';
import NarrationInspector from './NarrationInspector';
import { ResolvedSelection } from './selection';
import TitleCardInspector from './TitleCardInspector';
import ZoomInspector from './ZoomInspector';

type Props = {
  readonly selected: ResolvedSelection;
  readonly current?: ClipPlacement;
  readonly cursorLayer?: CursorLayer;
  readonly assets: Record<string, ProjectAsset>;
  readonly clipCount: number;
  // the placement before the selected clip, which bounds its transition
  readonly previousPlacement?: ClipPlacement;
  readonly readOnly: boolean;
  readonly assetDurationOf: (assetId: string) => number | undefined;
  // the one trim ceiling every surface shares: the ingest's probe or the
  // recorder's own take length, never the browser's stopgap reading
  readonly trimBoundMs?: number;
  // how long the whole programme runs, for the fields that speak its time
  readonly programmeMs?: number;
  readonly dispatch: (action: TimelineAction) => void;
  readonly onRemove: () => void;
};

// the right-hand column: one inspector for whatever is selected, and the clip
// inspector's own empty state when nothing is
const InspectorPanel: FC<Props> = ({
  selected,
  current,
  cursorLayer,
  assets,
  clipCount,
  previousPlacement,
  readOnly,
  assetDurationOf,
  trimBoundMs,
  programmeMs,
  dispatch,
  onRemove,
}) => {
  const { effect, zoom, banner, clip, narration } = selected;

  if (narration) {
    return (
      <NarrationInspector
        narration={narration}
        asset={assets[narration.assetId]}
        readOnly={readOnly}
        onChange={(change) =>
          dispatch({
            type: 'updateNarration',
            narrationId: narration.id,
            change,
          })
        }
        onRemove={onRemove}
      />
    );
  }

  if (effect && current) {
    return (
      <CursorEffectInspector
        effect={effect}
        readOnly={readOnly}
        inMs={current.clip.kind === 'source' ? current.clip.inMs : 0}
        spanMs={current.durationMs}
        pointer={cursorLayer?.pointer}
        hasCapture={(cursorLayer?.path.length ?? 0) > 0}
        offsetMs={cursorLayer?.offsetMs ?? 0}
        alignXPx={cursorLayer?.alignXPx ?? 0}
        alignYPx={cursorLayer?.alignYPx ?? 0}
        onChangePointer={(pointer) =>
          dispatch({
            type: 'setCursorPointer',
            clipId: current.clip.id,
            pointer,
          })
        }
        onChangeOffset={(offsetMs) =>
          dispatch({
            type: 'setCursorOffset',
            clipId: current.clip.id,
            offsetMs,
          })
        }
        onChangeAlign={(alignXPx, alignYPx) =>
          dispatch({
            type: 'setCursorAlign',
            clipId: current.clip.id,
            alignXPx,
            alignYPx,
          })
        }
        onChange={(change) =>
          dispatch({
            type: 'updateCursorEffect',
            clipId: current.clip.id,
            effectId: effect.id,
            change,
          })
        }
        onRemove={onRemove}
      />
    );
  }

  if (zoom) {
    return (
      <ZoomInspector
        zoom={zoom}
        readOnly={readOnly}
        {...(current ? { spanMs: current.durationMs } : {})}
        onChange={(change) =>
          dispatch({ type: 'updateZoom', zoomId: zoom.id, change })
        }
        onRemove={onRemove}
      />
    );
  }

  if (banner) {
    return (
      <BannerInspector
        banner={banner}
        programmeMs={programmeMs}
        readOnly={readOnly}
        onChange={(change) =>
          dispatch({ type: 'updateBanner', bannerId: banner.id, change })
        }
        onRemove={onRemove}
      />
    );
  }

  if (clip?.clip.kind === 'title') {
    const title = clip.clip;
    return (
      <TitleCardInspector
        placement={clip}
        clip={title}
        readOnly={readOnly}
        onChange={(change) =>
          dispatch({ type: 'updateTitleCard', clipId: title.id, ...change })
        }
        onRemove={onRemove}
      />
    );
  }

  const source = clip?.clip.kind === 'source' ? clip.clip : undefined;

  return (
    <ClipInspector
      placement={clip}
      asset={source ? assets[source.assetId] : undefined}
      trimBoundMs={trimBoundMs}
      previousPlacement={previousPlacement}
      readOnly={readOnly}
      index={clip?.index ?? 0}
      clipCount={clipCount}
      onTrim={(change) => {
        if (!source) return;
        dispatch({
          type: 'trimClip',
          clipId: source.id,
          ...change,
          assetDurationMs: trimBoundMs,
        });
      }}
      onVolume={(volume) => {
        if (!clip) return;
        dispatch({ type: 'setClipVolume', clipId: clip.clip.id, volume });
      }}
      onMove={(toIndex) => {
        if (!clip) return;
        dispatch({ type: 'moveClip', clipId: clip.clip.id, toIndex });
      }}
      onRemove={onRemove}
      onTransition={(transition) => {
        if (!clip) return;
        dispatch({ type: 'setTransition', clipId: clip.clip.id, transition });
      }}
    />
  );
};

// the playhead re-renders the editor on every frame; these panels only ever
// change when the document or the selection does
export default memo(InspectorPanel);
