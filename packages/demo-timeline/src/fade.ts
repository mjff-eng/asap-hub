export type Fade = { fadeInMs?: number; fadeOutMs?: number };

export type FadeRamps = { inMs: number; outMs: number };

export const defaultFadeMs = 300;

export type FadeWindow = { startMs: number; durationMs: number };

// The two ramps have to fit inside the window they belong to. When the creator
// asks for more than fits, both are scaled down together rather than one eating
// the other, so the shape they asked for survives on a short card.
export const resolveFade = (fade: Fade, durationMs: number): FadeRamps => {
  const inMs = Math.max(0, Math.round(fade.fadeInMs ?? defaultFadeMs));
  const outMs = Math.max(0, Math.round(fade.fadeOutMs ?? defaultFadeMs));
  const total = inMs + outMs;
  if (total === 0 || total <= durationMs) {
    return { inMs, outMs };
  }
  const scale = durationMs / total;
  return {
    inMs: Math.floor(inMs * scale),
    outMs: Math.floor(outMs * scale),
  };
};

// One definition of how far in or out a fade is, so the preview and the render
// agree: nothing before it starts or after it ends, ramping up over the first
// fade and back down over the last.
export const fadeOpacityAt = (
  fade: Fade,
  window: FadeWindow,
  tMs: number,
): number => {
  const since = tMs - window.startMs;
  const until = window.startMs + window.durationMs - tMs;
  if (since < 0 || until < 0) {
    return 0;
  }
  const { inMs, outMs } = resolveFade(fade, window.durationMs);
  return Math.min(
    1,
    inMs === 0 ? 1 : since / inMs,
    outMs === 0 ? 1 : until / outMs,
  );
};
