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

  it('rounds the percentage', () => {
    expect(colourWithAlpha(colour.border.secondary, 0.345)).toBe(
      'color-mix(in srgb, var(--colour-border-secondary) 34.5%, transparent)',
    );
  });

  it('gives a hex primitive as plain rgba, which browsers without color-mix support', () => {
    expect(colourWithAlpha('#DFE5EA', 0.34)).toBe('rgba(223, 229, 234, 0.34)');
  });
});
