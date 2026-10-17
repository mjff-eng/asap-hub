// pdf.js's search reads page text with `for await` over a ReadableStream,
// which Safari only supports from 27. Delete this once Safari 26 drops out of
// our browserslist. jsdom has no ReadableStream.
export const makeReadableStreamsIterable = () => {
  if (
    typeof ReadableStream === 'undefined' ||
    Symbol.asyncIterator in ReadableStream.prototype
  ) {
    return;
  }
  Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    async *value(this: ReadableStream<unknown>) {
      const reader = this.getReader();
      try {
        for (;;) {
          // eslint-disable-next-line no-await-in-loop
          const { done, value: chunk } = await reader.read();
          if (done) {
            return;
          }
          yield chunk;
        }
      } finally {
        reader.releaseLock();
      }
    },
  });
};
