import { render } from '@testing-library/react';

import Paragraph from '../Paragraph';
import { colour } from '../../colors';

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
  expect(getByText('text')).toHaveStyleRule('color', colour.foreground.error);
});
