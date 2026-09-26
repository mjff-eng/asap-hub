import { render, screen } from '@testing-library/react';
import { findParentWithStyle } from '@asap-hub/dom-test-utils';
import userEvent from '@testing-library/user-event';
import Tag from '../Tag';
import { colour } from '../../colors';

it('renders a tag with content', () => {
  const { container } = render(<Tag>Text</Tag>);
  expect(container.textContent).toEqual('Text');
});

it('renders a white tag with the brand background when highlighted', () => {
  const { getByText, rerender } = render(<Tag>Text</Tag>);
  expect(
    findParentWithStyle(getByText('Text'), 'borderStyle')?.element,
  ).toHaveStyleRule('background-color', colour.background.primary);

  rerender(<Tag highlight>Text</Tag>);
  expect(
    findParentWithStyle(getByText('Text'), 'borderStyle')?.element,
  ).toHaveStyleRule('background-color', colour.background.brand);
});

it('renders a tag with disabled styles when disabled', () => {
  const { getByText, rerender } = render(<Tag>Text</Tag>);
  const getParentStyle = (prop: keyof CSSStyleDeclaration) =>
    findParentWithStyle(getByText('Text'), prop);

  expect(getParentStyle('borderStyle')?.element).toHaveStyleRule(
    'background-color',
    colour.background.primary,
  );

  rerender(<Tag enabled={false}>Text</Tag>);

  const tag = getParentStyle('borderStyle')?.element;
  expect(tag).toHaveStyleRule('color', colour.foreground.primary);
  expect(tag).toHaveStyleRule('border-color', colour.border.tertiary);
  expect(tag).toHaveStyleRule('background-color', colour.background.disabled);
});

it('uses the brand border and text on hover when it links somewhere', () => {
  const { getByText } = render(<Tag href="/somewhere">Text</Tag>);
  const tag = findParentWithStyle(getByText('Text'), 'borderStyle')?.element;
  expect(tag).toHaveStyleRule('border-color', colour.border.brand, {
    target: ':hover',
  });
  expect(tag).toHaveStyleRule('color', colour.foreground.brand, {
    target: ':hover',
  });
});

it('renders a tag with a title', () => {
  const { getByTitle } = render(<Tag title="Text"></Tag>);
  expect(getByTitle('Text')).toBeVisible();
});

it('renders the remove Button if the onRemove is provided', async () => {
  const onRemove = jest.fn();
  const { getByRole } = render(<Tag title="Text" onRemove={onRemove}></Tag>);
  const onRemoveButton = getByRole('button');
  expect(onRemoveButton).toBeVisible();
  await userEvent.click(onRemoveButton);
  expect(onRemove).toHaveBeenCalled();
});

it('renders as a link when one is provided', () => {
  const { rerender } = render(<Tag title="Text">Test</Tag>);
  expect(screen.getByText('Test').closest('a')).toBeNull();

  rerender(
    <Tag title="Text" href="http://example.com">
      Test
    </Tag>,
  );
  expect(screen.getByText('Test').closest('a')).toHaveAttribute(
    'href',
    'http://example.com',
  );
});
