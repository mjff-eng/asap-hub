import { rem, remUnit, unitlessLineHeight } from '../pixels';

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
