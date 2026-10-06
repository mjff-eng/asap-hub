import { render, screen } from '@testing-library/react';

import GrantDocumentOverviewCard from '../GrantDocumentOverviewCard';

it('renders the overview heading and plain text', () => {
  render(<GrantDocumentOverviewCard text="Grant overview" />);

  expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
  expect(screen.getByText('Grant overview')).toBeVisible();
});

it('renders a formatted description from markdown, falling back to HTML', () => {
  const { rerender } = render(
    <GrantDocumentOverviewCard
      description="<p>From HTML</p>"
      descriptionMD="From **markdown**"
    />,
  );
  expect(screen.getByText('markdown')).toBeVisible();
  expect(screen.queryByText('From HTML')).not.toBeInTheDocument();

  rerender(
    <GrantDocumentOverviewCard
      description="<p>From HTML</p>"
      descriptionMD=""
    />,
  );
  expect(screen.getByText('From HTML')).toBeVisible();
});
