import { render } from '@testing-library/react';

import GlobalStyles from '../GlobalStyles';

it('applies global styles to the body', () => {
  render(<GlobalStyles />);
  expect(getComputedStyle(document.documentElement).fontFamily).toMatch(
    /^Roboto/,
  );
});

it('lets the root font size follow the browser font size setting', () => {
  render(<GlobalStyles />);
  const { fontSize, lineHeight } = getComputedStyle(document.documentElement);
  expect(fontSize).toBe('1rem');
  expect(lineHeight).toBe('1.5');
});

it('defines the CAS theme colours as CSS variables for CRN by default', () => {
  render(<GlobalStyles />);
  expect(
    getComputedStyle(document.documentElement).getPropertyValue(
      '--colour-background-button-primary-default',
    ),
  ).toBe('#309466');
});

it('defines the GP2 theme colours when rendered for GP2', () => {
  render(<GlobalStyles product="gp2" />);
  expect(
    getComputedStyle(document.documentElement).getPropertyValue(
      '--colour-background-button-primary-default',
    ),
  ).toBe('#0681B2');
});
