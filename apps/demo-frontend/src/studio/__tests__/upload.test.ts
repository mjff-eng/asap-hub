import { planParts, uploadParts } from '../upload';

const noWait = () => Promise.resolve();

describe('planParts', () => {
  it('splits a file into whole parts with a smaller last part', () => {
    expect(planParts(25, 10)).toEqual([
      { partNumber: 1, start: 0, end: 10 },
      { partNumber: 2, start: 10, end: 20 },
      { partNumber: 3, start: 20, end: 25 },
    ]);
  });

  it('makes a single part when the file fits exactly', () => {
    expect(planParts(10, 10)).toEqual([{ partNumber: 1, start: 0, end: 10 }]);
  });

  it('covers every byte exactly once', () => {
    const plans = planParts(10485760 * 3 + 17, 10485760);
    expect(plans).toHaveLength(4);
    expect(plans[plans.length - 1]?.end).toEqual(10485760 * 3 + 17);
    plans.forEach((plan, index) => {
      expect(plan.start).toEqual(plans[index - 1]?.end ?? 0);
    });
  });

  it.each([
    [0, 10],
    [100, 0],
    [-1, 10],
  ])('returns nothing for size %s and part size %s', (size, partSize) => {
    expect(planParts(size, partSize)).toEqual([]);
  });
});

const fakeFile = (size: number): Blob =>
  ({ size, slice: () => ({}) as Blob }) as unknown as Blob;

describe('uploadParts', () => {
  it('never runs more than six part uploads at a time', async () => {
    const plans = planParts(200, 10);
    const urls = plans.map(({ partNumber }) => ({
      partNumber,
      url: `https://s3/${partNumber}`,
    }));

    let inFlight = 0;
    let peak = 0;
    const put = jest.fn(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return 'etag';
    });

    const parts = await uploadParts({
      file: fakeFile(200),
      plans,
      urls,
      put,
      wait: noWait,
    });

    expect(plans).toHaveLength(20);
    expect(parts).toHaveLength(20);
    expect(peak).toBeLessThanOrEqual(6);
  });

  it('retries a failing part and succeeds on the third attempt', async () => {
    const put = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('etag-1');

    const parts = await uploadParts({
      file: fakeFile(10),
      plans: [{ partNumber: 1, start: 0, end: 10 }],
      urls: [{ partNumber: 1, url: 'https://s3/1' }],
      put,
      wait: noWait,
    });

    expect(put).toHaveBeenCalledTimes(3);
    expect(parts).toEqual([{ partNumber: 1, eTag: 'etag-1' }]);
  });

  it('gives up after three attempts and rejects', async () => {
    const put = jest.fn().mockRejectedValue(new Error('network'));

    await expect(
      uploadParts({
        file: fakeFile(10),
        plans: [{ partNumber: 1, start: 0, end: 10 }],
        urls: [{ partNumber: 1, url: 'https://s3/1' }],
        put,
        wait: noWait,
      }),
    ).rejects.toThrow('network');

    expect(put).toHaveBeenCalledTimes(3);
  });

  it('stops handing out parts once one worker gives up', async () => {
    const plans = planParts(100, 10);
    const started: number[] = [];
    const put = jest.fn(async (url: string) => {
      const partNumber = Number(url.split('/').pop());
      started.push(partNumber);
      if (partNumber === 1) throw new Error('network');
      return 'etag';
    });

    await expect(
      uploadParts({
        file: fakeFile(100),
        plans,
        urls: plans.map(({ partNumber }) => ({
          partNumber,
          url: `https://s3/${partNumber}`,
        })),
        concurrency: 2,
        put,
        wait: noWait,
      }),
    ).rejects.toThrow('network');

    // the pool is two wide, so without the stop flag the survivor would keep
    // draining every remaining part and re-report them on the next retry
    expect(new Set(started).size).toBeLessThan(plans.length);
  });

  it('reports bytes per finished part', async () => {
    const onPartDone = jest.fn();
    await uploadParts({
      file: fakeFile(25),
      plans: planParts(25, 10),
      urls: planParts(25, 10).map(({ partNumber }) => ({
        partNumber,
        url: `https://s3/${partNumber}`,
      })),
      put: () => Promise.resolve('etag'),
      wait: noWait,
      onPartDone,
    });

    const bytes = onPartDone.mock.calls.map(([, size]) => size);
    expect(bytes.reduce((total, size) => total + size, 0)).toEqual(25);
  });
});
