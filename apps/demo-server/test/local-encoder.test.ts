import type * as LocalEncoder from '../src/local-encoder';

type SpawnResult = {
  code?: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
};

type SpawnHandler = (command: string, args: string[]) => SpawnResult;

let spawnHandler: SpawnHandler = () => ({ code: 1 });

const fakeChild = (result: SpawnResult) => ({
  stdout: {
    on: (event: string, cb: (chunk: Buffer) => void) => {
      if (event === 'data' && result.stdout !== undefined) {
        setImmediate(() => cb(Buffer.from(result.stdout!)));
      }
    },
  },
  stderr: {
    on: (event: string, cb: (chunk: Buffer) => void) => {
      if (event === 'data' && result.stderr !== undefined) {
        setImmediate(() => cb(Buffer.from(result.stderr!)));
      }
    },
  },
  on: (event: string, cb: (arg?: unknown) => void) => {
    if (result.error) {
      if (event === 'error') setImmediate(() => cb(result.error));
      return;
    }
    if (event === 'close') setImmediate(() => cb(result.code));
  },
});

const mockSpawn = jest.fn((command: string, args: string[]) =>
  fakeChild(spawnHandler(command, args)),
);

jest.mock('child_process', () => ({
  spawn: (command: string, args: string[]) => mockSpawn(command, args),
}));

const mockFsPromises = {
  mkdtemp: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  copyFile: jest.fn(),
  rm: jest.fn(),
};
const mockCreateWriteStream = jest.fn();

jest.mock('fs', () => ({
  createWriteStream: mockCreateWriteStream,
  promises: mockFsPromises,
}));

const mockPipeline = jest.fn();
jest.mock('stream/promises', () => ({ pipeline: mockPipeline }));

const mockGetObject = jest.fn();
const mockPutObject = jest.fn();
jest.mock('../src/storage', () => ({
  getObject: mockGetObject,
  putObject: mockPutObject,
  mediaPrefix: (id: string) => `media/${id}/`,
  rawKey: (id: string) => `raw/${id}/original.mp4`,
}));

const mockGo = jest.fn();
const mockRemove = jest.fn();
const mockSet = jest.fn();
const mockPatch = jest.fn();
jest.mock('../src/data/entities', () => ({
  videoEntity: { patch: mockPatch },
}));

const kind = (args: string[]): string => {
  if (args.includes('-version')) return 'version';
  if (args.includes('libx264')) return 'encode';
  if (args.includes('format=duration')) return 'duration';
  if (args.includes('stream=height')) return 'height';
  if (args.some((arg) => arg.includes('tile='))) return 'sprite';
  return 'poster';
};

const baseResponses: Record<string, SpawnResult> = {
  version: { code: 0 },
  encode: { code: 0 },
  duration: { code: 0, stdout: '65.5\n' },
  sprite: { code: 0 },
  height: { code: 0, stdout: '270\n' },
  poster: { code: 0 },
};

const respond =
  (overrides: Record<string, SpawnResult> = {}): SpawnHandler =>
  (_command, args) => {
    const key = kind(args);
    return { ...baseResponses[key], ...overrides[key] };
  };

const workDir = '/tmp/demo-work';
const fileContents = Buffer.from('artefact-bytes');

let encoder: typeof LocalEncoder;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  spawnHandler = () => ({ code: 1 });
  mockFsPromises.mkdtemp.mockResolvedValue(workDir);
  mockFsPromises.writeFile.mockResolvedValue(undefined);
  mockFsPromises.readFile.mockResolvedValue(fileContents);
  mockFsPromises.copyFile.mockResolvedValue(undefined);
  mockFsPromises.rm.mockResolvedValue(undefined);
  mockCreateWriteStream.mockReturnValue({});
  mockPipeline.mockResolvedValue(undefined);
  mockGetObject.mockResolvedValue({ body: {} });
  mockPutObject.mockResolvedValue(undefined);
  mockGo.mockResolvedValue({ data: {} });
  mockRemove.mockReturnValue({ go: mockGo });
  mockSet.mockReturnValue({ remove: mockRemove, go: mockGo });
  mockPatch.mockReturnValue({ set: mockSet });
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  encoder = require('../src/local-encoder');
});

const putKeys = () => mockPutObject.mock.calls.map((call) => call[0]);

const versionCalls = () =>
  mockSpawn.mock.calls.filter(([, args]) => args.includes('-version'));

