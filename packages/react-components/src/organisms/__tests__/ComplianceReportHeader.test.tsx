import { render, screen, within } from '@testing-library/react';
import { dashboard } from '@asap-hub/routing';

import ComplianceReportHeader from '../ComplianceReportHeader';

it('renders the compliance report header content', () => {
  render(<ComplianceReportHeader />);
  expect(
    screen.getByRole('heading', { name: /Share a Compliance Report/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'Share the compliance report associated with this manuscript.',
    ),
  ).toBeInTheDocument();
});

it('renders breadcrumbs ending with the current page', () => {
  render(
    <ComplianceReportHeader
      breadcrumbs={[
        { label: 'Discovery Projects', href: '/projects/discovery' },
        { label: 'Alpha-Synuclein Origins', href: '/projects/discovery/1' },
      ]}
    />,
  );

  const breadcrumbs = within(
    screen.getByRole('navigation', { name: 'breadcrumbs' }),
  );
  expect(breadcrumbs.getByRole('link', { name: 'Home' })).toHaveAttribute(
    'href',
    dashboard({}).$,
  );
  expect(
    breadcrumbs.getByRole('link', { name: 'Discovery Projects' }),
  ).toHaveAttribute('href', '/projects/discovery');
  expect(
    breadcrumbs.getByRole('link', { name: 'Alpha-Synuclein Origins' }),
  ).toHaveAttribute('href', '/projects/discovery/1');
  expect(breadcrumbs.getByText('Share a Compliance Report')).toBeVisible();
});
