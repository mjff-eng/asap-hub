import { makeVideo } from '../../test-utils';
import {
  deleteTitle,
  deleteWarning,
  keptFolderMessage,
  matchesQuery,
  matchesStatusFilter,
  parseSort,
  parseStatusFilter,
  refusedVideosMessage,
  sortVideos,
} from '../state';

// three of the four share a recorded date, which is what used to make the two
// directions disagree
const videos = [
  makeVideo({
    id: 'a',
    title: 'Alpha',
    recordedAt: '2026-08-20T09:00:00.000Z',
  }),
  makeVideo({
    id: 'b',
    title: 'Bravo',
    recordedAt: '2026-08-20T09:00:00.000Z',
  }),
  makeVideo({
    id: 'c',
    title: 'Studio smoke test',
    recordedAt: '2026-08-20T09:00:00.000Z',
  }),
  makeVideo({
    id: 'd',
    title: 'Delta',
    recordedAt: '2026-08-01T09:00:00.000Z',
  }),
];

const ids = (list: ReturnType<typeof sortVideos>) => list.map(({ id }) => id);

describe('sortVideos', () => {
  it('orders newest first', () => {
    expect(ids(sortVideos(videos, 'newest'))[3]).toEqual('d');
  });

  it('makes oldest the exact reverse of newest', () => {
    expect(ids(sortVideos(videos, 'oldest'))).toEqual(
      ids(sortVideos(videos, 'newest')).reverse(),
    );
  });

  it('keeps the reverse property whatever order the list arrives in', () => {
    const shuffled = [
      videos[3],
      videos[1],
      videos[2],
      videos[0],
    ] as typeof videos;

    expect(ids(sortVideos(shuffled, 'oldest'))).toEqual(
      ids(sortVideos(shuffled, 'newest')).reverse(),
    );
    expect(ids(sortVideos(shuffled, 'newest'))).toEqual(
      ids(sortVideos(videos, 'newest')),
    );
  });

  it('orders by title case-insensitively', () => {
    expect(
      sortVideos(
        [
          makeVideo({ id: '1', title: 'zebra' }),
          makeVideo({ id: '2', title: 'Apple' }),
        ],
        'title',
      ).map(({ title }) => title),
    ).toEqual(['Apple', 'zebra']);
  });

  it('leaves the input untouched', () => {
    const input = [...videos];
    sortVideos(input, 'oldest');
    expect(ids(input)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('matchesQuery', () => {
  it('matches part of the title case-insensitively', () => {
    expect(matchesQuery(makeVideo({ title: 'Sprint retro' }), 'RETRO')).toBe(
      true,
    );
    expect(matchesQuery(makeVideo({ title: 'Sprint retro' }), 'design')).toBe(
      false,
    );
  });
});

describe('matchesStatusFilter', () => {
  it.each([
    ['all' as const, true, true],
    ['published' as const, true, false],
    ['drafts' as const, false, true],
  ])('%s keeps published=%s draft=%s', (filter, published, draft) => {
    expect(
      matchesStatusFilter(makeVideo({ status: 'published' }), filter),
    ).toBe(published);
    expect(matchesStatusFilter(makeVideo({ status: 'draft' }), filter)).toBe(
      draft,
    );
  });
});

describe('reading sort and status out of the url', () => {
  it.each([
    ['newest', 'newest'],
    ['oldest', 'oldest'],
    ['title', 'title'],
  ])('reads sort=%s', (value, expected) => {
    expect(parseSort(value)).toBe(expected);
  });

  it.each([null, '', 'sideways'])('falls back to newest for %p', (value) => {
    expect(parseSort(value)).toBe('newest');
  });

  it.each([
    ['all', 'all'],
    ['published', 'published'],
    ['drafts', 'drafts'],
  ])('reads status=%s', (value, expected) => {
    expect(parseStatusFilter(value)).toBe(expected);
  });

  it.each([null, '', 'archived'])(
    'falls back to every status for %p',
    (value) => {
      expect(parseStatusFilter(value)).toBe('all');
    },
  );
});

describe('naming what a delete would remove', () => {
  it('names the one demo rather than counting it', () => {
    expect(deleteTitle(['Untitled demo'])).toBe('Delete “Untitled demo”?');
    expect(deleteWarning(['Untitled demo'])).toBe(
      '“Untitled demo” and its file will be permanently removed and cannot be recovered.',
    );
  });

  it('counts a multi-selection and still names a few of them', () => {
    const titles = ['Untitled demo', 'Sprint 41', 'Sprint 42'];

    expect(deleteTitle(titles)).toBe('Delete 3 videos?');
    expect(deleteWarning(titles)).toBe(
      '“Untitled demo”, “Sprint 41”, “Sprint 42” and their files will be permanently removed and cannot be recovered.',
    );
  });

  it('stops naming them once the list is long', () => {
    expect(deleteWarning(['a', 'b', 'c', 'd', 'e'])).toBe(
      '“a”, “b”, “c” and 2 more and their files will be permanently removed and cannot be recovered.',
    );
  });
});

describe('reporting what the server refused', () => {
  const names = new Map([
    ['v-1', 'Sprint retro'],
    ['v-2', 'Sprint 42'],
  ]);

  it('says nothing when everything went through', () => {
    expect(
      refusedVideosMessage(
        { locked: [], missing: [], rendering: [] },
        'move',
        names,
      ),
    ).toBeUndefined();
    expect(refusedVideosMessage(undefined, 'delete', names)).toBeUndefined();
  });

  it('names the one demo another creator holds open', () => {
    expect(refusedVideosMessage({ locked: ['v-1'] }, 'move', names)).toBe(
      'We did not move “Sprint retro” because another creator has it open. Try again once they are done.',
    );
  });

  it('counts several and keeps the verb of the action', () => {
    expect(
      refusedVideosMessage({ locked: ['v-1', 'v-2'] }, 'delete', names),
    ).toBe(
      'We did not delete 2 videos because another creator has them open. Try again once they are done.',
    );
  });

  it('blames the export rather than a lock when a render is running', () => {
    expect(refusedVideosMessage({ rendering: ['v-2'] }, 'delete', names)).toBe(
      'We did not delete “Sprint 42” because an export is running. Try again once the export finishes.',
    );
  });

  it('tells a missing demo apart from a refused one', () => {
    expect(refusedVideosMessage({ missing: ['v-1'] }, 'move', names)).toBe(
      'We did not move “Sprint retro” because it is no longer in the library. Reload to see what is left.',
    );
  });

  it('reports every reason in the one result', () => {
    expect(
      refusedVideosMessage(
        { locked: ['v-1'], rendering: ['v-2'], missing: ['v-gone'] },
        'delete',
        names,
      ),
    ).toBe(
      'We did not delete “Sprint retro” because another creator has it open. Try again once they are done. ' +
        'We did not delete “Sprint 42” because an export is running. Try again once the export finishes. ' +
        'We did not delete 1 video because it is no longer in the library. Reload to see what is left.',
    );
  });

  it('counts an id it has no title for', () => {
    expect(refusedVideosMessage({ locked: ['v-unknown'] }, 'move', names)).toBe(
      'We did not move 1 video because another creator has it open. Try again once they are done.',
    );
  });
});

describe('reporting a folder the delete kept', () => {
  it('says nothing when the folder went', () => {
    expect(
      keptFolderMessage({ locked: [], rendering: [], kept: [] }, 'Engineering'),
    ).toBeUndefined();
    expect(keptFolderMessage(undefined, 'Engineering')).toBeUndefined();
  });

  it('names the folder and the lock that kept it', () => {
    expect(
      keptFolderMessage(
        { locked: ['v-1'], rendering: [], kept: ['f-eng'] },
        'Engineering',
      ),
    ).toBe(
      'We kept “Engineering” because another creator has 1 video inside open. Try again once that is done.',
    );
  });

  it('counts the subfolders that stayed with it and both reasons', () => {
    expect(
      keptFolderMessage(
        {
          locked: ['v-1'],
          rendering: ['v-2', 'v-3'],
          kept: ['f-eng', 'f-sprint'],
        },
        'Engineering',
      ),
    ).toBe(
      'We kept “Engineering” and 1 folder inside it because another creator has 1 video inside open and an export is running on 2 videos inside. Try again once that is done.',
    );
  });

  it('still explains itself when the server gave no reason', () => {
    expect(
      keptFolderMessage(
        { locked: [], rendering: [], kept: ['f-eng'] },
        'Engineering',
      ),
    ).toBe(
      'We kept “Engineering” because something inside could not be deleted. Try again once that is done.',
    );
  });
});
