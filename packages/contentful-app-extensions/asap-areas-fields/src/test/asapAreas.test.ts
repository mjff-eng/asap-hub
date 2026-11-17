import { FieldAppSDK } from '@contentful/app-sdk';
import {
  EntryLink,
  getAsapAreaIds,
  getAsapAreaMemberIds,
  getTeamAsapId,
  isSameOrder,
  mergeOrder,
} from '../asapAreas';

const link = (id: string): EntryLink => ({
  sys: { type: 'Link', linkType: 'Entry', id },
});

const entry = (id: string, extra: object = {}) => ({
  sys: { id, ...extra },
  fields: {},
});

const mockSdk = (getMany: jest.Mock) =>
  ({
    entry: { getSys: () => ({ id: 'area-1' }) },
    cma: { entry: { getMany } },
  }) as unknown as FieldAppSDK;

describe('mergeOrder', () => {
  it('keeps the saved order, drops missing ids and appends new ones', () => {
    expect(
      mergeOrder([link('b'), link('gone'), link('a')], ['a', 'b', 'c']),
    ).toEqual([link('b'), link('a'), link('c')]);
  });

  it('returns the ids in order when nothing is saved', () => {
    expect(mergeOrder(undefined, ['a', 'b'])).toEqual([link('a'), link('b')]);
  });
});

describe('isSameOrder', () => {
  it('is true when the ids match position by position', () => {
    expect(isSameOrder([link('a'), link('b')], [link('a'), link('b')])).toBe(
      true,
    );
    expect(isSameOrder(undefined, [])).toBe(true);
  });

  it('is false when the order or length differs', () => {
    expect(isSameOrder([link('b'), link('a')], [link('a'), link('b')])).toBe(
      false,
    );
    expect(isSameOrder([link('a')], [link('a'), link('b')])).toBe(false);
  });
});

describe('getAsapAreaMemberIds', () => {
  it('returns users whose memberships link the area, ignoring archived entries', async () => {
    const getMany = jest
      .fn()
      .mockResolvedValueOnce({
        items: [
          entry('membership-1'),
          entry('membership-2', { archivedVersion: 3 }),
        ],
      })
      .mockResolvedValueOnce({
        items: [entry('user-1'), entry('user-2', { archivedVersion: 1 })],
      });

    await expect(getAsapAreaMemberIds(mockSdk(getMany))).resolves.toEqual([
      'user-1',
    ]);
    expect(getMany).toHaveBeenNthCalledWith(1, {
      query: expect.objectContaining({
        content_type: 'teamMembership',
        'fields.asapAreas.sys.id': 'area-1',
      }),
    });
    expect(getMany).toHaveBeenNthCalledWith(2, {
      query: expect.objectContaining({
        content_type: 'users',
        'fields.teams.sys.id[in]': 'membership-1',
      }),
    });
  });

  it('does not query users when no membership links the area', async () => {
    const getMany = jest.fn().mockResolvedValueOnce({ items: [] });

    await expect(getAsapAreaMemberIds(mockSdk(getMany))).resolves.toEqual([]);
    expect(getMany).toHaveBeenCalledTimes(1);
  });
});

describe('getAsapAreaIds', () => {
  it('returns all areas that are not archived', async () => {
    const getMany = jest.fn().mockResolvedValue({
      items: [entry('area-1'), entry('area-2', { archivedVersion: 2 })],
    });

    await expect(getAsapAreaIds(mockSdk(getMany))).resolves.toEqual(['area-1']);
  });
});

describe('getTeamAsapId', () => {
  it('reads the ASAP Team from the About ASAP entry', async () => {
    const getMany = jest.fn().mockResolvedValue({
      items: [
        {
          sys: { id: 'about' },
          fields: { membersTeam: { 'en-US': { sys: { id: 'team-asap' } } } },
        },
      ],
    });

    await expect(getTeamAsapId(mockSdk(getMany))).resolves.toBe('team-asap');
  });

  it('returns null when there is no About ASAP entry', async () => {
    const getMany = jest.fn().mockResolvedValue({ items: [] });

    await expect(getTeamAsapId(mockSdk(getMany))).resolves.toBeNull();
  });
});
