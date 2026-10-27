export type SelectionModifiers = {
  readonly toggle: boolean;
  readonly range: boolean;
};

export type SelectionState = {
  readonly ids: readonly string[];
  readonly anchor?: string;
};

export const emptySelection: SelectionState = { ids: [] };

export const rangeBetween = (
  ordered: readonly string[],
  from: string,
  to: string,
): string[] => {
  const start = ordered.indexOf(from);
  const end = ordered.indexOf(to);
  if (start === -1 || end === -1) return end === -1 ? [] : [to];
  return ordered.slice(Math.min(start, end), Math.max(start, end) + 1);
};

export const applySelection = (
  current: SelectionState,
  ordered: readonly string[],
  id: string,
  { toggle, range }: SelectionModifiers,
): SelectionState => {
  if (range && current.anchor) {
    return {
      ids: rangeBetween(ordered, current.anchor, id),
      anchor: current.anchor,
    };
  }
  if (toggle) {
    const isSelected = current.ids.includes(id);
    return {
      ids: isSelected
        ? current.ids.filter((selected) => selected !== id)
        : [...current.ids, id],
      anchor: id,
    };
  }
  return { ids: [id], anchor: id };
};

export const selectionForContextMenu = (
  current: SelectionState,
  id: string,
): SelectionState =>
  current.ids.includes(id) ? current : { ids: [id], anchor: id };

export const pruneSelection = (
  current: SelectionState,
  available: readonly string[],
): SelectionState => {
  const ids = current.ids.filter((id) => available.includes(id));
  if (ids.length === current.ids.length) return current;
  return {
    ids,
    anchor:
      current.anchor && ids.includes(current.anchor)
        ? current.anchor
        : undefined,
  };
};
