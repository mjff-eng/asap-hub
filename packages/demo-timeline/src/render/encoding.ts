import { Canvas } from '../schema';
import { chain } from './filters';

export const startArgs = ['-nostdin', '-y'];

// a fixed GOP keeps every clip cuttable at the same cadence, which is what
// makes the stage two concat able to copy the video stream untouched. The join
// cuts on this grid too, so it is a constant rather than a repeated literal
export const gopFrames = 60;

export const videoEncodeArgs = (canvas: Canvas): string[] => [
  '-fps_mode',
  'cfr',
  '-r',
  String(canvas.fps),
  '-c:v',
  'libx264',
  // veryfast halves the encode against medium at the same crf; the size cost
  // lands on intermediates the cut-only join stream copies anyway
  '-preset',
  'veryfast',
  '-crf',
  '20',
  '-g',
  String(gopFrames),
  '-keyint_min',
  String(gopFrames),
  '-sc_threshold',
  '0',
  '-pix_fmt',
  'yuv420p',
];

export const audioCodecArgs = ['-c:a', 'aac', '-b:a', '128k'];

export const audioEncodeArgs = (filters: string[]): string[] => [
  ...audioCodecArgs,
  '-af',
  chain(filters),
];

export const containerArgs = ['-movflags', '+faststart'];

export const silentAudioInput = (seconds: string): string[] => [
  '-f',
  'lavfi',
  '-t',
  seconds,
  '-i',
  'anullsrc=channel_layout=stereo:sample_rate=48000',
];

// the overlay's own rate matters: left at the image default of 25fps its
// fades stepped unevenly against a 30 or 60fps canvas
export const imageInput = (
  seconds: string,
  path: string,
  fps: number,
): string[] => [
  '-framerate',
  String(fps),
  '-loop',
  '1',
  '-t',
  seconds,
  '-i',
  path,
];
