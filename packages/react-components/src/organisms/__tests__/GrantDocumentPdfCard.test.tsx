import { render, screen } from '@testing-library/react';

import GrantDocumentPdfCard from '../GrantDocumentPdfCard';

it('embeds the grant document link', () => {
  render(<GrantDocumentPdfCard link="https://example.com/grant.pdf" />);

  expect(
    screen.getByRole('heading', { name: 'Grant Document PDF' }),
  ).toBeVisible();
  const pdf = screen.getByTitle('Grant Document PDF');
  expect(pdf).toHaveAttribute('src', 'https://example.com/grant.pdf');
  expect(pdf).toHaveAttribute('loading', 'lazy');
});
