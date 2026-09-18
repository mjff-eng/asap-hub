import { render, screen, within } from '@testing-library/react';
import { dashboard } from '@asap-hub/routing';

import ManuscriptHeader from '../ManuscriptHeader';

it('renders the manuscript header content when creating a new manuscript', () => {
  render(<ManuscriptHeader />);
  expect(
    screen.getByRole('heading', { name: /Submit New Manuscript/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'Start a new manuscript to receive an itemized compliance report outlining action items for compliance with the ASAP Open Science Policy.',
    ),
  ).toBeInTheDocument();
});

it('renders the manuscript header content when resubmitting manuscript', () => {
  render(<ManuscriptHeader resubmitManuscript />);
  expect(
    screen.getByRole('heading', { name: /Submit Revised Manuscript/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'Resubmit your manuscript based on the last compliance report you received. All details below were duplicated from the previous manuscript.',
    ),
  ).toBeInTheDocument();
});

it('renders the manuscript header content when editing a manuscript', () => {
  render(<ManuscriptHeader isEditMode />);
  expect(
    screen.getByRole('heading', { name: /Edit Manuscript/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Edit the details of this manuscript. It has already been submitted, so some fields may not be available. If you need to correct something that's blocked, contact your PM.",
    ),
  ).toBeInTheDocument();
});

it.each`
  props                           | pageTitle
  ${{}}                           | ${'Submit New Manuscript'}
  ${{ resubmitManuscript: true }} | ${'Submit Revised Manuscript'}
  ${{ isEditMode: true }}         | ${'Edit Manuscript'}
`(
  'renders breadcrumbs ending with the current page for "$pageTitle"',
  ({ props, pageTitle }) => {
    render(
      <ManuscriptHeader
        {...props}
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
    expect(breadcrumbs.getByText(pageTitle)).toBeVisible();
  },
);
