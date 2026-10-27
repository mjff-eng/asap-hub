import { assetEntity, videoEntity } from '../data/entities';
import {
  abortMultipartUploadsUnder,
  deletePrefix,
  mediaPrefix,
  projectPrefix,
  rawPrefix,
} from '../storage';
import { isRenderActive, renderOf, VideoItem } from './video-shared';

const logFailure = (what: string) => (error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`failed to ${what}`, error);
};

// the only lifecycle rule on media/ moves objects to GLACIER_IR, so anything a
// running container writes after the prefix is emptied is billed for ever
export class RenderInProgress extends Error {
  constructor(readonly videoId: string) {
    super(`the video ${videoId} is still being rendered`);
    this.name = 'RenderInProgress';
  }
}

const deleteAssetRows = async (videoId: string): Promise<void> => {
  const { data } = await assetEntity.query
    .byVideo({ videoId })
    .go({ pages: 'all' });
  await Promise.all(
    data.map((asset) =>
      assetEntity.delete({ videoId, assetId: asset.assetId }).go(),
    ),
  );
};

export const deleteVideoCascade = async (id: string): Promise<void> => {
  const { data } = await videoEntity.get({ id }).go();
  if (data && isRenderActive(renderOf(data as VideoItem))) {
    throw new RenderInProgress(id);
  }

  const prefixes = [rawPrefix(id), mediaPrefix(id), projectPrefix(id)];

  // aborting first: a part that lands between the list and the delete would
  // otherwise be completed into an object nothing is left to clean up
  await Promise.all(
    [rawPrefix(id), projectPrefix(id)].map((prefix) =>
      abortMultipartUploadsUnder(prefix).catch(
        logFailure(`abort uploads under ${prefix}`),
      ),
    ),
  );

  await Promise.all(
    prefixes.map((prefix) =>
      deletePrefix(prefix).catch(logFailure(`delete ${prefix}`)),
    ),
  );

  await deleteAssetRows(id).catch(logFailure(`delete the assets of ${id}`));
  await videoEntity.delete({ id }).go();
};
