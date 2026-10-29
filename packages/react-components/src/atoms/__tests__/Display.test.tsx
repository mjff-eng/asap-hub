import { render } from '@testing-library/react';

import Display from '../Display';

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
  expect(fontSize).toMatchInlineSnapshot(`"40px"`);
});
