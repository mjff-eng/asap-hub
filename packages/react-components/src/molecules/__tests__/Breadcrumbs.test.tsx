import { render, screen } from '@testing-library/react';

import Breadcrumbs from '../Breadcrumbs';

it('renders a navigation landmark with a home link', () => {
  render(<Breadcrumbs homeHref="/home" />);
  expect(screen.getByRole('navigation')).toHaveAccessibleName('breadcrumbs');
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
    'href',
    '/home',
  );
});

it('renders intermediate items as links to their href', () => {
  render(
    <Breadcrumbs
      homeHref="/"
      items={[
        { label: 'Discovery Projects', href: '/projects' },
        { label: 'My Project', href: '/projects/42' },
        { label: 'Share a Compliance Report' },
      ]}
    />,
  );
  expect(
    screen.getByRole('link', { name: 'Discovery Projects' }),
  ).toHaveAttribute('href', '/projects');
  expect(screen.getByRole('link', { name: 'My Project' })).toHaveAttribute(
    'href',
    '/projects/42',
  );
});

it('renders the last item as plain text marked as the current page', () => {
  render(
    <Breadcrumbs
      homeHref="/"
      items={[
        { label: 'Discovery Projects', href: '/projects' },
        { label: 'My Project', href: '/projects/42' },
      ]}
    />,
  );
  expect(
    screen.queryByRole('link', { name: 'My Project' }),
  ).not.toBeInTheDocument();
  expect(screen.getByText('My Project')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it('renders an intermediate item without an href as plain text', () => {
  render(
    <Breadcrumbs
      homeHref="/"
      items={[{ label: 'Unlinkable' }, { label: 'Current Page' }]}
    />,
  );
  expect(
    screen.queryByRole('link', { name: 'Unlinkable' }),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Unlinkable')).not.toHaveAttribute('aria-current');
});

it('renders every crumb as a list item', () => {
  render(
    <Breadcrumbs
      homeHref="/"
      items={[
        { label: 'Discovery Projects', href: '/projects' },
        { label: 'My Project' },
      ]}
    />,
  );
  const listItems = screen.getAllByRole('listitem');
  expect(listItems).toHaveLength(3);
  expect(listItems[1]).toHaveTextContent('Discovery Projects');
  expect(listItems[2]).toHaveTextContent('My Project');
});

it('caps the trail at 900px and each crumb at one line of 240px', () => {
  render(<Breadcrumbs homeHref="/" items={[{ label: 'Long Output Title' }]} />);
  expect(screen.getByRole('navigation')).toHaveStyleRule(
    'max-width',
    '56.25rem',
  );
  const crumb = screen.getByText('Long Output Title');
  expect(crumb).toHaveStyleRule('max-width', '15rem');
  expect(crumb).toHaveStyleRule('text-overflow', 'ellipsis');
  expect(crumb).toHaveStyleRule('white-space', 'nowrap');
});
