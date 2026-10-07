import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

// A gesture is one thing the creator did: a drag, or the whole time a field is
// being typed into. Every frame of it after the first replaces the last rather
// than stacking up, so undo walks back through edits and not through keystrokes.
export type Gesture = {
  begin: (owner: string) => void;
  end: (owner: string) => void;
};

const idle: Gesture = { begin: () => undefined, end: () => undefined };

const GestureContext = createContext<Gesture>(idle);

// Two of them can overlap: clicking a block on the timeline starts its drag
// before the field that had focus is told it lost it, so the last to begin owns
// the end and a stale one cannot cut a live drag short.
export const useGestures = (
  beginGesture: () => void,
  endGesture: () => void,
): Gesture => {
  const owner = useRef<string>();

  const begin = useCallback(
    (name: string) => {
      owner.current = name;
      beginGesture();
    },
    [beginGesture],
  );

  const end = useCallback(
    (name: string) => {
      if (owner.current !== name) {
        return;
      }
      owner.current = undefined;
      endGesture();
    },
    [endGesture],
  );

  return useMemo(() => ({ begin, end }), [begin, end]);
};

export const GestureProvider: FC<{
  readonly value: Gesture;
  readonly children: ReactNode;
}> = ({ value, children }) => (
  <GestureContext.Provider value={value}>{children}</GestureContext.Provider>
);

export const useGesture = (): Gesture => useContext(GestureContext);

// what an inspector control hands to its input: the edit lasts as long as the
// focus does
export const fieldGesture = 'field';

// a drag on the stage or along a lane, which lasts until the pointer is let go
export const dragGesture = 'drag';
