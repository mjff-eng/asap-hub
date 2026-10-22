import { render } from '@testing-library/react';

import Subtitle from '../Subtitle';

it('renders the text in an <h4>', () => {
  const { getByText } = render(<Subtitle>text</Subtitle>);
  expect(getByText('text').tagName).toBe('H5');
});

it('applies the text margin', () => {
  const { getByText } = render(<Subtitle>text</Subtitle>);
  const { marginTop } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"12px"`);
});

it('renders the text in regular sized font', () => {
  const { getByText } = render(<Subtitle>text</Subtitle>);
  const { fontSize } = getComputedStyle(getByText('text'));
  expect(fontSize).toMatchInlineSnapshot(`"16px"`);
});
