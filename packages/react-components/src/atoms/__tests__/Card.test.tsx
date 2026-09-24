import { render } from '@testing-library/react';

import Card from '../Card';

it('renders the text in a <p>', () => {
  const { container } = render(<Card>text</Card>);
  expect(container.textContent).toBe('text');
});

it('uses the CAS card border and a white background by default', () => {
  const { getByText } = render(<Card>text</Card>);

  expect(getByText('text')).toHaveStyleRule(
    'border-color',
    'var(--colour-border-card-default)',
  );
  expect(getComputedStyle(getByText('text')).backgroundColor).toBe(
    'rgb(255, 255, 255)',
  );
});

it('uses the CAS error colours for the red accent', () => {
  const { getByText } = render(<Card accent="red">text</Card>);

  expect(getByText('text')).toHaveStyleRule(
    'border-color',
    'var(--colour-border-error)',
  );
  expect(getByText('text')).toHaveStyleRule(
    'background-color',
    'var(--colour-background-error)',
  );
  expect(getByText('text')).toHaveStyleRule(
    'color',
    'var(--colour-foreground-error)',
  );
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