describe('spriteGrid', () => {
  it('always yields at least one tile', () => {
    expect(encoder.spriteGrid(0)).toEqual({
      tileCount: 1,
      columns: 1,
      rows: 1,
      intervalSeconds: 1,
    });
  });

  // a fixed ten second interval gave a short demo a single tile, so the scrub
  // preview showed one frame from end to end
  it('samples a short demo every second', () => {
    expect(encoder.spriteGrid(10000)).toEqual({
      tileCount: 10,
      columns: 10,
      rows: 1,
      intervalSeconds: 1,
    });
  });

  it('adds a partial tile for the trailing remainder', () => {
    expect(encoder.spriteGrid(9500)).toMatchObject({
      tileCount: 10,
      intervalSeconds: 1,
    });
  });

  it('does not add a tile when the duration divides evenly', () => {
    expect(encoder.spriteGrid(9000)).toMatchObject({
      tileCount: 9,
      intervalSeconds: 1,
    });
  });

  it('stretches the interval rather than the sheet on a long demo', () => {
    const grid = encoder.spriteGrid(4 * 60 * 60 * 1000);

    expect(grid.intervalSeconds).toBe(144);
    expect(grid.tileCount).toBe(100);
    expect(grid.rows).toBe(10);
  });
});

describe('buildThumbnailsVtt', () => {
  it('builds cues with sprite coordinates and clamps the last cue end', () => {
    const vtt = encoder.buildThumbnailsVtt({
      durationMs: 1500,
      tileCount: 2,
      columns: 2,
      tileHeight: 90,
    });

    expect(vtt).toBe(
      [
        'WEBVTT',
        '',
        '00:00:00.000 --> 00:00:01.000',
        'sprite.jpg#xywh=0,0,160,90',
        '',
        '00:00:01.000 --> 00:00:01.500',
        'sprite.jpg#xywh=160,0,160,90',
        '',
      ].join('\n'),
    );
  });

  it('formats hours and milliseconds and advances rows', () => {
    const vtt = encoder.buildThumbnailsVtt({
      durationMs: 3600500,
      tileCount: 100,
      columns: 10,
      tileHeight: 90,
    });

    expect(vtt).toContain('00:59:49.000 --> 01:00:00.500');
    expect(vtt).toContain('sprite.jpg#xywh=1120,810,160,90');
  });
});

describe('encodeLocally with ffmpeg available', () => {
  it('uploads all artefacts and marks the video ready', async () => {
    spawnHandler = respond();

    await encoder.encodeLocally('video-1');

    expect(mockGetObject).toHaveBeenCalledWith('raw/video-1/original.mp4');
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(putKeys()).toEqual([
      'media/video-1/stream.mp4',
      'media/video-1/sprite.jpg',
      'media/video-1/thumbnails.vtt',
      'media/video-1/thumb.jpg',
    ]);
    expect(mockPutObject).toHaveBeenCalledWith(
      'media/video-1/stream.mp4',
      fileContents,
      'video/mp4',
    );
    expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
      `${workDir}/thumbnails.vtt`,
      expect.stringContaining('WEBVTT'),
    );
    expect(mockPatch).toHaveBeenCalledWith({ id: 'video-1' });
    expect(mockSet).toHaveBeenCalledWith({
      durationMs: 65500,
      processingState: 'ready',
    });
    expect(mockRemove).toHaveBeenCalledWith(['processingError']);
    expect(mockFsPromises.rm).toHaveBeenCalledWith(workDir, {
      recursive: true,
      force: true,
    });
  });

  it('skips the sprite when the sprite ffmpeg call fails', async () => {
    spawnHandler = respond({ sprite: { code: null } });

    await encoder.encodeLocally('video-1');

    expect(putKeys()).toEqual([
      'media/video-1/stream.mp4',
      'media/video-1/thumb.jpg',
    ]);
    expect(mockFsPromises.writeFile).not.toHaveBeenCalled();
  });

  it('skips the sprite when the probed height is zero', async () => {
    spawnHandler = respond({ height: { code: 0, stdout: '0\n' } });

    await encoder.encodeLocally('video-1');

    expect(putKeys()).toEqual([
      'media/video-1/stream.mp4',
      'media/video-1/thumb.jpg',
    ]);
  });

  it('skips the sprite when the height probe returns garbage', async () => {
    spawnHandler = respond({ height: { code: 0, stdout: 'nope\n' } });

    await encoder.encodeLocally('video-1');

    expect(putKeys()).not.toContain('media/video-1/sprite.jpg');
  });

  it('skips the poster when the poster ffmpeg call fails', async () => {
    spawnHandler = respond({ poster: { code: 1 } });

    await encoder.encodeLocally('video-1');

    expect(putKeys()).toEqual([
      'media/video-1/stream.mp4',
      'media/video-1/sprite.jpg',
      'media/video-1/thumbnails.vtt',
    ]);
  });

  it('skips the poster when the poster spawn errors', async () => {
    spawnHandler = respond({ poster: { error: new Error('ENOENT') } });

    await encoder.encodeLocally('video-1');

    expect(putKeys()).not.toContain('media/video-1/thumb.jpg');
    expect(mockSet).toHaveBeenCalledWith({
      durationMs: 65500,
      processingState: 'ready',
    });
  });

  it('records a zero duration when ffprobe exits nonzero', async () => {
    spawnHandler = respond({ duration: { code: 1, stdout: '65.5\n' } });

    await encoder.encodeLocally('video-1');

    expect(mockSet).toHaveBeenCalledWith({
      durationMs: 0,
      processingState: 'ready',
    });
  });

  it('records a zero duration when ffprobe output is not numeric', async () => {
    spawnHandler = respond({ duration: { code: 0, stdout: 'N/A\n' } });

    await encoder.encodeLocally('video-1');

    expect(mockSet).toHaveBeenCalledWith({
      durationMs: 0,
      processingState: 'ready',
    });
  });

  it('resolves binaries from known dirs and caches the path', async () => {
    spawnHandler = (command, args) => {
      if (kind(args) !== 'version') return respond()(command, args);
      if (command.startsWith('/usr/local/bin/')) return { code: 0 };
      if (command.startsWith('/')) return { code: 1 };
      return { error: new Error('ENOENT') };
    };

    await encoder.encodeLocally('video-1');

    expect(versionCalls()).toHaveLength(6);
    const encodeCall = mockSpawn.mock.calls.find(
      ([, args]) => kind(args) === 'encode',
    );
    expect(encodeCall![0]).toBe('/usr/local/bin/ffmpeg');

    await encoder.encodeLocally('video-1');

    expect(versionCalls()).toHaveLength(6);
  });
});

