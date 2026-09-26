import { colour, colourWithAlpha, cssColour } from '../colors';

describe('cssColour', () => {
  it('returns the hex value when opaque', () => {
    expect(cssColour('#34A270')).toBe('#34A270');
  });

  it('returns an rgba value with the given alpha', () => {
    expect(cssColour('#34A270', 0.34)).toBe('rgba(52, 162, 112, 0.34)');
    expect(cssColour('#34A270', 0)).toBe('rgba(52, 162, 112, 0)');
  });
});

describe('colourWithAlpha', () => {
  it('mixes a theme token with transparency so it follows the token value', () => {
    expect(colourWithAlpha(colour.border.secondary, 0.7)).toBe(
      'color-mix(in srgb, var(--colour-border-secondary) 70%, transparent)',
    );
  });

  it('accepts a primitive and rounds the percentage', () => {
    expect(colourWithAlpha(colour.neutral[200], 0.34)).toBe(
      `color-mix(in srgb, ${colour.neutral[200]} 34%, transparent)`,
    );
  });
});
