import { CursorEffect, limits } from '../schema';
import { MergedCursorEffects } from './types';

// a re-derivation must land on the same key for the same click, so an effect the
// creator has touched is recognised and not duplicated
const subjectOf = (effect: CursorEffect): string =>
  `${effect.type}:${effect.sourceEventId ?? effect.id}`;

// re-deriving replaces the untouched machine output and leaves everything the
// creator has moved, retimed or added by hand exactly where it is
export const mergeDerivedEffects = (
  existing: CursorEffect[],
  derived: CursorEffect[],
): MergedCursorEffects => {
  const kept = existing.filter(({ origin }) => origin !== 'derived');
  const claimed = new Set(kept.map(subjectOf));

  const room = Math.max(0, limits.cursorEffects - kept.length);
  const added = derived
    .filter((effect) => !claimed.has(subjectOf(effect)))
    .slice(0, room);

  return {
    effects: [...kept, ...added].sort((a, b) => a.tMs - b.tMs),
    added: added.length,
    removed: existing.length - kept.length,
    keptEdits: kept.length,
  };
};
