import { CursorEffect, limits } from '../../schema';
import { mergeDerivedEffects } from '../merge';

const effect = (overrides: Partial<CursorEffect> = {}): CursorEffect => ({
  id: 'ripple-e1',
  tMs: 1000,
  type: 'ripple',
  point: { x: 0.5, y: 0.5 },
  origin: 'derived',
  sourceEventId: 'e1',
  ...overrides,
});

describe('mergeDerivedEffects', () => {
  it('replaces the untouched derived effects and reports the counts', () => {
    const result = mergeDerivedEffects(
      [
        effect({ id: 'ripple-e1', tMs: 1000, sourceEventId: 'e1' }),
        effect({ id: 'ripple-e2', tMs: 2000, sourceEventId: 'e2' }),
      ],
      [
        effect({ id: 'ripple-e3', tMs: 3000, sourceEventId: 'e3' }),
        effect({ id: 'ripple-e4', tMs: 4000, sourceEventId: 'e4' }),
        effect({ id: 'ripple-e5', tMs: 5000, sourceEventId: 'e5' }),
      ],
    );

    expect(result.effects.map(({ id }) => id)).toEqual([
      'ripple-e3',
      'ripple-e4',
      'ripple-e5',
    ]);
    expect(result).toMatchObject({ added: 3, removed: 2, keptEdits: 0 });
  });

  it('keeps a hand edited effect and does not derive it a second time', () => {
    const edited = effect({
      id: 'ripple-e1',
      tMs: 1400,
      point: { x: 0.25, y: 0.75 },
      origin: 'derived-edited',
      sourceEventId: 'e1',
    });

    const result = mergeDerivedEffects(
      [edited],
      [
        effect({ id: 'ripple-e1', tMs: 1000, sourceEventId: 'e1' }),
        effect({ id: 'ripple-e2', tMs: 2000, sourceEventId: 'e2' }),
      ],
    );

    expect(result.effects).toEqual([
      edited,
      effect({ id: 'ripple-e2', tMs: 2000, sourceEventId: 'e2' }),
    ]);
    expect(result).toMatchObject({ added: 1, removed: 0, keptEdits: 1 });
  });

  it('keeps a manual effect that has no source event', () => {
    const manual = effect({
      id: 'spotlight-manual',
      tMs: 500,
      type: 'spotlight',
      origin: 'manual',
      sourceEventId: undefined,
    });

    const result = mergeDerivedEffects([manual], []);

    expect(result.effects).toEqual([manual]);
    expect(result).toMatchObject({ added: 0, removed: 0, keptEdits: 1 });
  });

  it('lets a different kind of effect be derived from the same event', () => {
    const result = mergeDerivedEffects(
      [effect({ origin: 'derived-edited' })],
      [effect({ id: 'zoom-e1', type: 'zoom', tMs: 600, sourceEventId: 'e1' })],
    );

    expect(result.effects.map(({ id }) => id)).toEqual([
      'zoom-e1',
      'ripple-e1',
    ]);
    expect(result.added).toBe(1);
  });

  it('sorts the merged list by clip time', () => {
    const result = mergeDerivedEffects(
      [effect({ id: 'manual-late', tMs: 9000, origin: 'manual' })],
      [effect({ id: 'ripple-e9', tMs: 100, sourceEventId: 'e9' })],
    );

    expect(result.effects.map(({ tMs }) => tMs)).toEqual([100, 9000]);
  });

  it('never grows the list past what the document allows', () => {
    const kept = Array.from({ length: limits.cursorEffects - 2 }, (_x, i) =>
      effect({ id: `manual-${i}`, tMs: i, origin: 'manual' }),
    );
    const derived = Array.from({ length: 10 }, (_x, i) =>
      effect({ id: `ripple-d${i}`, tMs: 10_000 + i, sourceEventId: `d${i}` }),
    );

    const result = mergeDerivedEffects(kept, derived);

    expect(result.effects).toHaveLength(limits.cursorEffects);
    expect(result).toMatchObject({
      added: 2,
      keptEdits: limits.cursorEffects - 2,
    });
  });
});
