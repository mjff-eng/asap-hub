import { render } from '@testing-library/react';

import Display from '../Display';
import { viewportCalc } from '../../test-utils';
import { largeDesktopScreen } from '../../pixels';

it('renders the text in an <h1>', () => {
  const { getByText } = render(<Display>text</Display>);
  expect(getByText('text').tagName).toBe('H1');
});

it('applies the text margin', () => {
  const { getByText } = render(<Display>text</Display>);
  const { marginTop } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"12px"`);
});

it('renders the text in large font', () => {
  const { getByText } = render(<Display>text</Display>);
  const { fontSize } = getComputedStyle(getByText('text'));
  expect(viewportCalc(fontSize, largeDesktopScreen)).toMatchInlineSnapshot(
    `"41.5px"`,
  );
});

it('removes the text margin', () => {
  const { getByText } = render(<Display noMargin>text</Display>);
  const { marginTop, marginBottom } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"0px"`);
  expect(marginBottom).toMatchInlineSnapshot(`"0px"`);
});
