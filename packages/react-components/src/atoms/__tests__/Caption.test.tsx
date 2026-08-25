import { render } from '@testing-library/react';

import Caption from '../Caption';
import { error500 } from '../../colors';

it('renders the text in a FigCaption', () => {
  const { getByText } = render(
    <figure>
      the figure
      <Caption>text</Caption>
    </figure>,
  );
  expect(getByText('text').tagName).toBe('FIGCAPTION');
});

it('renders text in a <p>', () => {
  const { getByText } = render(<Caption asParagraph>text</Caption>);
  expect(getByText('text').tagName).toBe('P');
});

it('applies the text margin', () => {
  const { getByText } = render(
    <figure>
      the figure
      <Caption>text</Caption>
    </figure>,
  );
  const { marginTop } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"12px"`);
});

it('removes the text margin based on prop', () => {
  const { getByText } = render(
    <figure>
      the figure
      <Caption noMargin>text</Caption>
    </figure>,
  );
  const { marginTop } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"0px"`);
});

it('renders text with font-weight bold', () => {
  const { getByText } = render(
    <figure>
      the figure
      <Caption bold>text</Caption>
    </figure>,
  );
  const { fontWeight } = getComputedStyle(getByText('text'));
  expect(fontWeight).toMatchInlineSnapshot(`"bold"`);
});

it('renders a given accent color', () => {
  const { getByText } = render(
    <figure>
      the figure
      <Caption accent="error500">text</Caption>
    </figure>,
  );
  const { color } = getComputedStyle(getByText('text'));
  expect(color).toBe(error500.rgb);
});
