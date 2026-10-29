import { render } from '@testing-library/react';

import Headline3 from '../Headline3';

it('renders the text in an <h3>', () => {
  const { getByText } = render(<Headline3>text</Headline3>);
  expect(getByText('text').tagName).toBe('H3');
});

it('applies the text margin', () => {
  const { getByText } = render(<Headline3>text</Headline3>);
  const { marginTop } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"12px"`);
});

it('renders the text in large font', () => {
  const { getByText } = render(<Headline3>text</Headline3>);
  const { fontSize } = getComputedStyle(getByText('text'));
  expect(fontSize).toMatchInlineSnapshot(`"28px"`);
});

it('removes the text margin', () => {
  const { getByText } = render(<Headline3 noMargin>text</Headline3>);
  const { marginTop, marginBottom } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"0px"`);
  expect(marginBottom).toMatchInlineSnapshot(`"0px"`);
});
