export type History<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const historyLimit = 100;

export const initialHistory = <T>(present: T): History<T> => ({
  past: [],
  present,
  future: [],
});

export const canUndo = <T>(history: History<T>): boolean =>
  history.past.length > 0;

export const canRedo = <T>(history: History<T>): boolean =>
  history.future.length > 0;

// the later frames of one gesture stand in for the first: a drag is a single
// thing the creator did, and undoing it should not walk back through every
// pointer move that made it up
export const replace = <T>(history: History<T>, present: T): History<T> =>
  present === history.present ? history : { ...history, present, future: [] };

// a new edit always clears the redo stack: the branch it belonged to is gone
export const record = <T>(history: History<T>, present: T): History<T> =>
  present === history.present
    ? history
    : {
        past: [...history.past, history.present].slice(-historyLimit),
        present,
        future: [],
      };

export const undo = <T>(history: History<T>): History<T> => {
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return history;
  }
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, historyLimit),
  };
};

export const redo = <T>(history: History<T>): History<T> => {
  const [next, ...rest] = history.future;
  if (next === undefined) {
    return history;
  }
  return {
    past: [...history.past, history.present].slice(-historyLimit),
    present: next,
    future: rest,
  };
};
