import { render } from '@testing-library/react';

import Headline5 from '../Headline5';

it('renders the text in an <h5>', () => {
  const { getByText } = render(<Headline5>text</Headline5>);
  expect(getByText('text').tagName).toBe('H5');
});

it('applies the text margin', () => {
  const { getByText } = render(<Headline5>text</Headline5>);
  const { marginTop } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"12px"`);
});

it('renders the text in bold', () => {
  const { getByText } = render(<Headline5>text</Headline5>);
  const { fontWeight } = getComputedStyle(getByText('text'));
  expect(fontWeight).toMatchInlineSnapshot(`"700"`);
});

it('removes the text margin', () => {
  const { getByText } = render(<Headline5 noMargin>text</Headline5>);
  const { marginTop, marginBottom } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"0px"`);
  expect(marginBottom).toMatchInlineSnapshot(`"0px"`);
});
