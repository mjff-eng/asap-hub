import { useCallback, useState } from 'react';

export type LeaveGuard = {
  // true while the creator is being asked what to do
  asking: boolean;
  // false means the caller must not go anywhere: the question is now on screen
  request: (leave: () => void) => boolean;
  discard: () => void;
  stay: () => void;
};

// Holds a departure until the creator has answered for the edits the server has
// not taken. The route the caller wanted is kept as a closure, so answering
// "discard" resumes exactly the navigation that was interrupted.
export const useLeaveGuard = (dirty: boolean): LeaveGuard => {
  const [held, setHeld] = useState<{ leave: () => void }>();

  const request = useCallback(
    (leave: () => void): boolean => {
      if (!dirty) {
        leave();
        return true;
      }
      setHeld({ leave });
      return false;
    },
    [dirty],
  );

  const discard = useCallback(() => {
    setHeld(undefined);
    held?.leave();
  }, [held]);

  const stay = useCallback(() => setHeld(undefined), []);

  return { asking: held !== undefined, request, discard, stay };
};
