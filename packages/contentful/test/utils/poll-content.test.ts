import {
  pollContentfulDeliveryApi,
  pollContentfulGql,
  pollContentfulGqlUntil,
} from '../../src/utils';

describe('pollContentfulGql', () => {
  test('checks version of published data and polls until they match', async () => {
    const userDataWithPublishedVersion1 = {
      users: {
        sys: {
          publishedVersion: 1,
        },
      },
    };

    const userDataWithPublishedVersion2 = {
      users: {
        sys: {
          publishedVersion: 2,
        },
      },
    };

    const fetchData = jest
      .fn()
      .mockResolvedValueOnce(userDataWithPublishedVersion1)
      .mockResolvedValueOnce(userDataWithPublishedVersion1)
      .mockResolvedValueOnce(userDataWithPublishedVersion1)
      .mockResolvedValueOnce(userDataWithPublishedVersion1)
      .mockResolvedValueOnce(userDataWithPublishedVersion1)
      .mockResolvedValueOnce(userDataWithPublishedVersion1)
      .mockResolvedValueOnce(userDataWithPublishedVersion2);

    await pollContentfulGql(2, fetchData, 'users');
    expect(fetchData).toHaveBeenCalledTimes(7);
  }, 120_000);

  test('throws if polling query does not return a value', async () => {
    const fetchData = jest.fn().mockResolvedValueOnce({
      users: null,
    });

    await expect(pollContentfulGql(2, fetchData, 'users')).rejects.toThrow();
  });
});

describe('pollContentfulDeliveryApi', () => {
  test('checks version of published counter and polls until they match and return entry', async () => {
    const entryDataWithPublishedCounter1 = {
      sys: {
        revision: 1,
      },
    };

    const entryDataWithPublishedCounter2 = {
      sys: {
        revision: 2,
      },
    };

    const fetchEntry = jest
      .fn()
      .mockResolvedValueOnce(entryDataWithPublishedCounter1)
      .mockResolvedValueOnce(entryDataWithPublishedCounter1)
      .mockResolvedValueOnce(entryDataWithPublishedCounter1)
      .mockResolvedValueOnce(entryDataWithPublishedCounter1)
      .mockResolvedValueOnce(entryDataWithPublishedCounter1)
      .mockResolvedValueOnce(entryDataWithPublishedCounter1)
      .mockResolvedValueOnce(entryDataWithPublishedCounter1)
      .mockResolvedValueOnce(entryDataWithPublishedCounter1)
      .mockResolvedValueOnce(entryDataWithPublishedCounter2);

    const response = await pollContentfulDeliveryApi(fetchEntry, 2);
    expect(fetchEntry).toHaveBeenCalledTimes(9);
    expect(response).toEqual(entryDataWithPublishedCounter2);
  }, 120_000);

  test('throws if polling query does not return a value', async () => {
    const fetchEntry = jest.fn().mockResolvedValueOnce(null);

    await expect(pollContentfulDeliveryApi(fetchEntry, 2)).rejects.toThrow();
  });
});

describe('pollContentfulGqlUntil', () => {
  test('polls until the predicate accepts the data', async () => {
    const fetchData = jest
      .fn()
      .mockResolvedValueOnce({ shared: false })
      .mockResolvedValueOnce({ shared: false })
      .mockResolvedValueOnce({ shared: true });

    await pollContentfulGqlUntil(
      fetchData,
      (data: { shared: boolean }) => data.shared,
      'speaker',
    );
    expect(fetchData).toHaveBeenCalledTimes(3);
  }, 10_000);

  test('throws if polling query does not return a value', async () => {
    const fetchData = jest.fn().mockResolvedValueOnce(undefined);

    await expect(
      pollContentfulGqlUntil(fetchData, () => true, 'speaker'),
    ).rejects.toThrow('Not found');
    expect(fetchData).toHaveBeenCalledTimes(1);
  });
});
