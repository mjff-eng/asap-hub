// This file owns its env: BUCKET_NAME is cleared so the driver exercises the
// local fallback in config.getBucketName(), regardless of what other test files
// set on the shared process.
//
// It goes through an alias because babel-base.config.js turns on
// transform-inline-environment-variables for any NODE_ENV other than 'test',
// and that plugin rewrites a literal `process.env.NAME` to its value at build
// time. `delete process.env.BUCKET_NAME` then compiles to `delete undefined`,
// which is a syntax error in strict mode and takes the whole suite with it.
const env: NodeJS.ProcessEnv = process.env;
env.SLS_STAGE = 'local';
delete env.BUCKET_NAME;

const bucket = 'demo-hub-local-storage';

/* eslint-disable import/first */
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import {
  abortMultipartUpload,
  abortMultipartUploadsUnder,
  completeMultipartUpload,
  createMultipartUpload,
  deletePrefix,
  getObject,
  getS3Client,
  objectSize,
  putObject,
  setS3Client,
  signUploadParts,
} from '../src/storage';
/* eslint-enable import/first */

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<
  typeof getSignedUrl
>;

const send = jest.fn();

// the driver only ever calls send(); a stub keeps the command inputs inspectable
const stubClient = () => {
  setS3Client({ send } as unknown as S3Client);
};

const lastInput = (call = 0) => send.mock.calls[call]![0].input;

beforeEach(() => {
  send.mockReset().mockResolvedValue({});
  mockGetSignedUrl.mockReset();
  stubClient();
});

afterEach(() => {
  setS3Client(undefined);
});

describe('client configuration', () => {
  afterEach(() => {
    setS3Client(undefined);
  });

  it('points at MinIO with path-style addressing when running locally', async () => {
    setS3Client(undefined);

    const client = getS3Client();

    expect(await client.config.forcePathStyle).toBe(true);
    expect(await client.config.region()).toBe('us-east-1');
    const endpoint = await client.config.endpoint!();
    expect(endpoint.hostname).toBe('localhost');
    // 9010, not the MinIO default: another project on this machine owns 9000
    expect(endpoint.port).toBe(9010);
    const credentials = await client.config.credentials();
    expect(credentials.accessKeyId).toBe('minioadmin');
    expect(credentials.secretAccessKey).toBe('minioadmin');
  });

  it('reuses the client across calls', () => {
    setS3Client(undefined);
    expect(getS3Client()).toBe(getS3Client());
  });

  it('replaces the client when one is injected', () => {
    const injected = { send } as unknown as S3Client;
    setS3Client(injected);
    expect(getS3Client()).toBe(injected);
  });
});

describe('createMultipartUpload', () => {
  it('creates the upload for the key and content type it is given', async () => {
    send.mockResolvedValue({ UploadId: 'upload-1' });

    const result = await createMultipartUpload(
      'raw/video-1/original.mp4',
      'video/mp4',
    );

    expect(result).toEqual({
      uploadId: 'upload-1',
      key: 'raw/video-1/original.mp4',
    });
    expect(lastInput()).toEqual({
      Bucket: bucket,
      Key: 'raw/video-1/original.mp4',
      ContentType: 'video/mp4',
    });
  });

  it('falls back to an empty upload id when S3 omits it', async () => {
    send.mockResolvedValue({});

    await expect(
      createMultipartUpload('raw/video-1/original.mp4', 'video/mp4'),
    ).resolves.toMatchObject({
      uploadId: '',
    });
  });
});

describe('signUploadParts', () => {
  it('presigns one hour urls for each requested part number', async () => {
    mockGetSignedUrl.mockImplementation(async (_client, command) => {
      const { PartNumber } = (
        command as unknown as { input: Record<string, unknown> }
      ).input;
      return `https://signed.example/part-${PartNumber}`;
    });

    const urls = await signUploadParts(
      'raw/video-1/original.mp4',
      'upload-1',
      [1, 3],
    );

    expect(urls).toEqual([
      { partNumber: 1, url: 'https://signed.example/part-1' },
      { partNumber: 3, url: 'https://signed.example/part-3' },
    ]);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(2);
    const [, command, options] = mockGetSignedUrl.mock.calls[0]!;
    expect(
      (command as unknown as { input: Record<string, unknown> }).input,
    ).toEqual({
      Bucket: bucket,
      Key: 'raw/video-1/original.mp4',
      UploadId: 'upload-1',
      PartNumber: 1,
    });
    expect(options).toEqual({ expiresIn: 3600 });
  });
});

