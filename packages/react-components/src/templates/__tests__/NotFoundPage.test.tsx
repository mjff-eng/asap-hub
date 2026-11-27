import '@emotion/jest';
import { ThemeProvider } from '@emotion/react';
import { render } from '@testing-library/react';

import { pageMarginStyles } from '../../layout';
import NotFoundPage from '../NotFoundPage';

it('renders a level 1 headline', () => {
  const { getByRole } = render(<NotFoundPage />);
  expect(getByRole('heading').tagName).toBe('H1');
});

it('links back to the root', () => {
  const { getByRole } = render(<NotFoundPage />);
  expect(getByRole('link')).toHaveAttribute('href', '/');
});

it('has the CRN page margins by default', () => {
  const { container } = render(<NotFoundPage />);
  expect(container.firstChild).toHaveStyleRule('padding-left', '4.25rem', {
    media: '(min-width: 64.0625em)',
  });
});

it('has the page margins of the theme when it sets them', () => {
  const { container } = render(
    <ThemeProvider
      theme={{ components: { PageMargins: { styles: pageMarginStyles.gp2 } } }}
    >
      <NotFoundPage />
    </ThemeProvider>,
  );
  expect(container.firstChild).toHaveStyleRule('padding-left', '3.5rem', {
    media: '(min-width: 40.0625em)',
  });
  expect(container.firstChild).not.toHaveStyleRule('padding-left', '4.25rem', {
    media: '(min-width: 64.0625em)',
  });
});
