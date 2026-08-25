import { render } from '@testing-library/react';

import Card from '../Card';

it('renders the text in a <p>', () => {
  const { container } = render(<Card>text</Card>);
  expect(container.textContent).toBe('text');
});

it('applies a default border and paper background', () => {
  const { container } = render(<Card>text</Card>);

  expect(container.firstElementChild).toBeDefined();
  const { borderColor, backgroundColor } = getComputedStyle(
    container.firstElementChild as Element,
  );

  expect(borderColor).toMatchInlineSnapshot(`"rgb(227, 230, 232)"`);
  expect(backgroundColor).toMatchInlineSnapshot(`"rgb(255, 255, 255)"`);
});

it('applies a ember border and rose background', () => {
  const { container } = render(<Card accent="red">text</Card>);

  expect(container.firstElementChild).toBeDefined();
  const { borderColor, backgroundColor } = getComputedStyle(
    container.firstElementChild as Element,
  );

  expect(borderColor).toMatchInlineSnapshot(`"rgb(217, 45, 32)"`);
  expect(backgroundColor).toMatchInlineSnapshot(`"rgb(254, 228, 226)"`);
});

it('omits the padding if requested', () => {
  const { getByText, rerender } = render(<Card>text</Card>);
  expect(getByText('text')).toHaveStyleRule('padding-top', /em/);

  rerender(<Card padding={false}>text</Card>);
  expect(getByText('text')).not.toHaveStyleRule('padding-top', /.*/);
});

it('omits the shadow if requested', () => {
  const { getByText, rerender } = render(<Card>text</Card>);
  expect(getByText('text')).toHaveStyleRule('box-shadow', /px/);

  rerender(<Card shadow={false}>text</Card>);
  expect(getByText('text')).toHaveStyleRule('box-shadow', 'none');
});
