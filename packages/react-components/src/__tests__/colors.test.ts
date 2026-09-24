import { cssColour } from '../colors';

describe('cssColour', () => {
  it('returns the hex value when opaque', () => {
    expect(cssColour('#34A270')).toBe('#34A270');
  });

  it('returns an rgba value with the given alpha', () => {
    expect(cssColour('#34A270', 0.34)).toBe('rgba(52, 162, 112, 0.34)');
    expect(cssColour('#34A270', 0)).toBe('rgba(52, 162, 112, 0)');
  });
});
