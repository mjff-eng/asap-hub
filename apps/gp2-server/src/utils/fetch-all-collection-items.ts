type Collection = { total: number; items: unknown[] };

export const fetchAllCollectionItems = async <T extends Collection>(
  collection: T | null | undefined,
  pageSize: number,
  fetchPage: (
    limit: number,
    skip: number,
  ) => Promise<Pick<T, 'items'> | null | undefined>,
): Promise<T | null | undefined> => {
  if (!collection || collection.items.length >= collection.total) {
    return collection;
  }
  const skips: number[] = [];
  for (
    let skip = collection.items.length;
    skip < collection.total;
    skip += pageSize
  ) {
    skips.push(skip);
  }
  const pages = await Promise.all(
    skips.map((skip) => fetchPage(pageSize, skip)),
  );
  return {
    ...collection,
    items: [...collection.items, ...pages.flatMap((page) => page?.items ?? [])],
  };
};
