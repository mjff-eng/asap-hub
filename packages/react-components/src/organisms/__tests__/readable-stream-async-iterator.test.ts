import { makeReadableStreamsIterable } from '../readable-stream-async-iterator';

const original = globalThis.ReadableStream;

afterEach(() => {
  globalThis.ReadableStream = original;
});

describe('makeReadableStreamsIterable', () => {
  it('lets for await read streams, which Safari 26 cannot do natively', async () => {
    const releaseLock = jest.fn();
    class StreamWithoutIteration {
      chunks = ['first', 'second'];

      getReader() {
        return {
          read: async () => {
            const value = this.chunks.shift();
            return { done: value === undefined, value };
          },
          releaseLock,
        };
      }
    }
    globalThis.ReadableStream =
      StreamWithoutIteration as unknown as typeof ReadableStream;

    makeReadableStreamsIterable();

    const iterator = (
      new StreamWithoutIteration() as unknown as AsyncIterable<string>
    )[Symbol.asyncIterator]();
    expect(await iterator.next()).toEqual({ done: false, value: 'first' });
    expect(await iterator.next()).toEqual({ done: false, value: 'second' });
    expect(await iterator.next()).toEqual({ done: true, value: undefined });
    expect(releaseLock).toHaveBeenCalled();
  });

  it('keeps the native iteration where the browser has it', () => {
    const nativeIteration = jest.fn();
    const prototype = { [Symbol.asyncIterator]: nativeIteration };
    const IterableStream = { prototype } as unknown as typeof ReadableStream;
    globalThis.ReadableStream = IterableStream;

    makeReadableStreamsIterable();

    expect(prototype[Symbol.asyncIterator]).toBe(nativeIteration);
  });
});
