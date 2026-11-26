import { ComponentProps } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { useScrollToTop } from '@asap-hub/react-context';

import { colour } from '../../colors';
import { useHighlightedNavigation } from '../../navigation';
import Layout from '../Layout';

const props: ComponentProps<typeof Layout> = {
  children: 'Content',
  userOnboarded: true,
  userProfileHref: '/profile',
  teams: [],
  workingGroups: [],
  interestGroups: [],
  aboutHref: '/about',
};

it('renders CRN logo', async () => {
  // Suppress console.error for known React Router v6 migration issue with isActive prop
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  const { getByTitle } = render(
    <MemoryRouter>
      <Layout {...props} />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(getByTitle('CRN Logo')).toBeInTheDocument();
  });

  consoleError.mockRestore();
});

it('renders the main navigation', async () => {
  const { getAllByText } = render(
    <MemoryRouter>
      <Layout {...props} />
    </MemoryRouter>,
  );
  expect(getAllByText(/network/i, { selector: 'nav *' })).not.toHaveLength(0);
});

it('renders the user navigation', async () => {
  const { getAllByText } = render(
    <MemoryRouter>
      <Layout {...props} />
    </MemoryRouter>,
  );
  expect(getAllByText(/profile/i, { selector: 'nav *' })).not.toHaveLength(0);
});

it('renders the content', async () => {
  const { getByText } = render(
    <MemoryRouter>
      <Layout {...props}>Content</Layout>
    </MemoryRouter>,
  );
  expect(getByText('Content')).toBeVisible();
});

it('renders a menu button that toggles the drawer', async () => {
  const { getByLabelText, queryByTitle } = render(
    <MemoryRouter>
      <Layout {...props} />
    </MemoryRouter>,
  );
  expect(queryByTitle(/close/i)).not.toBeInTheDocument();

  await userEvent.click(getByLabelText(/toggle menu/i));
  expect(queryByTitle(/close/i)).toBeInTheDocument();

  await userEvent.click(getByLabelText(/toggle menu/i));
  expect(queryByTitle(/close/i)).not.toBeInTheDocument();
});

it('renders a user menu button that toggles the user menu', async () => {
  const { getByLabelText, queryByTitle } = render(
    <MemoryRouter>
      <Layout {...props} />
    </MemoryRouter>,
  );
  expect(queryByTitle('Chevron Up')).not.toBeInTheDocument();

  await userEvent.click(getByLabelText(/toggle.+user menu/i));
  expect(queryByTitle('Chevron Up')).toBeInTheDocument();

  await userEvent.click(getByLabelText(/toggle.+user menu/i));
  expect(queryByTitle('Chevron Up')).not.toBeInTheDocument();
});

it('closes the user menu when clicking outside of it', async () => {
  const { getByLabelText, getByText, getByTestId, queryByTitle } = render(
    <MemoryRouter>
      <Layout {...props}>Content</Layout>
    </MemoryRouter>,
  );

  await userEvent.click(getByLabelText(/toggle.+user menu/i));
  expect(queryByTitle('Chevron Up')).toBeInTheDocument();

  await userEvent.click(getByText('Content'));
  expect(queryByTitle('Chevron Up')).not.toBeInTheDocument();

  await userEvent.click(getByLabelText(/toggle.+user menu/i));
  expect(queryByTitle('Chevron Up')).toBeInTheDocument();

  await userEvent.click(getByTestId('menu-header-testid'));
  expect(queryByTitle('Chevron Up')).not.toBeInTheDocument();
});

it('closes the user menu when pressing Escape', async () => {
  const { getByLabelText, queryByTitle } = render(
    <MemoryRouter>
      <Layout {...props} />
    </MemoryRouter>,
  );

  await userEvent.click(getByLabelText(/toggle.+user menu/i));
  expect(queryByTitle('Chevron Up')).toBeInTheDocument();

  await userEvent.keyboard('{Escape}');
  expect(queryByTitle('Chevron Up')).not.toBeInTheDocument();
});

it('closes the drawer when clicking the overlay', async () => {
  const { getByLabelText } = render(
    <MemoryRouter>
      <Layout {...props} />
    </MemoryRouter>,
  );
  await userEvent.click(getByLabelText(/toggle menu/i));

  await userEvent.click(getByLabelText(/close/i));
  expect(getByLabelText(/close/i)).not.toBeVisible();
});

it('closes the drawer on navigation', async () => {
  const { getByLabelText, getAllByText } = render(
    <MemoryRouter initialEntries={['/']}>
      <Layout {...props} />
    </MemoryRouter>,
  );
  await userEvent.click(getByLabelText(/toggle menu/i));
  await waitFor(() => {
    expect(getByLabelText(/close/i)).toBeVisible();
  });

  await userEvent.click(getAllByText(/network/i, { selector: 'nav *' })[0]!);
  await waitFor(() => {
    expect(getByLabelText(/close/i)).not.toBeVisible();
  });
});

