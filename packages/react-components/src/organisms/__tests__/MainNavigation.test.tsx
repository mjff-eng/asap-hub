import { StaticRouter, MemoryRouter } from 'react-router';
import { render, fireEvent } from '@testing-library/react';
import { network } from '@asap-hub/routing';

import MainNavigation from '../MainNavigation';
import { colour } from '../../colors';

it('renders the navigation items', () => {
  const { getAllByRole } = render(
    <MemoryRouter>
      <MainNavigation userOnboarded={true} />
    </MemoryRouter>,
  );

  expect(
    getAllByRole('listitem').map((item) => {
      expect(item).toHaveStyle('opacity:');
      return item.textContent;
    }),
  ).toEqual([
    expect.stringMatching(/network/i),
    expect.stringMatching(/projects/i),
    expect.stringMatching(/research/i),
    expect.stringMatching(/calendar/i),
    expect.stringMatching(/news/i),
    expect.stringMatching(/guides/i),
    expect.stringMatching(/about/i),
  ]);
});

it('renders the analytics menu item when allowed', () => {
  const { getByTitle } = render(
    <MemoryRouter>
      <MainNavigation userOnboarded={true} canViewAnalytics={true} />
    </MemoryRouter>,
  );
  expect(getByTitle(/analytics/i)).toBeInTheDocument();
});

describe('a navigation item', () => {
  it('is highlighted when it links to the current page', () => {
    const { getByTitle, rerender } = render(
      <StaticRouter key={1} location="/somewhere-else">
        <MainNavigation userOnboarded={true} />
      </StaticRouter>,
    );
    expect(
      getByTitle(/network/i).closest('a')?.firstElementChild,
    ).not.toHaveStyleRule('background-color', colour.background.active);

    rerender(
      <StaticRouter key={2} location={network({}).$}>
        <MainNavigation userOnboarded={true} />
      </StaticRouter>,
    );
    expect(
      getByTitle(/network/i).closest('a')?.firstElementChild,
    ).toHaveStyleRule('background-color', colour.background.active);
  });

  it('is highlighted when the current page is in the section it links to', () => {
    const { getByTitle, rerender } = render(
      <StaticRouter key={1} location="/somewhere-else">
        <MainNavigation userOnboarded={true} />
      </StaticRouter>,
    );
    expect(
      getByTitle(/network/i).closest('a')?.firstElementChild,
    ).not.toHaveStyleRule('background-color', colour.background.active);

    rerender(
      <StaticRouter key={2} location={network({}).interestGroups({}).$}>
        <MainNavigation userOnboarded={true} />
      </StaticRouter>,
    );
    expect(
      getByTitle(/network/i).closest('a')?.firstElementChild,
    ).toHaveStyleRule('background-color', colour.background.active);
  });

  it('is disabled when the current user is not onboarded', () => {
    const { getAllByRole } = render(
      <MemoryRouter>
        <MainNavigation userOnboarded={false} />
      </MemoryRouter>,
    );

    getAllByRole('listitem').map((item) =>
      expect(item).toHaveStyle('opacity: 0,3'),
    );
  });

  it('stays highlighted for the active route when collapsed', () => {
    const { getByTitle } = render(
      <StaticRouter location={network({}).$}>
        <MainNavigation userOnboarded={true} collapsed />
      </StaticRouter>,
    );
    expect(
      getByTitle(/network/i).closest('a')?.firstElementChild,
    ).toHaveStyleRule('background-color', colour.background.active);
  });
});