describe('completeMultipartUpload', () => {
  it('sorts the parts by number before completing', async () => {
    await completeMultipartUpload('raw/video-1/original.mp4', 'upload-1', [
      { partNumber: 3, eTag: 'c' },
      { partNumber: 1, eTag: 'a' },
      { partNumber: 2, eTag: 'b' },
    ]);

    expect(lastInput()).toEqual({
      Bucket: bucket,
      Key: 'raw/video-1/original.mp4',
      UploadId: 'upload-1',
      MultipartUpload: {
        Parts: [
          { PartNumber: 1, ETag: 'a' },
          { PartNumber: 2, ETag: 'b' },
          { PartNumber: 3, ETag: 'c' },
        ],
      },
    });
  });

  it('does not mutate the parts array it was given', async () => {
    const parts = [
      { partNumber: 2, eTag: 'b' },
      { partNumber: 1, eTag: 'a' },
    ];

    await completeMultipartUpload(
      'raw/video-1/original.mp4',
      'upload-1',
      parts,
    );

    expect(parts[0]!.partNumber).toBe(2);
  });
});

describe('abortMultipartUpload', () => {
  it('aborts the upload for the key it is given', async () => {
    await abortMultipartUpload('raw/video-1/original.mp4', 'upload-1');

    expect(lastInput()).toEqual({
      Bucket: bucket,
      Key: 'raw/video-1/original.mp4',
      UploadId: 'upload-1',
    });
  });
});

describe('putObject', () => {
  it('writes the body with the given content type', async () => {
    await putObject('media/video-1/chapters.json', '[]', 'application/json');

    expect(lastInput()).toEqual({
      Bucket: bucket,
      Key: 'media/video-1/chapters.json',
      Body: '[]',
      ContentType: 'application/json',
    });
  });
});

describe('getObject', () => {
  it('passes the range header through and maps the response metadata', async () => {
    const body = Readable.from(['chunk']);
    send.mockResolvedValue({
      Body: body,
      ContentLength: 5,
      ContentRange: 'bytes 0-4/100',
      ContentType: 'video/mp4',
    });

    const result = await getObject('media/video-1/index.m3u8', 'bytes=0-4');

    expect(lastInput()).toEqual({
      Bucket: bucket,
      Key: 'media/video-1/index.m3u8',
      Range: 'bytes=0-4',
    });
    expect(result).toEqual({
      body,
      contentLength: 5,
      contentRange: 'bytes 0-4/100',
      contentType: 'video/mp4',
    });
  });

  it('omits the Range key entirely when no range is requested', async () => {
    send.mockResolvedValue({ Body: Readable.from([]) });

    await getObject('media/video-1/index.m3u8');

    expect(lastInput()).not.toHaveProperty('Range');
  });
});

describe('objectSize', () => {
  it('heads the object and answers its length', async () => {
    send.mockResolvedValue({ ContentLength: 4096 });

    await expect(
      objectSize('projects/p1/capture/s1/events.ndjson'),
    ).resolves.toBe(4096);
    expect(lastInput()).toEqual({
      Bucket: bucket,
      Key: 'projects/p1/capture/s1/events.ndjson',
    });
  });

  // "never written" is a real answer here: through the CDN it is a 403 like any
  // other refusal, and the size is the only place the two come apart
  it('answers undefined for an object that is not there', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('Not Found'), {
        $metadata: { httpStatusCode: 404 },
      }),
    );

    await expect(
      objectSize('projects/p1/nothing.ndjson'),
    ).resolves.toBeUndefined();
  });

  it('raises anything that is not a missing object', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('Access Denied'), {
        $metadata: { httpStatusCode: 403 },
      }),
    );

    await expect(objectSize('projects/p1/nothing.ndjson')).rejects.toThrow(
      'Access Denied',
    );
  });
});

