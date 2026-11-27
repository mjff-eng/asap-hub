import '@emotion/jest';
import { screen, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import MainNavigation from '../MainNavigation';

describe('MainNavigation', () => {
  it('renders the navigation items', () => {
    render(
      <MemoryRouter>
        <MainNavigation />
      </MemoryRouter>,
    );
    expect(
      screen.getAllByRole('listitem').map(({ textContent }) => textContent),
    ).toEqual([
      expect.stringMatching(/people/i),
      expect.stringMatching(/working groups/i),
      expect.stringMatching(/projects/i),
      expect.stringMatching(/outputs/i),
      expect.stringMatching(/events/i),
      expect.stringMatching(/news/i),
      expect.stringMatching(/tags search/i),
    ]);
  });

  it('shows the tags search link in the menu only, below laptop', () => {
    render(
      <MemoryRouter>
        <MainNavigation />
      </MemoryRouter>,
    );
    const [tagsSearch] = screen.getAllByRole('listitem').slice(-1);
    expect(tagsSearch).toHaveStyleRule('display', 'none', {
      media: '(min-width: 64.0625em)',
    });
  });
});
