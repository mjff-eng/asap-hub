import { render } from '@testing-library/react';

import Headline4 from '../Headline4';

it('renders the text in an <h4>', () => {
  const { getByText } = render(<Headline4>text</Headline4>);
  expect(getByText('text').tagName).toBe('H4');
});

it('applies the text margin', () => {
  const { getByText } = render(<Headline4>text</Headline4>);
  const { marginTop } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"12px"`);
});

it('renders the text in large font', () => {
  const { getByText } = render(<Headline4>text</Headline4>);
  const { fontSize } = getComputedStyle(getByText('text'));
  expect(fontSize).toMatchInlineSnapshot(`"20px"`);
});

it('removes the text margin', () => {
  const { getByText } = render(<Headline4 noMargin>text</Headline4>);
  const { marginTop, marginBottom } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"0px"`);
  expect(marginBottom).toMatchInlineSnapshot(`"0px"`);
});
