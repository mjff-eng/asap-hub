import { render, screen } from '@testing-library/react';

import GrantDocumentTagsCard from '../GrantDocumentTagsCard';

it('renders the tags as links to the tag search', () => {
  render(<GrantDocumentTagsCard tags={['Mitochondria', 'Lysosome']} />);

  expect(screen.getByRole('heading', { name: 'Tags' })).toBeVisible();
  expect(
    screen.getByText(
      'Explore keywords related to skills, techniques, resources, and tools.',
    ),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Mitochondria' })).toHaveAttribute(
    'href',
    expect.stringContaining('Mitochondria'),
  );
  expect(screen.getByRole('link', { name: 'Lysosome' })).toBeVisible();
});