describe('the collapse toggle', () => {
  // The toggle only renders at desktop widths (display:none below), so role
  // queries must opt in to hidden elements under jsdom's no-media-query DOM.
  it('is not rendered without an onToggleCollapse handler', () => {
    const { queryByRole } = render(
      <MemoryRouter>
        <MainNavigation userOnboarded={true} />
      </MemoryRouter>,
    );
    expect(queryByRole('button', { hidden: true })).not.toBeInTheDocument();
  });

  it('shows a Collapse Menu control when expanded', () => {
    const onToggleCollapse = jest.fn();
    const { getByRole } = render(
      <MemoryRouter>
        <MainNavigation
          userOnboarded={true}
          onToggleCollapse={onToggleCollapse}
        />
      </MemoryRouter>,
    );
    const button = getByRole('button', {
      name: 'Collapse Menu',
      hidden: true,
    });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(button);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('shows an Expand Menu control when collapsed', () => {
    const onToggleCollapse = jest.fn();
    const { getByRole } = render(
      <MemoryRouter>
        <MainNavigation
          userOnboarded={true}
          collapsed
          onToggleCollapse={onToggleCollapse}
        />
      </MemoryRouter>,
    );
    const button = getByRole('button', { name: 'Expand', hidden: true });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('is disabled and cannot collapse while the menu is not ready', () => {
    const onToggleCollapse = jest.fn();
    const { getByRole } = render(
      <MemoryRouter>
        <MainNavigation
          userOnboarded={false}
          onToggleCollapse={onToggleCollapse}
        />
      </MemoryRouter>,
    );
    const button = getByRole('button', { hidden: true });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onToggleCollapse).not.toHaveBeenCalled();
  });

  it('uses the sidebar label colour in both states', () => {
    const { getByRole, rerender } = render(
      <MemoryRouter>
        <MainNavigation userOnboarded={true} onToggleCollapse={jest.fn()} />
      </MemoryRouter>,
    );
    // primary text colour, matching the other sidebar labels (not the lighter lead grey).
    expect(
      getByRole('button', { name: 'Collapse Menu', hidden: true }),
    ).toHaveStyleRule('color', colour.foreground.primary);

    rerender(
      <MemoryRouter>
        <MainNavigation
          userOnboarded={true}
          collapsed
          onToggleCollapse={jest.fn()}
        />
      </MemoryRouter>,
    );
    expect(
      getByRole('button', { name: 'Expand', hidden: true }),
    ).toHaveStyleRule('color', colour.foreground.primary);
  });

  it('keeps the toggle left-aligned in both states so the icon never shifts', () => {
    const { getByRole, rerender } = render(
      <MemoryRouter>
        <MainNavigation userOnboarded={true} onToggleCollapse={jest.fn()} />
      </MemoryRouter>,
    );
    expect(
      getByRole('button', { name: 'Collapse Menu', hidden: true }),
    ).toHaveStyle('justify-content: flex-start');

    rerender(
      <MemoryRouter>
        <MainNavigation
          userOnboarded={true}
          collapsed
          onToggleCollapse={jest.fn()}
        />
      </MemoryRouter>,
    );
    // Same alignment collapsed — the icon column position never changes.
    expect(getByRole('button', { name: 'Expand', hidden: true })).toHaveStyle(
      'justify-content: flex-start',
    );
  });

  it('shows a tooltip on the collapsed toggle when hovered', () => {
    const { getByRole, queryByRole } = render(
      <MemoryRouter>
        <MainNavigation
          userOnboarded={true}
          collapsed
          onToggleCollapse={jest.fn()}
        />
      </MemoryRouter>,
    );
    const toggle = getByRole('button', { name: 'Expand', hidden: true });
    expect(queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.mouseEnter(toggle.querySelector('span')!);
    expect(getByRole('tooltip')).toHaveTextContent('Expand');
  });
});

describe('a collapsed navigation item', () => {
  it('reveals its label in a tooltip on hover', () => {
    const { getAllByRole, getByRole, queryByRole } = render(
      <MemoryRouter>
        <MainNavigation userOnboarded={true} collapsed />
      </MemoryRouter>,
    );
    expect(queryByRole('tooltip')).not.toBeInTheDocument();
    const firstItem = getAllByRole('listitem')[0]!;
    fireEvent.mouseEnter(firstItem.querySelector('a div > span')!);
    expect(getByRole('tooltip')).toHaveTextContent('Network');
  });

  it('does not show a tooltip when expanded', () => {
    const { getByRole, queryByRole } = render(
      <MemoryRouter>
        <MainNavigation userOnboarded={true} />
      </MemoryRouter>,
    );
    fireEvent.mouseEnter(getByRole('link', { name: /network/i }));
    expect(queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
