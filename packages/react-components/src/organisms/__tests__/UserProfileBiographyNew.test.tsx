import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';

import UserProfileBiographyNew from '../UserProfileBiographyNew';

const props: ComponentProps<typeof UserProfileBiographyNew> = {
  biography: 'My biography',
  questions: ['First question?', 'Second question?'],
};

it('renders the biography', () => {
  render(<UserProfileBiographyNew {...props} />);
  expect(
    screen.getByRole('heading', { name: 'Biography' }),
  ).toBeInTheDocument();
  expect(screen.getByText('My biography')).toBeVisible();
});

it('renders the open questions', () => {
  render(<UserProfileBiographyNew {...props} />);
  expect(
    screen.getByRole('heading', { name: 'Open Questions' }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('First question?')).toBeVisible();
  expect(screen.getByText('Second question?')).toBeVisible();
});

it('hides the open questions when there are none', () => {
  render(<UserProfileBiographyNew {...props} questions={[]} />);
  expect(
    screen.queryByRole('heading', { name: 'Open Questions' }),
  ).not.toBeInTheDocument();
});

it('renders an empty state when the biography is missing', () => {
  render(<UserProfileBiographyNew {...props} biography={undefined} />);
  expect(screen.getByText('No biography yet.')).toBeVisible();
});

it('renders the edit link when an edit href is given', () => {
  render(<UserProfileBiographyNew {...props} editHref="/edit" />);
  expect(screen.getByRole('link', { name: 'Edit biography' })).toHaveAttribute(
    'href',
    '/edit',
  );
});

it('does not render the edit link without an edit href', () => {
  render(<UserProfileBiographyNew {...props} />);
  expect(
    screen.queryByRole('link', { name: 'Edit biography' }),
  ).not.toBeInTheDocument();
});
