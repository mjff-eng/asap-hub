/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  clipLocalMs,
  CursorEffect,
  Point,
  resolveChapters,
  layoutClips,
  placementAt,
  placementsDurationMs,
} from '@asap-hub/demo-timeline';
import {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ProjectAsset } from '../../api/types';
import { createId } from '../project/ids';
import { useCaptureHolder } from '../recording/captureLock';
import { CaptureApply, captureTargets } from '../recording/cursorPlacement';
import {
  ProjectEditor as Editor,
  SaveState,
} from '../project/useProjectEditor';
import ActionBar from './ActionBar';
import PickBar from './PickBar';
import AssetPanel from './AssetPanel';
import {
  assetsOnTimeline,
  canvasForAssets,
  raiseCanvas,
  sameCanvas,
} from './canvasChoice';
import ChapterList from './ChapterList';
import { DragKind, Span } from './dragging';
import { editorTheme } from './editorTheme';
import { dragGesture, GestureProvider, useGestures } from './gesture';
import InspectorPanel from './InspectorPanel';
import PreviewStage from './PreviewStage';
import { hasResolvedSelection, resolveSelection, Selection } from './selection';
import { effectChange, narrationChange, zoomChange } from './spanChange';
import StageControls from './StageControls';
import Timeline, { SpanKind } from './Timeline';
import TransportBar from './TransportBar';
import { useAssetDurations } from './useAssetDurations';
import { useEditorShortcuts } from './useEditorShortcuts';
import { useFittedBox } from './useFittedBox';
import { useFullscreen } from './useFullscreen';
import { PlaybackProvider, usePlayback } from './usePlayback';
import { useTimelineZoom } from './useTimelineZoom';

const shellStyles = css({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  // the timeline scrolls inside itself; nothing here may widen the page
  overflow: 'hidden',
  backgroundColor: editorTheme.surface,
  color: editorTheme.text,
});

// an explicit grid, not flex: the centre column is minmax(0, 1fr) so a wide
// preview or timeline can never push the side panels off the screen
const bodyStyles = css({
  display: 'grid',
  gridTemplateColumns: '280px minmax(0, 1fr) 260px',
  gridTemplateRows: 'minmax(0, 1fr)',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  '@media (max-width: 1100px)': {
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto',
    flex: 'none',
    overflow: 'auto',
  },
});

// the stage takes whatever the panels and the timeline leave, and the preview
// is centred in it rather than stretched
const centreStyles = css({
  gridColumn: 2,
  gridRow: 1,
  '@media (max-width: 1100px)': { gridColumn: 1 },
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 16,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
  backgroundColor: editorTheme.surface,
});

const stageAreaStyles = css({
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

// A take used to show only as a line inside the media panel, which scrolls, so
// scrolling past it left nothing in the studio saying anything was recording.
const recordingStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: 0,
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: editorTheme.record,
  color: editorTheme.onRecord,
});

const recordingDotStyles = css({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: 'currentColor',
});

const saveLabels: Record<SaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'All changes saved',
  error: 'Could not save, retrying shortly',
  rejected:
    'The server refused this document as it stands. Undo or change something and it will try again.',
};

// the playhead moves on every animation frame, so anything handed down as a
// prop has to keep its identity when the document has not changed
const noCursorEffects: CursorEffect[] = [];

const newBannerMs = 4000;
const newTitleCardMs = 3000;
// a provisional length for an asset the ingest has not probed yet
const unknownAssetMs = 10000;

