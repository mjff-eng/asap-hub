import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { UserProfileContext } from '@asap-hub/react-context';

import UserProfileRecentWorksNew from '../UserProfileRecentWorksNew';

const props: ComponentProps<typeof UserProfileRecentWorksNew> = {
  orcid: '0000-0002-1825-0097',
  orcidWorks: [
    {
      id: '1',
      doi: 'https://doi.org/10.1000/1',
      title: 'First work',
      type: 'JOURNAL_ARTICLE',
      publicationDate: { year: '2025', month: '03', day: '14' },
      lastModifiedDate: '2025-03-14T00:00:00Z',
    },
    {
      id: '2',
      title: 'Second work',
      type: 'PATENT',
      publicationDate: {},
      lastModifiedDate: '2024-09-02T00:00:00Z',
    },
  ],
};

const renderCard = (
  overrides: Partial<ComponentProps<typeof UserProfileRecentWorksNew>> = {},
  isOwnProfile = false,
) =>
  render(
    <UserProfileContext.Provider value={{ isOwnProfile }}>
      <UserProfileRecentWorksNew {...props} {...overrides} />
    </UserProfileContext.Provider>,
  );

it('renders the number of works in the title', () => {
  renderCard();
  expect(
    screen.getByRole('heading', { name: 'Recent Publications (2)' }),
  ).toBeInTheDocument();
});

it('renders each work with its type, title and publication date', () => {
  renderCard();
  expect(screen.getByText('Publication')).toBeVisible();
  expect(screen.getByText('Intelectual Property')).toBeVisible();
  expect(screen.getByRole('link', { name: 'First work' })).toHaveAttribute(
    'href',
    'https://doi.org/10.1000/1',
  );
  expect(screen.getByText('Second work')).toBeVisible();
  expect(
    screen.getByText('Originally Published: 14th March 2025'),
  ).toBeVisible();
});

it('renders an empty state when there are no works', () => {
  renderCard({ orcidWorks: [] });
  expect(screen.getByText('No publications yet.')).toBeVisible();
});

it('always renders the ORCID sync note', () => {
  renderCard();
  expect(
    screen.getByText(/may take up to 24 hours to appear here/),
  ).toBeVisible();
});

it('hides the ORCID number on another user profile', () => {
  renderCard();
  expect(screen.queryByText(/Your ORCID is/)).not.toBeInTheDocument();
});

it('renders the ORCID number with a contact link on the own profile', () => {
  renderCard({}, true);
  expect(screen.getByText('Your ORCID is: 0000-0002-1825-0097')).toBeVisible();
  expect(screen.getByRole('link', { name: /contact ASAP/ })).toHaveAttribute(
    'href',
    expect.stringMatching(/^mailto:/),
  );
});

it('hides the ORCID number on the own profile without an ORCID', () => {
  renderCard({ orcid: undefined }, true);
  expect(screen.queryByText(/Your ORCID is/)).not.toBeInTheDocument();
});
