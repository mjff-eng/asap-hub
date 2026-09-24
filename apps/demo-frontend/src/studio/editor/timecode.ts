// m:ss.cc, the way the transport and the ruler already read, so a creator never
// has to think in milliseconds. Hundredths are optional on the way in, and both
// m:ss and a bare number of seconds are accepted.
const pattern = /^(?:(\d+):)?([0-5]?\d)(?:\.(\d{1,3}))?$/;
// "90" is ninety seconds; the pattern above caps bare seconds at 59 only when
// minutes were actually written
const bareSeconds = /^(\d+)(?:\.(\d{1,3}))?$/;

export const formatMs = (ms: number): string => {
  // rounded to hundredths first, so 1999ms carries up to 0:02.00 rather than
  // printing an impossible 0:01.100 that reads back as 1100ms
  const total = Math.round(Math.max(0, ms) / 10);
  const minutes = Math.floor(total / 6000);
  const seconds = Math.floor(total / 100) % 60;
  const hundredths = total % 100;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(
    hundredths,
  ).padStart(2, '0')}`;
};

export const parseMs = (value: string): number | undefined => {
  const trimmed = value.trim();
  const clocked = pattern.exec(trimmed);
  const bare = clocked ? undefined : bareSeconds.exec(trimmed);
  if (!clocked && !bare) {
    return undefined;
  }
  const minutes = clocked?.[1];
  const seconds = clocked ? clocked[2] : bare?.[1];
  const fraction = (clocked ? clocked[3] : bare?.[2]) ?? '';
  return (
    (minutes ? Number(minutes) * 60000 : 0) +
    Number(seconds ?? 0) * 1000 +
    Number(fraction.padEnd(3, '0') || 0)
  );
};
