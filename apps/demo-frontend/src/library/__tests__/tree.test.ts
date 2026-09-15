import type { Folder } from '../../api/types';
import {
  aggregateCount,
  buildTree,
  childrenOf,
  depthOf,
  pathOf,
  subtreeIds,
} from '../tree';

const folders: Folder[] = [
  { id: 'ROOT', name: 'Unfiled' },
  { id: 'a', name: 'Demos' },
  { id: 'b', name: 'Islamic', parentId: 'a' },
  { id: 'c', name: 'testt', parentId: 'b' },
  { id: 'd', name: 'Other' },
];

describe('buildTree', () => {
  it('nests children under their parent and skips the synthetic root', () => {
    const tree = buildTree(folders);
    expect(tree.map(({ folder }) => folder.id)).toEqual(['a', 'd']);
    expect(tree[0]?.children.map(({ folder }) => folder.id)).toEqual(['b']);
    expect(
      tree[0]?.children[0]?.children.map(({ folder }) => folder.id),
    ).toEqual(['c']);
  });

  it('assigns increasing depths', () => {
    const tree = buildTree(folders);
    expect(tree[0]?.depth).toBe(0);
    expect(tree[0]?.children[0]?.depth).toBe(1);
    expect(tree[0]?.children[0]?.children[0]?.depth).toBe(2);
  });

  it('treats an unknown parentId as top level', () => {
    const tree = buildTree([{ id: 'x', name: 'Orphan', parentId: 'gone' }]);
    expect(tree.map(({ folder }) => folder.id)).toEqual(['x']);
  });
});

describe('subtreeIds', () => {
  it('collects the folder and all its descendants', () => {
    expect(subtreeIds('a', folders)).toEqual(['a', 'b', 'c']);
    expect(subtreeIds('c', folders)).toEqual(['c']);
  });
});

describe('pathOf and depthOf', () => {
  it('returns the ancestor chain in order', () => {
    expect(pathOf('c', folders).map(({ name }) => name)).toEqual([
      'Demos',
      'Islamic',
      'testt',
    ]);
  });

  it('counts depth from one', () => {
    expect(depthOf('a', folders)).toBe(1);
    expect(depthOf('c', folders)).toBe(3);
  });
});

describe('childrenOf', () => {
  it('lists direct children only', () => {
    expect(childrenOf('a', folders).map(({ id }) => id)).toEqual(['b']);
    expect(childrenOf(undefined, folders).map(({ id }) => id)).toEqual([
      'a',
      'd',
    ]);
  });
});

describe('aggregateCount', () => {
  it('sums the direct counts across the subtree', () => {
    expect(aggregateCount('a', folders, { a: 1, b: 2, c: 3, d: 9 })).toBe(6);
  });

  it('is undefined while counts are unknown', () => {
    expect(aggregateCount('a', folders, undefined)).toBeUndefined();
  });
});