describe('encodeLocally without ffmpeg', () => {
  it('copies the original as the stream and reports a zero duration', async () => {
    spawnHandler = () => ({ code: 1 });

    await encoder.encodeLocally('video-1');

    expect(mockFsPromises.copyFile).toHaveBeenCalledWith(
      `${workDir}/original`,
      `${workDir}/stream.mp4`,
    );
    expect(putKeys()).toEqual(['media/video-1/stream.mp4']);
    expect(mockSet).toHaveBeenCalledWith({
      durationMs: 0,
      processingState: 'ready',
    });
  });
});

describe('encodeLocally failure handling', () => {
  it('marks the video failed with a truncated error and still cleans up', async () => {
    spawnHandler = respond({
      encode: { code: 1, stderr: 'x'.repeat(600) },
    });

    await expect(encoder.encodeLocally('video-1')).resolves.toBeUndefined();

    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({
      processingState: 'failed',
      processingError: expect.stringMatching(/^ffmpeg failed: x+$/),
    });
    const { processingError } = mockSet.mock.calls[0]![0];
    expect(processingError).toHaveLength(500);
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockFsPromises.rm).toHaveBeenCalledWith(workDir, {
      recursive: true,
      force: true,
    });
  });

  it('stringifies non-Error failures', async () => {
    mockGetObject.mockRejectedValue('boom');

    await encoder.encodeLocally('video-1');

    expect(mockSet).toHaveBeenCalledWith({
      processingState: 'failed',
      processingError: 'boom',
    });
  });

  it('swallows a failing failure patch and a failing cleanup', async () => {
    mockGetObject.mockRejectedValue(new Error('download failed'));
    mockGo.mockRejectedValue(new Error('table offline'));
    mockFsPromises.rm.mockRejectedValue(new Error('busy'));

    await expect(encoder.encodeLocally('video-1')).resolves.toBeUndefined();
  });
});

describe('startLocalEncode', () => {
  it('swallows rejections and logs them', async () => {
    const failure = new Error('no temp dir');
    mockFsPromises.mkdtemp.mockRejectedValue(failure);
    const logged = new Promise<void>((resolve) => {
      jest.spyOn(console, 'error').mockImplementation(() => resolve());
    });

    encoder.startLocalEncode('video-1');
    await logged;

    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledWith(
      'local encode for video-1 failed',
      failure,
    );
  });
});
