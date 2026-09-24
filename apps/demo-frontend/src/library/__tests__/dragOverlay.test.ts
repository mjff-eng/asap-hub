import type { Modifier } from '@dnd-kit/core';

import { cursorOffset, followCursor } from '../dragOverlay';

type Args = Parameters<Modifier>[0];

const rect = {
  top: 100,
  left: 200,
  bottom: 260,
  right: 440,
  width: 240,
  height: 160,
};

const args = (overrides: Partial<Args> = {}): Args =>
  ({
    activatorEvent: new MouseEvent('pointerdown', {
      clientX: 260,
      clientY: 140,
    }),
    draggingNodeRect: rect,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    ...overrides,
  }) as Args;

it('puts the ghost just off the pointer, not where the card was grabbed', () => {
  // grabbed 60px right and 40px down from the card corner
  expect(followCursor(args())).toEqual({
    x: 60 + cursorOffset,
    y: 40 + cursorOffset,
    scaleX: 1,
    scaleY: 1,
  });
});

it('keeps the ghost on the pointer as the drag moves', () => {
  expect(
    followCursor(args({ transform: { x: 90, y: -30, scaleX: 1, scaleY: 1 } })),
  ).toEqual({
    x: 90 + 60 + cursorOffset,
    y: -30 + 40 + cursorOffset,
    scaleX: 1,
    scaleY: 1,
  });
});

it('follows a touch drag too', () => {
  const touchEvent = {
    touches: [{ clientX: 260, clientY: 140 }],
  } as unknown as Event;

  expect(followCursor(args({ activatorEvent: touchEvent }))).toEqual({
    x: 60 + cursorOffset,
    y: 40 + cursorOffset,
    scaleX: 1,
    scaleY: 1,
  });
});

it('leaves the transform alone when there is nothing to measure', () => {
  const transform = { x: 5, y: 6, scaleX: 1, scaleY: 1 };

  expect(followCursor(args({ transform, draggingNodeRect: null }))).toBe(
    transform,
  );
  expect(followCursor(args({ transform, activatorEvent: null }))).toBe(
    transform,
  );
});
