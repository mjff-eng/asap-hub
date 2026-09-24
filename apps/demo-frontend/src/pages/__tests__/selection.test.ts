import {
  applySelection,
  emptySelection,
  pruneSelection,
  rangeBetween,
  selectionForContextMenu,
} from '../selection';

const ordered = ['a', 'b', 'c', 'd', 'e'];
const plain = { toggle: false, range: false };

describe('rangeBetween', () => {
  it('returns the inclusive range in list order', () => {
    expect(rangeBetween(ordered, 'b', 'd')).toEqual(['b', 'c', 'd']);
  });

  it('is direction agnostic', () => {
    expect(rangeBetween(ordered, 'd', 'b')).toEqual(['b', 'c', 'd']);
  });

  it('returns a single item when both ends are the same', () => {
    expect(rangeBetween(ordered, 'c', 'c')).toEqual(['c']);
  });

  it('falls back to the target when the anchor is gone', () => {
    expect(rangeBetween(ordered, 'zz', 'c')).toEqual(['c']);
  });
});

describe('applySelection', () => {
  it('replaces the selection on a plain click', () => {
    const state = applySelection(
      { ids: ['a', 'b'], anchor: 'a' },
      ordered,
      'd',
      plain,
    );
    expect(state).toEqual({ ids: ['d'], anchor: 'd' });
  });

  it('adds on toggle click', () => {
    const state = applySelection({ ids: ['a'], anchor: 'a' }, ordered, 'c', {
      toggle: true,
      range: false,
    });
    expect(state.ids).toEqual(['a', 'c']);
    expect(state.anchor).toBe('c');
  });

  it('removes an already selected item on toggle click', () => {
    const state = applySelection(
      { ids: ['a', 'c'], anchor: 'c' },
      ordered,
      'a',
      { toggle: true, range: false },
    );
    expect(state.ids).toEqual(['c']);
  });

  it('selects a range from the anchor on shift click', () => {
    const state = applySelection({ ids: ['b'], anchor: 'b' }, ordered, 'e', {
      toggle: false,
      range: true,
    });
    expect(state.ids).toEqual(['b', 'c', 'd', 'e']);
    expect(state.anchor).toBe('b');
  });

  it('keeps the anchor so successive shift clicks re-anchor from the same point', () => {
    const first = applySelection({ ids: ['b'], anchor: 'b' }, ordered, 'e', {
      toggle: false,
      range: true,
    });
    const second = applySelection(first, ordered, 'c', {
      toggle: false,
      range: true,
    });
    expect(second.ids).toEqual(['b', 'c']);
  });

  it('treats shift click without an anchor as a plain click', () => {
    const state = applySelection(emptySelection, ordered, 'c', {
      toggle: false,
      range: true,
    });
    expect(state).toEqual({ ids: ['c'], anchor: 'c' });
  });
});

describe('selectionForContextMenu', () => {
  it('keeps a selection that already contains the target', () => {
    const current = { ids: ['a', 'b'], anchor: 'a' };
    expect(selectionForContextMenu(current, 'b')).toBe(current);
  });

  it('selects the target alone when it is not selected', () => {
    expect(selectionForContextMenu({ ids: ['a'], anchor: 'a' }, 'd')).toEqual({
      ids: ['d'],
      anchor: 'd',
    });
  });
});

describe('pruneSelection', () => {
  it('drops ids that are no longer present', () => {
    expect(pruneSelection({ ids: ['a', 'z'], anchor: 'z' }, ordered)).toEqual({
      ids: ['a'],
      anchor: undefined,
    });
  });

  it('returns the same object when nothing changed', () => {
    const current = { ids: ['a', 'b'], anchor: 'a' };
    expect(pruneSelection(current, ordered)).toBe(current);
  });
});
