import {
  mergeByTimestamp,
  parsePartId,
  partsByClient,
  timestampOf,
} from '../src/routes/capture-merge';

describe('parsePartId', () => {
  it('splits a client from its sequence number', () => {
    expect(parsePartId('tab-a:3')).toEqual({ clientId: 'tab-a', seq: 3 });
  });

  it('rejects anything that is not one', () => {
    ['', 'tab-a', ':3', 'tab-a:0', 'tab-a:x'].forEach((partId) =>
      expect(parsePartId(partId)).toBeUndefined(),
    );
  });
});

describe('partsByClient', () => {
  it('groups each tab and puts its parts back in order', () => {
    const byClient = partsByClient([
      'tab-b:2',
      'tab-a:1',
      'tab-b:1',
      'tab-a:2',
    ]);

    expect([...byClient.keys()].sort()).toEqual(['tab-a', 'tab-b']);
    expect(byClient.get('tab-a')).toEqual(['tab-a:1', 'tab-a:2']);
    expect(byClient.get('tab-b')).toEqual(['tab-b:1', 'tab-b:2']);
  });

  it('drops a duplicate and anything malformed', () => {
    const byClient = partsByClient(['tab-a:1', 'tab-a:1', 'nonsense']);

    expect(byClient.get('tab-a')).toEqual(['tab-a:1']);
    expect(byClient.size).toBe(1);
  });
});

describe('timestampOf', () => {
  it('reads the timestamp without parsing the whole event', () => {
    expect(timestampOf('{"id":"e1","type":"move","t":1756,"x":2}')).toBe(1756);
  });

  it('tolerates whitespace after the key', () => {
    expect(timestampOf('{"t": 42}')).toBe(42);
  });

  it('has none for a line without one', () => {
    expect(timestampOf('{"id":"e1"}')).toBeUndefined();
  });
});

describe('mergeByTimestamp', () => {
  const line = (id: string, t: number) => `{"id":"${id}","t":${t}}`;

  it('interleaves two tabs into one true order', () => {
    const merged = mergeByTimestamp([
      [`${line('a1', 10)}\n${line('a2', 30)}`],
      [`${line('b1', 20)}\n${line('b2', 40)}`],
    ]);

    expect(merged).toEqual([
      line('a1', 10),
      line('b1', 20),
      line('a2', 30),
      line('b2', 40),
    ]);
  });

  it('keeps a single tab exactly as it was recorded', () => {
    const merged = mergeByTimestamp([
      [`${line('a1', 10)}\n${line('a2', 20)}`, line('a3', 30)],
    ]);

    expect(merged).toEqual([line('a1', 10), line('a2', 20), line('a3', 30)]);
  });

  it('joins the parts of one tab across batch boundaries', () => {
    const merged = mergeByTimestamp([
      [line('a1', 10), line('a2', 30)],
      [line('b1', 20)],
    ]);

    expect(merged.map((entry) => entry)).toEqual([
      line('a1', 10),
      line('b1', 20),
      line('a2', 30),
    ]);
  });

  it('ignores blank lines and empty batches', () => {
    expect(mergeByTimestamp([[''], [`\n  \n${line('b1', 5)}\n`], []])).toEqual([
      line('b1', 5),
    ]);
  });

  it('is empty when nothing was captured', () => {
    expect(mergeByTimestamp([])).toEqual([]);
  });

  it('puts a line with no timestamp last rather than losing it', () => {
    const merged = mergeByTimestamp([['{"id":"broken"}'], [line('b1', 5)]]);

    expect(merged).toEqual([line('b1', 5), '{"id":"broken"}']);
  });

  it('handles three tabs at once', () => {
    const merged = mergeByTimestamp([
      [line('a', 1)],
      [line('b', 2)],
      [line('c', 3)],
    ]);

    expect(merged).toEqual([line('a', 1), line('b', 2), line('c', 3)]);
  });
});
