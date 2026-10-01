import { useEffect, useSyncExternalStore } from 'react';

// A recording in progress used to show as one line inside a panel that scrolls:
// scroll past it and nothing in the studio said a take was running, while every
// other way of starting one stayed ready to be clicked. This is the one place
// that knows, so the chrome can say so and the rest can stand down.
let holder: string | undefined;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = (): string | undefined => holder;

const announce = (next: string | undefined): void => {
  holder = next;
  listeners.forEach((listener) => listener());
};

export const useCaptureHolder = (): string | undefined =>
  useSyncExternalStore(subscribe, snapshot, snapshot);

// held for as long as the panel is live, and given up however it ends, an
// unmount in the middle of a take included
export const useHoldCapture = (name: string, live: boolean): void => {
  useEffect(() => {
    if (!live) {
      return undefined;
    }
    announce(name);
    return () => {
      if (holder === name) {
        announce(undefined);
      }
    };
  }, [live, name]);
};

// The two that cannot run together, because both want the microphone and both
// put a clip on the timeline. A cursor capture is not one of them: it runs in
// the tab being demoed and is meant to be going while the screen is recorded.
export const screenCapture = 'A screen recording';
export const voiceCapture = 'A voice over';

// for tests, which share a module between cases
export const releaseCapture = (): void => announce(undefined);
