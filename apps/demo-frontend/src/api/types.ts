export type Role = 'creator' | 'member' | 'admin';

export type UserStatus = 'active' | 'revoked';

export type Me = {
  sub: string;
  name: string;
  email: string;
  role: Role;
};

export type ManagedUser = {
  sub: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
};

export type Folder = {
  id: string;
  name: string;
  parentId?: string;
};

export const rootFolderId = 'ROOT';

// PATCH /folders/:id sentinel meaning "move to the top level"
export const topLevelParentId = 'TOP';

export type FolderCounts = Record<string, number>;

export type BulkMoveResult = {
  moved: string[];
  missing: string[];
  // held open by another creator, so the move was refused rather than applied
  locked: string[];
};

export type BulkDeleteResult = {
  deleted: string[];
  missing: string[];
  locked: string[];
  // an export was running, and deleting mid render strands the media
  rendering: string[];
};

// a folder holding a video that could not go is kept, and so are its ancestors
export type FolderDeleteResult = {
  locked: string[];
  rendering: string[];
  kept: string[];
};

export type Chapter = {
  startMs: number;
  title: string;
};

export type VideoStatus = 'draft' | 'published';

// 'empty' is a studio project that has never been rendered
export type ProcessingState =
  | 'empty'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed';

export type VideoKind = 'upload' | 'studio';

export type RenderState =
  | 'queued'
  | 'rendering'
  | 'done'
  | 'failed'
  | 'cancelled';

export type TimelinePointer = {
  key: string;
  timelineVersion: number;
  schemaVersion: number;
  updatedAt: string;
};

export type RenderJob = {
  renderId: string;
  state: RenderState;
  timelineVersion: number;
  // a download renders a picked cut into its own directory and never becomes
  // the demo; absent means the render is the demo itself
  purpose?: 'download';
  downloadPath?: string;
  stage?: string;
  progress?: number;
  requestedAt?: string;
  finishedAt?: string;
  error?: string;
};

export type Video = {
  id: string;
  title: string;
  status: VideoStatus;
  folderId: string;
  recordedAt: string;
  durationMs: number;
  chapters: Chapter[];
  // how many per-chapter section files the render published for download
  sectionCount?: number;
  processingState: ProcessingState;
  processingError?: string;
  createdBy: { sub: string; name: string };
  lockedBy?: string;
  lockedByName?: string;
  lockExpiresAt?: string;
  version: number;
  kind: VideoKind;
  mediaPath?: string;
  timeline?: TimelinePointer;
  render?: RenderJob;
};

export type VideoAccess = {
  streamUrl: string;
  spriteUrl: string;
  thumbnailsVttUrl: string;
  sectionsBaseUrl?: string;
};

export type Invite = {
  email: string;
  role: Role;
  createdAt: string;
  claimedBy?: string;
};

export type ListResponse<T> = { items: T[] };

export type CreatedUpload = {
  videoId: string;
  uploadId: string;
  key: string;
  partSize: number;
};

export type PartUrl = { partNumber: number; url: string };

export type UploadedPart = { partNumber: number; eTag: string };

export type VideoPatch = {
  title?: string;
  folderId?: string;
  chapters?: Chapter[];
  recordedAt?: string;
  version: number;
};

export type AssetKind = 'video' | 'audio';

export type AssetState = 'uploading' | 'preparing' | 'ready' | 'failed';

export type ProjectAsset = {
  assetId: string;
  kind: AssetKind;
  state: AssetState;
  mimeType: string;
  label: string;
  bytes?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio?: boolean;
  error?: string;
  // server-issued playable path; the editor never builds media urls itself
  url?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatedAsset = {
  assetId: string;
  uploadId: string;
  key: string;
  partSize: number;
};

export type RecordingSession = {
  sessionId: string;
  token: string;
  // the reusable bookmark, handed back only when it was just minted or replaced;
  // a project that already has one has nothing new to show
  snippetUrl?: string;
  bookmarkReady?: boolean;
  captureUrl: string;
  expiresAt: string;
};

export type CaptureBookmark = {
  snippetUrl: string;
  captureUrl: string;
};

export type RecordingSessionStatus = {
  state: 'open' | 'closed' | 'expired';
  eventCount: number;
  clientCount: number;
  lastEventAt?: string;
};

export type SavedTimeline = {
  video: Video;
  timelineVersion: number;
};

export type Lease = {
  lockedBy: string;
  lockedByName: string;
  lockExpiresAt: string;
};
