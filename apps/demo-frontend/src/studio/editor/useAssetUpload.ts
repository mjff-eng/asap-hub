import { useCallback, useRef, useState } from 'react';
import { useApi } from '../../api/ApiProvider';
import { ProjectAsset } from '../../api/types';
import { planParts, uploadParts } from '../upload';

const extensionOf = (file: File): string => {
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? '';
  return /^[a-z0-9]{1,8}$/.test(fromName) ? fromName : 'mp4';
};

const labelOf = (file: File): string =>
  file.name.replace(/\.[^.]+$/, '').slice(0, 300) || 'Untitled';

export type UploadInput = {
  blob: Blob;
  label: string;
  extension: string;
  mimeType: string;
  kind: 'video' | 'audio';
};

export type AssetUpload = {
  busy: boolean;
  progress?: number;
  error?: string;
  importFile: (
    file: File,
    kind?: 'video' | 'audio',
  ) => Promise<ProjectAsset | undefined>;
  uploadBlob: (input: UploadInput) => Promise<ProjectAsset | undefined>;
};

// the same multipart machinery the single file upload already uses, pointed at
// a project asset key instead of the raw video key
export const useAssetUpload = (projectId: string): AssetUpload => {
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<string>();
  const abortRef = useRef<AbortController>();

  const uploadBlob = useCallback(
    async ({
      blob,
      label,
      extension,
      mimeType,
      kind,
    }: UploadInput): Promise<ProjectAsset | undefined> => {
      setBusy(true);
      setError(undefined);
      setProgress(0);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const created = await api.createAsset(projectId, {
          kind,
          mimeType,
          label,
          extension,
        });

        const plans = planParts(blob.size, created.partSize);
        const urls = await api.createAssetPartUrls(
          projectId,
          created.assetId,
          created.uploadId,
          plans.map(({ partNumber }) => partNumber),
        );

        let done = 0;
        const parts = await uploadParts({
          file: blob,
          plans,
          urls,
          signal: controller.signal,
          onPartDone: () => {
            done += 1;
            setProgress(Math.round((done / plans.length) * 100));
          },
        });

        return await api.completeAsset(
          projectId,
          created.assetId,
          created.uploadId,
          parts,
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Upload failed');
        return undefined;
      } finally {
        setBusy(false);
        setProgress(undefined);
        abortRef.current = undefined;
      }
    },
    [api, projectId],
  );

  const importFile = useCallback(
    (
      file: File,
      kind: 'video' | 'audio' = 'video',
    ): Promise<ProjectAsset | undefined> =>
      uploadBlob({
        blob: file,
        label: labelOf(file),
        extension: extensionOf(file),
        mimeType: file.type || (kind === 'audio' ? 'audio/mpeg' : 'video/mp4'),
        kind,
      }),
    [uploadBlob],
  );

  return { busy, progress, error, importFile, uploadBlob };
};
