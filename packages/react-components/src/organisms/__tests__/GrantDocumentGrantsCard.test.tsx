import { render, screen } from '@testing-library/react';

import GrantDocumentGrantsCard from '../GrantDocumentGrantsCard';

const props = {
  grantType: 'original' as const,
  original: {
    researchOutputId: 'original-id',
    title: 'Original grant proposal',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-04-01T00:00:00.000Z',
  },
  supplement: {
    researchOutputId: 'supplement-id',
    title: 'Supplement grant proposal',
    startDate: '2025-02-01T00:00:00.000-08:00',
    endDate: '2026-05-01T00:00:00.000-08:00',
  },
};

describe('GrantDocumentGrantsCard', () => {
  it('renders the supplement grant before the original grant', () => {
    render(<GrantDocumentGrantsCard {...props} />);

    expect(
      screen.getByRole('heading', { name: 'Grants', level: 2 }),
    ).toBeVisible();
    expect(
      screen.getByText('Explore all the details about grants.'),
    ).toBeVisible();
    expect(
      screen.getAllByRole('heading', { level: 5 }).map((h) => h.textContent),
    ).toEqual([
      'Supplement Grant Name',
      'Grant Period',
      'Original Grant Name',
      'Grant Period',
    ]);
  });

  it('links the supplement grant on an original grant', () => {
    render(<GrantDocumentGrantsCard {...props} />);

    expect(
      screen.getByRole('link', { name: 'Supplement grant proposal' }),
    ).toHaveAttribute('href', '/shared-research/supplement-id');
    expect(screen.getByText('Original grant proposal')).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Original grant proposal' }),
    ).not.toBeInTheDocument();
  });

  it('links the original grant on a supplement grant', () => {
    render(<GrantDocumentGrantsCard {...props} grantType="supplement" />);

    expect(
      screen.getByRole('link', { name: 'Original grant proposal' }),
    ).toHaveAttribute('href', '/shared-research/original-id');
    expect(screen.getByText('Supplement grant proposal')).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Supplement grant proposal' }),
    ).not.toBeInTheDocument();
  });

  it('renders a grant without an output as plain text', () => {
    render(
      <GrantDocumentGrantsCard
        {...props}
        supplement={{ ...props.supplement, researchOutputId: undefined }}
      />,
    );

    expect(screen.getByText('Supplement grant proposal')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the grant periods', () => {
    render(<GrantDocumentGrantsCard {...props} />);

    expect(screen.getByText('Feb 2025 - May 2026')).toBeVisible();
    expect(screen.getByText('Jan 2024 - Apr 2024')).toBeVisible();
  });

  it('renders an open-ended period as present and hides a period without a start date', () => {
    render(
      <GrantDocumentGrantsCard
        {...props}
        original={{ ...props.original, endDate: undefined }}
        supplement={{
          ...props.supplement,
          startDate: undefined,
          endDate: undefined,
        }}
      />,
    );

    expect(screen.getByText('Jan 2024 - Present')).toBeVisible();
    expect(screen.getAllByText('Grant Period')).toHaveLength(1);
  });
});
