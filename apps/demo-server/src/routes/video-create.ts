import { videoEntity } from '../data/entities';
import { rootFolderId } from './folders';

type NewVideo = {
  id: string;
  title: string;
  folderId?: string;
  recordedAt?: string;
  kind: 'upload' | 'studio';
  processingState: 'uploading' | 'empty';
  createdBy: { sub: string; name: string };
};

// shared by the single file upload and by a studio project, which differ only in
// where their pixels come from
export const createVideoRow = async ({
  id,
  title,
  folderId,
  recordedAt,
  kind,
  processingState,
  createdBy,
}: NewVideo): Promise<Record<string, unknown>> => {
  const now = new Date().toISOString();

  const { data } = await videoEntity
    .create({
      id,
      title,
      status: 'draft',
      folderId: folderId ?? rootFolderId,
      recordedAt: recordedAt ?? now,
      durationMs: 0,
      chapters: [],
      s3Prefix: id,
      createdBy,
      version: 1,
      kind,
      processingState,
      createdAt: now,
      updatedAt: now,
    })
    .go();

  return data as Record<string, unknown>;
};
