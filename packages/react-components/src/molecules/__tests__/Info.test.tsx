import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Info from '../Info';

it('shows an info icon', () => {
  const { getByTitle } = render(<Info>text</Info>);
  expect(getByTitle(/info/i)).toBeInTheDocument();
});

it('does not show the children by default', () => {
  const { getByText } = render(<Info>text</Info>);
  expect(getByText('text')).not.toBeVisible();
});

it('shows a the children when clicking the info icon', async () => {
  const { getByTitle, getByText } = render(<Info>text</Info>);
  await userEvent.click(getByTitle(/info/i));
  expect(getByText('text')).toBeVisible();
});

it('hides the children again when clicking the info icon a second time', async () => {
  const { getByTitle, getByText } = render(<Info>text</Info>);
  await userEvent.click(getByTitle(/info/i));
  expect(getByText('text')).toBeVisible();
  await userEvent.click(getByTitle(/info/i));
  expect(getByText('text')).not.toBeVisible();
});

it('hides the children when clicking outside', async () => {
  const { getByTitle, getByText } = render(
    <div>
      <Info>text</Info>
      <button type="button">outside</button>
    </div>,
  );
  await userEvent.click(getByTitle(/info/i));
  expect(getByText('text')).toBeVisible();

  await userEvent.click(getByText('outside'));
  expect(getByText('text')).not.toBeVisible();
});

it('hides the children when pressing Escape', async () => {
  const { getByTitle, getByText } = render(<Info>text</Info>);
  await userEvent.click(getByTitle(/info/i));
  expect(getByText('text')).toBeVisible();

  await userEvent.keyboard('{Escape}');
  expect(getByText('text')).not.toBeVisible();
});

it('toggles on tap with openOnHover on a device that cannot hover', async () => {
  const realMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue({ matches: false }),
  });
  try {
    const { getByTitle, getByText } = render(<Info openOnHover>text</Info>);

    await userEvent.click(getByTitle(/info/i));
    expect(getByText('text')).toBeVisible();

    await userEvent.click(getByTitle(/info/i));
    expect(getByText('text')).not.toBeVisible();
  } finally {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: realMatchMedia,
    });
  }
});
