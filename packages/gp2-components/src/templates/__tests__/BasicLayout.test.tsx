import '@emotion/jest';
import { NotFoundPage } from '@asap-hub/react-components';
import { render, screen } from '@testing-library/react';

import BasicLayout from '../BasicLayout';
import Theme from '../Theme';

it('renders the GP2 logo', () => {
  render(<BasicLayout>Content</BasicLayout>);
  expect(screen.getByRole('link').firstChild).toHaveTextContent(/GP2 Logo/);
});

it('renders an GP2 logo with specified href', () => {
  render(<BasicLayout logoHref={'http://example.com'}>Content</BasicLayout>);
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    'http://example.com',
  );
});

it('renders the content', async () => {
  render(<BasicLayout>Content</BasicLayout>);
  expect(screen.getByText('Content')).toBeVisible();
});

it('adds no second set of page margins to a shared page', () => {
  render(
    <Theme>
      <BasicLayout>
        <NotFoundPage />
      </BasicLayout>
    </Theme>,
  );
  const main = screen.getByRole('main');
  expect(main).toHaveStyleRule('padding-left', '1.5rem');
  expect(main.firstChild).not.toHaveStyleRule('padding-left', '1.5rem');
});
