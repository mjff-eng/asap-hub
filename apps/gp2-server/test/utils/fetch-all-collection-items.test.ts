import { fetchAllCollectionItems } from '../../src/utils/fetch-all-collection-items';

describe('fetchAllCollectionItems', () => {
  const fetchPage = jest.fn();

  beforeEach(() => {
    fetchPage.mockReset();
  });

  test('returns the collection untouched when it is nullish', async () => {
    expect(await fetchAllCollectionItems(null, 2, fetchPage)).toBeNull();
    expect(
      await fetchAllCollectionItems(undefined, 2, fetchPage),
    ).toBeUndefined();
    expect(fetchPage).not.toHaveBeenCalled();
  });

  test('does not fetch when every item is already present', async () => {
    const collection = { total: 2, items: ['a', 'b'] };

    expect(await fetchAllCollectionItems(collection, 2, fetchPage)).toBe(
      collection,
    );
    expect(fetchPage).not.toHaveBeenCalled();
  });

  test('fetches every remaining page at once, starting after the fetched items', async () => {
    fetchPage
      .mockResolvedValueOnce({ items: ['c', 'd'] })
      .mockResolvedValueOnce({ items: ['e'] });

    const result = await fetchAllCollectionItems(
      { total: 5, items: ['a', 'b'] },
      2,
      fetchPage,
    );

    expect(result).toEqual({ total: 5, items: ['a', 'b', 'c', 'd', 'e'] });
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 2, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 4);
  });

  test('ignores pages that come back empty or missing', async () => {
    fetchPage.mockResolvedValueOnce(null).mockResolvedValueOnce({ items: [] });

    expect(
      await fetchAllCollectionItems({ total: 3, items: ['a'] }, 1, fetchPage),
    ).toEqual({ total: 3, items: ['a'] });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
