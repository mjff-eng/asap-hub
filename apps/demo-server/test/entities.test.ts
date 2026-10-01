process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';

// eslint-disable-next-line import/first
import { videoEntity } from '../src/data/entities';

describe('video entity keys', () => {
  const base = {
    id: 'video-1',
    title: 'Sprint 12 demo',
    status: 'draft' as const,
    folderId: 'ROOT',
    recordedAt: '2026-08-01T10:00:00.000Z',
    durationMs: 0,
    chapters: [],
    s3Prefix: 'video-1',
    createdBy: { sub: 'auth0|1', name: 'Ana' },
    version: 1,
    processingState: 'uploading' as const,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  };

  it('writes the keys exactly as specified with an uppercase status', () => {
    const { Item } = videoEntity.put(base).params() as {
      Item: Record<string, string>;
    };

    expect(Item.PK).toBe('VIDEO#video-1');
    expect(Item.SK).toBe('META');
    expect(Item.GSI1PK).toBe('FOLDER#ROOT');
    expect(Item.GSI1SK).toBe('DRAFT#2026-08-01T10:00:00.000Z#video-1');
  });

  it('rewrites GSI1SK to PUBLISHED when the status flips', () => {
    const { Item } = videoEntity
      .put({ ...base, status: 'published' })
      .params() as { Item: Record<string, string> };

    expect(Item.GSI1SK).toBe('PUBLISHED#2026-08-01T10:00:00.000Z#video-1');
  });

  it('rewrites GSI1PK when the folder moves', () => {
    const { Item } = videoEntity
      .put({ ...base, folderId: 'folder-9' })
      .params() as { Item: Record<string, string> };

    expect(Item.GSI1PK).toBe('FOLDER#folder-9');
  });

  it('stores every attribute at the top level so the encoder can update it raw', () => {
    const { Item } = videoEntity.put(base).params() as {
      Item: Record<string, unknown>;
    };

    expect(Item).toHaveProperty('durationMs');
    expect(Item).toHaveProperty('processingState');
    expect(Item).toHaveProperty('title');
  });

  it('constrains a member listing with begins_with rather than a filter', () => {
    const params = videoEntity.query
      .byFolder({ folderId: 'ROOT' })
      .begins({ statusKey: 'PUBLISHED', recordedAt: '' })
      .params() as Record<string, unknown>;

    expect(params).not.toHaveProperty('FilterExpression');
    expect(params.KeyConditionExpression).toContain('begins_with');
    expect(Object.values(params.ExpressionAttributeValues as object)).toContain(
      'PUBLISHED#',
    );
  });

  it('reads back an item that was updated outside ElectroDB', async () => {
    const rawItem = {
      ...(videoEntity.put(base).params() as { Item: Record<string, unknown> })
        .Item,
      durationMs: 123456,
      processingState: 'ready',
    };

    const send = jest.fn().mockResolvedValue({ Item: rawItem });
    const { data } = await videoEntity.get({ id: 'video-1' }).go({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: { send } as any,
    });

    expect(data).toMatchObject({
      id: 'video-1',
      durationMs: 123456,
      processingState: 'ready',
    });
  });
});
