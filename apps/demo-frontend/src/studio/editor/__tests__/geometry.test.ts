import {
  clampZoom,
  maxPixelsPerSecond,
  minPixelsPerSecond,
  tickIntervalMs,
} from '../geometry';

describe('clampZoom', () => {
  it('keeps a zoom inside the range the timeline can draw', () => {
    expect(clampZoom(1)).toBe(minPixelsPerSecond);
    expect(clampZoom(1000)).toBe(maxPixelsPerSecond);
    expect(clampZoom(40)).toBe(40);
  });
});

describe('tickIntervalMs', () => {
  it('picks the first step whose ticks clear the label', () => {
    expect(tickIntervalMs(24)).toBe(5000);
    expect(tickIntervalMs(160)).toBe(1000);
  });

  it('falls back to the widest step when even that is too tight', () => {
    expect(tickIntervalMs(0.1)).toBe(600000);
  });
});
