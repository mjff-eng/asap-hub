import { render } from '@testing-library/react';

import Paragraph from '../Paragraph';
import { error500 } from '../../colors';

it('renders the text in a <p>', () => {
  const { getByText } = render(<Paragraph>text</Paragraph>);
  expect(getByText('text').tagName).toBe('P');
});

it('applies the text margin', () => {
  const { getByText } = render(<Paragraph>text</Paragraph>);
  const { marginTop } = getComputedStyle(getByText('text'));
  expect(marginTop).toMatchInlineSnapshot(`"12px"`);
});

it('renders a given accent color', () => {
  const { getByText } = render(<Paragraph accent="error">text</Paragraph>);
  const { color } = getComputedStyle(getByText('text'));
  expect(color).toBe(error500.rgb);
});
