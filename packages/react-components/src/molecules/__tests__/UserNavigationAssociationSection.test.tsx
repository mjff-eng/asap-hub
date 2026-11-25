import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { colour } from '../../colors';
import UserNavigationAssociationSection from '../UserNavigationAssociationSection';

const interestGroup = {
  id: '1',
  name: 'Interest Group 1',
  href: '/interest-group-1',
  active: true,
};
const workingGroup = {
  id: '1',
  name: 'Working Group 1',
  href: '/working-group-1',
  active: true,
};
const team = {
  id: '1',
  name: 'Team 1',
  href: '/team-1',
};

it('renders an association section with all the details', () => {
  const { getByText, getByRole } = render(
    <MemoryRouter>
      <UserNavigationAssociationSection
        association={[{ ...interestGroup, name: 'group 1', href: '/abc' }]}
        userOnboarded={true}
        title="MY INTEREST GROUPS"
      />
    </MemoryRouter>,
  );

  expect(getByText('group 1')).toBeVisible();
  expect(getByText('MY INTEREST GROUPS')).toBeVisible();
  expect(getByRole('link', { name: /interest group/i })).toHaveAttribute(
    'href',
    expect.stringMatching('/abc'),
  );
});

it('renders only active associations', () => {
  const { getByText, queryByText } = render(
    <MemoryRouter>
      <UserNavigationAssociationSection
        association={[
          { ...interestGroup, name: 'group 1', href: '/abc', active: true },
          { ...interestGroup, active: false, name: 'group2' },
        ]}
        userOnboarded={true}
        title="MY INTEREST GROUPS"
      />
    </MemoryRouter>,
  );

  expect(getByText('group 1')).toBeVisible();
  expect(queryByText('group 2')).not.toBeInTheDocument();
});

it('disables the navigation link based on user onboarded', () => {
  const { getByText } = render(
    <MemoryRouter>
      <UserNavigationAssociationSection
        association={[
          { ...interestGroup, name: 'group 1', href: '/abc', active: true },
        ]}
        userOnboarded={false}
        title="MY INTEREST GROUPS"
      />
    </MemoryRouter>,
  );
  const targetElement = getByText('group 1');
  expect(targetElement).toBeVisible();
  // The pointer-events style is on the grandparent div element (span -> p -> div)
  const disabledDiv = targetElement.parentElement?.parentElement;
  expect(disabledDiv).toHaveStyle('pointer-events: none');
});

it('renders a association section with the correct icon', () => {
  const { getByTitle, rerender } = render(
    <MemoryRouter>
      <UserNavigationAssociationSection
        association={[workingGroup]}
        userOnboarded={true}
        title="MY WORKING GROUPS"
      />
    </MemoryRouter>,
  );
  expect(getByTitle('Working Groups')).toBeInTheDocument();

  rerender(
    <MemoryRouter>
      <UserNavigationAssociationSection
        association={[team]}
        userOnboarded={true}
        title="MY TEAMS"
      />
    </MemoryRouter>,
  );
  expect(getByTitle('Team')).toBeInTheDocument();

  rerender(
    <MemoryRouter>
      <UserNavigationAssociationSection
        association={[team]}
        userOnboarded={true}
        title="MY INTEREST GROUPS"
      />
    </MemoryRouter>,
  );
  expect(getByTitle('Interest Group')).toBeInTheDocument();
});

describe('the highlight of the current association', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <UserNavigationAssociationSection
          association={[
            {
              ...workingGroup,
              name: 'My Working Group',
              href: '/network/working-groups/wg-1',
            },
          ]}
          userOnboarded={true}
          title="MY WORKING GROUPS"
        />
      </MemoryRouter>,
    );
  const highlightedBackground = (container: HTMLElement) =>
    container.querySelector('a')?.firstElementChild;

  it('shows on the association pages', () => {
    const { container } = renderAt('/network/working-groups/wg-1/about');
    expect(highlightedBackground(container)).toHaveStyleRule(
      'background-color',
      colour.background['color-brand'],
    );
  });

  it('is off on its output forms', () => {
    const { container } = renderAt(
      '/network/working-groups/wg-1/create-output/protocol',
    );
    expect(highlightedBackground(container)).not.toHaveStyleRule(
      'background-color',
      colour.background['color-brand'],
    );
  });
});
