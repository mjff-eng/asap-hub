import { fitBox } from '../useFittedBox';

const wide = 16 / 9;

describe('fitBox', () => {
  it('fills the width when the space is taller than the frame', () => {
    expect(fitBox({ width: 1600, height: 1200 }, wide)).toEqual({
      width: 1600,
      height: 900,
    });
  });

  it('fills the height when the space is wider than the frame', () => {
    expect(fitBox({ width: 1600, height: 400 }, wide)).toEqual({
      width: 711,
      height: 400,
    });
  });

  it('matches exactly when the space already has the ratio', () => {
    expect(fitBox({ width: 1920, height: 1080 }, wide)).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('is empty before the container has been measured', () => {
    expect(fitBox({ width: 0, height: 0 }, wide)).toEqual({
      width: 0,
      height: 0,
    });
  });

  it('honours a taller frame than 16:9', () => {
    expect(fitBox({ width: 1000, height: 1000 }, 1)).toEqual({
      width: 1000,
      height: 1000,
    });
  });
});
