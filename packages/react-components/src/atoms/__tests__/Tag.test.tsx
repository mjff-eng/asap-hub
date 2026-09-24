import { render, screen } from '@testing-library/react';
import { findParentWithStyle } from '@asap-hub/dom-test-utils';
import userEvent from '@testing-library/user-event';
import Tag from '../Tag';
import {
  neutral1000,
  colour,
  success100,
  neutral300,
  neutral500,
  colorFromHex,
} from '../../colors';

it('renders a tag with content', () => {
  const { container } = render(<Tag>Text</Tag>);
  expect(container.textContent).toEqual('Text');
});

it('renders a white tag with a success100 background when highlighted', () => {
  const { getByText, rerender } = render(<Tag>Text</Tag>);
  expect(
    findParentWithStyle(getByText('Text'), 'backgroundColor')?.backgroundColor,
  ).toBe(colorFromHex(colour.neutral[0]).rgb);

  rerender(<Tag highlight>Text</Tag>);
  expect(
    findParentWithStyle(getByText('Text'), 'backgroundColor')?.backgroundColor,
  ).toBe(success100.rgb);
});

it('renders a tag with disabled styles when disabled', () => {
  const { getByText, rerender } = render(<Tag>Text</Tag>);
  const getParentStyle = (prop: keyof CSSStyleDeclaration) =>
    findParentWithStyle(getByText('Text'), prop);

  expect(getParentStyle('backgroundColor')?.backgroundColor).toBe(
    colorFromHex(colour.neutral[0]).rgb,
  );

  rerender(<Tag enabled={false}>Text</Tag>);

  expect(getParentStyle('color')?.color).toBe(neutral1000.rgb);
  expect(getParentStyle('borderColor')?.borderColor).toBe(neutral500.rgb);
  expect(getParentStyle('backgroundColor')?.backgroundColor).toBe(
    neutral300.rgb,
  );
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
