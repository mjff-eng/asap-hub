import { RefObject, useEffect, useRef, useState } from 'react';

export type Box = { width: number; height: number };

export type FittedBox = {
  // goes on the element the box has to fit inside
  ref: RefObject<HTMLDivElement>;
  box: Box;
};

export const fitBox = (available: Box, ratio: number): Box => {
  if (available.width <= 0 || available.height <= 0 || ratio <= 0) {
    return { width: 0, height: 0 };
  }
  return available.width / available.height > ratio
    ? { width: Math.round(available.height * ratio), height: available.height }
    : { width: available.width, height: Math.round(available.width / ratio) };
};

// CSS cannot shrink a box in both directions from an aspect ratio: a max-height
// clamps the height and leaves the width alone, which is what stretched the
// preview. Measuring and sizing it keeps the frame honest in both directions.
export const useFittedBox = (ratio: number): FittedBox => {
  const ref = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState<Box>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry?.contentRect;
      setAvailable({ width: rect?.width ?? 0, height: rect?.height ?? 0 });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, box: fitBox(available, ratio) };
};
