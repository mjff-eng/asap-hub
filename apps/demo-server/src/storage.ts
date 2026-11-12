import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListMultipartUploadsCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';
import { getBucketName, isLocal, localS3Endpoint } from './config';

let client: S3Client | undefined;

export const getS3Client = (): S3Client => {
  if (!client) {
    const config: S3ClientConfig = isLocal()
      ? {
          endpoint: localS3Endpoint(),
          forcePathStyle: true,
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'minioadmin',
            secretAccessKey: 'minioadmin',
          },
        }
      : {};
    client = new S3Client(config);
  }
  return client;
};

export const setS3Client = (next: S3Client | undefined): void => {
  client = next;
};

// raw/ is the only prefix the EventBridge encoder rule watches, so nothing the
// studio writes may live under it or every asset would start a Fargate encode
// S3 requires every part but the last to be at least 5MiB
export const partSize = 10485760;

export const rawKey = (videoId: string): string =>
  `raw/${videoId}/original.mp4`;

export const rawPrefix = (videoId: string): string => `raw/${videoId}/`;

export const mediaPrefix = (videoId: string): string => `media/${videoId}/`;

export const projectPrefix = (videoId: string): string =>
  `projects/${videoId}/`;

export const assetPrefix = (videoId: string, assetId: string): string =>
  `${projectPrefix(videoId)}assets/${assetId}/`;

export const assetKey = (
  videoId: string,
  assetId: string,
  extension: string,
): string => `${assetPrefix(videoId, assetId)}original.${extension}`;

export const assetProxyKey = (videoId: string, assetId: string): string =>
  `${assetPrefix(videoId, assetId)}proxy.mp4`;

// two tabs of the same creator both pass the timelineVersion check and the
// per-sub lease, so a key derived from the version alone would be written twice
// and the CAS winner's pointer could end up naming the loser's bytes; the uuid
// ties the pointer to the object it wrote and leaves the loser an orphan
export const timelineKey = (videoId: string, timelineVersion: number): string =>
  `${projectPrefix(videoId)}timeline/${timelineVersion}-${uuid()}.json`;

export const createMultipartUpload = async (
  key: string,
  contentType: string,
): Promise<{ uploadId: string; key: string }> => {
  const response = await getS3Client().send(
    new CreateMultipartUploadCommand({
      Bucket: getBucketName(),
      Key: key,
      ContentType: contentType,
    }),
  );
  return { uploadId: response.UploadId ?? '', key };
};

export const signUploadParts = async (
  key: string,
  uploadId: string,
  partNumbers: number[],
): Promise<{ partNumber: number; url: string }[]> =>
  Promise.all(
    partNumbers.map(async (partNumber) => ({
      partNumber,
      url: await getSignedUrl(
        getS3Client(),
        new UploadPartCommand({
          Bucket: getBucketName(),
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 3600 },
      ),
    })),
  );

export const completeMultipartUpload = async (
  key: string,
  uploadId: string,
  parts: { partNumber: number; eTag: string }[],
): Promise<void> => {
  await getS3Client().send(
    new CompleteMultipartUploadCommand({
      Bucket: getBucketName(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map(({ partNumber, eTag }) => ({
            PartNumber: partNumber,
            ETag: eTag,
          })),
      },
    }),
  );
};

export const abortMultipartUpload = async (
  key: string,
  uploadId: string,
): Promise<void> => {
  await getS3Client().send(
    new AbortMultipartUploadCommand({
      Bucket: getBucketName(),
      Key: key,
      UploadId: uploadId,
    }),
  );
};

// an S3 lifecycle rule matches a literal prefix, never a wildcard in the middle
// of one, so the intermediates that live under projects/{id}/ carry the tag the
// rule filters on instead
export const captureLifecycleTag = 'lifecycle=capture';
export const renderLifecycleTag = 'lifecycle=render';

export const putObject = async (
  key: string,
  body: Buffer | string,
  contentType: string,
  tagging?: string,
): Promise<void> => {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(tagging ? { Tagging: tagging } : {}),
    }),
  );
};

export const getObject = async (
  key: string,
  range?: string,
): Promise<{
  body: Readable;
  contentLength?: number;
  contentRange?: string;
  contentType?: string;
}> => {
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ...(range ? { Range: range } : {}),
    }),
  );
  return {
    body: response.Body as Readable,
    contentLength: response.ContentLength,
    contentRange: response.ContentRange,
    contentType: response.ContentType,
  };
};

// A caller deciding whether it may carry an object's bytes needs its size and
// nothing else, and a HEAD costs no transfer. An object that was never written
// answers undefined rather than throwing: through the CDN that case is a 403
// like any other refusal, so the size is the only place it can be told apart.
export const objectSize = async (key: string): Promise<number | undefined> => {
  try {
    const { ContentLength } = await getS3Client().send(
      new HeadObjectCommand({ Bucket: getBucketName(), Key: key }),
    );
    return ContentLength;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    if (error instanceof NotFound || status === 404) {
      return undefined;
    }
    throw error;
  }
};

// callers that want a whole small object (the timeline document) rather than a
// stream to pipe at a client
export const getObjectText = async (key: string): Promise<string> => {
  const { body } = await getObject(key);
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    body.on('data', (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    body.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    body.on('error', reject);
  });
};

export const deleteObject = async (key: string): Promise<void> => {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }),
  );
};

export const deletePrefix = async (prefix: string): Promise<void> => {
  let continuationToken: string | undefined;
  do {
    const listed = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: getBucketName(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const keys = (listed.Contents || [])
      .map(({ Key }) => Key)
      .filter((key): key is string => Boolean(key));
    if (keys.length) {
      await getS3Client().send(
        new DeleteObjectsCommand({
          Bucket: getBucketName(),
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    }
    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
};

// in-flight multipart uploads keep their parts billable and are invisible to
// ListObjectsV2, so deleting the objects under a prefix is not enough to free
// the storage; every upload still open on that prefix has to be aborted too
export const abortMultipartUploadsUnder = async (
  prefix: string,
): Promise<void> => {
  // MinIO answers a prefixed ListMultipartUploads with an empty set, so when a
  // prefixed page comes back empty the whole bucket is listed and filtered here
  const abortPage = async (usePrefix: boolean): Promise<number> => {
    let keyMarker: string | undefined;
    let uploadIdMarker: string | undefined;
    let aborted = 0;
    do {
      const listed = await getS3Client().send(
        new ListMultipartUploadsCommand({
          Bucket: getBucketName(),
          ...(usePrefix ? { Prefix: prefix } : {}),
          KeyMarker: keyMarker,
          UploadIdMarker: uploadIdMarker,
        }),
      );
      const uploads = (listed.Uploads || []).filter(
        (upload): upload is { Key: string; UploadId: string } =>
          Boolean(upload.Key?.startsWith(prefix) && upload.UploadId),
      );
      await Promise.all(
        uploads.map(({ Key, UploadId }) =>
          getS3Client().send(
            new AbortMultipartUploadCommand({
              Bucket: getBucketName(),
              Key,
              UploadId,
            }),
          ),
        ),
      );
      aborted += uploads.length;
      if (listed.IsTruncated) {
        keyMarker = listed.NextKeyMarker;
        uploadIdMarker = listed.NextUploadIdMarker;
      } else {
        keyMarker = undefined;
        uploadIdMarker = undefined;
      }
    } while (keyMarker || uploadIdMarker);
    return aborted;
  };

  if ((await abortPage(true)) === 0) {
    await abortPage(false);
  }
};