type Props = {
  readonly editor: Editor;
  readonly assets: ProjectAsset[];
  readonly readOnly: boolean;
  readonly assetUrl: (asset: ProjectAsset) => string | undefined;
  readonly onImport: (file: File) => void;
  readonly onImportAudio: (file: File) => void;
  readonly assetError?: string;
  readonly onRenameAsset: (asset: ProjectAsset, label: string) => void;
  readonly onDeleteAsset: (asset: ProjectAsset) => void;
  readonly uploading: boolean;
  readonly uploadProgress?: number;
  // a recorder needs to put what it captured on the timeline where the playhead
  // is, and the playhead lives here, so it is handed the same drop-ins the
  // media list uses rather than reaching for the reducer itself
  readonly recorder?: (
    addAsset: (asset: ProjectAsset) => void,
    // false when the timeline has no clip to land the capture on
    applyCursorCapture: (apply: CaptureApply) => boolean,
  ) => ReactNode;
  // starts a download render of just these clips; absent hides the picking bar
  readonly onDownloadClips?: (clipIds: string[]) => void;
  // the same settled-document gate the export button has
  readonly canDownload?: boolean;
  // an export or download is already running, so the bar waits
  readonly downloadBusy?: boolean;
};

const ProjectEditor: FC<Props> = ({
  editor,
  assets,
  readOnly,
  assetUrl,
  onImport,
  onImportAudio,
  assetError,
  onRenameAsset,
  onDeleteAsset,
  uploading,
  uploadProgress,
  recorder,
  onDownloadClips,
  canDownload = false,
  downloadBusy = false,
}) => {
  const { timeline, dispatch, beginGesture, endGesture } = editor;
  const gesture = useGestures(beginGesture, endGesture);
  const startDrag = useCallback(() => gesture.begin(dragGesture), [gesture]);
  const endDrag = useCallback(() => gesture.end(dragGesture), [gesture]);
  const [selection, setSelection] = useState<Selection>();
  const [pickedIds, setPickedIds] = useState<readonly string[]>([]);
  const togglePick = useCallback(
    (clipId: string) =>
      setPickedIds((picked) =>
        picked.includes(clipId)
          ? picked.filter((id) => id !== clipId)
          : [...picked, clipId],
      ),
    [],
  );
  const clearPicks = useCallback(() => setPickedIds([]), []);
  const [volume, setVolume] = useState(1);
  const select = useCallback(
    (kind: Selection['kind'], id: string) => setSelection({ kind, id }),
    [],
  );

  const placements = useMemo(
    () => layoutClips(timeline.clips),
    [timeline.clips],
  );

  // a pick can outlive its clip: a delete or an undo takes the clip away and
  // the pick must not silently put a ghost into the download
  const picked = useMemo(
    () =>
      pickedIds.filter((id) => timeline.clips.some((clip) => clip.id === id)),
    [pickedIds, timeline.clips],
  );
  // the placements above already laid the clips out; laying them out again
  // just to read the end doubled the per-edit cost
  const durationMs = useMemo(
    () => placementsDurationMs(placements),
    [placements],
  );
  const assetsById = useMemo(
    () => Object.fromEntries(assets.map((asset) => [asset.assetId, asset])),
    [assets],
  );

  const playback = usePlayback({ durationMs });
  const { getPlayheadMs, subscribe, toggle, seek, nudge } = playback;
  const zoom = useTimelineZoom(durationMs);
  const stage = useFittedBox(timeline.canvas.width / timeline.canvas.height);
  const theatreRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(theatreRef);

  // the clock moves every frame; the editor only has to hear about it when the
  // playhead crosses into another clip, because that is what the panels read
  const [currentClipId, setCurrentClipId] = useState<string>();
  useEffect(() => {
    const follow = (ms: number) =>
      setCurrentClipId(placementAt(placements, ms)?.clip.id);
    follow(getPlayheadMs());
    return subscribe(follow);
  }, [getPlayheadMs, placements, subscribe]);

  const current = useMemo(
    () => placements.find(({ clip }) => clip.id === currentClipId),
    [currentClipId, placements],
  );
  const selected = useMemo(
    () => resolveSelection(selection, timeline, placements, current),
    [current, placements, selection, timeline],
  );
  const selectedSource =
    selected.clip?.clip.kind === 'source' ? selected.clip.clip : undefined;
  const cursorLayer = timeline.cursor.find(
    (layer) => layer.clipId === current?.clip.id,
  );
  const cursorEffects = cursorLayer?.effects ?? noCursorEffects;

  // a recording adds itself as soon as it is saved, so the media list has to be
  // able to say which sources are already in use
  const usedAssetIds = useMemo(
    () =>
      new Set([
        ...timeline.clips.flatMap((clip) =>
          clip.kind === 'source' ? [clip.assetId] : [],
        ),
        ...timeline.narration.map((take) => take.assetId),
      ]),
    [timeline.clips, timeline.narration],
  );

  const probedDurations = useAssetDurations(assets, assetUrl);

  // the server value wins once the ingest has probed the file; until then the
  // browser's own reading stands in, and a recording that carries no duration
  // at all leaves this undefined rather than pretending the clip is the asset
  const assetDurationOf = useCallback(
    (assetId: string): number | undefined =>
      assetsById[assetId]?.durationMs ?? probedDurations[assetId],
    [assetsById, probedDurations],
  );

  // the capture also wants the footage's own pixel size, the ground truth
  // about what was really shared when the surface label cannot be trusted
  const captureAssetOf = useCallback(
    (assetId: string) => {
      const asset = assetsById[assetId];
      return {
        ...(assetDurationOf(assetId) !== undefined
          ? { durationMs: assetDurationOf(assetId) }
          : {}),
        ...(asset?.width ? { width: asset.width } : {}),
        ...(asset?.height ? { height: asset.height } : {}),
      };
    },
    [assetDurationOf, assetsById],
  );

  const addNarration = useCallback(
    (asset: ProjectAsset) => {
      const id = createId('narration');
      dispatch({
        type: 'addNarration',
        narration: {
          id,
          assetId: asset.assetId,
          startMs: Math.round(getPlayheadMs()),
          inMs: 0,
          outMs: Math.round(
            asset.durationMs ??
              probedDurations[asset.assetId] ??
              unknownAssetMs,
          ),
          volume: 1,
        },
      });
      select('narration', id);
    },
    [dispatch, getPlayheadMs, probedDurations, select],
  );

  // the output follows the footage: 60fps sources render at 60, and a source
  // taller than 1080p keeps its height. The creator's own choice of frame rate
  // stops this for the rest of the session rather than being overwritten.
  const pickedCanvas = useRef(false);
  const followFootage = useCallback(
    (extra?: ProjectAsset) => {
      if (pickedCanvas.current) return;
      const wanted = canvasForAssets([
        ...assetsOnTimeline(timeline.clips, assetsById, timeline.cursor),
        ...(extra ? [extra] : []),
      ]);
      if (!wanted) return;
      const canvas = raiseCanvas(timeline.canvas, wanted);
      if (sameCanvas(canvas, timeline.canvas)) return;
      dispatch({ type: 'setCanvas', canvas });
    },
    [assetsById, dispatch, timeline.canvas, timeline.clips, timeline.cursor],
  );

  // the ingest probes the file in a container, so the real format arrives long
  // after the clip was put on the timeline and the choice has to be made again
  useEffect(() => {
    followFootage();
  }, [followFootage]);

  const addAsset = useCallback(
    (asset: ProjectAsset) => {
      if (asset.kind === 'audio') {
        addNarration(asset);
        return;
      }
      // adding a clip and moving the output format with it is one thing the
      // creator did, so one Ctrl+Z takes the whole of it back
      beginGesture();
      const clipId = createId('clip');
      dispatch({
        type: 'addClip',
        assetId: asset.assetId,
        durationMs:
          asset.durationMs ?? probedDurations[asset.assetId] ?? unknownAssetMs,
        clipId,
      });
      followFootage(asset);
      endGesture();
      // the inspector is what you reach for next, and it stayed on its empty
      // state until the new clip was hunted down on the lane and clicked
      select('clip', clipId);
    },
    [
      addNarration,
      beginGesture,
      dispatch,
      endGesture,
      followFootage,
      probedDurations,
      select,
    ],
  );

  const splitAtPlayhead = useCallback(() => {
    if (!current) return;
    dispatch({
      type: 'splitAt',
      tMs: getPlayheadMs(),
      clipId: createId('clip'),
    });
  }, [current, dispatch, getPlayheadMs]);

  const duplicateSelected = useCallback(() => {
    if (!selected.clip) return;
    dispatch({
      type: 'duplicateClip',
      clipId: selected.clip.clip.id,
      newClipId: createId('clip'),
    });
  }, [dispatch, selected.clip]);

  const toggleMuteSelected = useCallback(() => {
    if (!selected.clip) return;
    dispatch({ type: 'toggleMute', clipId: selected.clip.clip.id });
  }, [dispatch, selected.clip]);

  const removeSelected = useCallback(() => {
    if (selected.effect && current) {
      dispatch({
        type: 'removeCursorEffect',
        clipId: current.clip.id,
        effectId: selected.effect.id,
      });
    } else if (selected.zoom) {
      dispatch({ type: 'removeZoom', zoomId: selected.zoom.id });
    } else if (selected.banner) {
      dispatch({ type: 'removeBanner', bannerId: selected.banner.id });
    } else if (selected.narration) {
      dispatch({
        type: 'removeNarration',
        narrationId: selected.narration.id,
      });
    } else if (selected.clip) {
      dispatch({ type: 'removeClip', clipId: selected.clip.clip.id });
    } else {
      return;
    }
    setSelection(undefined);
  }, [current, dispatch, selected]);

  const addTitleCard = useCallback(() => {
    const clipId = createId('title');
    dispatch({
      type: 'addTitleCard',
      clipId,
      index: current ? current.index + 1 : placements.length,
      text: 'New chapter',
      durationMs: newTitleCardMs,
    });
    select('clip', clipId);
  }, [current, dispatch, placements.length, select]);

  // a zoom belongs to the clip under the playhead and starts where the playhead
  // is, so it lands where the creator is actually looking
  const addZoom = useCallback(() => {
    if (!current) return;
    const id = createId('zoom');
    dispatch({
      type: 'addZoom',
      zoom: {
        id,
        clipId: current.clip.id,
        startMs: Math.round(clipLocalMs(current, getPlayheadMs())),
        rampInMs: 400,
        holdMs: 1500,
        rampOutMs: 400,
        focus: { x: 0.5, y: 0.5 },
        scale: 2,
        easing: 'easeInOut',
      },
    });
    select('zoom', id);
  }, [current, dispatch, getPlayheadMs, select]);

  const addCursorClick = useCallback(() => {
    if (!current) return;
    const effectId = createId('effect');
    dispatch({
      type: 'addCursorEffect',
      clipId: current.clip.id,
      effect: {
        id: effectId,
        // stored in footage time, like every capture time: the playhead is in
        // programme time, so the trim goes back on after the clip conversion
        tMs:
          Math.round(clipLocalMs(current, getPlayheadMs())) +
          (current.clip.kind === 'source' ? current.clip.inMs : 0),
        type: 'ripple',
        point: { x: 0.5, y: 0.5 },
        origin: 'manual',
      },
    });
    select('effect', effectId);
  }, [current, dispatch, getPlayheadMs, select]);

  // the cursor capture lands on every clip that knows when its take ran, each
  // given its own slice of the stream; a timeline with no such clip falls back
  // to the clip under the playhead, the same place a hand placed click does
  const applyCursorCapture = useCallback(
    (apply: CaptureApply): boolean => {
      // the playhead parked past the last clip left no placement under it, and
      // the button then did nothing at all with no word about why
      const onto = current ?? placements.at(-1);
      const request = captureTargets(
        timeline,
        onto,
        Date.now(),
        captureAssetOf,
      );
      if (!request) {
        // an empty timeline has nowhere to put the capture; the caller says so
        return false;
      }
      void apply(request).then((applied) => {
        if (!applied || applied.length === 0) {
          return;
        }
        // however many takes the capture lands on, it was one click of one
        // button, so one Ctrl+Z takes the whole of it back
        beginGesture();
        applied.forEach((layer) => {
          dispatch({
            type: 'applyCapture',
            clipId: layer.clipId,
            path: layer.path,
            effects: layer.effects,
          });
        });
        endGesture();
      });
      return true;
    },
    [
      beginGesture,
      captureAssetOf,
      current,
      dispatch,
      endGesture,
      placements,
      timeline,
    ],
  );

  const addChapter = useCallback(() => {
    if (!current) return;
    dispatch({
      type: 'addChapter',
      id: createId('chapter'),
      clipId: current.clip.id,
      offsetMs: Math.round(clipLocalMs(current, getPlayheadMs())),
      title: 'New chapter',
    });
  }, [current, dispatch, getPlayheadMs]);

  // a marker belongs to the clip under the moment it is moved to, so a retimed
  // chapter still travels with that clip when it is trimmed or reordered
  const retimeChapter = useCallback(
    (chapterId: string, startMs: number) => {
      const placement = placementAt(placements, startMs);
      if (!placement) return;
      dispatch({
        type: 'updateChapter',
        chapterId,
        clipId: placement.clip.id,
        offsetMs: Math.round(clipLocalMs(placement, startMs)),
      });
    },
    [dispatch, placements],
  );

  const selectTitleCard = useCallback(
    (clipId: string) => {
      const placement = placements.find(({ clip }) => clip.id === clipId);
      if (!placement) return;
      seek(placement.startMs);
      select('clip', clipId);
    },
    [placements, seek, select],
  );

  const addBanner = useCallback(() => {
    const id = createId('banner');
    dispatch({
      type: 'addBanner',
      banner: {
        id,
        startMs: Math.round(getPlayheadMs()),
        durationMs: newBannerMs,
        preset: 'lowerThird',
        text: 'New banner',
        position: 'bottom',
        animation: 'fade',
      },
    });
    select('banner', id);
  }, [dispatch, getPlayheadMs, select]);

  const moveClip = useCallback(
    (clipId: string, toIndex: number) =>
      dispatch({ type: 'moveClip', clipId, toIndex }),
    [dispatch],
  );

  // Two clips can only share time by blending, so an overlap dragged on the
  // lane is stored as the incoming transition of the later of the two. A join
  // that was already sliding keeps sliding; anything else becomes a crossfade.
  const overlapClips = useCallback(
    (clipId: string, blendMs: number) => {
      const clip = timeline.clips.find((candidate) => candidate.id === clipId);
      if (!clip) return;
      // dragging one clip over another sets how long the blend runs; the kind
      // of blend stays whatever the inspector chose, and only a plain cut is
      // promoted to a crossfade, or the drag would read as doing nothing
      const kept =
        clip.transitionIn && clip.transitionIn.type !== 'cut'
          ? clip.transitionIn.type
          : 'crossfade';
      dispatch({
        type: 'setTransition',
        clipId,
        transition:
          blendMs > 0
            ? { type: kept, durationMs: Math.round(blendMs) }
            : undefined,
      });
    },
    [dispatch, timeline.clips],
  );

  // The one trim ceiling every surface shares: the TAKE's length, not the
  // footage's. A screen capture writes no frames while nothing changes, so
  // footage legitimately ends early while the take, the drawn cursor and the
  // voice over run on, and the render holds the last frame through the
  // difference. Only the ingest's probe and the recorder's own measure count;
  // the browser's stopgap reading of a fresh file can come up seconds short,
  // and clamping to it cut the end of a take away on the first touch.
  const trimBoundOf = useCallback(
    (clipId: string, assetId: string): number | undefined => {
      const probedMs = assetsById[assetId]?.durationMs;
      const takeMs = timeline.cursor.find((layer) => layer.clipId === clipId)
        ?.recordedDurationMs;
      return probedMs === undefined && takeMs === undefined
        ? undefined
        : Math.max(probedMs ?? 0, takeMs ?? 0);
    },
    [assetsById, timeline.cursor],
  );

  const trimClip = useCallback(
    (clipId: string, change: { inMs?: number; outMs?: number }) => {
      const clip = timeline.clips.find((candidate) => candidate.id === clipId);
      if (!clip || clip.kind !== 'source') return;
      dispatch({
        type: 'trimClip',
        clipId,
        ...change,
        assetDurationMs: trimBoundOf(clipId, clip.assetId),
      });
    },
    [dispatch, timeline.clips, trimBoundOf],
  );

  // The timeline speaks programme time for everything it drags. Zooms and
  // cursor effects are anchored to a clip, so this is where they convert back.
  const changeSpan = useCallback(
    (kind: SpanKind, id: string, span: Span, drag: DragKind) => {
      const startMs = Math.round(span.startMs);
      const spanDurationMs = Math.round(span.durationMs);

      if (kind === 'banner') {
        dispatch({
          type: 'updateBanner',
          bannerId: id,
          change: { startMs, durationMs: spanDurationMs },
        });
        return;
      }

      if (kind === 'title') {
        dispatch({
          type: 'updateTitleCard',
          clipId: id,
          durationMs: spanDurationMs,
        });
        return;
      }

      if (kind === 'narration') {
        const take = timeline.narration.find((item) => item.id === id);
        if (!take) return;
        dispatch({
          type: 'updateNarration',
          narrationId: id,
          change: narrationChange(
            take,
            span,
            drag,
            assetDurationOf(take.assetId),
          ),
        });
        return;
      }

      if (kind === 'effect') {
        const layer = timeline.cursor.find((item) =>
          item.effects.some((effect) => effect.id === id),
        );
        if (!layer) return;
        // the click goes to whichever clip it was dropped on, so dragging it
        // past the end of its own clip carries it across rather than stopping
        const atMs = Math.max(0, Math.round(span.startMs));
        const onto = placementAt(placements, atMs) ?? placements.at(-1);
        if (!onto) return;
        // the drag lands in programme time; the effect is stored against the
        // footage, so the landing clip's own trim goes back on
        const trimMs = onto.clip.kind === 'source' ? onto.clip.inMs : 0;
        dispatch({
          type: 'moveCursorEffect',
          fromClipId: layer.clipId,
          toClipId: onto.clip.id,
          effectId: id,
          tMs:
            (effectChange(span, onto.startMs, onto.durationMs).tMs ?? 0) +
            trimMs,
        });
        return;
      }

      const target = timeline.zooms.find((item) => item.id === id);
      const placement = placements.find(
        ({ clip }) => clip.id === target?.clipId,
      );
      if (!target || !placement) return;
      dispatch({
        type: 'updateZoom',
        zoomId: id,
        change: zoomChange(target, span, placement.startMs),
      });
    },
    [
      assetDurationOf,
      dispatch,
      placements,
      timeline.cursor,
      timeline.narration,
      timeline.zooms,
    ],
  );

  const toggleMuteClip = useCallback(
    (clipId: string) => dispatch({ type: 'toggleMute', clipId }),
    [dispatch],
  );

  const moveFocus = useCallback(
    (focus: Point) => {
      if (!selected.zoom) return;
      dispatch({
        type: 'updateZoom',
        zoomId: selected.zoom.id,
        change: { focus },
      });
    },
    [dispatch, selected.zoom],
  );

  const movePin = useCallback(
    (point: Point) => {
      if (!selected.effect || !current) return;
      dispatch({
        type: 'updateCursorEffect',
        clipId: current.clip.id,
        effectId: selected.effect.id,
        change: { point },
      });
    },
    [current, dispatch, selected.effect],
  );

  const chapters = useMemo(
    () => resolveChapters(timeline, { forEditing: true }),
    [timeline],
  );
  // a second chapter on the same frame is one the render has to throw away, and
  // adding one looked like nothing had happened
  const chapterStarts = useMemo(
    () => new Set(chapters.map((chapter) => chapter.startMs)),
    [chapters],
  );
  const [onChapter, setOnChapter] = useState(false);
  useEffect(() => {
    const follow = (ms: number) =>
      setOnChapter(chapterStarts.has(Math.round(ms)));
    follow(getPlayheadMs());
    return subscribe(follow);
  }, [chapterStarts, getPlayheadMs, subscribe]);
  const canAddChapter = Boolean(current) && !onChapter;

  const recording = useCaptureHolder();

  const recorderPanels = useMemo(
    () => recorder?.(addAsset, applyCursorCapture),
    [addAsset, applyCursorCapture, recorder],
  );

  const setFps = useCallback(
    (fps: 24 | 30 | 60) => {
      pickedCanvas.current = true;
      dispatch({ type: 'setCanvas', canvas: { ...timeline.canvas, fps } });
    },
    [dispatch, timeline.canvas],
  );

  const renameChapter = useCallback(
    (chapterId: string, title: string) =>
      dispatch({ type: 'updateChapter', chapterId, title }),
    [dispatch],
  );

  const removeChapter = useCallback(
    (chapterId: string) => dispatch({ type: 'removeChapter', chapterId }),
    [dispatch],
  );

  // every panel below is memoised, so anything handed to one has to keep its
  // identity while the clock runs
  const chapterList = useMemo(
    () => (
      <ChapterList
        resolved={chapters}
        readOnly={readOnly}
        canAdd={canAddChapter}
        onAdd={addChapter}
        onRename={renameChapter}
        onRetime={retimeChapter}
        onRemove={removeChapter}
        onSelectTitle={selectTitleCard}
      />
    ),
    [
      addChapter,
      canAddChapter,
      chapters,
      readOnly,
      removeChapter,
      renameChapter,
      retimeChapter,
      selectTitleCard,
    ],
  );

  const skipToStart = useCallback(() => seek(0), [seek]);
  const skipToEnd = useCallback(() => seek(durationMs), [durationMs, seek]);

  useEditorShortcuts({
    readOnly,
    onToggle: toggle,
    onNudge: nudge,
    onSplit: splitAtPlayhead,
    onDuplicate: duplicateSelected,
    onToggleMute: toggleMuteSelected,
    onRemove: removeSelected,
    onUndo: editor.undo,
    onRedo: editor.redo,
  });

  return (
    <GestureProvider value={gesture}>
      <PlaybackProvider value={playback}>
        <div css={shellStyles} ref={zoom.shellRef}>
          {recording ? (
            <p css={recordingStyles} role="status">
              <span css={recordingDotStyles} />
              {`${recording} is running.`}
            </p>
          ) : null}
          <TransportBar
            dirty={editor.dirty}
            saving={editor.saveState === 'saving'}
            readOnly={readOnly}
            onSave={editor.flush}
            canUndo={!readOnly && editor.canUndo}
            canRedo={!readOnly && editor.canRedo}
            saveLabel={saveLabels[editor.saveState]}
            canvasHeight={timeline.canvas.height}
            canvasFps={timeline.canvas.fps}
            onFpsChange={setFps}
            onUndo={editor.undo}
            onRedo={editor.redo}
          />

          <div css={bodyStyles}>
            <AssetPanel
              recorder={recorderPanels}
              chapters={chapterList}
              assets={assets}
              used={usedAssetIds}
              busy={uploading}
              progress={uploadProgress}
              readOnly={readOnly}
              onImport={onImport}
              onImportAudio={onImportAudio}
              error={assetError}
              onRename={onRenameAsset}
              onAdd={addAsset}
              onDelete={onDeleteAsset}
            />

            <div css={centreStyles} ref={theatreRef}>
              <div css={stageAreaStyles} ref={stage.ref}>
                <PreviewStage
                  onGestureStart={startDrag}
                  onGestureEnd={endDrag}
                  box={stage.box}
                  placement={current}
                  next={current ? placements[current.index + 1] : undefined}
                  banners={timeline.banners}
                  zooms={timeline.zooms}
                  cursorEffects={cursorEffects}
                  cursorPath={cursorLayer?.path}
                  cursorPointer={cursorLayer?.pointer}
                  cursorOffsetMs={cursorLayer?.offsetMs}
                  cursorAlign={
                    cursorLayer &&
                    (cursorLayer.alignXPx || cursorLayer.alignYPx)
                      ? {
                          x:
                            (cursorLayer.alignXPx ?? 0) / timeline.canvas.width,
                          y:
                            (cursorLayer.alignYPx ?? 0) /
                            timeline.canvas.height,
                        }
                      : undefined
                  }
                  playing={playback.playing}
                  volume={volume}
                  narration={timeline.narration}
                  assets={assetsById}
                  assetUrl={assetUrl}
                  focus={
                    selected.zoom && !readOnly
                      ? {
                          point: selected.zoom.focus,
                          scale: selected.zoom.scale,
                          onChange: moveFocus,
                        }
                      : undefined
                  }
                  pin={
                    selected.effect && !readOnly
                      ? { point: selected.effect.point, onChange: movePin }
                      : undefined
                  }
                />
              </div>
              <StageControls
                playing={playback.playing}
                canPlay={durationMs > 0}
                durationMs={durationMs}
                volume={volume}
                fullscreen={fullscreen.supported ? fullscreen : undefined}
                onToggle={toggle}
                onSeek={seek}
                onSkipStart={skipToStart}
                onSkipEnd={skipToEnd}
                onVolume={setVolume}
              />
            </div>

            <InspectorPanel
              selected={selected}
              current={current}
              cursorLayer={cursorLayer}
              assets={assetsById}
              clipCount={placements.length}
              previousPlacement={
                selected.clip && selected.clip.index > 0
                  ? placements[selected.clip.index - 1]
                  : undefined
              }
              readOnly={readOnly}
              assetDurationOf={assetDurationOf}
              trimBoundMs={
                selectedSource
                  ? trimBoundOf(selectedSource.id, selectedSource.assetId)
                  : undefined
              }
              programmeMs={durationMs}
              dispatch={dispatch}
              onRemove={removeSelected}
            />
          </div>

          <ActionBar
            canSplit={Boolean(current)}
            canDuplicate={Boolean(selected.clip)}
            canMute={Boolean(selectedSource)}
            canRemove={hasResolvedSelection(selected)}
            canAddEffect={Boolean(current)}
            onAddTitleCard={addTitleCard}
            onAddBanner={addBanner}
            onAddZoom={addZoom}
            onAddCursorClick={addCursorClick}
            selectionMuted={selectedSource?.volume === 0}
            readOnly={readOnly}
            onSplit={splitAtPlayhead}
            onDuplicate={duplicateSelected}
            onToggleMute={toggleMuteSelected}
            onRemove={removeSelected}
            onZoomIn={zoom.zoomIn}
            onZoomOut={zoom.zoomOut}
            onZoomFit={zoom.zoomToFit}
          />

          {onDownloadClips && picked.length > 0 ? (
            <PickBar
              count={picked.length}
              canDownload={canDownload}
              busy={downloadBusy}
              onDownload={() => onDownloadClips([...picked])}
              onClear={clearPicks}
            />
          ) : null}

          <Timeline
            placements={placements}
            durationMs={durationMs}
            pixelsPerSecond={zoom.pixelsPerSecond}
            banners={timeline.banners}
            narration={timeline.narration}
            zooms={timeline.zooms}
            cursorLayers={timeline.cursor}
            selection={selection}
            pickedIds={picked}
            canPick={Boolean(onDownloadClips) && !readOnly}
            readOnly={readOnly}
            assets={assetsById}
            onSelect={select}
            onTogglePick={togglePick}
            onSeek={seek}
            onSpanChange={changeSpan}
            onMove={moveClip}
            onOverlap={overlapClips}
            onTrim={trimClip}
            onToggleMute={toggleMuteClip}
            onGestureStart={startDrag}
            onGestureEnd={endDrag}
          />
        </div>
      </PlaybackProvider>
    </GestureProvider>
  );
};

export default ProjectEditor;