it('scrolls to top between page navigations', async () => {
  const { getByRole, getAllByText } = render(
    <MemoryRouter initialEntries={['/']}>
      <Layout {...props} />
    </MemoryRouter>,
  );

  await userEvent.click(getAllByText(/network/i, { selector: 'nav *' })[0]!);
  expect(getByRole('main').scrollTo).toHaveBeenCalled();
});

it('calls scrollToTop with merged options', async () => {
  const TestComponent = () => {
    const { scrollToTop } = useScrollToTop();

    return (
      <button onClick={() => scrollToTop({ behavior: 'auto' })}>Scroll</button>
    );
  };
  const scrollToMock = jest.fn();

  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    value: scrollToMock,
    writable: true,
  });

  const { getByRole } = render(
    <MemoryRouter>
      <Layout {...props}>
        <TestComponent />
      </Layout>
    </MemoryRouter>,
  );

  await userEvent.click(getByRole('button', { name: /scroll/i }));

  expect(scrollToMock).toHaveBeenCalledWith({
    top: 0,
    behavior: 'auto', // overridden from default 'smooth'
  });
});

describe('the collapsible menu', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // The toggle only renders at desktop widths (display:none below), so under
  // jsdom (no media queries) role queries must opt in to hidden elements.
  it('toggles between Collapse Menu and Expand Menu', async () => {
    const { getByRole, queryByRole, findByRole, container } = render(
      <MemoryRouter>
        <Layout {...props} />
      </MemoryRouter>,
    );
    // MainNavigation is lazy-loaded behind Suspense; wait for the toggle rather
    // than assuming it mounted synchronously (which races on CI).
    await userEvent.click(
      await findByRole('button', { name: 'Collapse Menu', hidden: true }),
    );
    expect(
      getByRole('button', { name: 'Expand', hidden: true }),
    ).toBeInTheDocument();
    expect(
      queryByRole('button', { name: 'Collapse Menu', hidden: true }),
    ).not.toBeInTheDocument();

    // Once the collapse animation settles, hovering an item reveals its
    // tooltip — which only arms after the animating flag clears.
    const firstItem = container.querySelector('nav ul li a div > span')!;
    await waitFor(() => {
      fireEvent.mouseEnter(firstItem);
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
    fireEvent.mouseLeave(firstItem);

    await userEvent.click(
      getByRole('button', { name: 'Expand', hidden: true }),
    );
    expect(
      getByRole('button', { name: 'Collapse Menu', hidden: true }),
    ).toBeInTheDocument();
  });

  it('persists the collapsed state across mounts', async () => {
    const { findByRole, unmount } = render(
      <MemoryRouter>
        <Layout {...props} />
      </MemoryRouter>,
    );
    await userEvent.click(
      await findByRole('button', { name: 'Collapse Menu', hidden: true }),
    );
    unmount();

    const { findByRole: findByRoleRemounted } = render(
      <MemoryRouter>
        <Layout {...props} />
      </MemoryRouter>,
    );
    expect(
      await findByRoleRemounted('button', {
        name: 'Expand',
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it('falls back to expanded when localStorage is unavailable', async () => {
    const getItem = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('localStorage blocked');
      });
    try {
      const { findByRole } = render(
        <MemoryRouter>
          <Layout {...props} />
        </MemoryRouter>,
      );
      expect(
        await findByRole('button', { name: 'Collapse Menu', hidden: true }),
      ).toBeInTheDocument();
    } finally {
      getItem.mockRestore();
    }
  });
});

it('displays onboarding footer', async () => {
  const { getByText } = render(
    <MemoryRouter>
      <Layout
        {...props}
        onboardModalHref={'/example'}
        onboardable={{
          incompleteSteps: [{ label: 'Details', modalHref: '/' }],
          totalSteps: 5,
          isOnboardable: false,
        }}
      />
    </MemoryRouter>,
  );
  expect(getByText(/profile.+% complete/i)).toBeVisible();
});

it('highlights the section a page asks for, whatever its URL', async () => {
  const ProjectDraft = () => {
    useHighlightedNavigation('/projects');
    return null;
  };
  const { findByRole, getByRole } = render(
    <MemoryRouter initialEntries={['/shared-research/1']}>
      <Layout {...props}>
        <ProjectDraft />
      </Layout>
    </MemoryRouter>,
  );
  expect(
    (await findByRole('link', { name: /^Projects$/ })).firstElementChild,
  ).toHaveStyleRule('background-color', colour.background['color-brand']);
  expect(
    getByRole('link', { name: /Shared Research$/ }).firstElementChild,
  ).not.toHaveStyleRule('background-color', colour.background['color-brand']);
});
