import { render, screen } from '@testing-library/react';

import ExternalProfiles from '../ExternalProfiles';

it('renders nothing when there are no links', () => {
  const { container } = render(<ExternalProfiles />);
  expect(container).toBeEmptyDOMElement();
});

it('renders the label and one link per profile', () => {
  render(
    <ExternalProfiles
      orcid="0000-0001"
      github="octocat"
      website1="http://example.com/site"
    />,
  );
  expect(screen.getByText('External profiles:')).toBeVisible();
  expect(
    screen.getAllByRole('link').map((link) => link.getAttribute('href')),
  ).toEqual([
    'https://orcid.org/0000-0001',
    'https://github.com/octocat',
    'http://example.com/site',
  ]);
});

it('skips profiles that are not set', () => {
  render(<ExternalProfiles linkedIn="jane" />);
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/jane',
  );
});

it('renders the label globe and the website globes with the same stroke width', () => {
  render(<ExternalProfiles website1="http://example.com/site" />);
  const [labelGlobe, websiteGlobe] = screen.getAllByTitle('Website');
  const strokeWidths = (svg: HTMLElement) =>
    Array.from(svg.parentElement!.querySelectorAll('path')).map((path) =>
      path.getAttribute('stroke-width'),
    );
  expect(strokeWidths(labelGlobe!)).toEqual(strokeWidths(websiteGlobe!));
  expect(new Set(strokeWidths(websiteGlobe!)).size).toBe(1);
});
