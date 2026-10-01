import { ClipPlacement } from '../clips';
import { Canvas, NarrationClip } from '../schema';
import { assetPath } from './assets';
import {
  audioCodecArgs,
  containerArgs,
  startArgs,
  videoEncodeArgs,
} from './encoding';
import {
  audioFormatFilter,
  filterSegment,
  graph,
  label,
  secondsFromMs,
  timebaseFilter,
  xfadeTransition,
} from './filters';
import { joinPieces, JoinPieces, TileStarts } from './joinPieces';
import { clipOutputPath, concatListPath } from './paths';
import { ConcatListFile, FfmpegStep, RenderAsset } from './types';

export type JoinStepInput = {
  placements: ClipPlacement[];
  canvas: Canvas;
  narration: NarrationClip[];
  assets: Map<string, RenderAsset>;
  durationMs: number;
  workDir: string;
  output: string;
  // set for a clip the plan encoded as tiles, so the join knows the picture
  // restarts on a keyframe at every tile rather than only on the GOP grid
  tileStarts?: TileStarts;
};

export type JoinStepResult = {
  step: FfmpegStep;
  listFile?: ConcatListFile;
  // the cuts and blends the join reads, when it is joining pieces
  pieces?: FfmpegStep[];
};

export const hasVisualTransition = (placements: ClipPlacement[]): boolean =>
  placements.some((placement) => placement.overlapMs > 0);

export type JoinBoundary = {
  // the ffmpeg input the incoming clip is read from: the join opens one input
  // per placement, in order, so it is that placement's position in the list
  index: number;
  offsetMs: number;
  durationMs: number;
  transition: string;
};

// layoutClips is the single source of the arithmetic: the chain built so far
// ends at the previous clip's endMs, which is this clip's startMs plus its
// overlap, so the xfade offset is exactly this clip's startMs
export const joinBoundaries = (placements: ClipPlacement[]): JoinBoundary[] =>
  placements.slice(1).map((placement, position) => ({
    index: position + 1,
    offsetMs: placement.startMs,
    durationMs: placement.overlapMs,
    transition: xfadeTransition(placement.clip.transitionIn),
  }));

const joinLabel = (clipCount: number, strategy: string): string =>
  `join ${clipCount} clip${clipCount === 1 ? '' : 's'} (${strategy})`;

