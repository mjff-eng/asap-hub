export interface TokenEntry {
  path: string[];
  name: string;
  group: string;
  hex: string;
  alpha: number;
  alias?: string;
}

interface RawColorValue {
  hex: string;
  alpha: number;
}

interface RawNode {
  $type?: string;
  $value?: RawColorValue | string | number;
  $extensions?: {
    'com.figma.aliasData'?: { targetVariableName: string };
  };
  [key: string]: unknown;
}

export const parseColourTokens = (root: unknown): TokenEntry[] => {
  const entries: TokenEntry[] = [];
  const walk = (node: RawNode, path: string[]) => {
    if (typeof node !== 'object' || node === null) return;
    if (node.$type === 'color' && typeof node.$value === 'object') {
      entries.push({
        path,
        name: path[path.length - 1] as string,
        group: path.slice(0, -1).join(' / '),
        hex: node.$value.hex.toUpperCase(),
        alpha: Math.round(node.$value.alpha * 100) / 100,
        alias:
          node.$extensions?.['com.figma.aliasData']?.targetVariableName ??
          undefined,
      });
    } else if (node.$type === undefined) {
      Object.entries(node).forEach(([key, child]) =>
        walk(child as RawNode, [...path, key]),
      );
    }
  };
  walk(root as RawNode, []);
  return entries.filter((entry) => entry.path[0] === 'colour');
};

export const groupInOrder = (
  entries: TokenEntry[],
): { group: string; tokens: TokenEntry[] }[] => {
  const groups: { group: string; tokens: TokenEntry[] }[] = [];
  entries.forEach((entry) => {
    const last = groups[groups.length - 1];
    if (last && last.group === entry.group) {
      last.tokens.push(entry);
    } else {
      groups.push({ group: entry.group, tokens: [entry] });
    }
  });
  return groups;
};
