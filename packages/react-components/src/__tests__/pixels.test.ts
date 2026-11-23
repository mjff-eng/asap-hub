import {
  rem,
  remUnit,
  screen,
  unitlessLineHeight,
  vminLinearCalc,
  Screen,
  vminLinearCalcClamped,
} from '../pixels';

describe('rem', () => {
  it('converts pixels to em, relative to the parent font size', () => {
    expect(rem(24)).toBe('1.5em');
  });
});

describe('remUnit', () => {
  it('converts pixels to rem, relative to the root font size', () => {
    expect(remUnit(24)).toBe('1.5rem');
    expect(remUnit(16)).toBe('1rem');
  });
});

describe('unitlessLineHeight', () => {
  it('divides the line height by the font size', () => {
    expect(unitlessLineHeight(16, 24)).toBe(1.5);
    expect(unitlessLineHeight(28, 36)).toBeCloseTo(36 / 28);
  });
});

describe('screen', () => {
  it('sets the dimensions', () => {
    expect(screen(1920, 1080)).toStrictEqual({
      width: 1920,
      height: 1080,
      min: 1080,
      max: 1920,
    });
  });
});

describe('vminLinearCalc', () => {
  it('creates a CSS calc for a linear scale based on vmin size', () => {
    const smallScreen: Screen = { width: 125, height: 100, min: 100, max: 125 };
    const largeScreen: Screen = { width: 250, height: 200, min: 200, max: 250 };
    expect(vminLinearCalc(smallScreen, 10, largeScreen, 12, 'px')).toEqual(
      'calc(8px + 2vmin)',
    );
  });
});

describe('vminLinearCalcClamped', () => {
  const smallScreen: Screen = { width: 125, height: 100, min: 100, max: 125 };
  const largeScreen: Screen = { width: 250, height: 200, min: 200, max: 250 };

  it('creates a vminLinearCalc clamped to the value range', () => {
    expect(
      vminLinearCalcClamped(smallScreen, 10, largeScreen, 12, 'px'),
    ).toEqual('clamp(10px, calc(8px + 2vmin), 12px)');
  });

  it('creates a decreasing clamp', () => {
    expect(
      vminLinearCalcClamped(smallScreen, 12, largeScreen, 10, 'px'),
    ).toEqual('clamp(10px, calc(14px + -2vmin), 12px)');
  });
});
