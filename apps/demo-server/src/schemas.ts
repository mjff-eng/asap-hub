import { z } from 'zod';
import { isFolderId, isVideoId } from './routes/request';

// ids land in S3 keys, DynamoDB key templates and CloudFront policy resources,
// so the body-supplied ones are held to the same alphabet as the path params
const folderIdField = z
  .string()
  .refine(isFolderId, { message: 'invalid folder id' });

// a parent is always a real folder row, never the synthetic ROOT bucket
const parentIdField = z
  .string()
  .refine((value) => value !== 'ROOT' && isVideoId(value), {
    message: 'invalid parent folder id',
  });

export const maxChapters = 500;

export const roleSchema = z.enum(['creator', 'member', 'admin']);

export const userStatusSchema = z.enum(['active', 'revoked']);

export const chapterSchema = z.object({
  startMs: z.number().int().nonnegative(),
  title: z.string().min(1).max(300),
});

// a chapter runs to the next chapter's start, so two on the same millisecond
// leave one of them with nothing to play and nothing to download, and a list out
// of order gives every chapter but the last a negative length
export const chaptersField = z
  .array(chapterSchema)
  .max(maxChapters)
  .superRefine((chapters, ctx) => {
    chapters.forEach((chapter, index) => {
      const previous = chapters[index - 1];
      if (previous && chapter.startMs <= previous.startMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'startMs'],
          message: 'chapters must start after the chapter before them',
        });
      }
    });
  });

export const createFolderSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: parentIdField.optional(),
});

// parentId 'TOP' moves the folder to the top level; omitting it leaves the parent untouched
export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    parentId: parentIdField.optional(),
  })
  .refine(
    ({ name, parentId }) => name !== undefined || parentId !== undefined,
    {
      message: 'name or parentId is required',
    },
  );

export const bulkMoveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  folderId: folderIdField,
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const updateVideoSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  folderId: folderIdField.optional(),
  chapters: chaptersField.optional(),
  recordedAt: z.string().min(1).optional(),
  version: z.number().int().nonnegative(),
});

export const publishVideoSchema = z.object({
  version: z.number().int().nonnegative(),
});

export const createUploadSchema = z.object({
  title: z.string().min(1).max(300),
  folderId: folderIdField.optional(),
  recordedAt: z.string().min(1).optional(),
});

export const uploadPartsSchema = z.object({
  uploadId: z.string().min(1).max(256),
  partNumbers: z.array(z.number().int().positive().max(10000)).min(1).max(1000),
});

export const completeUploadSchema = z.object({
  uploadId: z.string().min(1).max(256),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive().max(10000),
        eTag: z.string().min(1).max(256),
      }),
    )
    .min(1)
    .max(10000),
});

export const createProjectSchema = z.object({
  title: z.string().min(1).max(300),
  folderId: folderIdField.optional(),
  recordedAt: z.string().min(1).optional(),
});

// the document itself is validated by timelineSchema from @asap-hub/demo-timeline;
// this is the envelope the editor sends around it
export const saveTimelineSchema = z.object({
  timeline: z.unknown(),
  timelineVersion: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
});

// both render endpoints only ever carry the item version the caller read, which
// is what guards the write against a takeover or a concurrent edit
export const startRenderSchema = z.object({
  version: z.number().int().nonnegative(),
  // present only for a download: the cut keeps just these clips, and the
  // output lands beside the project rather than becoming the demo
  clipIds: z.array(z.string().min(1).max(64)).min(1).max(100).optional(),
});

export const cancelRenderSchema = z.object({
  version: z.number().int().nonnegative(),
});

export const createAssetSchema = z.object({
  kind: z.enum(['video', 'audio']),
  mimeType: z.string().min(1).max(120),
  label: z.string().min(1).max(300),
  extension: z
    .string()
    .min(1)
    .max(8)
    .regex(/^[a-z0-9]+$/, 'invalid extension'),
});

export const renameAssetSchema = z.object({
  // trimmed before the length check, so a name of nothing but spaces is refused
  // rather than stored and shown as a blank row
  label: z.string().trim().min(1).max(300),
});

export const assetPartsSchema = z.object({
  uploadId: z.string().min(1).max(256),
  partNumbers: z.array(z.number().int().positive().max(10000)).min(1).max(1000),
});

export const completeAssetSchema = z.object({
  uploadId: z.string().min(1).max(256),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive().max(10000),
        eTag: z.string().min(1).max(256),
      }),
    )
    .min(1)
    .max(10000),
});

// a batch is written to S3 as one object, so the batch size bounds both the
// object and the DynamoDB counters the capture endpoint bumps
export const maxCaptureBatchEvents = 5000;

// the capture endpoint is unauthenticated, so every id is held to the same safe
// alphabet as a path param before it reaches a key template. A batch names
// either the project, which is the reusable bookmark and is routed to whichever
// session is open, or one session, which is what bookmarks saved before it send.
export const captureBatchSchema = z
  .object({
    projectId: z
      .string()
      .refine(isVideoId, { message: 'invalid project id' })
      .optional(),
    sessionId: z
      .string()
      .refine(isVideoId, { message: 'invalid session id' })
      .optional(),
    token: z.string().min(1).max(256),
    // one per tab: several tabs share a session when the whole screen is recorded
    clientId: z.string().refine(isVideoId, { message: 'invalid client id' }),
    seq: z.number().int().positive().max(1_000_000),
    events: z.array(z.record(z.unknown())).min(1).max(maxCaptureBatchEvents),
  })
  .refine(
    ({ projectId, sessionId }) =>
      (projectId === undefined) !== (sessionId === undefined),
    { message: 'exactly one of projectId and sessionId is required' },
  );

// the take's start is optional: a capture applied from the editor knows when it
// stopped but not when the recording it belongs to began, and the events carry
// their own origin
export const finaliseRecordingSchema = z
  .object({
    startedAtEpochMs: z.number().int().positive().optional(),
    stoppedAtEpochMs: z.number().int().positive(),
  })
  .refine(
    ({ startedAtEpochMs, stoppedAtEpochMs }) =>
      startedAtEpochMs === undefined || stoppedAtEpochMs >= startedAtEpochMs,
    {
      message: 'stoppedAtEpochMs must not precede startedAtEpochMs',
    },
  );

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
});

export const updateUserSchema = z
  .object({
    role: roleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine(({ role, status }) => role !== undefined || status !== undefined, {
    message: 'role or status is required',
  });