export const concatListContent = (paths: string[]): string =>
  paths.map((path) => `file '${path.replace(/'/g, `'\\''`)}'\n`).join('');

const narrationInputArgs = (
  narration: NarrationClip[],
  assets: Map<string, RenderAsset>,
): string[] =>
  narration.flatMap((take) => [
    '-i',
    assetPath(assets, take.assetId, `narration ${take.id}`),
  ]);

const narrationLabel = (position: number): string => `n${position}`;

const narrationSegments = (
  narration: NarrationClip[],
  firstInput: number,
): string[] =>
  narration.map((take, position) =>
    filterSegment(
      [`${firstInput + position}:a`],
      [
        `atrim=${secondsFromMs(take.inMs)}:${secondsFromMs(take.outMs)}`,
        'asetpts=PTS-STARTPTS',
        `volume=${take.volume}`,
        // conditioned like clip audio: a mono 44.1kHz take fed to amix raw
        // collapsed the whole programme to mono on ffmpeg 6
        audioFormatFilter,
        `adelay=${take.startMs}:all=1`,
      ],
      narrationLabel(position),
    ),
  );

// normalize=0 is essential: the default quietly attenuates every input by 1/N
const mixSegment = (inputs: string[], durationMs: number): string =>
  filterSegment(
    inputs,
    [
      `amix=inputs=${inputs.length}:normalize=0:dropout_transition=0`,
      'apad',
      `atrim=0:${secondsFromMs(durationMs)}`,
    ],
    'a',
  );

// The concat demuxer copies each clip's AAC packets untouched, so every clip
// after the first re-inserts its own encoder priming: the programme measured
// 21.35ms of audio ahead of picture and a non-monotonic DTS clamp at each cut.
// The audio is therefore rebuilt from the clip files through the concat filter,
// which decodes each one and drops its priming, while the video is still copied
// off the demuxer. -copyts keeps the demuxer's negative audio start off the
// video: without it ffmpeg rebases the whole input and the picture lands late.
const concatJoin = ({
  placements,
  narration,
  assets,
  durationMs,
  workDir,
  output,
}: JoinStepInput): JoinStepResult => {
  const listPath = concatListPath(workDir);
  // input 0 is the demuxer the video is copied from, so the per-clip audio
  // inputs start at 1 and the narration follows them
  const audioInputs = placements.map(
    (_unused, position) => `${position + 1}:a`,
  );
  const programAudio = filterSegment(
    audioInputs,
    [`concat=n=${audioInputs.length}:v=0:a=1`],
    'pa',
  );
  const mixed = narration.length > 0;
  const segments = [
    programAudio,
    ...(mixed
      ? [
          ...narrationSegments(narration, placements.length + 1),
          mixSegment(
            [
              'pa',
              ...narration.map((_unused, position) => narrationLabel(position)),
            ],
            durationMs,
          ),
        ]
      : []),
  ];

  return {
    listFile: {
      path: listPath,
      content: concatListContent(
        placements.map((placement) => clipOutputPath(workDir, placement.index)),
      ),
    },
    step: {
      label: joinLabel(placements.length, 'concat'),
      output,
      args: [
        ...startArgs,
        '-copyts',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        ...placements.flatMap((placement) => [
          '-i',
          clipOutputPath(workDir, placement.index),
        ]),
        ...narrationInputArgs(narration, assets),
        '-filter_complex',
        graph(segments),
        '-map',
        '0:v',
        '-map',
        label(mixed ? 'a' : 'pa'),
        '-c:v',
        'copy',
        ...audioCodecArgs,
        ...containerArgs,
        output,
      ],
    },
  };
};

type ChainLink = { input: string; name: string; filter: string };

type Chain = { segments: string[]; label: string };

// ffmpeg's xfade and acrossfade take two inputs, so a join of n clips is a
// left-leaning spine: each link blends everything built so far with one more
const foldChain = (first: string, links: ChainLink[]): Chain => {
  const segments: string[] = [];
  let last = first;

  links.forEach((link) => {
    segments.push(filterSegment([last, link.input], [link.filter], link.name));
    last = link.name;
  });

  return { segments, label: last };
};

// The programme's own audio: a blended boundary crossfades, a cut abuts. The
// first clip is whichever input the caller opened it as, because a join that
// reads its picture off the concat demuxer holds that demuxer as input 0.
const programAudioChain = (
  boundaries: JoinBoundary[],
  firstInput: number,
): Chain =>
  foldChain(
    `${firstInput}:a`,
    boundaries.map((boundary) => ({
      input: `${boundary.index + firstInput}:a`,
      name: `a${boundary.index}`,
      filter:
        boundary.durationMs > 0
          ? `acrossfade=d=${secondsFromMs(boundary.durationMs)}`
          : 'concat=n=2:v=0:a=1',
    })),
  );

const xfadeJoin = ({
  placements,
  canvas,
  narration,
  assets,
  durationMs,
  workDir,
  output,
}: JoinStepInput): JoinStepResult => {
  const boundaries = joinBoundaries(placements);

  // xfade refuses two inputs whose timebases differ, and concat rewrites the
  // timebase of what it produces, so every branch is pinned to the same one
  const normalised = [
    filterSegment(['0:v'], [timebaseFilter], 'vt0'),
    ...boundaries.map((boundary) =>
      filterSegment(
        [`${boundary.index}:v`],
        [timebaseFilter],
        `vt${boundary.index}`,
      ),
    ),
  ];

  const video = foldChain(
    'vt0',
    boundaries.map((boundary) => ({
      input: `vt${boundary.index}`,
      name: `v${boundary.index}`,
      filter:
        boundary.durationMs > 0
          ? `xfade=transition=${boundary.transition}:duration=${secondsFromMs(
              boundary.durationMs,
            )}:offset=${secondsFromMs(boundary.offsetMs)}`
          : 'concat=n=2:v=1:a=0',
    })),
  );

  const programAudio = programAudioChain(boundaries, 0);

  const mixed = narration.length > 0;
  const mix = mixed
    ? [
        ...narrationSegments(narration, placements.length),
        mixSegment(
          [
            programAudio.label,
            ...narration.map((_, position) => narrationLabel(position)),
          ],
          durationMs,
        ),
      ]
    : [];

  return {
    step: {
      label: joinLabel(placements.length, 'xfade'),
      output,
      args: [
        ...startArgs,
        ...placements.flatMap((placement) => [
          '-i',
          clipOutputPath(workDir, placement.index),
        ]),
        ...narrationInputArgs(narration, assets),
        '-filter_complex',
        graph([
          ...normalised,
          ...video.segments,
          ...programAudio.segments,
          ...mix,
        ]),
        '-map',
        label(video.label),
        '-map',
        label(mixed ? 'a' : programAudio.label),
        ...videoEncodeArgs(canvas),
        ...audioCodecArgs,
        ...containerArgs,
        output,
      ],
    },
  };
};

// Everything the xfade join does to the audio, done to the audio alone. The
// picture comes off the concat demuxer, so the clips move up one input and the
// programme is a list of pieces rather than a list of clips: the blended spans
// re-encoded, every other span copied out of the clip it already sits in.
const segmentedJoin = (
  { placements, narration, assets, durationMs, workDir, output }: JoinStepInput,
  pieces: JoinPieces,
): JoinStepResult => {
  const listPath = concatListPath(workDir);
  const programAudio = programAudioChain(joinBoundaries(placements), 1);
  const mixed = narration.length > 0;
  const mix = mixed
    ? [
        ...narrationSegments(narration, placements.length + 1),
        mixSegment(
          [
            programAudio.label,
            ...narration.map((_unused, position) => narrationLabel(position)),
          ],
          durationMs,
        ),
      ]
    : [];

  return {
    listFile: { path: listPath, content: concatListContent(pieces.paths) },
    pieces: pieces.steps,
    step: {
      label: joinLabel(placements.length, 'segments'),
      output,
      args: [
        ...startArgs,
        '-copyts',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        ...placements.flatMap((placement) => [
          '-i',
          clipOutputPath(workDir, placement.index),
        ]),
        ...narrationInputArgs(narration, assets),
        '-filter_complex',
        graph([...programAudio.segments, ...mix]),
        '-map',
        '0:v',
        '-map',
        label(mixed ? 'a' : programAudio.label),
        '-c:v',
        'copy',
        ...audioCodecArgs,
        ...containerArgs,
        output,
      ],
    },
  };
};

export const buildJoinStep = (input: JoinStepInput): JoinStepResult => {
  if (!hasVisualTransition(input.placements)) {
    return concatJoin(input);
  }
  const pieces = joinPieces(
    input.placements,
    input.canvas,
    input.workDir,
    input.tileStarts,
  );
  // a programme too short to cut on the keyframe grid is re-encoded whole,
  // which is slow but is the picture the timeline asks for
  return pieces ? segmentedJoin(input, pieces) : xfadeJoin(input);
};