describe('deletePrefix', () => {
  it('lists then deletes the keys under the prefix', async () => {
    send
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'media/video-1/a.ts' },
          { Key: 'media/video-1/b.ts' },
        ],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});

    await deletePrefix('media/video-1/');

    expect(lastInput(0)).toEqual({
      Bucket: bucket,
      Prefix: 'media/video-1/',
      ContinuationToken: undefined,
    });
    expect(lastInput(1)).toEqual({
      Bucket: bucket,
      Delete: {
        Objects: [{ Key: 'media/video-1/a.ts' }, { Key: 'media/video-1/b.ts' }],
      },
    });
  });

  it('follows the continuation token until the listing is exhausted', async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: 'media/video-1/page-1' }],
        IsTruncated: true,
        NextContinuationToken: 'token-1',
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Contents: [{ Key: 'media/video-1/page-2' }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});

    await deletePrefix('media/video-1/');

    expect(send).toHaveBeenCalledTimes(4);
    expect(lastInput(2).ContinuationToken).toBe('token-1');
    expect(lastInput(3).Delete.Objects).toEqual([
      { Key: 'media/video-1/page-2' },
    ]);
  });

  it('skips the delete call when the prefix is empty', async () => {
    send.mockResolvedValueOnce({ Contents: [], IsTruncated: false });

    await deletePrefix('media/video-1/');

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('ignores listed entries without a key', async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: undefined }, { Key: 'media/video-1/a.ts' }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});

    await deletePrefix('media/video-1/');

    expect(lastInput(1).Delete.Objects).toEqual([
      { Key: 'media/video-1/a.ts' },
    ]);
  });

  it('stops when S3 reports truncation without a next token', async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: 'media/video-1/a.ts' }],
        IsTruncated: true,
        NextContinuationToken: undefined,
      })
      .mockResolvedValueOnce({});

    await deletePrefix('media/video-1/');

    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('abortMultipartUploadsUnder', () => {
  it('aborts every in-flight upload under the prefix', async () => {
    send
      .mockResolvedValueOnce({
        Uploads: [
          { Key: 'raw/video-1/original.mp4', UploadId: 'u1' },
          { Key: 'raw/video-1/original.mp4', UploadId: 'u2' },
        ],
        IsTruncated: false,
      })
      .mockResolvedValue({});

    await abortMultipartUploadsUnder('raw/video-1/');

    expect(lastInput(0)).toEqual({
      Bucket: bucket,
      Prefix: 'raw/video-1/',
      KeyMarker: undefined,
      UploadIdMarker: undefined,
    });
    expect(lastInput(1)).toEqual({
      Bucket: bucket,
      Key: 'raw/video-1/original.mp4',
      UploadId: 'u1',
    });
    expect(lastInput(2)).toEqual({
      Bucket: bucket,
      Key: 'raw/video-1/original.mp4',
      UploadId: 'u2',
    });
  });

  it('follows the key and upload id markers across pages', async () => {
    send
      .mockResolvedValueOnce({
        Uploads: [{ Key: 'raw/video-1/original.mp4', UploadId: 'u1' }],
        IsTruncated: true,
        NextKeyMarker: 'raw/video-1/original.mp4',
        NextUploadIdMarker: 'u1',
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Uploads: [{ Key: 'raw/video-1/original.mp4', UploadId: 'u2' }],
        IsTruncated: false,
      })
      .mockResolvedValue({});

    await abortMultipartUploadsUnder('raw/video-1/');

    expect(lastInput(2)).toEqual({
      Bucket: bucket,
      Prefix: 'raw/video-1/',
      KeyMarker: 'raw/video-1/original.mp4',
      UploadIdMarker: 'u1',
    });
    expect(lastInput(3)).toEqual({
      Bucket: bucket,
      Key: 'raw/video-1/original.mp4',
      UploadId: 'u2',
    });
  });

  it('retries without a prefix when the prefixed listing comes back empty', async () => {
    // MinIO answers a prefixed ListMultipartUploads with nothing at all
    send
      .mockResolvedValueOnce({ Uploads: [], IsTruncated: false })
      .mockResolvedValueOnce({
        Uploads: [
          { Key: 'raw/video-1/original.mp4', UploadId: 'u1' },
          { Key: 'raw/video-2/original.mp4', UploadId: 'other' },
        ],
        IsTruncated: false,
      })
      .mockResolvedValue({});

    await abortMultipartUploadsUnder('raw/video-1/');

    expect(lastInput(1)).toEqual({
      Bucket: bucket,
      KeyMarker: undefined,
      UploadIdMarker: undefined,
    });
    // only the upload under the requested prefix is aborted
    expect(send).toHaveBeenCalledTimes(3);
    expect(lastInput(2)).toEqual({
      Bucket: bucket,
      Key: 'raw/video-1/original.mp4',
      UploadId: 'u1',
    });
  });

  it('ignores uploads with no key or no upload id', async () => {
    send
      .mockResolvedValueOnce({
        Uploads: [{ Key: 'raw/video-1/original.mp4' }, { UploadId: 'u2' }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({ Uploads: [], IsTruncated: false })
      .mockResolvedValue({});

    await abortMultipartUploadsUnder('raw/video-1/');

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does nothing when there is no upload in flight', async () => {
    send.mockResolvedValue({ Uploads: [], IsTruncated: false });

    await abortMultipartUploadsUnder('raw/video-1/');

    expect(send).toHaveBeenCalledTimes(2);
  });
});
