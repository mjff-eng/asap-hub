export type CapturePart = { clientId: string; seq: number };

export const parsePartId = (partId: string): CapturePart | undefined => {
  const separator = partId.lastIndexOf(':');
  const clientId = partId.slice(0, separator);
  const seq = Number(partId.slice(separator + 1));
  return separator > 0 && Number.isInteger(seq) && seq > 0
    ? { clientId, seq }
    : undefined;
};

// each tab's parts are already in time order, so they only need putting back in
// sequence before the streams are merged
export const partsByClient = (partIds: string[]): Map<string, string[]> =>
  [...new Set(partIds)]
    .flatMap((partId) => {
      const part = parsePartId(partId);
      return part ? [{ partId, ...part }] : [];
    })
    .sort((a, b) => a.seq - b.seq)
    .reduce((byClient, { clientId, partId }) => {
      byClient.set(clientId, [...(byClient.get(clientId) ?? []), partId]);
      return byClient;
    }, new Map<string, string[]>());

// Reading the whole line as JSON only to sort it would parse every event twice,
// and a recording can carry a hundred thousand of them. The producer is our own
// snippet, so the timestamp is found by shape.
const timestampPattern = /"t":\s*(\d+)/;

export const timestampOf = (line: string): number | undefined => {
  const found = timestampPattern.exec(line);
  return found?.[1] === undefined ? undefined : Number(found[1]);
};

const linesOf = (body: string): string[] =>
  body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

type Cursor = { lines: string[]; index: number };

const nextCursor = (cursors: Cursor[]): Cursor | undefined =>
  cursors
    .filter((cursor) => cursor.index < cursor.lines.length)
    .reduce<Cursor | undefined>((earliest, cursor) => {
      if (!earliest) {
        return cursor;
      }
      const at = timestampOf(cursor.lines[cursor.index] ?? '') ?? Infinity;
      const best =
        timestampOf(earliest.lines[earliest.index] ?? '') ?? Infinity;
      return at < best ? cursor : earliest;
    }, undefined);

// Every tab stamps its events with Date.now() on the same machine, so merging
// the streams by timestamp puts the whole screen back into one true order.
export const mergeByTimestamp = (streams: string[][]): string[] => {
  const cursors: Cursor[] = streams
    .map((bodies) => ({ lines: bodies.flatMap(linesOf), index: 0 }))
    .filter((cursor) => cursor.lines.length > 0);

  const merged: string[] = [];
  for (
    let cursor = nextCursor(cursors);
    cursor !== undefined;
    cursor = nextCursor(cursors)
  ) {
    const line = cursor.lines[cursor.index];
    cursor.index += 1;
    if (line !== undefined) {
      merged.push(line);
    }
  }
  return merged;
};
