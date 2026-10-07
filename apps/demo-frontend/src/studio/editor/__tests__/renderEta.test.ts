import { EtaSample, etaLabel, etaMs, withSample } from '../renderEta';

const at = (atMs: number, progress: number): EtaSample => ({ atMs, progress });

describe('withSample', () => {
  it('records only the moments progress actually moved', () => {
    const one = withSample([], 5, 1000);
    const same = withSample(one, 5, 6000);
    const moved = withSample(same, 7, 11_000);

    expect(same).toBe(one);
    expect(moved).toEqual([at(1000, 5), at(11_000, 7)]);
  });
});

describe('etaMs', () => {
  it('says nothing before the pace has any history', () => {
    expect(etaMs([], 0)).toBeUndefined();
    expect(etaMs([at(0, 5)], 5000)).toBeUndefined();
    expect(etaMs([at(0, 1), at(5000, 2)], 5000)).toBeUndefined();
  });

  it('carries a steady pace forward', () => {
    const samples = [at(0, 4), at(15_000, 10), at(30_000, 16), at(45_000, 22)];
    // 30s window back from 45s reaches the 15s sample: 12 points in 30s,
    // so 78 points to go at 2.5s each
    expect(etaMs(samples, 45_000)).toBe(78 * 2500);
  });

  it('reads the recent pace, not the whole run', () => {
    // clips flew, then the join crawls: only the crawl should speak
    const samples = [
      at(0, 10),
      at(5000, 40),
      at(10_000, 70),
      at(40_000, 72),
      at(70_000, 74),
    ];
    // the window anchors 30s back, at the 40s sample: 2 points in 30s
    expect(etaMs(samples, 70_000)).toBe((26 * 30_000) / 2);
  });

  it('counts the time already waited since the last movement', () => {
    const samples = [at(0, 10), at(20_000, 20), at(40_000, 30)];
    const fresh = etaMs(samples, 40_000);
    const waited = etaMs(samples, 50_000);
    expect(fresh).toBe(70 * 2000);
    expect(waited).toBe(70 * 2000 - 10_000);
  });

  it('never goes below zero and never speaks at the end', () => {
    const samples = [at(0, 10), at(20_000, 98)];
    expect(etaMs(samples, 1_000_000)).toBe(0);
    expect(etaMs([at(0, 10), at(20_000, 100)], 20_000)).toBeUndefined();
  });
});

describe('etaLabel', () => {
  it('speaks minutes, hours and the last stretch plainly', () => {
    expect(etaLabel(20_000)).toBe('under a minute left');
    expect(etaLabel(90_000)).toBe('about 2 min left');
    expect(etaLabel(35 * 60_000)).toBe('about 35 min left');
    expect(etaLabel(70 * 60_000)).toBe('about 1 h 10 min left');
    expect(etaLabel(121 * 60_000)).toBe('about 2 h left');
  });
});
