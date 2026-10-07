import { darkTokens, lightTokens } from '../GlobalStyles';

describe('the palettes', () => {
  it('define the same tokens, so nothing falls back to the light value', () => {
    expect(Object.keys(darkTokens).sort()).toEqual(
      Object.keys(lightTokens).sort(),
    );
  });

  // the player controls and the duration badges sit on a surface that is dark
  // in both themes. Painting them with a token that inverts made them black on
  // black in dark mode, at about 1.05:1 contrast.
  it('keeps the on-dark ink white in both themes', () => {
    expect(darkTokens['--demo-on-dark']).toBe(lightTokens['--demo-on-dark']);
    expect(lightTokens['--demo-on-dark']).toBe('rgb(255, 255, 255)');
  });
});
