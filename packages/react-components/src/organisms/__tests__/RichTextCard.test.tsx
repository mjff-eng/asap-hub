import { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RichTextCard from '../RichTextCard';

const props: ComponentProps<typeof RichTextCard> = {
  title: '',
  text: 'Example',
};
it('renders a heading at level 2', () => {
  const { getByRole } = render(
    <RichTextCard {...props} title="Meeting materials" />,
  );
  expect(getByRole('heading').tagName).toBe('H2');
  expect(getByRole('heading').textContent).toEqual('Meeting materials');
});

it('renders the rich text notes', () => {
  const { getByText } = render(
    <RichTextCard
      {...props}
      text={`<a href="https://google.com">Google</a>`}
    />,
  );
  expect(getByText('Google').tagName).toBe('A');
});

it('is collapsible when prop set', async () => {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollHeight',
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => 125,
  });

  const { getByRole, queryByText } = render(
    <RichTextCard {...props} text="example text" collapsible />,
  );
  expect(queryByText('example text')).toBeVisible();

  const button = getByRole('button');
  expect(button.textContent).toContain('Show more');
  await userEvent.click(button);
  expect(button.textContent).toContain('Show less');

  if (originalScrollHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      'scrollHeight',
      originalScrollHeight,
    );
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight');
  }
});
