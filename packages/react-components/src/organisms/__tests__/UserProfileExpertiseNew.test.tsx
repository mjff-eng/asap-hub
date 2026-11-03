import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';

import UserProfileExpertiseNew from '../UserProfileExpertiseNew';

const props: ComponentProps<typeof UserProfileExpertiseNew> = {
  expertiseAndResourceDescription: 'My expertise',
  tags: [
    { id: '1', name: 'Neurology' },
    { id: '2', name: 'Microscopy' },
  ],
};

it('renders the expertise and resources description', () => {
  render(<UserProfileExpertiseNew {...props} />);
  expect(
    screen.getByRole('heading', { name: 'Expertise and Resources' }),
  ).toBeInTheDocument();
  expect(screen.getByText('My expertise')).toBeVisible();
});

it('renders the tags', () => {
  render(<UserProfileExpertiseNew {...props} />);
  expect(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument();
  expect(screen.getByText('Neurology')).toBeVisible();
  expect(screen.getByText('Microscopy')).toBeVisible();
});

it('hides the tags when there are none', () => {
  render(<UserProfileExpertiseNew {...props} tags={[]} />);
  expect(
    screen.queryByRole('heading', { name: 'Tags' }),
  ).not.toBeInTheDocument();
});

it('renders an empty state when the description is missing', () => {
  render(
    <UserProfileExpertiseNew
      {...props}
      expertiseAndResourceDescription={undefined}
    />,
  );
  expect(screen.getByText('No expertise and resources yet.')).toBeVisible();
});

it('renders the edit link when an edit href is given', () => {
  render(<UserProfileExpertiseNew {...props} editHref="/edit" />);
  expect(
    screen.getByRole('link', { name: 'Edit expertise and resources' }),
  ).toHaveAttribute('href', '/edit');
});

it('does not render the edit link without an edit href', () => {
  render(<UserProfileExpertiseNew {...props} />);
  expect(
    screen.queryByRole('link', { name: 'Edit expertise and resources' }),
  ).not.toBeInTheDocument();
});
