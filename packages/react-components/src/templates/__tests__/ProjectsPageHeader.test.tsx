import { ComponentProps } from 'react';
import { MemoryRouter, StaticRouter } from 'react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { findParentWithStyle } from '@asap-hub/dom-test-utils';
import { projects } from '@asap-hub/routing';

import ProjectsPageHeader from '../ProjectsPageHeader';
import {
  DiscoveryProjectIcon,
  ResourceProjectIcon,
  TraineeProjectIcon,
} from '../../icons';

const props: ComponentProps<typeof ProjectsPageHeader> = {
  page: 'Discovery',
  searchQuery: '',
};

it('renders the header', () => {
  const { getByRole } = render(<ProjectsPageHeader {...props} />);
  expect(getByRole('heading')).toBeVisible();
  expect(getByRole('heading').textContent).toEqual('Projects');
});

it('renders the main description', () => {
  const { getByText } = render(<ProjectsPageHeader {...props} />);
  expect(
    getByText(
      /Projects are targeted efforts that translate recommendations into action/i,
    ),
  ).toBeVisible();
});

describe('dynamic project type descriptions', () => {
  it.each([
    {
      page: 'Discovery' as const,
      expectedText:
        /Discovery Projects are collaborative research projects whose primary objective is to advance scientific understanding/i,
    },
    {
      page: 'Resource' as const,
      expectedText:
        /Resource Projects are projects whose primary objective is to generate research tools/i,
    },
    {
      page: 'Trainee' as const,
      expectedText:
        /Trainee Projects provide early-career scientists with dedicated support/i,
    },
  ])(
    'renders $page Projects description when page is $page',
    ({ page, expectedText }) => {
      const { getByText } = render(
        <ProjectsPageHeader {...props} page={page} />,
      );
      expect(getByText(expectedText)).toBeVisible();
    },
  );
});

describe('tab navigation', () => {
  it('renders all three project type tabs', () => {
    const { getByText } = render(
      <MemoryRouter>
        <ProjectsPageHeader {...props} />
      </MemoryRouter>,
    );
    expect(
      getByText('Discovery Projects', { selector: 'nav a *' }),
    ).toBeVisible();
    expect(
      getByText('Resource Projects', { selector: 'nav a *' }),
    ).toBeVisible();
    expect(
      getByText('Trainee Projects', { selector: 'nav a *' }),
    ).toBeVisible();
  });

  it.each([
    {
      page: 'Discovery' as const,
      location: projects({}).discoveryProjects({}).$,
      activeTab: /Discovery Projects/i,
      inactiveTab: /Resource Projects/i,
    },
    {
      page: 'Resource' as const,
      location: projects({}).resourceProjects({}).$,
      activeTab: /Resource Projects/i,
      inactiveTab: /Discovery Projects/i,
    },
    {
      page: 'Trainee' as const,
      location: projects({}).traineeProjects({}).$,
      activeTab: /Trainee Projects/i,
      inactiveTab: /Discovery Projects/i,
    },
  ])(
    'highlights the current tab - $page',
    ({ page, location, activeTab, inactiveTab }) => {
      const { getByText } = render(
        <StaticRouter location={location}>
          <ProjectsPageHeader {...props} page={page} />
        </StaticRouter>,
      );
      expect(
        findParentWithStyle(
          getByText(activeTab, { selector: 'nav a *' }),
          'fontWeight',
        )!.fontWeight,
      ).toBe('bold');
      expect(
        findParentWithStyle(
          getByText(inactiveTab, { selector: 'nav a *' }),
          'fontWeight',
        )?.fontWeight,
      ).not.toBe('bold');
    },
  );
});

describe('search functionality', () => {
  it('renders a search box with the search query', () => {
    const { getByRole } = render(
      <ProjectsPageHeader {...props} searchQuery={'test123'} />,
    );
    expect((getByRole('searchbox') as HTMLInputElement).value).toEqual(
      'test123',
    );
  });

  it('renders the correct search placeholder', () => {
    const { getByRole } = render(<ProjectsPageHeader {...props} />);
    expect(
      (getByRole('searchbox') as HTMLInputElement).placeholder,
    ).toMatchInlineSnapshot(`"Enter project name, keyword, …"`);
  });

  it('calls onChangeSearchQuery when typing', async () => {
    const mockOnChangeSearchQuery = jest.fn();
    const { getByRole } = render(
      <ProjectsPageHeader
        {...props}
        onChangeSearchQuery={mockOnChangeSearchQuery}
      />,
    );

    const input = getByRole('searchbox');

    await userEvent.type(input, 'test');

    expect(mockOnChangeSearchQuery).toHaveBeenLastCalledWith('test');
  });

  it('does not render the search box when showSearch is false', () => {
    const { queryByRole } = render(
      <ProjectsPageHeader {...props} showSearch={false} />,
    );
    expect(queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('does not render project type description when showSearch is false', () => {
    const { queryByText } = render(
      <ProjectsPageHeader {...props} page="Discovery" showSearch={false} />,
    );
    expect(
      queryByText(/Discovery Projects are collaborative research projects/i),
    ).not.toBeInTheDocument();
  });
});

describe('filter functionality', () => {
  it('renders filter button', () => {
    const { getByRole } = render(<ProjectsPageHeader {...props} />);
    expect(getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('renders with onChangeFilter callback', () => {
    const mockOnChangeFilter = jest.fn();
    const { getByRole } = render(
      <ProjectsPageHeader {...props} onChangeFilter={mockOnChangeFilter} />,
    );
    expect(getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('renders with filters set', () => {
    const filters = new Set(['Active', 'Genetics']);
    const { getByRole } = render(
      <ProjectsPageHeader {...props} filters={filters} />,
    );
    // Filters component should be rendered (verified by presence of Filter button)
    expect(getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });
});

describe('Tab Icons Default Colors', () => {
  it('renders DiscoveryProjectIcon with default color', () => {
    const { container } = render(<DiscoveryProjectIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths[0]).toHaveAttribute('fill', '#4D646B');
  });

  it('renders ResourceProjectIcon with default color', () => {
    const { container } = render(<ResourceProjectIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths[0]).toHaveAttribute('fill', '#4D646B');
  });

  it('renders TraineeProjectIcon with default color', () => {
    const { container } = render(<TraineeProjectIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths[0]).toHaveAttribute('fill', '#4D646B');
  });
});
